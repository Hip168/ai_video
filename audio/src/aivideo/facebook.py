"""Bản Facebook của video dài và Short, gắn đoạn kết Facebook (đề mục 32).

    python -m aivideo.facebook ensure <slug>
    python -m aivideo.facebook export <slug> [--short <n> | --all] [--src <mp4>]

Đoạn kết Facebook (`OutroFacebook.tsx`, `assets/brand/outro-facebook.json`) làm một lần như đoạn kết YouTube và lưu ở
`out/outro-facebook/<khoá>/`: `wide.mp4`, `vertical.mp4` (hình câm) và `mix.wav` (lời VieNeu + nhạc nền của tập, -16 LUFS).

Xuất KHÔNG render lại tập: lấy MP4 YouTube đã xong, cắt bỏ đoạn kết YouTube ở cuối (nếu tập / phần đó có, theo
`outro.wanted`), rồi nối đoạn kết Facebook bằng FFmpeg. Hình chép nguyên luồng (không nén lại); chỉ tiếng nén lại AAC.
Kết quả ở `out/facebook/<slug>/<slug>.mp4` và `<slug>-short-<n>.mp4`. Bản YouTube không bị đụng tới.
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
CONFIG = Path("assets") / "brand" / "outro-facebook.json"
SOURCE = Path("video") / "src" / "OutroFacebook.tsx"
COMPOSITION = {"wide": "OutroFacebookWide", "vertical": "OutroFacebookVertical"}
FPS = 30
LUFS_TOL = 1.0
TP_MAX = -1.0
CHROME = Path.home() / ".cache" / "aivideo" / "chrome-headless-shell" / "chrome-headless-shell"


class FacebookError(RuntimeError):
    pass


def load_config() -> dict:
    return json.loads((ROOT / CONFIG).read_text(encoding="utf-8"))


def frames() -> int:
    return int(load_config()["frames"])


def cache_key(music: Path | None, gain: float) -> str:
    sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()  # noqa: E731
    body = {"platform": "facebook", "config": load_config(), "avatar": sha(ROOT / outro.AVATAR),
            "source": sha(ROOT / SOURCE), "music": sha(music) if music else None, "gainDb": gain}
    return hashlib.sha256(json.dumps(body, sort_keys=True, ensure_ascii=False).encode()).hexdigest()[:16]


def cache_dir(slug: str, root=ROOT) -> Path:
    root = Path(root)
    music, gain = outro._music(slug, root)
    return root / "out" / "outro-facebook" / cache_key(music, gain)


def render_video(layout: str, out: Path) -> None:
    cmd = ["npx", "remotion", "render", "src/index.ts", COMPOSITION[layout], str(out), "--muted", "--log=error"]
    browser = os.environ.get("REMOTION_BROWSER_EXECUTABLE") or (str(CHROME) if CHROME.is_file() else "")
    if browser:
        cmd.append(f"--browser-executable={browser}")
    r = subprocess.run(cmd, cwd=ROOT / "video", stdin=subprocess.DEVNULL)
    if r.returncode != 0:
        raise FacebookError(f"render {COMPOSITION[layout]} lỗi (mã {r.returncode})")


def ensure(slug: str, root=ROOT, *, synth=outro.synth_voice, render=render_video) -> Path:
    """Làm đoạn kết Facebook nếu cache chưa có. Mọi tập đều làm được (không cần `meta.outro`)."""
    from aivideo.assemble import probe_frames
    root = Path(root)
    d = cache_dir(slug, root)
    if all((d / f).is_file() for f in ("wide.mp4", "vertical.mp4", "mix.wav")):
        return d
    cfg = load_config()
    bad = outro.foreign_words(cfg["line"])
    if bad:
        raise FacebookError(f"lời đoạn kết Facebook có chữ không phải tiếng Việt: {', '.join(bad)}")
    music, gain = outro._music(slug, root)
    tmp = d.with_name(d.name + ".part")
    shutil.rmtree(tmp, ignore_errors=True)
    tmp.mkdir(parents=True)
    try:
        outro.make_audio(cfg, synth(cfg), tmp / "mix.wav", music, gain)
        for layout in COMPOSITION:
            f = tmp / f"{layout}.mp4"
            render(layout, f)
            n = probe_frames(f)
            if n != int(cfg["frames"]):
                raise FacebookError(f"{f.name} có {n} frame, cần {cfg['frames']}")
        shutil.rmtree(d, ignore_errors=True)
        os.replace(tmp, d)
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
    return d


def out_path(slug: str, root=ROOT, short: int | None = None) -> Path:
    name = f"{slug}.mp4" if short is None else f"{slug}-short-{short}.mp4"
    return Path(root) / "out" / "facebook" / slug / name


def youtube_outro_frames(slug: str, root=ROOT, short: int | None = None) -> int:
    """Số frame đoạn kết YouTube ở cuối MP4 nguồn: có khi tập / phần đó gắn đoạn kết (D38), không thì 0."""
    return outro.frames() if outro.wanted(slug, root, short) else 0


def _run(cmd: list[str]) -> None:
    p = subprocess.run(cmd, capture_output=True, text=True, stdin=subprocess.DEVNULL)
    if p.returncode != 0:
        raise FacebookError(f"{cmd[0]} lỗi: {p.stderr.strip()[-400:]}")


def export(slug: str, root=ROOT, short: int | None = None, src: Path | None = None, *, ensure_fn=ensure) -> Path:
    """Ghi bản Facebook của video dài (`short=None`) hoặc phần Short `short`. Trả đường dẫn MP4."""
    from aivideo.assemble import final_path, measure_lufs, probe_frames, probe_streams
    from aivideo.mix import true_peak
    root = Path(root)
    src = Path(src) if src else final_path(slug, root, short)
    if not src.is_file():
        raise FacebookError(f"thiếu {src} (render bản YouTube trước, hoặc chỉ --src)")
    info = probe_streams(src)
    v = next((s for s in info["streams"] if s["codec_type"] == "video"), None)
    if v is None or not any(s["codec_type"] == "audio" for s in info["streams"]):
        raise FacebookError(f"{src} thiếu luồng hình hoặc tiếng")
    w, h = int(v["width"]), int(v["height"])
    layout = "vertical" if h > w else "wide"
    total = probe_frames(src)
    cut = youtube_outro_frames(slug, root, short)
    keep = total - cut
    if keep <= 0:
        raise FacebookError(f"{src} có {total} frame, không đủ để bỏ đoạn kết YouTube {cut} frame")
    d = ensure_fn(slug, root)
    end_mp4, end_wav = d / f"{layout}.mp4", d / "mix.wav"
    n_end = probe_frames(end_mp4)
    ev = next(s for s in probe_streams(end_mp4)["streams"] if s["codec_type"] == "video")
    if (int(ev["width"]), int(ev["height"])) != (w, h):
        raise FacebookError(f"đoạn kết {ev['width']}x{ev['height']} khác nguồn {w}x{h}")
    out = out_path(slug, root, short)
    out.parent.mkdir(parents=True, exist_ok=True)
    work = out.with_name(out.stem + ".work")
    shutil.rmtree(work, ignore_errors=True)
    work.mkdir()
    try:
        main_v, silent, lst = work / "main.mp4", work / "silent.mp4", work / "list.txt"
        # 1. Hình phần chính: chép nguyên luồng, dừng ở frame `keep` (đoạn kết YouTube được nối bằng chép luồng
        #    nên bắt đầu ở khung khoá; không có frame nào của phần chính nằm sau nó).
        _run(["ffmpeg", "-v", "error", "-y", "-i", str(src), "-map", "0:v:0", "-c", "copy", "-frames:v", str(keep),
              str(main_v)])
        if probe_frames(main_v) != keep:
            raise FacebookError(f"cắt phần chính được {probe_frames(main_v)} frame, cần {keep}")
        lst.write_text(f"file '{main_v.as_posix()}'\nfile '{end_mp4.resolve().as_posix()}'\n", encoding="utf-8")
        _run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", str(lst), "-c", "copy", str(silent)])
        # 2. Tiếng: tiếng nguồn cắt đúng `keep` frame, nối tiếng đoạn kết Facebook (cùng -16 LUFS).
        fmt = "aresample=48000,aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo"
        graph = (f"[1:a]atrim=end={keep / FPS:.6f},asetpts=PTS-STARTPTS,{fmt}[m];"
                 f"[2:a]{fmt}[o];[m][o]concat=n=2:v=0:a=1[a]")
        part = work / "final.mp4"
        _run(["ffmpeg", "-v", "error", "-y", "-i", str(silent), "-i", str(src), "-i", str(end_wav),
              "-filter_complex", graph, "-map", "0:v:0", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
              "-movflags", "+faststart", str(part)])
        want = keep + n_end
        got = probe_frames(part)
        if got != want:
            raise FacebookError(f"bản Facebook có {got} frame, cần {want}")
        streams = probe_streams(part)["streams"]
        a = next(s for s in streams if s["codec_type"] == "audio")
        vd = want / FPS
        if abs(float(a.get("duration") or 0) - vd) > 0.1:
            raise FacebookError(f"tiếng dài {a.get('duration')} s, hình {vd:.2f} s")
        lufs, tp = measure_lufs(part), true_peak(part)
        if abs(lufs + 16) > LUFS_TOL or tp > TP_MAX:
            raise FacebookError(f"âm lượng {lufs} LUFS / {tp} dBTP, cần -16 ±{LUFS_TOL} và ≤ {TP_MAX}")
        os.replace(part, out)
    finally:
        shutil.rmtree(work, ignore_errors=True)
    return out


def export_all(slug: str, root=ROOT, *, ensure_fn=ensure) -> list[Path]:
    """Xuất bản Facebook cho video dài và mọi phần Short đã có MP4 YouTube trong `out/episodes/<slug>/`."""
    from aivideo.assemble import final_path
    root = Path(root)
    done = []
    if final_path(slug, root, None).is_file():
        done.append(export(slug, root, None, ensure_fn=ensure_fn))
    k = 1
    while final_path(slug, root, k).is_file():
        done.append(export(slug, root, k, ensure_fn=ensure_fn))
        k += 1
    if not done:
        raise FacebookError(f"không có MP4 YouTube nào của {slug} trong out/episodes/{slug}/")
    return done


def main(argv: list[str] | None = None) -> int:
    from aivideo.framecheck import short_number
    ap = argparse.ArgumentParser(prog="aivideo.facebook")
    ap.add_argument("cmd", choices=["ensure", "export"])
    ap.add_argument("slug")
    ap.add_argument("--root", default=os.environ.get("AIVIDEO_ROOT") or str(ROOT))
    g = ap.add_mutually_exclusive_group()
    g.add_argument("--short", type=short_number)
    g.add_argument("--all", action="store_true", help="video dài và mọi phần Short đã có")
    ap.add_argument("--src", help="MP4 YouTube nguồn (mặc định out/episodes/<slug>/...)")
    a = ap.parse_args(argv)
    if a.src and (a.all or a.cmd == "ensure"):
        ap.error("--src chỉ dùng với export một video")
    try:
        if a.cmd == "ensure":
            print(f"đoạn kết Facebook: {ensure(a.slug, a.root)}")
        elif a.all:
            for p in export_all(a.slug, a.root):
                print(f"bản Facebook: {p}")
        else:
            print(f"bản Facebook: {export(a.slug, a.root, a.short, a.src)}")
    except (FacebookError, outro.OutroError, RuntimeError, OSError, KeyError, ValueError) as e:
        print(f"lỗi: {e}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
