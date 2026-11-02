"""Dựng tập: script.json -> narration.wav, timeline v2, SRT, chapters.txt."""
from __future__ import annotations

import argparse
import json
import math
import os
import re
import sys
import unicodedata
from pathlib import Path

import numpy as np
import soundfile as sf

from aivideo import audio, engines
from aivideo.audio import FPS, HEIGHT, OUT_SR, WIDTH
from aivideo.normalize_vi import speak

TEMPLATE_SLUG = "_template"
SLUG_RE = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")
SCENE_TYPE_RE = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")
CUSTOM_RE = re.compile(r"^custom:[a-z0-9]+(-[a-z0-9]+)*$")
CATALOG = frozenset((
    "cold-open", "chapter-title", "recap-outro", "big-number", "compare", "myth-fact",
    "history-timeline", "term-card", "chart", "flow", "layers", "code-walk", "terminal",
    "bits", "memory-array", "algo-bars", "tree-graph", "scale-ladder"))
SFX_GAIN_DB = -18
MIN_CHAPTER_S = 10


def _int(v, lo=0) -> bool:
    return isinstance(v, int) and not isinstance(v, bool) and v >= lo


def _nonempty(v) -> bool:
    return isinstance(v, str) and bool(v.strip())


# ---- script.json ---------------------------------------------------------------

def validate_script(doc) -> list[str]:
    errs: list[str] = []
    if not isinstance(doc, dict):
        return ["script phải là object"]
    meta = doc.get("meta")
    if not isinstance(meta, dict):
        errs.append("meta phải là object")
        meta = {}
    if not _nonempty(meta.get("title")):
        errs.append("meta.title phải là chuỗi không rỗng")
    if not _nonempty(meta.get("theme")):
        errs.append("meta.theme phải là chuỗi không rỗng")
    if "voice" in meta and not _nonempty(meta["voice"]):
        errs.append("meta.voice phải là chuỗi không rỗng")
    sp = meta.get("speed")
    if "speed" in meta and (isinstance(sp, bool) or not isinstance(sp, (int, float)) or sp <= 0):
        errs.append("meta.speed phải là số > 0")
    chapters = doc.get("chapters")
    chap_ids: list[str] = []
    if not isinstance(chapters, list) or not chapters:
        errs.append("chapters phải là danh sách không rỗng")
    else:
        for i, c in enumerate(chapters):
            if not isinstance(c, dict) or not _nonempty(c.get("id")) or not _nonempty(c.get("title")):
                errs.append(f"chapters[{i}] cần id và title không rỗng")
            elif c["id"] in chap_ids:
                errs.append(f"chương {c['id']!r} bị trùng")
            else:
                chap_ids.append(c["id"])
    scenes = doc.get("scenes")
    if not isinstance(scenes, list) or not scenes:
        errs.append("scenes phải là danh sách không rỗng")
        return errs
    seen_s: set = set()
    seen_b: set = set()
    last_chap = -1
    for si, sc in enumerate(scenes):
        if not isinstance(sc, dict):
            errs.append(f"scenes[{si}] phải là object")
            continue
        sid = sc.get("id")
        if not _nonempty(sid):
            errs.append(f"scenes[{si}].id phải là chuỗi không rỗng")
        elif sid in seen_s:
            errs.append(f"cảnh {sid!r} bị trùng")
        seen_s.add(sid)
        t = sc.get("type")
        if not (isinstance(t, str) and (SCENE_TYPE_RE.match(t) or CUSTOM_RE.match(t))):
            errs.append(f"cảnh {sid!r}: type {t!r} không hợp lệ")
        ch = sc.get("chapter")
        if ch not in chap_ids:
            errs.append(f"cảnh {sid!r}: chapter {ch!r} không có trong chapters")
        else:
            k = chap_ids.index(ch)
            if k < last_chap:
                errs.append(f"cảnh {sid!r}: chương {ch!r} đi lùi so với cảnh trước")
            last_chap = max(last_chap, k)
        if "props" in sc and not isinstance(sc["props"], dict):
            errs.append(f"cảnh {sid!r}: props phải là object")
        if "sfx" in sc and sc["sfx"] is not None and not _nonempty(sc["sfx"]):
            errs.append(f"cảnh {sid!r}: sfx phải là chuỗi hoặc null")
        beats = sc.get("beats")
        if not isinstance(beats, list):
            errs.append(f"cảnh {sid!r}: beats phải là danh sách")
            continue
        hold = sc.get("holdMs", 0)
        if not _int(hold):
            errs.append(f"cảnh {sid!r}: holdMs phải là số nguyên >= 0")
        elif not beats and hold <= 0:
            errs.append(f"cảnh {sid!r}: cảnh không có beat cần holdMs > 0")
        for bi, b in enumerate(beats):
            if not isinstance(b, dict):
                errs.append(f"cảnh {sid!r}: beats[{bi}] phải là object")
                continue
            bid = b.get("id")
            if not _nonempty(bid):
                errs.append(f"cảnh {sid!r}: beats[{bi}].id phải là chuỗi không rỗng")
            elif bid in seen_b:
                errs.append(f"beat id {bid!r} bị trùng")
            seen_b.add(bid)
            text = b.get("text")
            if not _nonempty(text):
                errs.append(f"beat {bid!r}: text rỗng")
            else:
                if len(text) > 100:
                    errs.append(f"beat {bid!r}: text dài {len(text)} > 100 ký tự")
                if unicodedata.normalize("NFC", text) != text:
                    errs.append(f"beat {bid!r}: text không phải NFC")
            if b.get("spoken") is not None and not isinstance(b["spoken"], str):
                errs.append(f"beat {bid!r}: spoken phải là chuỗi hoặc null")
            if not _int(b.get("pause_ms", 0)):
                errs.append(f"beat {bid!r}: pause_ms phải là số nguyên >= 0")
            if b.get("cue") is not None and not _nonempty(b["cue"]):
                errs.append(f"beat {bid!r}: cue phải là chuỗi không rỗng hoặc null")
            if b.get("sfx") is not None and not _nonempty(b["sfx"]):
                errs.append(f"beat {bid!r}: sfx phải là chuỗi hoặc null")
            cl = b.get("claims", [])
            if not isinstance(cl, list) or not all(_nonempty(x) for x in cl):
                errs.append(f"beat {bid!r}: claims phải là danh sách chuỗi")
    return errs


# ---- timeline v2 ---------------------------------------------------------------

def validate_timeline2(doc, catalog=None, narration_seconds=None) -> list[str]:
    """Lỗi theo hợp đồng timeline v2 (mỗi lỗi bắt đầu `luật N:`); rỗng là hợp lệ."""
    errs: list[str] = []
    if not isinstance(doc, dict):
        return ["luật 1: timeline phải là object"]
    for key, want in (("version", 2), ("fps", FPS), ("width", WIDTH), ("height", HEIGHT)):
        v = doc.get(key)
        if isinstance(v, bool) or v != want:
            errs.append(f"luật 1: {key} phải bằng {want}, có {v!r}")
    total = doc.get("durationInFrames")
    if not _int(total, 1):
        errs.append("luật 2: durationInFrames phải là số nguyên >= 1")
        total = None
    if not _nonempty(doc.get("theme")):
        errs.append("luật 12: theme phải là chuỗi không rỗng")
    au = doc.get("audio")
    src = au.get("src") if isinstance(au, dict) else None
    if not _nonempty(src):
        errs.append("luật 12: audio.src phải là chuỗi không rỗng")
    elif src.startswith(("/", "\\")) or "://" in src or ".." in Path(src).parts:
        errs.append(f"luật 12: audio.src phải tương đối, có {src!r}")

    scenes = doc.get("scenes")
    first_of_chapter: dict = {}
    scene_ok = True
    if not isinstance(scenes, list) or not scenes:
        errs.append("luật 4: scenes phải là danh sách không rỗng")
        scenes = []
        scene_ok = False
    seen_s: set = set()
    seen_b: set = set()
    expect = 0
    for si, sc in enumerate(scenes):
        if not isinstance(sc, dict):
            errs.append(f"luật 3: scenes[{si}] phải là object")
            scene_ok = False
            continue
        sid = sc.get("id")
        if not _nonempty(sid):
            errs.append(f"luật 3: scenes[{si}].id phải là chuỗi không rỗng")
        elif sid in seen_s:
            errs.append(f"luật 3: cảnh {sid!r} bị trùng")
        seen_s.add(sid)
        t = sc.get("type")
        if not isinstance(t, str) or not t:
            errs.append(f"luật 3: cảnh {sid!r} thiếu type")
        elif not CUSTOM_RE.match(t):
            ok = (t in catalog) if catalog is not None else bool(SCENE_TYPE_RE.match(t))
            if not ok:
                errs.append(f"luật 3: cảnh {sid!r} type {t!r} không có trong catalog")
        if not isinstance(sc.get("props"), dict):
            errs.append(f"luật 3: cảnh {sid!r} props phải là object")
        s0, sd = sc.get("startFrame"), sc.get("durationFrames")
        if not (_int(s0) and _int(sd, 1)):
            errs.append(f"luật 2: cảnh {sid!r} startFrame phải là số nguyên >= 0, durationFrames >= 1")
            scene_ok = False
            continue
        if s0 != expect:
            errs.append(f"luật 4: cảnh {sid!r} bắt đầu {s0}, phải là {expect} (hở hoặc chồng)")
            scene_ok = False
        expect = s0 + sd
        ch = sc.get("chapter")
        if isinstance(ch, str):
            first_of_chapter.setdefault(ch, s0)
        beats = sc.get("beats")
        if not isinstance(beats, list):
            errs.append(f"luật 6: cảnh {sid!r} beats phải là danh sách")
            continue
        prev_end = s0
        for bi, b in enumerate(beats):
            if not isinstance(b, dict):
                errs.append(f"luật 6: cảnh {sid!r} beats[{bi}] phải là object")
                continue
            bid = b.get("id")
            if not _nonempty(bid):
                errs.append(f"luật 6: cảnh {sid!r} beats[{bi}].id phải là chuỗi không rỗng")
            elif bid in seen_b:
                errs.append(f"luật 6: beat id {bid!r} bị trùng")
            seen_b.add(bid)
            b0, bd = b.get("startFrame"), b.get("durationFrames")
            if not (_int(b0) and _int(bd, 1)):
                errs.append(f"luật 2: beat {bid!r} startFrame phải là số nguyên >= 0, durationFrames >= 1")
            else:
                if b0 < prev_end:
                    errs.append(f"luật 5: beat {bid!r} bắt đầu {b0} < {prev_end} (chồng hoặc không tăng dần)")
                if b0 + bd > s0 + sd:
                    errs.append(f"luật 5: beat {bid!r} vượt ra ngoài cảnh {sid!r}")
                prev_end = max(prev_end, b0 + bd)
            text = b.get("text")
            if not _nonempty(text):
                errs.append(f"luật 7: beat {bid!r} text rỗng")
            else:
                if len(text) > 100:
                    errs.append(f"luật 7: beat {bid!r} text dài {len(text)} > 100 ký tự")
                if unicodedata.normalize("NFC", text) != text:
                    errs.append(f"luật 7: beat {bid!r} text không phải NFC")
            if "cue" in b and not _nonempty(b["cue"]):
                errs.append(f"luật 8: beat {bid!r} cue phải là chuỗi không rỗng")
    if scene_ok and total is not None and expect != total:
        errs.append(f"luật 4: cảnh cuối kết thúc tại {expect}, durationInFrames là {total}")

    chapters = doc.get("chapters")
    chap_ids: set = set()
    if not isinstance(chapters, list) or not chapters:
        errs.append("luật 13: chapters phải là danh sách không rỗng")
    else:
        prev = -1
        for i, c in enumerate(chapters):
            if not isinstance(c, dict):
                errs.append(f"luật 9: chapters[{i}] phải là object")
                continue
            cid = c.get("id")
            if not _nonempty(cid):
                errs.append(f"luật 9: chapters[{i}].id phải là chuỗi không rỗng")
            elif cid in chap_ids:
                errs.append(f"luật 9: chương {cid!r} bị trùng")
            chap_ids.add(cid)
            if not _nonempty(c.get("title")):
                errs.append(f"luật 9: chương {cid!r} title rỗng")
            st = c.get("startFrame")
            if not _int(st):
                errs.append(f"luật 9: chương {cid!r} startFrame phải là số nguyên >= 0")
                continue
            if i == 0 and st != 0:
                errs.append(f"luật 9: chương đầu phải có startFrame 0, có {st}")
            if st <= prev:
                errs.append(f"luật 9: chương {cid!r} startFrame {st} không tăng dần")
            prev = st
            if scene_ok and isinstance(cid, str):
                if cid not in first_of_chapter:
                    errs.append(f"luật 9: chương {cid!r} không có cảnh nào")
                elif first_of_chapter[cid] != st:
                    errs.append(f"luật 9: chương {cid!r} startFrame {st} khác cảnh đầu của chương ({first_of_chapter[cid]})")
        for si, sc in enumerate(scenes):
            if isinstance(sc, dict) and sc.get("chapter") not in chap_ids:
                errs.append(f"luật 9: cảnh {sc.get('id')!r} có chapter {sc.get('chapter')!r} không nằm trong chapters")

    sfx = doc.get("sfx")
    if not isinstance(sfx, list):
        errs.append("luật 13: sfx phải có và là danh sách (được rỗng)")
    else:
        prev = -1
        for i, s in enumerate(sfx):
            if not isinstance(s, dict):
                errs.append(f"luật 10: sfx[{i}] phải là object")
                continue
            fr, g = s.get("frame"), s.get("gainDb")
            if not _int(fr) or (total is not None and fr >= total):
                errs.append(f"luật 10: sfx[{i}].frame phải là số nguyên trong [0, durationInFrames)")
            elif fr < prev:
                errs.append(f"luật 10: sfx[{i}].frame {fr} giảm so với {prev}")
            else:
                prev = fr
            if not _nonempty(s.get("name")):
                errs.append(f"luật 10: sfx[{i}].name rỗng")
            if isinstance(g, bool) or not isinstance(g, (int, float)) or g > 0:
                errs.append(f"luật 10: sfx[{i}].gainDb phải là số <= 0")

    if narration_seconds is not None and total is not None:
        want = math.ceil((narration_seconds + 0.5) * FPS)
        if total != want:
            errs.append(f"luật 11: durationInFrames {total}, theo wav phải là {want}")
    return errs


# ---- chương, SRT -----------------------------------------------------------------

def _clock(seconds: int, hours: bool) -> str:
    h, rem = divmod(seconds, 3600)
    m, s = divmod(rem, 60)
    return f"{h}:{m:02d}:{s:02d}" if hours else f"{m:02d}:{s:02d}"


def chapters_txt(timeline: dict) -> str:
    hours = timeline["durationInFrames"] >= 3600 * FPS
    return "".join(f"{_clock(c['startFrame'] // FPS, hours)} {c['title']}\n"
                   for c in timeline["chapters"])


def _chapter_warnings(timeline: dict) -> list[str]:
    out = []
    chs = timeline["chapters"]
    for i, c in enumerate(chs):
        end = chs[i + 1]["startFrame"] if i + 1 < len(chs) else timeline["durationInFrames"]
        if (end - c["startFrame"]) / FPS < MIN_CHAPTER_S:
            out.append(f"cảnh báo: chương {c['id']!r} < {MIN_CHAPTER_S} giây")
    return out


# ---- cache TTS an toàn khi bị ngắt -----------------------------------------------

def _wav_intact(path: Path) -> bool:
    """Header RIFF/data khớp đúng kích thước file; có ít nhất một mẫu."""
    size = path.stat().st_size
    with open(path, "rb") as f:
        head = f.read(12)
        if len(head) < 12 or head[:4] != b"RIFF" or head[8:12] != b"WAVE":
            return False
        if int.from_bytes(head[4:8], "little") + 8 != size:
            return False
        pos = 12
        while pos + 8 <= size:
            f.seek(pos)
            cid, n = f.read(4), int.from_bytes(f.read(4), "little")
            if cid == b"data":
                return n > 0 and pos + 8 + n == size
            pos += 8 + n + (n & 1)
    return False


def _synth_cached(cache_dir: Path, engine: str, voice: str, speed: float, spoken: str):
    """Như `audio._synth_cached` nhưng ghi file tạm rồi `os.replace`; cache đọc lỗi thì xoá và tổng hợp lại."""
    path = cache_dir / f"{audio._cache_key(engine, voice, speed, spoken)}.wav"
    if path.exists():
        try:
            if _wav_intact(path):
                wav, sr = sf.read(path, dtype="float32")
                if len(wav) > 0:
                    return wav.reshape(-1), sr
        except Exception:
            pass
        path.unlink(missing_ok=True)
    wav, sr = engines.synth(engine, spoken, voice, speed)
    cache_dir.mkdir(parents=True, exist_ok=True)
    tmp = path.with_name(path.name + f".{os.getpid()}.tmp")
    try:
        sf.write(tmp, wav, sr, subtype="FLOAT", format="WAV")
        os.replace(tmp, path)
    finally:
        tmp.unlink(missing_ok=True)
    return wav, sr


# ---- dựng -----------------------------------------------------------------------

def _load_json(path) -> object:
    return json.loads(Path(path).read_text(encoding="utf-8"))


def build_episode(slug: str, engine: str, voice: str | None = None, speed: float | None = None, *,
                  episodes_dir, out_dir, content_lexicon_path=None) -> dict:
    if slug != TEMPLATE_SLUG and not SLUG_RE.match(slug):
        raise ValueError(f"slug không hợp lệ: {slug!r}")
    if engine not in engines.ENGINES:
        raise ValueError(f"engine không hợp lệ: {engine!r}")
    ep_dir = Path(episodes_dir) / slug
    if not (ep_dir / "script.json").is_file():
        raise ValueError(f"không có {ep_dir / 'script.json'}")
    script = _load_json(ep_dir / "script.json")
    errs = validate_script(script)
    if errs:
        raise ValueError("script.json không hợp lệ: " + "; ".join(errs))
    meta = script["meta"]
    voice = voice or meta.get("voice")
    if not voice:
        raise ValueError("thiếu giọng: truyền --voice hoặc đặt meta.voice")
    speed = float(speed if speed is not None else meta.get("speed", 1.0))

    lexicon: dict[str, str] = {}
    if content_lexicon_path and Path(content_lexicon_path).is_file():
        lexicon.update(_load_json(content_lexicon_path))
    if (ep_dir / "lexicon.json").is_file():
        lexicon.update(_load_json(ep_dir / "lexicon.json"))

    out = Path(out_dir) / slug
    cache_dir = out / "cache"
    for stale in cache_dir.glob("*.tmp"):
        stale.unlink(missing_ok=True)

    chunks: list[np.ndarray] = []
    pos = 0  # mẫu hiện tại trong wav ghép
    # từng cảnh: [mẫu đầu, mẫu cuối) và danh sách beat (id, text, cue, mẫu đầu, mẫu cuối)
    scene_spans: list[dict] = []
    pending_pause = 0

    def add_silence(n: int) -> None:
        nonlocal pos
        if n > 0:
            chunks.append(np.zeros(n, dtype=np.float32))
            pos += n

    for sc in script["scenes"]:
        info = {"sc": sc, "start": pos, "beats": []}
        if sc["beats"]:
            for b in sc["beats"]:
                add_silence(pending_pause)
                b_start_after_pause = pos
                spoken = b.get("spoken")
                line = spoken if spoken else speak(b["text"], lexicon)
                raw, sr = _synth_cached(cache_dir, engine, voice, speed, line)
                wav = audio._filter_wav(raw, sr, audio.TRIM_FULL)
                chunks.append(wav)
                pos += len(wav)
                info["beats"].append((b, b_start_after_pause, pos))
                pending_pause = int(round(b.get("pause_ms", 0) * OUT_SR / 1000))
            info["start"] = info["beats"][0][1]
        else:
            add_silence(pending_pause)
            pending_pause = 0
            info["start"] = pos
            add_silence(int(round(sc.get("holdMs", 0) * OUT_SR / 1000)))
            info["end"] = pos
        scene_spans.append(info)

    joined = np.concatenate(chunks)
    final = audio.loudnorm(joined, OUT_SR)
    out.mkdir(parents=True, exist_ok=True)
    sf.write(out / "narration.wav", final, OUT_SR, subtype="PCM_16")
    total = math.ceil((len(final) / OUT_SR + 0.5) * FPS)

    def fr(sample: int) -> int:
        return round(sample / OUT_SR * FPS)

    scenes: list[dict] = []
    all_beats: list[dict] = []
    sfx: list[dict] = []
    for i, info in enumerate(scene_spans):
        sc = info["sc"]
        start = 0 if i == 0 else fr(info["start"])
        nxt = fr(scene_spans[i + 1]["start"]) if i + 1 < len(scene_spans) else total
        if nxt <= start:
            nxt = start + 1
        beats = []
        for b, a, z in info["beats"]:
            beat = {"id": b["id"], "startFrame": fr(a), "durationFrames": max(1, fr(z) - fr(a)),
                    "text": unicodedata.normalize("NFC", b["text"])}
            if b.get("cue"):
                beat["cue"] = b["cue"]
            beats.append(beat)
            all_beats.append(beat)
        scenes.append({"id": sc["id"], "chapter": sc["chapter"], "type": sc["type"],
                       "props": sc.get("props") or {}, "startFrame": start,
                       "durationFrames": nxt - start, "beats": beats})
        if sc.get("sfx"):
            sfx.append({"frame": start, "name": sc["sfx"], "gainDb": SFX_GAIN_DB})
        for (b, _, _), beat in zip(info["beats"], beats):
            if b.get("sfx"):
                sfx.append({"frame": beat["startFrame"], "name": b["sfx"], "gainDb": SFX_GAIN_DB})
    sfx.sort(key=lambda s: s["frame"])
    # nhắc: sfx cảnh nằm trước sfx beat cùng frame nhờ sắp ổn định

    first = {}
    for sc in scenes:
        first.setdefault(sc["chapter"], sc["startFrame"])
    chapters = [{"id": c["id"], "title": c["title"], "startFrame": first[c["id"]]}
                for c in script["chapters"] if c["id"] in first]

    timeline = {"version": 2, "fps": FPS, "width": WIDTH, "height": HEIGHT,
                "durationInFrames": total, "theme": meta["theme"],
                "audio": {"src": "narration.wav"}, "chapters": chapters, "sfx": sfx,
                "scenes": scenes}
    errs = validate_timeline2(timeline, catalog=CATALOG, narration_seconds=len(final) / OUT_SR)
    if errs:
        raise RuntimeError("timeline không hợp lệ: " + "; ".join(errs))
    (out / "timeline.json").write_text(
        json.dumps(timeline, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    audio.write_srt(all_beats, out / "video.srt")
    (out / "chapters.txt").write_text(chapters_txt(timeline), encoding="utf-8")
    for w in _chapter_warnings(timeline):
        print(w, file=sys.stderr)
    return timeline


# ---- CLI --------------------------------------------------------------------------

def main(argv: list[str] | None = None) -> int:
    try:
        return _main(argv)
    except (ValueError, RuntimeError, OSError, KeyError) as e:
        print(f"lỗi: {e}", file=sys.stderr)
        return 1


def _main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(prog="aivideo.episode")
    sub = ap.add_subparsers(dest="cmd", required=True)
    b = sub.add_parser("build")
    b.add_argument("slug")
    b.add_argument("--engine", required=True, choices=engines.ENGINES)
    b.add_argument("--voice")
    b.add_argument("--speed", type=float)
    b.add_argument("--episodes-dir", default="../episodes")
    b.add_argument("--out-dir", default="../out/episodes")
    b.add_argument("--lexicon", default="../content/lexicon.json")
    a = ap.parse_args(argv)
    tl = build_episode(a.slug, a.engine, a.voice, a.speed, episodes_dir=a.episodes_dir,
                       out_dir=a.out_dir, content_lexicon_path=a.lexicon)
    print(f"timeline: {tl['durationInFrames']} frame ({tl['durationInFrames'] / FPS:.1f} s)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
