"""Chuẩn hóa, ghép âm thanh, xuất timeline + SRT, kiểm timeline, CLI."""
from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
import tempfile
import unicodedata
from pathlib import Path

import numpy as np
import soundfile as sf

from aivideo import engines

SCENE_IDS = ("phone", "dns", "packets", "wifi", "hops", "server", "receiver")
FPS, WIDTH, HEIGHT = 30, 1920, 1080


def _is_frame(v) -> bool:
    return isinstance(v, int) and not isinstance(v, bool) and v >= 0


def validate_timeline(doc) -> list[str]:
    """Trả danh sách lỗi theo hợp đồng timeline v1; rỗng là hợp lệ."""
    errs: list[str] = []
    if not isinstance(doc, dict):
        return ["timeline phải là object"]
    for key, want in (("version", 1), ("fps", FPS), ("width", WIDTH), ("height", HEIGHT)):
        if doc.get(key) != want or isinstance(doc.get(key), bool):
            errs.append(f"luật 1: {key} phải bằng {want}, có {doc.get(key)!r}")
    total = doc.get("durationInFrames")
    if not _is_frame(total):
        errs.append("luật 2: durationInFrames phải là số nguyên >= 0")
        total = None
    audio = doc.get("audio")
    if not isinstance(audio, dict) or not isinstance(audio.get("src"), str) or not audio["src"]:
        errs.append("audio.src phải là chuỗi không rỗng")
    scenes = doc.get("scenes")
    if not isinstance(scenes, list) or not scenes:
        errs.append("scenes phải là danh sách không rỗng")
        return errs

    seen_scenes: set = set()
    seen_beats: set = set()
    expected_start = 0
    for si, sc in enumerate(scenes):
        if not isinstance(sc, dict):
            errs.append(f"scenes[{si}] phải là object")
            continue
        sid = sc.get("id")
        if sid not in SCENE_IDS:
            errs.append(f"luật 3: scenes[{si}].id {sid!r} không thuộc tập cho phép")
        elif sid in seen_scenes:
            errs.append(f"luật 3: cảnh {sid!r} xuất hiện nhiều hơn một lần")
        seen_scenes.add(sid)
        s0, sd = sc.get("startFrame"), sc.get("durationFrames")
        if not (_is_frame(s0) and _is_frame(sd)):
            errs.append(f"luật 2: scenes[{si}] startFrame/durationFrames phải là số nguyên >= 0")
            continue
        if s0 != expected_start:
            errs.append(f"luật 4: cảnh {sid!r} bắt đầu {s0}, phải là {expected_start} (hở hoặc chồng)")
        expected_start = s0 + sd
        beats = sc.get("beats")
        if not isinstance(beats, list) or not beats:
            errs.append(f"luật 6: cảnh {sid!r} phải có ít nhất một beat")
            continue
        prev_end = s0
        for bi, b in enumerate(beats):
            if not isinstance(b, dict):
                errs.append(f"cảnh {sid!r} beats[{bi}] phải là object")
                continue
            bid = b.get("id")
            if not isinstance(bid, str) or not bid:
                errs.append(f"luật 6: cảnh {sid!r} beats[{bi}].id phải là chuỗi không rỗng")
            elif bid in seen_beats:
                errs.append(f"luật 6: beat id {bid!r} bị trùng")
            seen_beats.add(bid)
            b0, bd = b.get("startFrame"), b.get("durationFrames")
            if not (_is_frame(b0) and _is_frame(bd)):
                errs.append(f"luật 2: beat {bid!r} startFrame/durationFrames phải là số nguyên >= 0")
            else:
                if b0 < prev_end:
                    errs.append(f"luật 5: beat {bid!r} bắt đầu {b0} < {prev_end} (chồng hoặc không tăng dần)")
                if b0 + bd > s0 + sd:
                    errs.append(f"luật 5: beat {bid!r} vượt ra ngoài cảnh {sid!r}")
                prev_end = max(prev_end, b0 + bd)
            text = b.get("text")
            if not isinstance(text, str) or not text.strip():
                errs.append(f"luật 7: beat {bid!r} text rỗng")
            else:
                if len(text) > 100:
                    errs.append(f"luật 7: beat {bid!r} text dài {len(text)} > 100 ký tự")
                if unicodedata.normalize("NFC", text) != text:
                    errs.append(f"luật 7: beat {bid!r} text không phải NFC")
            if "cue" in b and not isinstance(b["cue"], str):
                errs.append(f"luật 8: beat {bid!r} cue phải là chuỗi")
    if total is not None and expected_start != total:
        errs.append(f"luật 4: cảnh cuối kết thúc tại {expected_start}, durationInFrames là {total}")
    return errs


# ---- chuẩn hóa văn bản ------------------------------------------------------

_DIGITS = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"]


def _below_100(n: int, full: bool) -> str:
    """0..99. full=True: có chữ số hàng trăm đứng trước (dùng 'linh' cho 1..9)."""
    if n < 10:
        return ("linh " + _DIGITS[n]) if full and n else ("" if full else _DIGITS[n])
    t, u = divmod(n, 10)
    head = "mười" if t == 1 else f"{_DIGITS[t]} mươi"
    if u == 0:
        return head
    if u == 1 and t > 1:
        return f"{head} mốt"
    if u == 5:
        return f"{head} lăm"
    return f"{head} {_DIGITS[u]}"


def _below_1000(n: int, full: bool) -> str:
    """1..999. full=True: có nhóm cao hơn đứng trước (đọc đủ 'không trăm')."""
    h, r = divmod(n, 100)
    if h == 0:
        return _below_100(r, full)
    parts = [f"{_DIGITS[h]} trăm"]
    tail = _below_100(r, True)
    if tail:
        parts.append(tail)
    return " ".join(parts)


def number_to_words(n: int) -> str:
    """Số nguyên 0..999_999_999 thành chữ tiếng Việt."""
    if not isinstance(n, int) or isinstance(n, bool) or n < 0 or n > 999_999_999:
        raise ValueError(f"số ngoài phạm vi 0..999999999: {n!r}")
    if n == 0:
        return _DIGITS[0]
    groups = []
    for unit in ("", "nghìn", "triệu"):
        n, g = divmod(n, 1000)
        groups.append((g, unit))
    words: list[str] = []
    started = False
    for g, unit in reversed(groups):
        if g == 0:
            continue
        if started and g < 100:
            words.append("không trăm" + (" " + _below_100(g, True) if g else ""))
        else:
            words.append(_below_1000(g, started))
        if unit:
            words.append(unit)
        started = True
    return " ".join(words)


def _digits_to_words(m: re.Match) -> str:
    d = m.group(0)
    if len(d) > 9:
        return " ".join(_DIGITS[int(c)] for c in d)
    return number_to_words(int(d))


def normalize_text(text: str, lexicon: dict[str, str]) -> str:
    """Số thành chữ, rồi thay từ theo bảng phát âm (nguyên từ, không phân biệt hoa thường)."""
    out = re.sub(r"\d+", _digits_to_words, text)
    if lexicon:
        keys = sorted(lexicon, key=len, reverse=True)
        lowered = {k.lower(): v for k, v in lexicon.items()}
        pattern = r"(?<!\w)(" + "|".join(re.escape(k) for k in keys) + r")(?!\w)"
        out = re.sub(pattern, lambda m: lowered[m.group(1).lower()], out, flags=re.IGNORECASE)
    return out


def spoken_text(segment: dict, lexicon: dict[str, str]) -> str:
    """Lời đọc: `spoken` nếu có, ngược lại `text`; rồi chuẩn hóa. `text` không đổi."""
    src = segment.get("spoken") or segment["text"]
    return normalize_text(src, lexicon)


def load_script(path) -> dict:
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def load_lexicon(path) -> dict[str, str]:
    with open(path, encoding="utf-8") as f:
        return json.load(f)


# ---- FFmpeg: loudnorm ---------------------------------------------------------

OUT_SR = 48000
TARGET_I, TARGET_TP, TARGET_LRA = -16.0, -1.5, 11.0


def _ffmpeg(args: list[str]) -> str:
    r = subprocess.run(["ffmpeg", "-hide_banner", "-nostdin", "-y", *args],
                       capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(f"ffmpeg lỗi: {r.stderr[-800:]}")
    return r.stderr


def _measure(src: str, pre: str) -> dict:
    af = (pre + "," if pre else "") + f"loudnorm=I={TARGET_I}:TP={TARGET_TP}:LRA={TARGET_LRA}:print_format=json"
    err = _ffmpeg(["-i", src, "-af", af, "-f", "null", "-"])
    return json.loads(err[err.rindex("{"):err.rindex("}") + 1])


def loudnorm(wav: np.ndarray, sr: int, pre: str = "") -> np.ndarray:
    """Qua `pre` (chuỗi lọc FFmpeg, tuỳ chọn) rồi loudnorm 2 lượt (-16 LUFS, TP -1.5).
    Trả float32 mono 48 kHz. `linear=true` nên không đổi độ dài."""
    with tempfile.TemporaryDirectory() as d:
        src, dst = str(Path(d) / "in.wav"), str(Path(d) / "out.wav")
        sf.write(src, wav, sr, subtype="FLOAT")
        pre_chain = (pre + "," if pre else "") + f"aresample={OUT_SR},aformat=channel_layouts=mono"
        m = _measure(src, pre_chain)
        af = (pre_chain + f",loudnorm=I={TARGET_I}:TP={TARGET_TP}:LRA={TARGET_LRA}"
              f":measured_I={m['input_i']}:measured_TP={m['input_tp']}"
              f":measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}"
              f":offset={m['target_offset']}:linear=true,aresample={OUT_SR}")
        _ffmpeg(["-i", src, "-af", af, "-c:a", "pcm_f32le", dst])
        out, out_sr = sf.read(dst, dtype="float32")
    assert out_sr == OUT_SR
    return out.reshape(-1)


def measure_lufs(path) -> float:
    """Loudness tích hợp (LUFS) của một file, đo bằng ebur128."""
    err = _ffmpeg(["-i", str(path), "-af", "ebur128=framelog=quiet", "-f", "null", "-"])
    return float(re.findall(r"I:\s+(-?[\d.]+)\s+LUFS", err)[-1])


# ---- compare ------------------------------------------------------------------

def _slug(name: str) -> str:
    base = unicodedata.normalize("NFKD", name.replace("đ", "d").replace("Đ", "D"))
    base = "".join(c for c in base if not unicodedata.combining(c))
    return re.sub(r"[^A-Za-z0-9_-]", "-", base)


def compare(text_file, out_dir, engines_list=None, voices=None, lexicon_path=None) -> list[Path]:
    """Cùng một văn bản, mọi (engine, giọng), cùng loudness; ghi <engine>_<giọng>.wav."""
    lexicon = load_lexicon(lexicon_path) if lexicon_path else {}
    text = normalize_text(Path(text_file).read_text(encoding="utf-8").strip(), lexicon)
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    names = list(engines_list) if engines_list else [e for e in engines.ENGINES if e != "fake"]
    paths: list[Path] = []
    for eng in names:
        for voice in (voices or {}).get(eng) or engines.VOICES[eng]:
            wav, sr = engines.synth(eng, text, voice)
            norm = loudnorm(wav, sr, pre=SILENCE_FILTER)
            path = out_dir / f"{eng}_{_slug(voice)}.wav"
            sf.write(path, norm, OUT_SR, subtype="PCM_16")
            paths.append(path)
            print(f"{path}  {measure_lufs(path):.2f} LUFS", flush=True)
    return paths


SILENCE_FILTER = (
    "silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05,areverse,"
    "silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.08,areverse"
)


# ---- CLI --------------------------------------------------------------------

def _parse_voices(items: list[str] | None) -> dict[str, list[str]]:
    out: dict[str, list[str]] = {}
    for it in items or []:
        for pair in it.split(","):
            eng, _, voice = pair.partition("=")
            out.setdefault(eng.strip(), []).append(voice.strip())
    return out


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(prog="aivideo.audio")
    sub = ap.add_subparsers(dest="cmd", required=True)
    c = sub.add_parser("compare")
    c.add_argument("--text-file", required=True)
    c.add_argument("--out-dir", default="../out/compare")
    c.add_argument("--engines")
    c.add_argument("--voices", action="append")
    c.add_argument("--lexicon", default="../content/lexicon.json")
    a = ap.parse_args(argv)
    if a.cmd == "compare":
        eng = a.engines.split(",") if a.engines else None
        paths = compare(a.text_file, a.out_dir, eng, _parse_voices(a.voices), a.lexicon)
        print(f"{len(paths)} file trong {a.out_dir}")
        return 0
    return 2


if __name__ == "__main__":
    sys.exit(main())
