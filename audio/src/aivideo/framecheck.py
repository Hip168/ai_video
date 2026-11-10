"""Kiểm mất hình khi render tập dài (D14, D23, đề mục 10).

Hai bước, không dựa vào việc so hai lần render cùng dải (cùng dải có thể cùng mất hình):
1. `scan`: quét từng khung trong MỘT video, báo khung mà số điểm khác nền tụt rồi hồi lại trong tối đa 2 khung.
2. `compare`: so từng khung với bản render ranh giới đoạn lệch (`--layout shift`), chỉ tính khi lệch cả một vùng liền khối.
Ý lấy từ ai_video_spike/scripts/detect_blip.py và cmp_frames.py. Giao diện: .team/features/10-render-dai-giao-dien.md
"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Iterator

import numpy as np

ROOT = Path(__file__).resolve().parents[3]
W, FH = 960, 415  # vùng y < 830 của 1920x1080, nửa độ phân giải
LEVEL = 40  # ngưỡng chênh mức xám khi so hai khung
COUNT_LEVEL = 80  # ngưỡng "khác nền" khi đếm: bỏ hoạ tiết nền mờ (vòng, lưới) đang nhấp nhô
MIN_DROP, REL_DROP = 25, 0.04
MIN_TOL, REL_TOL = 20, 0.05
MAX_DIP = 2
MIN_REGION = 30  # số điểm còn lại sau bào mòn 3x3
MAX_REDO = 3
IGNORE_BEFORE, IGNORE_AFTER = 2, 12  # quanh đầu cảnh, cuối cảnh và cue


def _cmd(src: Path | list[Path], start: int, count: int | None, tmp: Path | None) -> list[str]:
    inp = ["-i", str(src)]
    if isinstance(src, list):
        lst = tmp / "list.txt"
        lst.write_text("".join(f"file '{Path(p).resolve().as_posix()}'\n" for p in src), encoding="utf-8")
        inp = ["-f", "concat", "-safe", "0", "-i", str(lst)]
    vf = []
    if start:
        vf.append(f"select='gte(n\\,{start})'")
    vf += ["crop=1920:830:0:0", f"scale={W}:{FH}:flags=area", "format=gray"]
    cmd = ["ffmpeg", "-v", "error", *inp, "-vf", ",".join(vf), "-vsync", "0"]
    if count is not None:
        cmd += ["-frames:v", str(count)]
    return cmd + ["-f", "rawvideo", "-pix_fmt", "gray", "-"]


def read_frames(src: Path | list[Path], start: int = 0, count: int | None = None) -> Iterator[np.ndarray]:
    """Từng khung xám 415x960 của vùng hình chính. `src` là một file hoặc danh sách file ghép liền."""
    for f in (src if isinstance(src, list) else [src]):
        if not Path(f).is_file():
            raise RuntimeError(f"không có file video: {f}")
    with tempfile.TemporaryDirectory() as td:
        p = subprocess.Popen(_cmd(src, start, count, Path(td)), stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                             stdin=subprocess.DEVNULL)
        size = W * FH
        n = 0
        eof = False
        try:
            while True:
                raw = p.stdout.read(size)
                if len(raw) < size:
                    eof = True
                    break
                n += 1
                yield np.frombuffer(raw, dtype=np.uint8).reshape(FH, W)
        finally:
            p.stdout.close()
            if not eof:
                p.kill()
            err = p.stderr.read().decode(errors="replace").strip()
            p.stderr.close()
            rc = p.wait()
        if n == 0 or (rc != 0 and not err == ""):
            raise RuntimeError(f"không đọc được khung hình từ {src}: {err[-200:] or 'không có khung nào'}")


def ignore_frames(timeline: dict | None) -> set[int]:
    """Khung bỏ qua: quanh đầu cảnh, cuối cảnh và beat có cue (chuyển động hợp lệ)."""
    out: set[int] = set()
    if not timeline:
        return out
    for sc in timeline.get("scenes", []):
        s, e = sc["startFrame"], sc["startFrame"] + sc["durationFrames"]
        out.update(range(s - IGNORE_BEFORE, s + IGNORE_AFTER))
        out.update(range(e - IGNORE_AFTER, e + IGNORE_BEFORE))
        for b in sc.get("beats", []):
            if b.get("cue"):
                out.update(range(b["startFrame"] - IGNORE_BEFORE, b["startFrame"] + IGNORE_AFTER))
    return out


def count_series(frames: Iterator[np.ndarray]) -> list[int]:
    """Mỗi khung: số điểm khác màu nền (nền = mức xám phổ biến nhất)."""
    c = []
    for f in frames:
        bg = int(np.bincount(f.ravel(), minlength=256).argmax())
        c.append(int((np.abs(f.astype(np.int16) - bg) > COUNT_LEVEL).sum()))
    return c


def find_dips(c: list[int], ignore: set[int] = frozenset(), offset: int = 0) -> list[dict]:
    hits = []
    n = len(c)
    i = 1
    while i < n - 1:
        ref = c[i - 1]
        drop = max(MIN_DROP, REL_DROP * ref)
        tol = max(MIN_TOL, REL_TOL * ref)
        found = 0
        for k in range(1, MAX_DIP + 1):
            if i + k >= n:
                break
            if c[i + k - 1] > ref - drop:
                break
            if abs(c[i + k] - ref) <= tol:
                found = k
                break
        if found and not any(j in ignore for j in range(i, i + found)):
            hits.append({"frame": i + offset, "from": ref, "to": c[i], "length": found})
            i += found
        i += 1
    return hits


def scan(src: Path | list[Path], timeline: dict | None = None, start: int = 0) -> list[dict]:
    ignore = {j - start for j in ignore_frames(timeline)}
    return find_dips(count_series(read_frames(src)), ignore, start)


def _erode3(m: np.ndarray) -> np.ndarray:
    r = m[1:-1, 1:-1].copy()
    for dy in (0, 1, 2):
        for dx in (0, 1, 2):
            r &= m[dy:dy + m.shape[0] - 2, dx:dx + m.shape[1] - 2]
    return r


def region_size(a: np.ndarray, b: np.ndarray) -> int:
    """Số điểm của các vùng lệch liền khối đủ dày (bào mòn 3x3 loại nét mảnh do lệch nửa điểm ảnh ở chữ)."""
    diff = np.abs(a.astype(np.int16) - b.astype(np.int16)) > LEVEL
    return int(_erode3(diff).sum())


def compare(a: Path | list[Path], b: Path | list[Path], start_a: int = 0, start_b: int = 0,
            count: int | None = None, offset: int = 0) -> list[dict]:
    hits = []
    for i, (fa, fb) in enumerate(zip(read_frames(a, start_a, count), read_frames(b, start_b, count))):
        n = region_size(fa, fb)
        if n >= MIN_REGION:
            hits.append({"frame": i + offset, "points": n})
    return hits


# ---- verify -------------------------------------------------------------------

def _manifest(d: Path) -> dict:
    return json.loads((d / "manifest.json").read_text(encoding="utf-8"))


def _render(slug: str, root: Path, layout: str, redo: list[str]) -> None:
    cmd = ["npx", "tsx", "scripts/render-episode.ts", slug, "--root", str(root), "--layout", layout]
    if redo:
        cmd += ["--redo", ",".join(redo)]
    r = subprocess.run(cmd, cwd=ROOT / "video")  # ứng dụng video/ theo vị trí mã, --root chỉ là gốc dữ liệu
    if r.returncode != 0:
        raise RuntimeError(f"render lại lỗi (mã {r.returncode}): {' '.join(cmd)}")


def _segment_of(segs: list[dict], frame: int) -> str:
    for s in segs:
        if s["startFrame"] <= frame <= s["endFrame"]:
            return s["id"]
    raise ValueError(f"khung {frame} ngoài mọi đoạn")


def _files(d: Path, segs: list[dict]) -> list[Path]:
    return [d / s["file"] for s in segs]


def verify(slug: str, root=ROOT, log=print) -> None:
    root = Path(root)
    d = root / "out" / "episodes" / slug
    timeline = json.loads((d / "timeline.json").read_text(encoding="utf-8"))
    redo_count: dict[str, int] = {}

    def redo(layout: str, ids: set[str]) -> None:
        for i in sorted(ids):
            key = f"{layout}:{i}"
            redo_count[key] = redo_count.get(key, 0) + 1
            if redo_count[key] > MAX_REDO:
                raise RuntimeError(f"đoạn {i} ({layout}) vẫn lỗi sau {MAX_REDO} lần render lại")
        log(f"render lại {layout}: {', '.join(sorted(ids))}")
        _render(slug, root, layout, sorted(ids))

    def segs(layout: str) -> list[dict]:
        s = _manifest(d).get("layouts", {}).get(layout)
        if not s or any(x.get("status") != "done" for x in s):
            raise RuntimeError(f"manifest chưa có đủ đoạn {layout} đã xong")
        return s

    def clean_scan(layout: str) -> None:
        while True:
            s = segs(layout)
            hits = scan(_files(d, s), timeline)
            if not hits:
                log(f"quét {layout}: sạch")
                return
            for h in hits:
                log(f"đột biến ({layout}): khung {h['frame']} (c từ {h['from']} còn {h['to']})")
            try:
                redo(layout, {_segment_of(s, h["frame"]) for h in hits})
            except RuntimeError as e:
                raise RuntimeError(f"{e}; khung {', '.join(str(h['frame']) for h in hits)}")

    clean_scan("main")
    _render(slug, root, "shift", [])
    clean_scan("shift")
    while True:
        m, s = segs("main"), segs("shift")
        diffs = compare(_files(d, m), _files(d, s))
        if not diffs:
            log("so lượt hai: sạch")
            break
        for h in diffs[:20]:
            log(f"lệch: khung {h['frame']} ({h['points']} điểm)")
        try:
            redo("main", {_segment_of(m, h["frame"]) for h in diffs})
            redo("shift", {_segment_of(s, h["frame"]) for h in diffs})
        except RuntimeError as e:
            raise RuntimeError(f"{e}; khung lệch {', '.join(str(h['frame']) for h in diffs[:20])}")
        clean_scan("main")
        clean_scan("shift")


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(prog="aivideo.framecheck")
    sub = ap.add_subparsers(dest="cmd", required=True)
    s = sub.add_parser("scan")
    s.add_argument("mp4")
    s.add_argument("--start", type=int, default=0)
    s.add_argument("--timeline")
    c = sub.add_parser("compare")
    c.add_argument("a")
    c.add_argument("b")
    c.add_argument("--start-a", type=int, default=0)
    c.add_argument("--start-b", type=int, default=0)
    c.add_argument("--count", type=int)
    v = sub.add_parser("verify")
    v.add_argument("slug")
    v.add_argument("--root", default=str(ROOT))
    a = ap.parse_args(argv)
    try:
        if a.cmd == "scan":
            tl = json.loads(Path(a.timeline).read_text(encoding="utf-8")) if a.timeline else None
            hits = scan(Path(a.mp4), tl, a.start)
            for h in hits:
                print(f"đột biến: khung {h['frame']} (c từ {h['from']} còn {h['to']})")
            print(f"scan: {len(hits)} đột biến")
            return 1 if hits else 0
        if a.cmd == "compare":
            hits = compare(Path(a.a), Path(a.b), a.start_a, a.start_b, a.count, a.start_a)
            for h in hits:
                print(f"lệch: khung {h['frame']} ({h['points']} điểm)")
            print(f"compare: {len(hits)} khung lệch")
            return 1 if hits else 0
        verify(a.slug, a.root)
        print("framecheck: ĐẠT")
        return 0
    except (RuntimeError, OSError, ValueError, KeyError) as e:
        print(f"LỖI: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
