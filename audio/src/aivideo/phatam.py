"""Nghe phát âm tiếng Anh trong lời đọc (đề mục 18).

    python -m aivideo.phatam scan <slug>
    python -m aivideo.phatam pick <từ> [--candidates a,b] [--context "câu có {}"] [--meaning sai]
    python -m aivideo.phatam check <slug>

Giọng Việt (Korva) đọc từ tiếng Anh dễ sai. Máy nghe là Whisper large-v3-turbo chạy
offline trong venv riêng (`phatam_worker.py`): ép Whisper đọc đúng câu có từ tiếng Anh
và lấy xác suất của từ đó (pEn). Máy nghe âm vị wav2vec2 (nếu cài) chỉ để tham khảo (PER).
"""
from __future__ import annotations

import argparse
import difflib
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import unicodedata
from pathlib import Path

from aivideo import audio, engines
from aivideo.audio import FPS
from aivideo.gates import GENERIC_ACRONYMS
from aivideo.normalize_vi import speak

ROOT = Path(__file__).resolve().parents[3]
WORKER = Path(__file__).with_name("phatam_worker.py")
STT_PYTHON = Path.home() / "stt-work" / "venv" / "bin" / "python"
PHONEME_PYTHON = Path.home() / "stt-work" / "phoneme-venv" / "bin" / "python"
ENGINE, VOICE, SPEED = "korva", "hoang_nam", 1.25  # D12
DEFAULT_CONTEXT = "Ở đây ta gặp từ {} trong đoạn mã."
SR16 = 16000
BEAT_PAD_S = 0.1

# Ngưỡng duy nhất: xác suất Whisper (tiếng Anh) gán cho đúng từ đích khi ép đọc cả câu.
# Đo trên hoang_nam 1,25 (audio/README.md, "Nghe phát âm tiếng Anh"): false gốc 0,51–0,62,
# fôls 0,56–0,57; phôn-xơ 0,016–0,026, phôn 0,000–0,001, phon-s 0,000.
# PER (âm vị) không dùng để chặn: nó đánh trượt cả Python và decimal đọc gốc (0,67 và 0,43).
P_EN_MIN = 0.2

# ---- âm tiết tiếng Việt ----------------------------------------------------------

_TONES = {"̀", "́", "̃", "̉", "̣"}
_ONSET = "ngh|ng|nh|ch|gh|gi|kh|ph|qu|th|tr|b|c|d|đ|g|h|k|l|m|n|p|r|s|t|v|x"
_NUCLEUS = ("uyê|uya|uyu|iêu|yêu|uôi|ươi|ươu|oai|oay|oao|oeo|uây|"
            "iê|yê|uô|ươ|ưa|ưi|ưu|ai|ao|au|ay|âu|ây|eo|êu|ia|iu|oa|oă|oe|oi|oo|ôi|ơi|"
            "ua|uâ|uê|ui|uơ|uy|"
            "a|ă|â|e|ê|i|o|ô|ơ|u|ư|y")
_CODA = "ch|ng|nh|c|m|n|p|t"
_SYLLABLE = re.compile(rf"^(?:{_ONSET})?(?:{_NUCLEUS})(?:{_CODA})?$")
TOKEN_RE = re.compile(r"[^\W\d_]+(?:[-'’.][^\W\d_]+)*")


def _toneless(s: str) -> str:
    d = unicodedata.normalize("NFD", s.lower())
    return unicodedata.normalize("NFC", "".join(c for c in d if c not in _TONES))


def is_vi_syllable(s: str) -> bool:
    return bool(_SYLLABLE.match(_toneless(s)))


def is_foreign(word: str) -> bool:
    """Từ chữ Latin không phải âm tiết tiếng Việt (bỏ viết tắt phổ thông, bỏ chữ một ký tự)."""
    if len(word) < 2 or word in GENERIC_ACRONYMS:
        return False
    if sum(c.isupper() for c in word) >= 2:
        return True
    if re.search(r"[fjwzFJWZ]", word):
        return True
    return not all(is_vi_syllable(p) for p in re.split(r"[-'’.]", word) if p)


def _vi_phrase(s: str) -> bool:
    parts = TOKEN_RE.findall(s)
    return bool(parts) and all("-" not in p and is_vi_syllable(p) for p in parts)


# ---- tìm từ tiếng Anh trong lời đọc ------------------------------------------------

def load_lexicon(ep_dir: Path, content_lexicon: Path | None) -> dict[str, str]:
    lex: dict[str, str] = {}
    for p in (content_lexicon, ep_dir / "lexicon.json"):
        if p and Path(p).is_file():
            lex.update(json.loads(Path(p).read_text(encoding="utf-8")))
    return lex


def _find_word(line: str, word: str, start: int = 0):
    return re.compile(rf"(?<![\w-]){re.escape(word)}(?![\w-])", re.IGNORECASE).search(line, start)


def _spoken_form(term: str, text: str, line: str, lex_lower: dict[str, str]):
    """Cách từ `term` (trong text) được đọc trong `line`: (dạng đọc, loại) hoặc (None, lý do)."""
    if _find_word(line, term):
        return term, "giu-tieng-anh"
    val = lex_lower.get(term.lower())
    if val and _find_word(line, val):
        return val, "phien-am"
    a = [t.lower() for t in TOKEN_RE.findall(text)]
    b = TOKEN_RE.findall(line)
    sm = difflib.SequenceMatcher(a=a, b=[t.lower() for t in b], autojunk=False)
    for op, i1, i2, j1, j2 in sm.get_opcodes():
        if op == "replace" and term.lower() in a[i1:i2]:
            if i2 - i1 == j2 - j1:
                k = j1 + a[i1:i2].index(term.lower())
                form = b[k]
            elif i2 - i1 == 1 and j2 - j1 <= 3:
                form = " ".join(b[j1:j2])
            else:
                break
            if form:
                return form, ("nghia-viet" if _vi_phrase(form) else "phien-am")
            break
    return None, "khong-xac-dinh"


def find_occurrences(script: dict, lexicon: dict[str, str]) -> list[dict]:
    """Mọi lần một từ tiếng Anh được đọc trong lời. Mỗi mục: beat, term, spoken, kind, line, span."""
    lex_lower = {k.lower(): v for k, v in lexicon.items()}
    out: list[dict] = []
    for sc in script["scenes"]:
        for b in sc["beats"]:
            text = b["text"]
            line = b["spoken"] if b.get("spoken") else speak(text, lexicon)
            terms: list[str] = []
            for t in TOKEN_RE.findall(text):
                if (is_foreign(t) or t.lower() in lex_lower) and t not in terms:
                    terms.append(t)
            for t in TOKEN_RE.findall(line):  # tiếng Anh viết thẳng trong lời (chỉ chữ ASCII)
                if t.isascii() and is_foreign(t) and not any(t.lower() == x.lower() for x in terms):
                    terms.append(t)
            for term in terms:
                form, kind = _spoken_form(term, text, line, lex_lower)
                base = {"beat": b["id"], "term": term, "spoken": form, "kind": kind, "line": line}
                if form is None or kind == "nghia-viet":
                    out.append({**base, "span": None})
                    continue
                pos = 0
                while (m := _find_word(line, form, pos)) is not None:
                    out.append({**base, "span": [m.start(), m.end()]})
                    pos = m.end()
    return out


# ---- phiên âm tự sinh từ IPA của espeak-ng ----------------------------------------

_MULTI = ("tʃ", "dʒ", "aɪ", "aʊ", "eɪ", "oʊ", "əʊ", "ɔɪ", "ɪə", "eə", "ʊə")
_VOWEL = {"i": "i", "ɪ": "i", "ᵻ": "i", "e": "e", "ɛ": "e", "æ": "e", "a": "a", "ɑ": "a",
          "ɒ": "o", "ɔ": "o", "o": "ô", "oʊ": "ô", "əʊ": "ô", "ʊ": "u", "u": "u", "ʌ": "â",
          "ə": "ơ", "ɜ": "ơ", "ɚ": "ơ", "ɐ": "ơ", "aɪ": "ai", "aʊ": "ao", "eɪ": "ây",
          "ɔɪ": "oi", "ɪə": "ia", "eə": "e", "ʊə": "ua"}
_ONSET_MAP = {"p": "p", "b": "b", "t": "t", "ɾ": "t", "d": "đ", "k": "c", "ɡ": "g", "g": "g",
              "f": "ph", "v": "v", "θ": "th", "ð": "đ", "s": "x", "z": "d", "ʃ": "s", "ʒ": "gi",
              "tʃ": "ch", "dʒ": "gi", "h": "h", "m": "m", "n": "n", "ŋ": "ng", "l": "l",
              "ɹ": "r", "r": "r", "w": "u", "j": "d"}
_CODA_OK = {"p": "p", "t": "t", "k": "c", "m": "m", "n": "n", "ŋ": "ng"}
_CODA_NEAR = {**_CODA_OK, "l": "n", "d": "t", "b": "p", "ɡ": "c", "g": "c", "ɾ": "t"}


def _ipa_clean(ipa: str) -> str:
    ipa = unicodedata.normalize("NFD", ipa)
    ipa = "".join(c for c in ipa if not unicodedata.combining(c))
    return re.sub(r"[ˈˌː\-\s\d‿]", "", ipa)


def _ipa_phones(ipa: str) -> list[str]:
    s, out, i = _ipa_clean(ipa), [], 0
    while i < len(s):
        two = s[i:i + 2]
        if two in _MULTI:
            out.append(two)
            i += 2
        else:
            out.append(s[i])
            i += 1
    return out


def _onset(c: str, nucleus: str) -> str:
    v = _ONSET_MAP.get(c, "")
    if v == "c" and nucleus[:1] in ("i", "e", "ê", "y"):
        return "k"
    if v == "g" and nucleus[:1] in ("i", "e", "ê"):
        return "gh"
    return v


def respell(ipa: str) -> list[str]:
    """Ba cách phiên âm thô (nuốt âm cuối / đổi âm cuối gần nhất / tách âm cuối thành 'ơ')."""
    phones = [p for p in _ipa_phones(ipa) if p in _VOWEL or p in _ONSET_MAP]
    groups: list[list] = []  # [onsets, nucleus, codas]
    pending: list[str] = []
    for p in phones:
        if p in _VOWEL:
            groups.append([pending, _VOWEL[p], []])
            pending = []
        else:
            pending.append(p)
    if not groups:
        return []
    groups[-1][2] = pending
    # giữa hai nguyên âm: phụ âm đầu thuộc vần trước nếu có từ hai phụ âm
    for g, nxt in zip(groups, groups[1:]):
        if len(nxt[0]) >= 2:
            g[2], nxt[0] = nxt[0][:1], nxt[0][1:]

    def word(mode: str) -> str:
        sylls = []
        for ons, nuc, codas in groups:
            for c in ons[:-1]:
                sylls.append(_onset(c, "ơ") + "ơ")
            head = (_onset(ons[-1], nuc) if ons else "") + nuc
            if ons and ons[-1] == "w":
                head = {"ua": "oa", "ue": "oe"}.get(head[:2], head[:2]) + head[2:]
            rest = list(codas)
            table = _CODA_OK if mode == "drop" else _CODA_NEAR
            if rest and rest[0] in table:
                head += table[rest.pop(0)]
            sylls.append(head)
            if mode == "split":
                sylls += [_onset(c, "ơ") + "ơ" for c in rest]
        return "-".join(s for s in sylls if s)

    out: list[str] = []
    for mode in ("drop", "near", "split"):
        w = word(mode)
        if w and w not in out:
            out.append(w)
    return out


def target_ipa(term: str) -> str | None:
    """IPA tiếng Anh (Mỹ) của từ theo espeak-ng; None nếu máy không có espeak-ng."""
    exe = shutil.which("espeak-ng")
    if not exe:
        return None
    r = subprocess.run([exe, "-q", "--ipa", "-v", "en-us", term], capture_output=True, text=True)
    return r.stdout.strip() or None if r.returncode == 0 else None


# ---- khoảng cách âm vị ------------------------------------------------------------

_PHONE_EQ = str.maketrans({"ɹ": "r", "ɡ": "g", "ɐ": "ə", "ɚ": "ə", "ɜ": "ə", "ɑ": "a", "ɒ": "ɔ",
                           "o": "ɔ", "ɪ": "i", "ᵻ": "i", "ʊ": "u", "ʉ": "u", "ɛ": "e", "æ": "e",
                           "ʌ": "ə", "ɾ": "t"})


def norm_phones(ipa: str) -> str:
    return _ipa_clean(ipa).translate(_PHONE_EQ)


def phone_distance(target: str, heard: str) -> float:
    """Levenshtein giữa hai chuỗi âm vị đã chuẩn hoá, chia cho độ dài đích (khớp đoạn con tốt nhất)."""
    t, h = norm_phones(target), norm_phones(heard)
    if not t:
        return 1.0
    prev = [0] * (len(h) + 1)  # được bỏ tự do phần đầu và phần cuối của h
    for i, ct in enumerate(t, 1):
        cur = [i] + [0] * len(h)
        for j, ch in enumerate(h, 1):
            cur[j] = min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (ct != ch))
        prev = cur
    return round(min(prev) / len(t), 3)


# ---- máy nghe (subprocess sang venv riêng) ------------------------------------------

def _python(env: str, default: Path) -> Path:
    return Path(os.environ.get(env) or default)


def _worker(py: Path, mode: str, items: list[dict]) -> list[dict]:
    if not py.is_file():
        raise RuntimeError(f"không có python của máy nghe: {py}")
    r = subprocess.run([str(py), "-I", str(WORKER), mode], input=json.dumps(items, ensure_ascii=False),
                       capture_output=True, text=True,
                       env={**os.environ, "HF_HUB_OFFLINE": "1", "TRANSFORMERS_OFFLINE": "1"})
    if r.returncode != 0:
        raise RuntimeError(f"máy nghe {mode} lỗi: {r.stderr.strip()[-600:]}")
    res = json.loads(r.stdout)
    if len(res) != len(items):
        raise RuntimeError(f"máy nghe {mode} trả {len(res)} kết quả cho {len(items)} đoạn")
    return res


def listen(items: list[dict]) -> list[dict]:
    """items {wav, prefix, term, suffix} -> {pEn, pVi, start, end, heardEn, langEn, heardVi}."""
    return _worker(_python("AIVIDEO_STT_PYTHON", STT_PYTHON), "asr", items)


def phonemes(items: list[dict]) -> list[dict] | None:
    """items {wav, start, end} -> {phones}; None nếu chưa cài máy nghe âm vị."""
    py = _python("AIVIDEO_PHONEME_PYTHON", PHONEME_PYTHON)
    if not py.is_file():
        return None
    return _worker(py, "phoneme", items)


# ---- âm thanh ----------------------------------------------------------------------

def _to16k(src: Path, dst: Path, start: float | None = None, dur: float | None = None) -> None:
    cut = ([] if start is None else ["-ss", f"{start:.3f}"]) + ([] if dur is None else ["-t", f"{dur:.3f}"])
    audio._ffmpeg([*cut, "-i", str(src), "-ar", str(SR16), "-ac", "1", "-c:a", "pcm_s16le", str(dst)])


def synth_clip(line: str, voice: str, speed: float, dst: Path) -> None:
    """Tổng hợp như lúc dựng tập (engines.synth rồi cắt lặng TRIM_FULL), ghi wav 16 kHz."""
    import soundfile as sf

    raw, sr = engines.synth(ENGINE, line, voice, speed)
    wav = audio._filter_wav(raw, sr, audio.TRIM_FULL)
    tmp = dst.with_suffix(".48k.wav")
    sf.write(tmp, wav, audio.OUT_SR, subtype="FLOAT")
    _to16k(tmp, dst)
    tmp.unlink(missing_ok=True)


# ---- chấm điểm -----------------------------------------------------------------------

def score(heard: dict, ipa: str | None, phones: dict | None) -> dict:
    per = phone_distance(ipa, phones["phones"]) if ipa and phones is not None else None
    ok = heard["pEn"] >= P_EN_MIN
    return {**heard, "per": per, "phones": phones["phones"] if phones else None, "pass": ok}


def _hear(jobs: list[dict], term_ipa: dict[str, str | None]) -> list[dict]:
    if not jobs:
        return []
    heard = listen([{k: j[k] for k in ("wav", "prefix", "term", "suffix")} for j in jobs])
    ph = phonemes([{"wav": j["wav"], "start": h["start"], "end": h["end"]} for j, h in zip(jobs, heard)])
    return [score(h, term_ipa.get(j["term"]), ph[i] if ph else None)
            for i, (j, h) in enumerate(zip(jobs, heard))]


def _fmt(x, nd=3) -> str:
    return "—" if x is None else f"{x:.{nd}f}"


def _heard_en(r: dict) -> str:
    return " ".join(w["word"] for w in r["heardEn"]) or "—"


def candidates(term: str, user: list[str], meaning: str | None, ipa: str | None) -> list[tuple[str, str]]:
    out: list[tuple[str, str]] = []
    for c, kind in ([(c, "tu-sinh") for c in (respell(ipa) if ipa else [])]
                    + [(c, "cua-ban") for c in user] + [(term, "tieng-anh-goc")]
                    + ([(meaning, "nghia-viet")] if meaning else [])):
        c = c.strip()
        if c and c not in [x for x, _ in out]:
            out.append((c, kind))
    return out


def pick(term: str, user: list[str], context: str, meaning: str | None,
         voice: str = VOICE, speed: float = SPEED) -> dict:
    if context.count("{}") != 1:
        raise ValueError("--context phải có đúng một chỗ {}")
    prefix, suffix = context.split("{}")
    ipa = target_ipa(term)
    cands = candidates(term, user, meaning, ipa)
    with tempfile.TemporaryDirectory() as d:
        jobs = []
        for i, (c, _kind) in enumerate(cands):
            wav = Path(d) / f"c{i}.wav"
            synth_clip(prefix + c + suffix, voice, speed, wav)
            jobs.append({"wav": str(wav), "prefix": prefix, "term": term, "suffix": suffix})
        res = _hear(jobs, {term: ipa})
    rows = [{"candidate": c, "kind": k, **r} for (c, k), r in zip(cands, res)]
    for r in rows:
        if r["kind"] == "nghia-viet":
            r["pass"] = False  # nghĩa tiếng Việt không chấm theo tai tiếng Anh
    english = sorted((r for r in rows if r["kind"] != "nghia-viet"),
                     key=lambda r: r["pEn"], reverse=True)
    winner = english[0] if english and english[0]["pass"] else None
    return {"term": term, "ipa": ipa, "context": context, "rows": english + [r for r in rows if r["kind"] == "nghia-viet"],
            "winner": winner["candidate"] if winner else None, "meaning": meaning}


def print_pick(res: dict) -> None:
    print(f"từ: {res['term']}  IPA: {res['ipa'] or '— (không có espeak-ng)'}  câu: {res['context']}")
    print(f"ngưỡng: pEn ≥ {P_EN_MIN} (PER chỉ để tham khảo)")
    print(f"{'#':>2}  {'ứng viên':<16} {'loại':<14} {'pEn':>6} {'pVi':>6} {'PER':>5}  {'âm vị nghe':<16} "
          f"{'Anh nghe (cắt từ)':<20} {'Việt nghe (cả câu)':<40} kết quả")
    for i, r in enumerate(res["rows"], 1):
        verdict = "—" if r["kind"] == "nghia-viet" else ("ĐẠT" if r["pass"] else "trượt")
        print(f"{i:>2}  {r['candidate']:<16} {r['kind']:<14} {_fmt(r['pEn']):>6} {_fmt(r['pVi']):>6} "
              f"{_fmt(r['per'], 2):>5}  {(r['phones'] or '—'):<16} {_heard_en(r):<20} {r['heardVi'][:40]:<40} {verdict}")
    if res["winner"]:
        print(f"CHỌN: {res['winner']!r} (đưa vào `spoken` của beat qua scriptwriter)")
    else:
        alt = repr(res["meaning"]) if res["meaning"] else "nghĩa tiếng Việt"
        print(f"KHÔNG ĐẠT: không cách đọc nào đủ giống tiếng Anh. Thay {res['term']!r} bằng {alt} "
              "trong lời đọc, chỉ hiện chữ tiếng Anh trên màn hình.")


# ---- scan / check tập ----------------------------------------------------------------

def _episode(slug: str, root: Path):
    ep = root / "episodes" / slug
    if not (ep / "script.json").is_file():
        raise ValueError(f"không có {ep / 'script.json'}")
    script = json.loads((ep / "script.json").read_text(encoding="utf-8"))
    return ep, script, load_lexicon(ep, root / "content" / "lexicon.json")


def scan(slug: str, root: Path) -> list[dict]:
    _ep, script, lex = _episode(slug, root)
    return find_occurrences(script, lex)


def print_scan(occ: list[dict]) -> None:
    if not occ:
        print("không có từ tiếng Anh trong lời đọc")
        return
    terms: dict[str, dict] = {}
    for o in occ:
        t = terms.setdefault(o["term"].lower(), {"term": o["term"], "n": 0, "beats": [], "forms": [], "kinds": []})
        t["n"] += 1
        for key, val in (("beats", o["beat"]), ("forms", o["spoken"] or "?"), ("kinds", o["kind"])):
            if val not in t[key]:
                t[key].append(val)
    print(f"{'từ':<16} {'lần':>3}  {'đọc thành':<28} {'loại':<24} nhịp")
    for t in terms.values():
        print(f"{t['term']:<16} {t['n']:>3}  {', '.join(t['forms']):<28} {', '.join(t['kinds']):<24} {', '.join(t['beats'])}")


def check(slug: str, root: Path) -> dict:
    _ep, script, lex = _episode(slug, root)
    out = root / "out" / "episodes" / slug
    narr, tl_path = out / "narration.wav", out / "timeline.json"
    if not narr.is_file() or not tl_path.is_file():
        raise ValueError(f"chưa dựng giọng: thiếu {narr} hoặc {tl_path}")
    timeline = json.loads(tl_path.read_text(encoding="utf-8"))
    beats = {b["id"]: b for sc in timeline["scenes"] for b in sc["beats"]}
    occ = find_occurrences(script, lex)
    rows, jobs = [], []
    with tempfile.TemporaryDirectory() as d:
        for o in occ:
            row = dict(o)
            rows.append(row)
            if o["kind"] == "nghia-viet":
                row.update({"pass": True, "note": "đã thay bằng nghĩa tiếng Việt"})
                continue
            if o["span"] is None:
                row.update({"pass": False, "note": "không xác định được cách đọc trong lời"})
                continue
            if o["beat"] not in beats:
                row.update({"pass": False, "note": "nhịp không có trong timeline (dựng lại giọng)"})
                continue
            b = beats[o["beat"]]
            start = max(0.0, b["startFrame"] / FPS - BEAT_PAD_S)
            wav = Path(d) / f"o{len(jobs)}.wav"
            _to16k(narr, wav, start, b["durationFrames"] / FPS + 2 * BEAT_PAD_S)
            a, z = o["span"]
            jobs.append({"wav": str(wav), "prefix": o["line"][:a], "term": o["term"],
                         "suffix": o["line"][z:], "row": row})
        ipas = {t: target_ipa(t) for t in {j["term"] for j in jobs}}
        for j, r in zip(jobs, _hear(jobs, ipas)):
            j["row"].update(r)
    return {"slug": slug, "rows": rows, "pass": all(r["pass"] for r in rows)}


def print_check(res: dict) -> None:
    if not res["rows"]:
        print("không có từ tiếng Anh trong lời đọc: ĐẠT")
        return
    print(f"ngưỡng: pEn ≥ {P_EN_MIN} (PER chỉ để tham khảo)")
    print(f"{'nhịp':<8} {'từ':<14} {'đọc thành':<16} {'pEn':>6} {'PER':>5}  {'Anh nghe (cắt từ)':<20} kết quả")
    for r in res["rows"]:
        verdict = "ĐẠT" if r["pass"] else "TRƯỢT"
        extra = r.get("note") or ""
        print(f"{r['beat']:<8} {r['term']:<14} {(r['spoken'] or '?'):<16} {_fmt(r.get('pEn')):>6} "
              f"{_fmt(r.get('per'), 2):>5}  {(_heard_en(r) if 'heardEn' in r else '—'):<20} {verdict} {extra}")
    bad = [r for r in res["rows"] if not r["pass"]]
    if bad:
        print(f"TRƯỢT {len(bad)} chỗ: chạy `python -m aivideo.phatam pick <từ> --context \"<câu có {{}}>\"` "
              "cho từng từ, đưa cách đọc ĐẠT cho scriptwriter làm `spoken`, hoặc thay bằng nghĩa tiếng Việt.")
    else:
        print("ĐẠT")


# ---- CLI ------------------------------------------------------------------------------

def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(prog="aivideo.phatam")
    ap.add_argument("--root", default=os.environ.get("AIVIDEO_ROOT") or str(ROOT))
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("scan").add_argument("slug")
    p = sub.add_parser("pick")
    p.add_argument("term")
    p.add_argument("--candidates", default="")
    p.add_argument("--context", default=DEFAULT_CONTEXT)
    p.add_argument("--meaning")
    p.add_argument("--voice", default=VOICE)
    p.add_argument("--speed", type=float, default=SPEED)
    sub.add_parser("check").add_argument("slug")
    a = ap.parse_args(argv)
    try:
        if a.cmd == "scan":
            print_scan(scan(a.slug, Path(a.root)))
            return 0
        if a.cmd == "pick":
            res = pick(a.term, [c for c in a.candidates.split(",") if c.strip()], a.context, a.meaning,
                       a.voice, a.speed)
            print_pick(res)
            return 0 if res["winner"] else 1
        res = check(a.slug, Path(a.root))
        print_check(res)
        return 0 if res["pass"] else 1
    except (ValueError, RuntimeError, OSError, KeyError) as e:
        print(f"lỗi: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
