"""Shorts dọc từ tập dài (đề mục 14, D28, D32, D33): kiểm `shorts.json`, cắt dữ liệu một phần, xuất cho TikTok.

Giao diện: .team/features/14-shorts-giao-dien.md
"""
from __future__ import annotations

import argparse
import json
import shutil
import sys
from pathlib import Path

import soundfile as sf

from aivideo.audio import write_srt

ROOT = Path(__file__).resolve().parents[3]
MIN_PARTS, MAX_PARTS = 1, 8
MAX_FRAMES = 5400  # 180 s ở 30 fps
WARN_FRAMES = 4500  # 150 s
MAX_HOOK = 40
MAX_TITLE = 100
TIKTOK_TAGS = "#tinhoc #khoahocmaytinh"
AI_LINE = "Giọng đọc trong video do AI tạo."


class ShortsError(RuntimeError):
    pass


def title_suffix(part: int, total: int) -> str:
    return f" (Phần {part}/{total}) #Shorts"


def load_shorts(path: Path) -> list[dict]:
    if not path.is_file():
        raise ShortsError(f"thiếu {path}")
    try:
        d = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        raise ShortsError(f"{path} không phải JSON: {e}") from e
    if not isinstance(d, dict) or not isinstance(d.get("shorts"), list):
        raise ShortsError(f"{path}: cần object có mảng `shorts`")
    return d["shorts"]


def _beats(timeline: dict) -> list[tuple[int, dict]]:
    """(chỉ số cảnh, beat) theo thứ tự timeline."""
    return [(i, b) for i, s in enumerate(timeline["scenes"]) for b in s["beats"]]


def scene_range(timeline: dict, frm: str, to: str) -> tuple[int, int]:
    """Chỉ số cảnh đầu và cuối (tính cả) của một phần. Cảnh đầu lùi qua các cảnh không có beat đứng ngay trước."""
    idx = {b["id"]: i for i, b in _beats(timeline)}
    if frm not in idx:
        raise ShortsError(f"không có beat {frm}")
    if to not in idx:
        raise ShortsError(f"không có beat {to}")
    a, b = idx[frm], idx[to]
    while a > 0 and not timeline["scenes"][a - 1]["beats"]:
        a -= 1
    return a, b


def clip_range(timeline: dict, frm: str, to: str) -> tuple[int, int]:
    """[start, end) theo frame: đầu cảnh đầu, cuối cảnh chứa `to`."""
    a, b = scene_range(timeline, frm, to)
    s0, s1 = timeline["scenes"][a], timeline["scenes"][b]
    return s0["startFrame"], s1["startFrame"] + s1["durationFrames"]


def validate(shorts: list, timeline: dict) -> tuple[list[str], list[str]]:
    """Trả (lỗi, cảnh báo). Cùng luật với `validateShorts` (TS), trừ kiểm `CUSTOM_SQUARE` (chỉ TS đọc được mã cảnh)."""
    errs: list[str] = []
    warns: list[str] = []
    n = len(shorts)
    if not MIN_PARTS <= n <= MAX_PARTS:
        errs.append(f"cần {MIN_PARTS}..{MAX_PARTS} phần, có {n}")
    pos = {b["id"]: k for k, (_, b) in enumerate(_beats(timeline))}
    prev_end = -1
    for i, e in enumerate(shorts, 1):
        w = f"phần {i}"
        if not isinstance(e, dict):
            errs.append(f"{w}: phải là object")
            continue
        if e.get("part") != i:
            errs.append(f"{w}: part phải là {i}, nhận {e.get('part')!r}")
        if e.get("total") != n:
            errs.append(f"{w}: total phải là {n}, nhận {e.get('total')!r}")
        hook, title = e.get("hook"), e.get("title")
        if not isinstance(hook, str) or not hook.strip() or len(hook) > MAX_HOOK:
            errs.append(f"{w}: hook phải có 1..{MAX_HOOK} ký tự")
        if not isinstance(title, str) or not title.strip():
            errs.append(f"{w}: title rỗng")
        elif len(title + title_suffix(i, n)) > MAX_TITLE:
            errs.append(f"{w}: tiêu đề kèm \"{title_suffix(i, n).strip()}\" dài quá {MAX_TITLE} ký tự")
        frm, to = e.get("from"), e.get("to")
        if frm not in pos or to not in pos:
            errs.append(f"{w}: from/to phải là id beat có trong timeline ({frm!r}, {to!r})")
            continue
        if pos[to] < pos[frm]:
            errs.append(f"{w}: beat {to} đứng trước {frm}")
            continue
        scenes = timeline["scenes"]
        sf_, st_ = next(s for s in scenes if any(b["id"] == frm for b in s["beats"])), \
            next(s for s in scenes if any(b["id"] == to for b in s["beats"]))
        if sf_["beats"][0]["id"] != frm:
            errs.append(f"{w}: {frm} không phải beat đầu của cảnh {sf_['id']}")
        if st_["beats"][-1]["id"] != to:
            errs.append(f"{w}: {to} không phải beat cuối của cảnh {st_['id']}")
        start, end = clip_range(timeline, frm, to)
        if start < prev_end:
            errs.append(f"{w}: chồng lên phần trước")
        prev_end = end
        length = end - start
        if length > MAX_FRAMES:
            errs.append(f"{w}: dài {length / 30:.1f} s, tối đa {MAX_FRAMES // 30} s")
        elif length > WARN_FRAMES:
            warns.append(f"{w}: dài {length / 30:.1f} s, nên dưới {WARN_FRAMES // 30} s")
    return errs, warns


def cut_timeline(timeline: dict, a: int, b: int) -> dict:
    """Timeline v2 hợp lệ của phần: cảnh a..b (tính cả), frame tính lại từ 0."""
    scenes = timeline["scenes"][a:b + 1]
    start = scenes[0]["startFrame"]
    end = scenes[-1]["startFrame"] + scenes[-1]["durationFrames"]
    shift = lambda f: f - start  # noqa: E731
    out_scenes = [{**s, "startFrame": shift(s["startFrame"]),
                   "beats": [{**x, "startFrame": shift(x["startFrame"])} for x in s["beats"]]} for s in scenes]
    used = []
    for s in out_scenes:
        if s["chapter"] not in used:
            used.append(s["chapter"])
    chapters = []
    for c in timeline["chapters"]:
        if c["id"] in used:
            first = next(s for s in out_scenes if s["chapter"] == c["id"])
            chapters.append({**c, "startFrame": first["startFrame"]})
    sfx = [{**x, "frame": shift(x["frame"])} for x in timeline.get("sfx", []) if start <= x["frame"] < end]
    return {**timeline, "durationInFrames": end - start, "scenes": out_scenes, "chapters": chapters, "sfx": sfx}


def _paths(slug: str, root: Path) -> tuple[Path, Path]:
    return root / "episodes" / slug, root / "out" / "episodes" / slug


def _load(slug: str, root: Path) -> tuple[list, dict]:
    ep, out = _paths(slug, root)
    tl_p = out / "timeline.json"
    if not tl_p.is_file():
        raise ShortsError(f"thiếu {tl_p} (chạy bước dựng tập trước)")
    return load_shorts(ep / "shorts.json"), json.loads(tl_p.read_text(encoding="utf-8"))


def entry(shorts: list, n: int) -> dict:
    if not 1 <= n <= len(shorts):
        raise ShortsError(f"không có phần {n} (shorts.json có {len(shorts)} phần)")
    return shorts[n - 1]


def cut(slug: str, n: int, root=ROOT) -> Path:
    """Ghi `<out>/shorts/<n>/`: `timeline.json`, `clip.json`, `narration.wav`, `video.srt`."""
    root = Path(root)
    shorts, timeline = _load(slug, root)
    errs, _ = validate(shorts, timeline)
    if errs:
        raise ShortsError("shorts.json không hợp lệ: " + "; ".join(errs))
    e = entry(shorts, n)
    a, b = scene_range(timeline, e["from"], e["to"])
    start, end = clip_range(timeline, e["from"], e["to"])
    tl = cut_timeline(timeline, a, b)
    _, out = _paths(slug, root)
    d = out / "shorts" / str(n)
    d.mkdir(parents=True, exist_ok=True)
    (d / "timeline.json").write_text(json.dumps(tl, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    clip = {"from": e["from"], "to": e["to"], "hook": e["hook"], "part": e["part"], "total": e["total"]}
    (d / "clip.json").write_text(json.dumps(clip, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    nar = out / "narration.wav"
    if not nar.is_file():
        raise ShortsError(f"thiếu {nar}")
    info = sf.info(str(nar))
    fps = timeline["fps"]
    s0, s1 = round(start * info.samplerate / fps), round(end * info.samplerate / fps)
    wav, sr = sf.read(str(nar), start=s0, stop=min(s1, info.frames), dtype="float32", always_2d=False)
    sf.write(str(d / "narration.wav"), wav, sr, subtype="FLOAT")
    write_srt([x for s in tl["scenes"] for x in s["beats"]], d / "video.srt", fps)
    return d


def tiktok_caption(e: dict, long_url: str | None, last: bool) -> str:
    lines = [f"{e['title']} (Phần {e['part']}/{e['total']})", "", e["hook"]]
    if long_url:
        lines += ["", f"Xem bản đầy đủ trên YouTube: {long_url}"]
    if last:
        lines += ["", "Các phần còn lại và bản đầy đủ có trên kênh YouTube của mình, ghé xem tiếp nhé."]
    lines += ["", TIKTOK_TAGS, AI_LINE]
    return "\n".join(lines) + "\n"


def parse_parts(s: str) -> tuple[int, int]:
    try:
        a, _, b = s.partition("-")
        lo, hi = int(a), int(b or a)
    except ValueError:
        raise ShortsError(f"--parts phải dạng a-b, nhận {s!r}") from None
    if lo < 1 or hi < lo:
        raise ShortsError(f"--parts không hợp lệ: {s}")
    return lo, hi


def export(slug: str, root=ROOT, parts: str = "1-3") -> Path:
    """Ghi `<out>/tiktok/`: `phan-<k>.mp4`, `phan-<k>.txt`, `manifest.json`."""
    from aivideo.upload import recorded_video_id, video_url

    root = Path(root)
    ep, out = _paths(slug, root)
    shorts = load_shorts(ep / "shorts.json")
    lo, hi = parse_parts(parts)
    if hi > len(shorts):
        raise ShortsError(f"--parts {parts} vượt số phần trong shorts.json ({len(shorts)})")
    for k in range(lo, hi + 1):
        mp4 = out / f"{slug}-short-{k}.mp4"
        if not mp4.is_file():
            raise ShortsError(f"thiếu {mp4}")
    vid = recorded_video_id(ep)
    url = video_url(vid) if vid else None
    d = out / "tiktok"
    d.mkdir(parents=True, exist_ok=True)
    items = []
    for k in range(lo, hi + 1):
        mp4, txt = d / f"phan-{k}.mp4", d / f"phan-{k}.txt"
        shutil.copyfile(out / f"{slug}-short-{k}.mp4", mp4)
        txt.write_text(tiktok_caption(shorts[k - 1], url, k == hi), encoding="utf-8")
        items.append({"part": k, "mp4": mp4.name, "caption": txt.name})
    (d / "manifest.json").write_text(json.dumps({"slug": slug, "parts": items}, ensure_ascii=False, indent=2) + "\n",
                                     encoding="utf-8")
    return d


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(prog="aivideo.shorts")
    sub = ap.add_subparsers(dest="cmd", required=True)
    v = sub.add_parser("validate")
    v.add_argument("slug")
    c = sub.add_parser("cut")
    c.add_argument("slug")
    c.add_argument("n", type=int)
    x = sub.add_parser("export")
    x.add_argument("slug")
    x.add_argument("--parts", default="1-3")
    for p in (v, c, x):
        p.add_argument("--root", default=str(ROOT))
    a = ap.parse_args(argv)
    try:
        if a.cmd == "validate":
            shorts, timeline = _load(a.slug, Path(a.root))
            errs, warns = validate(shorts, timeline)
            for w in warns:
                print(f"cảnh báo: {w}")
            for e in errs:
                print(f"lỗi: {e}", file=sys.stderr)
            if errs:
                return 1
            for i, e in enumerate(shorts, 1):
                s, t = clip_range(timeline, e["from"], e["to"])
                print(f"phần {i}/{len(shorts)}: frame {s}-{t} ({(t - s) / 30:.1f} s)")
            return 0
        if a.cmd == "cut":
            print(f"cắt: {cut(a.slug, a.n, a.root)}")
            return 0
        print(f"xuất TikTok: {export(a.slug, a.root, a.parts)}")
        return 0
    except (ShortsError, OSError, KeyError, ValueError) as e:
        print(f"lỗi: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
