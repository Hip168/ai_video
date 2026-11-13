"""Đoạn kết thích và đăng ký dùng chung (đề mục 21, D38).

    python -m aivideo.outro ensure <slug> [--short <n>]

Làm một lần cho mọi tập, lưu ở `out/outro/<khoá>/`: `wide.mp4`, `vertical.mp4` (hình câm, Remotion)
và `mix.wav` (lời đọc Korva + nhạc nền của tập, -16 LUFS). Khoá là sha256 của mọi đầu vào, đổi gì thì làm lại.
`assemble concat/mux` nối hình và tiếng này vào sau tập (hoặc phần Short) khi tập bật `meta.outro`.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
import soundfile as sf

ROOT = Path(__file__).resolve().parents[3]
CONFIG = Path("assets") / "brand" / "outro.json"
AVATAR = Path("assets") / "brand" / "avatar-chip.png"
SOURCE = Path("video") / "src" / "Outro.tsx"
COMPOSITION = {"wide": "OutroWide", "vertical": "OutroVertical"}
TAIL_S = 0.8  # lời đọc phải xong trước cuối đoạn kết ít nhất chừng này


class OutroError(RuntimeError):
    pass


def load_config() -> dict:
    """Cấu hình đoạn kết; cùng file `Outro.tsx` nhập, nên luôn đọc theo vị trí mã (không theo `--root`)."""
    return json.loads((ROOT / CONFIG).read_text(encoding="utf-8"))


def frames() -> int:
    return int(load_config()["frames"])


def short_parts(total: int) -> set[int]:
    """Các phần Short gắn đoạn kết: phần 3 và 6; tập ít hơn 6 phần thì cả phần cuối (D38)."""
    if total >= 6:
        return {3, 6}
    return {p for p in (3, total) if 1 <= p <= total}


def _script_meta(slug: str, root: Path) -> dict | None:
    p = root / "episodes" / slug / "script.json"
    if not p.is_file():
        return None
    return json.loads(p.read_text(encoding="utf-8")).get("meta") or {}


def wanted(slug: str, root=ROOT, short: int | None = None) -> bool:
    """Chỉ tập ghi `meta.outro: true` (từ tập 3, scene-director đặt theo PLAYBOOK); thiếu thì không gắn, nên
    tập 1, 2 đã đăng giữ nguyên. Short: chỉ các phần của `short_parts`."""
    root = Path(root)
    if (_script_meta(slug, root) or {}).get("outro") is not True:
        return False
    if short is None:
        return True
    from aivideo.shorts import load_shorts
    return short in short_parts(len(load_shorts(root / "episodes" / slug / "shorts.json")))


def foreign_words(line: str) -> list[str]:
    """Từ không phải tiếng Việt trong lời đọc, theo luật của `phatam` (D38: lời phải qua `phatam check`)."""
    from aivideo.phatam import TOKEN_RE, is_foreign
    return [w for w in TOKEN_RE.findall(line) if is_foreign(w)]


def _music(slug: str, root: Path) -> tuple[Path | None, float]:
    from aivideo.mix import resolve_track
    music = (_script_meta(slug, root) or {}).get("music")
    if not music:
        return None, -24.0
    path = resolve_track(music["track"], root / "assets" / "audio" / "manifest.json", root / "assets" / "audio" / "files")
    return path, float(music.get("gainDb", -24.0))


def _sha(p: Path) -> str:
    return hashlib.sha256(p.read_bytes()).hexdigest()


def cache_key(music: Path | None, gain: float) -> str:
    body = {"config": load_config(), "avatar": _sha(ROOT / AVATAR), "source": _sha(ROOT / SOURCE),
            "music": _sha(music) if music else None, "gainDb": gain}
    return hashlib.sha256(json.dumps(body, sort_keys=True, ensure_ascii=False).encode()).hexdigest()[:16]


def cache_dir(slug: str, root=ROOT) -> Path:
    root = Path(root)
    music, gain = _music(slug, root)
    return root / "out" / "outro" / cache_key(music, gain)


def paths(slug: str, root=ROOT, short: int | None = None) -> dict | None:
    """Hình và tiếng đoạn kết cho tập / phần Short; None nếu không gắn. Lỗi nếu cần mà chưa làm."""
    root = Path(root)
    if not wanted(slug, root, short):
        return None
    d = cache_dir(slug, root)
    mp4, wav = d / ("wide.mp4" if short is None else "vertical.mp4"), d / "mix.wav"
    for f in (mp4, wav):
        if not f.is_file():
            raise OutroError(f"thiếu {f}: chạy `python -m aivideo.outro ensure {slug}` trước")
    return {"frames": frames(), "mp4": str(mp4), "wav": str(wav)}


def synth_voice(cfg: dict) -> np.ndarray:
    """Lời đọc 48 kHz mono, cắt lặng và chuẩn hoá như lời đọc của tập."""
    from aivideo import audio, engines
    raw, sr = engines.synth(cfg["engine"], cfg["line"], cfg["voice"], float(cfg["speed"]))
    return audio.loudnorm(audio._filter_wav(raw, sr, audio.TRIM_FULL), audio.OUT_SR)


def make_audio(cfg: dict, voice: np.ndarray, out: Path, music: Path | None, gain: float) -> dict:
    """Đặt lời đọc ở `voiceStartFrame`, trộn nhạc nền bằng `mix.mix_episode` (cùng thước -16 LUFS của tập)."""
    from aivideo.audio import OUT_SR
    from aivideo.mix import mix_episode
    n_frames, fps = int(cfg["frames"]), 30
    n = round(n_frames * OUT_SR / fps)
    start = round(int(cfg["voiceStartFrame"]) * OUT_SR / fps)
    if start + len(voice) > n - TAIL_S * OUT_SR:
        raise OutroError(f"lời đọc dài {len(voice) / OUT_SR:.2f} s, không vừa đoạn kết {n_frames / fps:.1f} s")
    buf = np.zeros(n, dtype=np.float32)
    buf[start:start + len(voice)] = voice
    with tempfile.TemporaryDirectory(dir=out.parent) as d:
        nar, tl = Path(d) / "narration.wav", Path(d) / "timeline.json"
        sf.write(str(nar), buf, OUT_SR, subtype="FLOAT")
        tl.write_text(json.dumps({"durationInFrames": n_frames, "fps": fps, "sfx": []}), encoding="utf-8")
        return mix_episode(tl, nar, out, music_path=music, music_gain_db=gain)


def render_video(layout: str, out: Path) -> None:
    cmd = ["npx", "remotion", "render", "src/index.ts", COMPOSITION[layout], str(out), "--muted", "--log=error"]
    r = subprocess.run(cmd, cwd=ROOT / "video", stdin=subprocess.DEVNULL)
    if r.returncode != 0:
        raise OutroError(f"render {COMPOSITION[layout]} lỗi (mã {r.returncode})")


def ensure(slug: str, root=ROOT, short: int | None = None, *, synth=synth_voice, render=render_video) -> Path | None:
    """Làm đoạn kết nếu tập / phần cần mà cache chưa có. Trả thư mục cache, hoặc None nếu không gắn."""
    from aivideo.assemble import probe_frames
    root = Path(root)
    if not wanted(slug, root, short):
        return None
    d = cache_dir(slug, root)
    if all((d / f).is_file() for f in ("wide.mp4", "vertical.mp4", "mix.wav")):
        return d
    cfg = load_config()
    bad = foreign_words(cfg["line"])
    if bad:
        raise OutroError(f"lời đoạn kết có chữ không phải tiếng Việt: {', '.join(bad)}")
    music, gain = _music(slug, root)
    tmp = d.with_name(d.name + ".part")
    shutil.rmtree(tmp, ignore_errors=True)
    tmp.mkdir(parents=True)
    try:
        make_audio(cfg, synth(cfg), tmp / "mix.wav", music, gain)
        for layout in COMPOSITION:
            f = tmp / f"{layout}.mp4"
            render(layout, f)
            n = probe_frames(f)
            if n != int(cfg["frames"]):
                raise OutroError(f"{f.name} có {n} frame, cần {cfg['frames']}")
        shutil.rmtree(d, ignore_errors=True)
        os.replace(tmp, d)
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
    return d


def main(argv: list[str] | None = None) -> int:
    from aivideo.framecheck import short_number
    ap = argparse.ArgumentParser(prog="aivideo.outro")
    ap.add_argument("cmd", choices=["ensure"])
    ap.add_argument("slug")
    ap.add_argument("--root", default=os.environ.get("AIVIDEO_ROOT") or str(ROOT))
    ap.add_argument("--short", type=short_number)
    a = ap.parse_args(argv)
    try:
        d = ensure(a.slug, a.root, a.short)
    except (OutroError, RuntimeError, OSError, KeyError, ValueError) as e:
        print(f"lỗi: {e}", file=sys.stderr)
        return 1
    print(f"đoạn kết: {d}" if d else "đoạn kết: không gắn")
    return 0


if __name__ == "__main__":
    sys.exit(main())
