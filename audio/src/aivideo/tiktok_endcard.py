"""Thẻ kết cho bản TikTok: chữ "Xem full tại diu tiu bé @bitstory168", không giọng đọc (đề mục 33, D42).

    python -m aivideo.tiktok_endcard ensure <slug>
    python -m aivideo.tiktok_endcard append <slug> --src <mp4 TikTok> --out <mp4>

Thẻ (`TiktokEndCard.tsx`, `assets/brand/tiktok-endcard.json`) làm một lần và lưu ở `out/tiktok-endcard/<khoá>/`:
`vertical.mp4` (hình câm) và `mix.wav` (chỉ nhạc nền nhẹ của tập, mức `gainDb` như dưới lời đọc, mờ vào / mờ ra;
tập không có nhạc thì im). Tên nền tảng viết lái có chủ ý để TikTok không bắt duyệt hay hạn chế video (D42), nên chữ
thẻ không đọc thành tiếng và file kết quả không mang metadata nào của nguồn.
Gắn KHÔNG render lại: nối thẻ vào sau MP4 TikTok bằng FFmpeg, hình chép nguyên luồng, tiếng nén lại AAC.
`aivideo.shorts export` tự gắn cho tập từ số `FROM_EPISODE` trở đi; Short YouTube và bản Facebook không đổi.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

from aivideo import outro

ROOT = Path(__file__).resolve().parents[3]
CONFIG = Path("assets") / "brand" / "tiktok-endcard.json"
SOURCE = Path("video") / "src" / "TiktokEndCard.tsx"
COMPOSITION = "TiktokEndCard"
SIZE = (1080, 1920)
FPS = 30
FROM_EPISODE = 5  # tập 1–4 đã đăng TikTok, không làm lại
LUFS_TOL = 1.0
TP_MAX = -1.0
CHROME = Path.home() / ".cache" / "aivideo" / "chrome-headless-shell" / "chrome-headless-shell"


class EndCardError(RuntimeError):
    pass


def load_config() -> dict:
    return json.loads((ROOT / CONFIG).read_text(encoding="utf-8"))


def text() -> str:
    return load_config()["text"]


def frames() -> int:
    return int(load_config()["frames"])


def wanted(ep_no: int) -> bool:
    """Bản TikTok của tập số `ep_no` (thứ tự trong episodes/index.json) có gắn thẻ kết không."""
    return ep_no >= FROM_EPISODE


def cache_key(music: Path | None, gain: float) -> str:
    sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()  # noqa: E731
    body = {"platform": "tiktok", "config": load_config(),
            "source": sha(ROOT / SOURCE), "music": sha(music) if music else None, "gainDb": gain}
    return hashlib.sha256(json.dumps(body, sort_keys=True, ensure_ascii=False).encode()).hexdigest()[:16]


def cache_dir(slug: str, root=ROOT) -> Path:
    root = Path(root)
    music, gain = outro._music(slug, root)
    return root / "out" / "tiktok-endcard" / cache_key(music, gain)


def render_video(out: Path) -> None:
    cmd = ["npx", "remotion", "render", "src/index.ts", COMPOSITION, str(out), "--muted", "--log=error"]
    browser = os.environ.get("REMOTION_BROWSER_EXECUTABLE") or (str(CHROME) if CHROME.is_file() else "")
    if browser:
        cmd.append(f"--browser-executable={browser}")
    r = subprocess.run(cmd, check=False, cwd=ROOT / "video", stdin=subprocess.DEVNULL)
    if r.returncode != 0:
        raise EndCardError(f"render {COMPOSITION} lỗi (mã {r.returncode})")


def make_audio(cfg: dict, out: Path, music: Path | None, gain: float) -> None:
    """Tiếng thẻ: nhạc nền nhẹ (không giọng), 48 kHz stereo, đúng độ dài thẻ."""
    dur = int(cfg["frames"]) / FPS
    if music is None:
        src = ["-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo"]
        af = "anull"
    else:
        src = ["-stream_loop", "-1", "-i", str(music)]
        fo = float(cfg["musicFadeOutS"])
        af = (f"volume={gain:.2f}dB,afade=t=in:d={float(cfg['musicFadeInS']):.2f},"
              f"afade=t=out:st={dur - fo:.3f}:d={fo:.2f}")
    _run(["ffmpeg", "-v", "error", "-y", *src, "-t", f"{dur:.6f}", "-af",
          f"{af},aresample=48000,aformat=sample_fmts=s16:channel_layouts=stereo", "-map_metadata", "-1",
          "-c:a", "pcm_s16le", str(out)])


def ensure(slug: str, root=ROOT, *, render=render_video) -> Path:
    """Làm thẻ kết nếu cache chưa có. Trả thư mục cache (`vertical.mp4`, `mix.wav`)."""
    from aivideo.assemble import probe_frames
    root = Path(root)
    d = cache_dir(slug, root)
    if all((d / f).is_file() for f in ("vertical.mp4", "mix.wav")):
        return d
    cfg = load_config()
    music, gain = outro._music(slug, root)
    tmp = d.with_name(d.name + ".part")
    shutil.rmtree(tmp, ignore_errors=True)
    tmp.mkdir(parents=True)
    try:
        make_audio(cfg, tmp / "mix.wav", music, gain)
        f = tmp / "vertical.mp4"
        render(f)
        n = probe_frames(f)
        if n != int(cfg["frames"]):
            raise EndCardError(f"{f.name} có {n} frame, cần {cfg['frames']}")
        shutil.rmtree(d, ignore_errors=True)
        os.replace(tmp, d)
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
    return d


def _run(cmd: list[str]) -> None:
    p = subprocess.run(cmd, check=False, capture_output=True, text=True, stdin=subprocess.DEVNULL)
    if p.returncode != 0:
        raise EndCardError(f"{cmd[0]} lỗi: {p.stderr.strip()[-400:]}")


def _video(path: Path) -> dict:
    from aivideo.assemble import probe_streams
    info = probe_streams(path)
    v = next((s for s in info["streams"] if s["codec_type"] == "video"), None)
    if v is None:
        raise EndCardError(f"{path} không có luồng hình")
    return v


def append(slug: str, src: Path, out: Path, root=ROOT, *, ensure_fn=ensure) -> Path:
    """Ghi `out` = MP4 TikTok `src` + thẻ kết. `src` không đổi. Trả `out`."""
    from aivideo.assemble import measure_lufs, probe_frames, probe_streams
    from aivideo.mix import true_peak
    src, out = Path(src), Path(out)
    if not src.is_file():
        raise EndCardError(f"thiếu {src}")
    if src.resolve() == out.resolve():
        raise EndCardError("--out phải khác --src")
    v = _video(src)
    if not any(s["codec_type"] == "audio" for s in probe_streams(src)["streams"]):
        raise EndCardError(f"{src} thiếu luồng tiếng")
    d = ensure_fn(slug, root)
    end_mp4, end_wav = d / "vertical.mp4", d / "mix.wav"
    ev = _video(end_mp4)
    for k in ("width", "height", "codec_name", "pix_fmt", "r_frame_rate"):
        if v.get(k) != ev.get(k):
            raise EndCardError(f"thẻ kết khác nguồn ở {k}: {ev.get(k)} / {v.get(k)}")
    keep, n_end = probe_frames(src), probe_frames(end_mp4)
    out.parent.mkdir(parents=True, exist_ok=True)
    work = out.with_name(out.stem + ".work")
    shutil.rmtree(work, ignore_errors=True)
    work.mkdir()
    try:
        main_v, silent, lst = work / "main.mp4", work / "silent.mp4", work / "list.txt"
        _run(["ffmpeg", "-v", "error", "-y", "-i", str(src), "-map", "0:v:0", "-c", "copy", str(main_v)])
        lst.write_text(f"file '{main_v.resolve().as_posix()}'\nfile '{end_mp4.resolve().as_posix()}'\n",
                       encoding="utf-8")
        _run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", str(lst), "-c", "copy", str(silent)])
        fmt = "aresample=48000,aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo"
        graph = (f"[1:a]atrim=end={keep / FPS:.6f},apad=whole_dur={keep / FPS:.6f},asetpts=PTS-STARTPTS,{fmt}[m];"
                 f"[2:a]{fmt}[o];[m][o]concat=n=2:v=0:a=1[a]")
        part = work / "final.mp4"
        _run(["ffmpeg", "-v", "error", "-y", "-i", str(silent), "-i", str(src), "-i", str(end_wav),
              "-filter_complex", graph, "-map", "0:v:0", "-map", "[a]", "-map_metadata", "-1", "-map_chapters", "-1",
              "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", str(part)])
        want = keep + n_end
        got = probe_frames(part)
        if got != want:
            raise EndCardError(f"bản TikTok có {got} frame, cần {want}")
        kinds = [s["codec_type"] for s in probe_streams(part)["streams"]]
        if sorted(kinds) != ["audio", "video"]:
            raise EndCardError(f"bản TikTok phải có đúng 1 hình + 1 tiếng, có {kinds}")
        a = next(s for s in probe_streams(part)["streams"] if s["codec_type"] == "audio")
        if abs(float(a.get("duration") or 0) - want / FPS) > 0.1:
            raise EndCardError(f"tiếng dài {a.get('duration')} s, hình {want / FPS:.2f} s")
        lufs, tp = measure_lufs(part), true_peak(part)
        if abs(lufs + 16) > LUFS_TOL or tp > TP_MAX:
            raise EndCardError(f"âm lượng {lufs} LUFS / {tp} dBTP, cần -16 ±{LUFS_TOL} và ≤ {TP_MAX}")
        os.replace(part, out)
    finally:
        shutil.rmtree(work, ignore_errors=True)
    return out


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(prog="aivideo.tiktok_endcard")
    ap.add_argument("cmd", choices=["ensure", "append"])
    ap.add_argument("slug")
    ap.add_argument("--root", default=os.environ.get("AIVIDEO_ROOT") or str(ROOT))
    ap.add_argument("--src", help="MP4 TikTok chưa có thẻ kết (append)")
    ap.add_argument("--out", help="MP4 kết quả (append)")
    a = ap.parse_args(argv)
    if a.cmd == "append" and not (a.src and a.out):
        ap.error("append cần --src và --out")
    try:
        if a.cmd == "ensure":
            print(f"thẻ kết TikTok: {ensure(a.slug, a.root)}")
        else:
            print(f"bản TikTok có thẻ kết: {append(a.slug, Path(a.src), Path(a.out), a.root)}")
    except (EndCardError, outro.OutroError, RuntimeError, OSError, KeyError, ValueError) as e:
        print(f"lỗi: {e}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
