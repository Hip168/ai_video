"""Ghép đoạn, gắn tiếng, kiểm MP4 và dọn tập dài (đề mục 10, D18).

Giao diện: .team/features/10-render-dai-giao-dien.md
"""
from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

from aivideo.audio import measure_lufs
from aivideo.framecheck import scan
from aivideo.mix import true_peak

ROOT = Path(__file__).resolve().parents[3]
LUFS_TOL = 1.0
TP_MAX = -1.0  # AAC có thể vượt nhẹ so với mix (-1,5)
BLACK_MIN_S = 0.5
DEFAULT_MIN_FREE_GB = 6.0
EXIT_DISK = 3

REMOVE = ("segments", "segments-shift", "mix.wav", "mix.voice.wav", "mix.music.wav", "video.silent.mp4")


class DiskError(RuntimeError):
    pass


def free_gb(path: Path) -> float:
    forced = os.environ.get("AIVIDEO_FREE_GB")
    if forced not in (None, ""):
        try:
            return float(forced)
        except ValueError:
            pass
    path.mkdir(parents=True, exist_ok=True)
    return shutil.disk_usage(path).free / 1024**3


def min_free_gb() -> float:
    try:
        return float(os.environ["AIVIDEO_MIN_FREE_GB"])
    except (KeyError, ValueError):
        return DEFAULT_MIN_FREE_GB


def check_disk(path: Path) -> None:
    free, need = free_gb(path), min_free_gb()
    if free < need:
        raise DiskError(f"đĩa trống {free:.1f} GB < {need:g} GB")


def _run(cmd: list[str]) -> str:
    p = subprocess.run(cmd, capture_output=True, text=True, stdin=subprocess.DEVNULL)
    if p.returncode != 0:
        raise RuntimeError(f"{cmd[0]} lỗi: {p.stderr.strip()[-400:]}")
    return p.stdout + p.stderr


def probe_frames(path: Path) -> int:
    if not path.is_file():
        return -1
    p = subprocess.run(
        ["ffprobe", "-v", "error", "-count_frames", "-select_streams", "v:0",
         "-show_entries", "stream=nb_read_frames", "-of", "csv=p=0", str(path)],
        capture_output=True, text=True, stdin=subprocess.DEVNULL)
    try:
        return int(p.stdout.strip())
    except ValueError:
        return -1


def probe_streams(path: Path) -> dict:
    out = _run(["ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", str(path)])
    return json.loads(out[out.index("{"):out.rindex("}") + 1])


def out_dir(slug: str, root: Path) -> Path:
    return Path(root) / "out" / "episodes" / slug


def load_manifest(d: Path) -> dict:
    f = d / "manifest.json"
    if not f.is_file():
        raise RuntimeError(f"thiếu {f} (chạy render-episode.ts trước)")
    return json.loads(f.read_text(encoding="utf-8"))


def save_manifest(d: Path, m: dict) -> None:
    tmp = d / "manifest.json.tmp"
    tmp.write_text(json.dumps(m, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    os.replace(tmp, d / "manifest.json")


def concat(slug: str, root=ROOT) -> Path:
    d = out_dir(slug, Path(root))
    check_disk(d)
    m = load_manifest(d)
    segs = (m.get("layouts") or {}).get("main")
    if not segs:
        raise RuntimeError("manifest chưa có đoạn main")
    pos = 0
    for s in segs:
        f = d / s["file"]
        if s.get("status") != "done":
            raise RuntimeError(f"đoạn {s['id']} chưa xong (trạng thái {s.get('status')})")
        if s["startFrame"] != pos:
            raise RuntimeError(f"đoạn {s['id']} bắt đầu {s['startFrame']}, cần {pos} (hở hoặc chồng)")
        n = probe_frames(f)
        if n != s["frames"]:
            raise RuntimeError(f"đoạn {s['id']} có {n} frame, cần {s['frames']}")
        pos += s["frames"]
    if pos != m["durationInFrames"]:
        raise RuntimeError(f"các đoạn tổng {pos} frame, timeline {m['durationInFrames']}")
    lst = d / "segments.txt"
    lst.write_text("".join(f"file '{(d / s['file']).as_posix()}'\n" for s in segs), encoding="utf-8")
    out = d / "video.silent.mp4"
    tmp = d / "video.silent.part.mp4"
    try:
        _run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", str(lst), "-c", "copy",
              "-movflags", "+faststart", str(tmp)])
        n = probe_frames(tmp)
        if n != m["durationInFrames"]:
            raise RuntimeError(f"video ghép có {n} frame, cần {m['durationInFrames']}")
        os.replace(tmp, out)
    finally:
        tmp.unlink(missing_ok=True)
        lst.unlink(missing_ok=True)
    m.setdefault("assembled", {})["silent"] = out.name
    save_manifest(d, m)
    return out


def mux(slug: str, root=ROOT) -> Path:
    d = out_dir(slug, Path(root))
    check_disk(d)
    silent, wav = d / "video.silent.mp4", d / "mix.wav"
    for f in (silent, wav):
        if not f.is_file() or f.stat().st_size == 0:
            raise RuntimeError(f"thiếu {f}")
    m = load_manifest(d)
    out = d / f"{slug}.mp4"
    tmp = d / f"{slug}.part.mp4"
    try:
        _run(["ffmpeg", "-v", "error", "-y", "-i", str(silent), "-i", str(wav), "-map", "0:v:0", "-map", "1:a:0",
              "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", str(tmp)])
        os.replace(tmp, out)
    finally:
        tmp.unlink(missing_ok=True)
    m.setdefault("assembled", {})["final"] = out.name
    save_manifest(d, m)
    return out


def _black_runs(path: Path) -> list[tuple[float, float]]:
    log = _run(["ffmpeg", "-v", "info", "-i", str(path), "-vf", f"blackdetect=d={BLACK_MIN_S}:pix_th=0.02",
                "-an", "-f", "null", "-"])
    return [(float(a), float(b)) for a, b in re.findall(r"black_start:([\d.]+) black_end:([\d.]+)", log)]


def verify(slug: str, root=ROOT) -> dict:
    d = out_dir(slug, Path(root))
    f = d / f"{slug}.mp4"
    if not f.is_file() or f.stat().st_size == 0:
        raise RuntimeError(f"thiếu {f}")
    want = load_manifest(d)["durationInFrames"]
    info = probe_streams(f)
    v = next((s for s in info["streams"] if s["codec_type"] == "video"), None)
    a = next((s for s in info["streams"] if s["codec_type"] == "audio"), None)
    checks: dict = {}
    errs: list[str] = []

    def put(name: str, value, ok: bool, why: str) -> None:
        checks[name] = {"value": value, "ok": ok}
        if not ok:
            errs.append(why)

    if v is None:
        put("video", None, False, "không có luồng hình")
    else:
        put("codec", v.get("codec_name"), v.get("codec_name") == "h264", f"codec hình {v.get('codec_name')}, cần h264")
        put("pix_fmt", v.get("pix_fmt"), v.get("pix_fmt") == "yuv420p", f"pix_fmt {v.get('pix_fmt')}, cần yuv420p")
        size = (v.get("width"), v.get("height"))
        put("size", list(size), size == (1920, 1080), f"kích thước {size[0]}x{size[1]}, cần 1920x1080")
        put("fps", v.get("r_frame_rate"), v.get("r_frame_rate") == "30/1", f"fps {v.get('r_frame_rate')}, cần 30")
        n = probe_frames(f)
        put("frames", n, n == want, f"{n} frame, cần {want}")
    if a is None:
        put("audio", None, False, "không có luồng âm thanh")
    else:
        put("audio_codec", a.get("codec_name"), a.get("codec_name") == "aac", f"codec tiếng {a.get('codec_name')}, cần aac")
        lufs, tp = measure_lufs(f), true_peak(f)
        put("lufs", lufs, abs(lufs - -16) <= LUFS_TOL, f"loudness {lufs} LUFS, cần -16 ±{LUFS_TOL}")
        put("true_peak", tp, tp <= TP_MAX, f"true peak {tp} dBTP vượt {TP_MAX}")
        if v is not None:
            vd, ad = float(v.get("duration", 0) or 0), float(a.get("duration", 0) or 0)
            put("av_gap_s", round(ad - vd, 3), abs(ad - vd) <= 1 / 30 + 0.02, f"tiếng lệch hình {ad - vd:.3f} s")
    runs = _black_runs(f) if v is not None else []
    put("black", runs, not runs, f"có đoạn đen liền ≥ {BLACK_MIN_S}s tại {runs[:3]} (mất hình)")
    if v is not None and size == (1920, 1080):
        # blackdetect chỉ bắt khung đen; khung chỉ còn nền theme (độ sáng ~0,06–0,07) do framecheck scan bắt.
        # scan cắt vùng 1920x830 nên chỉ chạy khi đúng kích thước (sai kích thước đã bị check "size" chặn).
        tl = d / "timeline.json"
        hits = scan(f, json.loads(tl.read_text(encoding="utf-8")) if tl.is_file() else None)
        put("dips", [h["frame"] for h in hits], not hits,
            f"mất hình (đột biến) tại khung {[h['frame'] for h in hits[:3]]}")
    res = {"ok": not errs, "checks": checks, "errors": errs}
    if errs:
        raise VerifyError("; ".join(errs), res)
    return res


class VerifyError(RuntimeError):
    def __init__(self, msg: str, result: dict):
        super().__init__(msg)
        self.result = result


def _size(p: Path) -> int:
    if p.is_file():
        return p.stat().st_size
    return sum(x.stat().st_size for x in p.rglob("*") if x.is_file()) if p.exists() else 0


def clean(slug: str, root=ROOT) -> dict:
    d = out_dir(slug, Path(root))
    final = d / f"{slug}.mp4"
    if not final.is_file():
        raise RuntimeError(f"không dọn: chưa có {final}")
    try:
        verify(slug, root)
    except VerifyError as e:
        raise RuntimeError(f"không dọn: kiểm MP4 không đạt ({e})")
    freed = 0
    for name in REMOVE:
        p = d / name
        freed += _size(p)
        if p.is_dir():
            shutil.rmtree(p)
        else:
            p.unlink(missing_ok=True)
    for p in d.glob("*.part.mp4"):
        freed += _size(p)
        p.unlink()
    kept = _size(d)
    return {"freed": freed, "kept": kept}


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(prog="aivideo.assemble")
    ap.add_argument("cmd", choices=["concat", "mux", "verify", "clean"])
    ap.add_argument("slug")
    ap.add_argument("--root", default=os.environ.get("AIVIDEO_ROOT") or str(ROOT))
    a = ap.parse_args(argv)
    try:
        if a.cmd == "concat":
            print(f"ghép: {concat(a.slug, a.root)}")
        elif a.cmd == "mux":
            print(f"gắn tiếng: {mux(a.slug, a.root)}")
        elif a.cmd == "verify":
            print(json.dumps(verify(a.slug, a.root), ensure_ascii=False))
        else:
            print(json.dumps(clean(a.slug, a.root)))
    except DiskError as e:
        print(f"lỗi: {e}", file=sys.stderr)
        return EXIT_DISK
    except VerifyError as e:
        print(json.dumps(e.result, ensure_ascii=False))
        print(f"lỗi: {e}", file=sys.stderr)
        return 1
    except (RuntimeError, OSError, KeyError, ValueError) as e:
        print(f"lỗi: {e}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
