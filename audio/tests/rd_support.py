"""Hạ tầng dùng chung cho test đề mục 10 (render dài, ghép, kiểm).

Giao diện: `.team/features/10-render-dai-giao-dien.md`. Tạo cây
`<gốc>/out/episodes/<slug>/` giả lập (đoạn mp4, mix.wav, manifest,
timeline), video tổng hợp bằng ffmpeg/numpy, và các hàm đo độc lập
(ffprobe, ebur128) để chứng minh mỗi ca sai thật sự sai.
"""

from __future__ import annotations

import atexit
import copy
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
import soundfile as sf

from aivideo.audio import OUT_SR, measure_lufs
from aivideo.mix import true_peak

ROOT = Path(__file__).resolve().parents[2]
AUDIO_SRC = ROOT / "audio" / "src"
SAMPLE2 = ROOT / ".team" / "contract" / "timeline2.sample.json"
FPS = 30
W, H = 1920, 1080
RENDER_TEST = os.environ.get("RENDER_TEST") == "1"
CHROME = os.environ.get(
    "REMOTION_BROWSER_EXECUTABLE",
    str(Path.home() / ".cache/aivideo/chrome-headless-shell/chrome-headless-shell"),
)


# ------------------------------------------------------------ chạy lệnh
def run_module(module: str, args: list, *, env=None, cwd=None, timeout=600):
    """`python -m aivideo.<module> ...` với PYTHONPATH=audio/src."""
    e = dict(os.environ)
    e["PYTHONPATH"] = str(AUDIO_SRC)
    for k in ("AIVIDEO_FREE_GB", "AIVIDEO_MIN_FREE_GB"):
        e.pop(k, None)
    e.update(env or {})
    return subprocess.run(
        [sys.executable, "-m", f"aivideo.{module}", *map(str, args)],
        capture_output=True, text=True, env=e, cwd=cwd or ROOT / "audio",
        timeout=timeout,
    )


def both(r) -> str:
    return (r.stdout or "") + "\n" + (r.stderr or "")


def ff(*args, timeout=300):
    r = subprocess.run(
        ["ffmpeg", "-hide_banner", "-nostdin", "-y", "-loglevel", "error", *map(str, args)],
        capture_output=True, text=True, timeout=timeout,
    )
    assert r.returncode == 0, r.stderr
    return r


# ------------------------------------------------------------ đo độc lập
def probe(path) -> dict:
    r = subprocess.run(
        ["ffprobe", "-v", "error", "-count_frames", "-show_streams",
         "-show_format", "-of", "json", str(path)],
        capture_output=True, text=True, timeout=300,
    )
    assert r.returncode == 0, r.stderr
    return json.loads(r.stdout)


def video_frames(path) -> int:
    v = next(s for s in probe(path)["streams"] if s["codec_type"] == "video")
    return int(v["nb_read_frames"])


def streams(path) -> dict:
    d = probe(path)
    out = {}
    for s in d["streams"]:
        out.setdefault(s["codec_type"], s)
    out["format"] = d["format"]
    return out


def atom_order(path) -> list[str]:
    """Tên các atom cấp cao của mp4, theo thứ tự trong file."""
    names, data = [], Path(path).read_bytes()
    pos = 0
    while pos + 8 <= len(data):
        size = int.from_bytes(data[pos:pos + 4], "big")
        names.append(data[pos + 4:pos + 8].decode("latin1"))
        if size == 1:
            size = int.from_bytes(data[pos + 8:pos + 16], "big")
        if size < 8:
            break
        pos += size
    return names


# ------------------------------------------------------------ timeline
def make_timeline(frames: int) -> dict:
    """Timeline v2 hợp lệ: một cảnh tiêu đề chương phủ trọn `frames`."""
    t = json.loads(SAMPLE2.read_text("utf-8"))
    sc = copy.deepcopy(t["scenes"][1])
    sc.update(id="sc01", chapter="mo-dau", startFrame=0, durationFrames=frames)
    t["scenes"] = [sc]
    t["chapters"] = [{"id": "mo-dau", "title": "Mở đầu", "startFrame": 0}]
    t["durationInFrames"] = frames
    t["sfx"] = []
    return t


# ------------------------------------------------------------ video / âm thanh
# Clip và wav giống nhau được dựng một lần cho cả phiên test rồi sao chép.
_CACHE = Path(tempfile.mkdtemp(prefix="rd-cache-"))
atexit.register(shutil.rmtree, _CACHE, ignore_errors=True)


def _cached(key: str, path, build) -> Path:
    src = _CACHE / re.sub(r"[^A-Za-z0-9_.-]", "_", key)
    if not src.exists():
        build(src)
    shutil.copyfile(src, path)
    return Path(path)


def make_clip(path, frames: int, **kw) -> Path:
    key = f"clip-{frames}-{sorted(kw.items())}.mp4"
    return _cached(key, path, lambda dst: _make_clip(dst, frames, **kw))


def make_wav(path, seconds: float, *, lufs=-16.0, spike=False) -> Path:
    key = f"wav-{seconds}-{lufs}-{spike}.wav"
    return _cached(key, path, lambda dst: _make_wav(dst, seconds, lufs, spike))


def _make_clip(path, frames: int, *, size=f"{W}x{H}", fps=FPS,
              pix_fmt="yuv420p", vcodec="libx264", black=None) -> Path:
    """Clip testsrc2 có `frames` khung. `black=(a, b)`: khung a..b-1 đen hẳn."""
    vf = f"format={pix_fmt}"
    if black:
        vf = (f"drawbox=x=0:y=0:w=iw:h=ih:color=black:t=fill:"
              f"enable='between(n,{black[0]},{black[1] - 1})',{vf}")
    if vcodec == "libx264":
        enc = ["-preset", "ultrafast", "-crf", 28, "-bf", "0"]
    else:
        enc = ["-q:v", 5]
    ff("-f", "lavfi", "-i", f"testsrc2=size={size}:rate={fps}",
       "-frames:v", frames, "-vf", vf, "-c:v", vcodec, *enc,
       "-pix_fmt", pix_fmt, path)
    return Path(path)


def _make_wav(path, seconds: float, lufs, spike) -> Path:
    """Âm sin mono OUT_SR, chỉnh để đo ra `lufs`; `spike`: thêm xung toàn thang."""
    n = round(seconds * OUT_SR)
    t = np.arange(n) / OUT_SR
    amp = 0.1
    for _ in range(3):
        sf.write(str(path), (amp * np.sin(2 * np.pi * 440 * t)).astype("float32"),
                 OUT_SR, subtype="FLOAT")
        amp *= 10 ** ((lufs - measure_lufs(path)) / 20)
    x = amp * np.sin(2 * np.pi * 440 * t)
    if spike:
        x[OUT_SR // 2::OUT_SR] = 1.0
    sf.write(str(path), x.astype("float32"), OUT_SR, subtype="FLOAT")
    return Path(path)


def make_final(path, video, wav=None, *, acodec="aac", faststart=True) -> Path:
    """Ghép video (copy) và wav thành mp4 như bước mux (hoặc biến thể sai)."""
    args = ["-i", video]
    if wav is not None:
        args += ["-i", wav, "-c:a", acodec]
        if acodec == "aac":
            args += ["-b:a", "192k"]
        elif acodec == "libmp3lame":
            args += ["-b:a", "192k"]
    args += ["-c:v", "copy"]
    if faststart:
        args += ["-movflags", "+faststart"]
    ff(*args, path)
    return Path(path)


def lufs_tp(path) -> tuple[float, float]:
    return measure_lufs(path), true_peak(path)


# ------------------------------------------------------------ cây tập giả
class Root:
    """`<gốc>/out/episodes/<slug>/` với đoạn mp4 thật và manifest đúng giao diện."""

    def __init__(self, base: Path, slug: str = "tap-thu"):
        self.base, self.slug = base, slug
        self.out = base / "out" / "episodes" / slug
        (self.out / "segments").mkdir(parents=True)
        self.frames = 0
        self.segs: list[dict] = []

    def add_segment(self, frames: int, **clip_kw) -> dict:
        i = len(self.segs)
        rel = f"segments/seg-{i:03d}.mp4"
        make_clip(self.out / rel, frames, **clip_kw)
        seg = {"id": f"seg-{i:03d}", "startFrame": self.frames,
               "endFrame": self.frames + frames - 1, "frames": frames,
               "file": rel, "hash": f"h{i}", "status": "done", "attempts": 1,
               "bytes": (self.out / rel).stat().st_size}
        self.frames += frames
        self.segs.append(seg)
        return seg

    def write_meta(self, *, wav_seconds=None, duration=None, mix=True) -> None:
        dur = self.frames if duration is None else duration
        (self.out / "timeline.json").write_text(
            json.dumps(make_timeline(dur), ensure_ascii=False), "utf-8")
        self.write_manifest(dur)
        if mix:
            make_wav(self.out / "mix.wav",
                     wav_seconds if wav_seconds is not None else self.frames / FPS)

    def write_manifest(self, duration=None) -> None:
        m = {"version": 1, "slug": self.slug, "fps": FPS,
             "durationInFrames": self.frames if duration is None else duration,
             "srcHash": "s" * 64, "layouts": {"main": self.segs}}
        (self.out / "manifest.json").write_text(json.dumps(m), "utf-8")

    def manifest(self) -> dict:
        return json.loads((self.out / "manifest.json").read_text("utf-8"))

    def args(self, *extra) -> list:
        return [self.slug, "--root", self.base, *extra]


def tree_bytes(d: Path) -> int:
    return sum(p.stat().st_size for p in d.rglob("*") if p.is_file())


# ------------------------------------------------------------ video cho framecheck
BG = 24
FG = 220


def _rects() -> list[tuple[int, int, int, int]]:
    """20 khối 120x60 trong y < 830 (mỗi khối 1800 điểm ở nửa độ phân giải)."""
    out = []
    for i in range(20):
        out.append((60 + (i % 5) * 340, 80 + (i // 5) * 160, 120, 60))
    return out


RECTS = _rects()


def draw_frame(missing=(), extra=(), subtitle_missing=False,
               strokes_dx=None) -> np.ndarray:
    """Khung xám: nền BG, các khối FG, thanh phụ đề ở y >= 900.

    missing: chỉ số khối bị bỏ; extra: thêm (x, y, w, h); strokes_dx: nếu
    đặt, vẽ thêm 30 nét chữ mảnh 3 px lệch `dx` điểm ảnh (khử răng cưa).
    """
    f = np.full((H, W), BG, dtype=np.float32)
    for i, (x, y, w, h) in enumerate(RECTS):
        if i not in missing:
            f[y:y + h, x:x + w] = FG
    for x, y, w, h in extra:
        f[y:y + h, x:x + w] = FG
    if not subtitle_missing:
        f[900:1000, 300:1600] = FG
    if strokes_dx is not None:
        for k in range(30):
            x0 = 100 + k * 55 + strokes_dx
            y0 = 740
            lo, hi = x0, x0 + 3
            for xx in range(int(np.floor(lo)), int(np.ceil(hi))):
                cov = min(xx + 1, hi) - max(xx, lo)
                if cov > 0:
                    f[y0:y0 + 60, xx] = BG + (FG - BG) * cov
    return f


def write_video(path, frames: list[np.ndarray] | int, *, fn=None) -> Path:
    """Mã hoá dãy khung xám thành mp4 h264 yuv420p 1920x1080 30 fps.

    frames: danh sách ndarray, hoặc số khung kèm `fn(i) -> ndarray`.
    """
    seq = (fn(i) for i in range(frames)) if isinstance(frames, int) else frames
    p = subprocess.Popen(
        ["ffmpeg", "-hide_banner", "-nostdin", "-y", "-loglevel", "error",
         "-f", "rawvideo", "-pix_fmt", "gray", "-s", f"{W}x{H}", "-r", str(FPS),
         "-i", "-", "-c:v", "libx264", "-crf", "10", "-preset", "veryfast",
         "-pix_fmt", "yuv420p", str(path)],
        stdin=subprocess.PIPE, stderr=subprocess.PIPE)
    for fr in seq:
        p.stdin.write(np.clip(np.rint(fr), 0, 255).astype(np.uint8).tobytes())
    p.stdin.close()
    err = p.stderr.read().decode()
    assert p.wait() == 0, err
    return Path(path)


def dip_video(path, n: int, dips: dict[int, dict]) -> Path:
    """n khung; `dips[k]` = tham số draw_frame cho khung k (còn lại bình thường)."""
    base = draw_frame()
    cache: dict[int, np.ndarray] = {}

    def fn(i):
        if i in dips:
            key = id(dips[i])
            if key not in cache:
                cache[key] = draw_frame(**dips[i])
            return cache[key]
        return base

    return write_video(path, n, fn=fn)


def sorted_lines(text: str, prefix: str) -> list[str]:
    return [ln for ln in text.splitlines() if ln.startswith(prefix)]


def frames_in(text: str, prefix: str) -> list[int]:
    out = []
    for ln in sorted_lines(text, prefix):
        m = re.match(rf"{re.escape(prefix)}\s*khung\s+(\d+)", ln)
        assert m, f"dòng sai định dạng: {ln!r}"
        out.append(int(m.group(1)))
    return out
