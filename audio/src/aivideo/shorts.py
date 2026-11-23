"""Shorts dọc từ tập dài (đề mục 14, D28, D32, D33): kiểm `shorts.json`, cắt dữ liệu một phần, xuất cho TikTok.

Giao diện: .team/features/14-shorts-giao-dien.md
"""
from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

import soundfile as sf

from aivideo import outro
from aivideo.audio import write_srt

ROOT = Path(__file__).resolve().parents[3]
MIN_PARTS, MAX_PARTS = 1, 8
MAX_FRAMES = 5400  # 180 s ở 30 fps
WARN_FRAMES = 4500  # 150 s
MAX_HOOK = 40
MAX_TITLE = 100
TIKTOK_TAGS = "#tinhoc"  # thẻ chủ đề mặc định
TIKTOK_TAIL = "#hoccungtiktok"
TIKTOK_MAX_TAGS = 4  # D43: dòng hashtag 3–4 thẻ
TIKTOK_MAX_PART = 3  # D43: TikTok chỉ dùng Short phần 1–3
TIKTOK_QUESTION = "Bạn đã biết chuyện này chưa?"
AI_LINE = "Giọng đọc trong video do AI tạo."
NEXT_LINE = "Theo dõi để xem phần tiếp."
FULL_LINE = "Các phần còn lại và bản đầy đủ: link ở bio nha."


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
    if outro.wanted(slug, root, n) and end - start + outro.frames() > MAX_FRAMES:
        raise ShortsError(f"phần {n} kèm đoạn kết dài {(end - start + outro.frames()) / 30:.1f} s, "
                          f"tối đa {MAX_FRAMES // 30} s")
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


def render_relabeled(slug: str, root: Path, items: list[dict], n: int, work: Path) -> Path:
    """Render phần n của `items` (các phần xuất, đã đánh số lại part/total) trong gốc tạm `work`; không ghi vào
    `<out>/shorts/`. Cùng các bước của `make-episode.sh --short`: cắt, trộn tiếng, render, kiểm mất hình, ghép, kiểm MP4."""
    from aivideo import assemble, framecheck, mix

    ep, out = _paths(slug, root)
    wep, wout = _paths(slug, work)
    if not wep.is_dir():
        wep.mkdir(parents=True)
        wout.mkdir(parents=True)
        for src, dst in ((ep / "script.json", wep / "script.json"), (root / "assets", work / "assets"),
                         (out / "timeline.json", wout / "timeline.json"), (out / "narration.wav", wout / "narration.wav")):
            if src.exists():
                os.symlink(src.resolve(), dst)
        (wep / "shorts.json").write_text(json.dumps({"version": 1, "shorts": items}, ensure_ascii=False) + "\n",
                                         encoding="utf-8")
    cut(slug, n, work)
    mix.run_episode(slug, work, short=n)
    r = subprocess.run(["npx", "tsx", "scripts/render-episode.ts", slug, "--root", str(work), "--short", str(n)],
                       cwd=ROOT / "video")
    if r.returncode != 0:
        raise ShortsError(f"render phần {n}/{len(items)} cho TikTok lỗi (mã {r.returncode})")
    framecheck.verify(slug, work, short=n)
    assemble.concat(slug, work, n, outro=False)  # TikTok không gắn đoạn kết (D38)
    mp4 = assemble.mux(slug, work, n)
    assemble.verify(slug, work, n)
    return mp4


def episode_number(root: Path, slug: str) -> int:
    """Số tập = thứ tự (từ 1) của tập trong `episodes/index.json` (D35)."""
    idx = Path(root) / "episodes" / "index.json"
    if not idx.is_file():
        raise ShortsError(f"thiếu {idx}")
    slugs = [e.get("slug") for e in json.loads(idx.read_text("utf-8"))]
    if slug not in slugs:
        raise ShortsError(f"{slug} không có trong {idx}")
    return slugs.index(slug) + 1


def tiktok_caption(e: dict, ep_no: int, last: bool) -> str:
    """Caption TikTok theo khuôn D43 (LUAT/con-bit.md §7), các đoạn cách nhau một dòng trống:
    `#conbit<n> <tiêu đề>` (không "(Phần k/N)"), đoạn mở, dòng giọng AI, lời mời theo dõi (phần cuối: link ở bio),
    câu hỏi mời bình luận (dòng chữ cuối), dòng hashtag 3–4 thẻ `#conbit<n> #conbit #<chủ đề>` [+ `#hoccungtiktok`].
    Không URL, không nhắc YouTube.

    Chữ riêng cho TikTok đặt ở khoá tuỳ chọn `tiktok` của mục `shorts.json`: `title`, `intro`, `question`, `tags`
    (thẻ chủ đề); thiếu thì dùng `title`, `hook` của mục, câu hỏi mặc định, thẻ chủ đề mặc định."""
    t = e.get("tiktok") or {}
    base = [f"#conbit{ep_no}", "#conbit"]
    topic = [x for x in (t.get("tags") or TIKTOK_TAGS).split() if x not in base and x != TIKTOK_TAIL]
    tags = base + topic[:TIKTOK_MAX_TAGS - len(base)]
    if len(tags) < TIKTOK_MAX_TAGS:
        tags.append(TIKTOK_TAIL)
    lines = [f"#conbit{ep_no} {t.get('title') or e['title']}", "", t.get("intro") or e["hook"], "", AI_LINE,
             "", FULL_LINE if last else NEXT_LINE, "", t.get("question") or TIKTOK_QUESTION, "", " ".join(tags)]
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


def export(slug: str, root=ROOT, parts: str = "1-3", render=render_relabeled, endcard: bool = True,
           append=None) -> Path:
    """Ghi `<out>/tiktok/`: `phan-<k>.mp4`, `phan-<k>.txt`, `manifest.json`. Chỉ phần 1–`TIKTOK_MAX_PART` (D43).

    Tập từ số `tiktok_endcard.FROM_EPISODE` (D42): mỗi phần nối thêm thẻ kết chữ (không giọng) bằng
    `append(slug, root, src, dst)` (mặc định `tiktok_endcard.append`); `endcard=False` thì bỏ. Tập trước đó chép như cũ.

    Nhãn "Phần i/m" theo dải xuất (i = vị trí trong dải, m = số phần xuất). Trùng nhãn của Short YouTube thì
    `phan-<k>.mp4` là bản sao `<slug>-short-<k>.mp4`, khác thì render lại bằng `render`."""
    root = Path(root)
    ep, out = _paths(slug, root)
    shorts = load_shorts(ep / "shorts.json")
    lo, hi = parse_parts(parts)
    if hi > len(shorts):
        raise ShortsError(f"--parts {parts} vượt số phần trong shorts.json ({len(shorts)})")
    if hi > TIKTOK_MAX_PART:
        raise ShortsError(f"--parts {parts}: TikTok chỉ dùng Short phần 1–{TIKTOK_MAX_PART} (D43)")
    for k in range(lo, hi + 1):
        mp4 = out / f"{slug}-short-{k}.mp4"
        if not mp4.is_file():
            raise ShortsError(f"thiếu {mp4}")
    ep_no = episode_number(root, slug)
    from aivideo import tiktok_endcard
    if append is None:
        append = lambda s, r, src, dst: tiktok_endcard.append(s, src, dst, r)  # noqa: E731
    card = endcard and tiktok_endcard.wanted(ep_no)
    d = out / "tiktok"
    d.mkdir(parents=True, exist_ok=True)
    sel = [{**e, "part": i, "total": hi - lo + 1} for i, e in enumerate(shorts[lo - 1:hi], 1)]
    work = d / ".work"
    shutil.rmtree(work, ignore_errors=True)
    items = []
    try:
        for k, e in zip(range(lo, hi + 1), sel):
            mp4, txt = d / f"phan-{k}.mp4", d / f"phan-{k}.txt"
            src = out / f"{slug}-short-{k}.mp4"
            # Short YouTube có đoạn kết thì render lại bản không có đoạn kết cho TikTok (D38).
            if (e["part"], e["total"]) != (shorts[k - 1]["part"], shorts[k - 1]["total"]) \
                    or outro.wanted(slug, root, k):
                src = render(slug, root, sel, e["part"], work)
            if card:
                append(slug, root, src, mp4)
            else:
                shutil.copyfile(src, mp4)
            q = (e.get("tiktok") or {}).get("question")
            if q and not q.rstrip().endswith("?"):
                print(f"cảnh báo: phần {k}: câu hỏi TikTok nên là dòng chữ cuối kết bằng \"?\" (D43): {q}",
                      file=sys.stderr)
            txt.write_text(tiktok_caption(e, ep_no, k == hi), encoding="utf-8")
            items.append({"part": k, "mp4": mp4.name, "caption": txt.name,
                          **({"endcard": tiktok_endcard.text()} if card else {})})
    finally:
        shutil.rmtree(work, ignore_errors=True)
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
    x.add_argument("--no-endcard", action="store_true", help="không gắn thẻ kết chữ (D42) dù tập từ số 5")
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
        print(f"xuất TikTok: {export(a.slug, a.root, a.parts, endcard=not a.no_endcard)}")
        return 0
    except (ShortsError, RuntimeError, OSError, KeyError, ValueError) as e:  # RuntimeError: thẻ kết, đoạn kết
        print(f"lỗi: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
