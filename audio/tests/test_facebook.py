"""[32] Bản Facebook: đoạn kết Facebook, bỏ đoạn kết YouTube, nối bằng FFmpeg; bản YouTube không đổi.

Giọng và render Remotion thay bằng hàm giả; ffmpeg là thật.
"""
from __future__ import annotations

import hashlib
import json
import shutil
import subprocess

import numpy as np
import pytest

from aivideo import facebook, outro
from aivideo.audio import OUT_SR
from rd_support import FPS, make_wav, video_frames

pytestmark = pytest.mark.skipif(not shutil.which("ffmpeg"), reason="cần ffmpeg")
SLUG = "tap-thu"
F_YT = outro.frames()
F_FB = facebook.frames()
WIDE, VERT = (320, 180), (180, 320)


def write_script(root, *, yt_outro=True, parts=6):
    ep = root / "episodes" / SLUG
    ep.mkdir(parents=True, exist_ok=True)
    (ep / "script.json").write_text(json.dumps({"meta": {"title": "t", "theme": "mau-a", "outro": yt_outro}}), "utf-8")
    (ep / "shorts.json").write_text(json.dumps({"version": 1, "shorts": [{"part": i} for i in range(1, parts + 1)]}),
                                    "utf-8")


def color_clip(path, frames, color, size):
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i", f"color=c={color}:s={size[0]}x{size[1]}:r={FPS}",
                    "-frames:v", str(frames), "-c:v", "libx264", "-preset", "ultrafast", "-pix_fmt", "yuv420p",
                    str(path)], check=True)
    return path


def youtube_final(tmp_path, main_frames, size, with_outro):
    """MP4 kiểu YouTube: phần chính đỏ, (tuỳ) đoạn kết YouTube xanh dương, ghép chép luồng như assemble."""
    parts = [color_clip(tmp_path / "main.mp4", main_frames, "red", size)]
    if with_outro:
        parts.append(color_clip(tmp_path / "yt.mp4", F_YT, "blue", size))
    lst = tmp_path / "l.txt"
    lst.write_text("".join(f"file '{p}'\n" for p in parts))
    silent = tmp_path / "silent.mp4"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", str(lst), "-c", "copy",
                    str(silent)], check=True)
    n = main_frames + (F_YT if with_outro else 0)
    wav = make_wav(tmp_path / "a.wav", n / FPS)
    out = tmp_path / "src.mp4"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(silent), "-i", str(wav), "-c:v", "copy", "-c:a", "aac",
                    "-b:a", "192k", str(out)], check=True)
    return out


def fake_ensure(tmp_path):
    def ensure(slug, root):
        d = tmp_path / "fbcache"
        if not d.is_dir():
            d.mkdir()
            color_clip(d / "wide.mp4", F_FB, "green", WIDE)
            color_clip(d / "vertical.mp4", F_FB, "green", VERT)
            make_wav(d / "mix.wav", F_FB / FPS)
        return d
    return ensure


def frame_rgb(path, n):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-vf", f"select=eq(n\\,{n}),scale=1:1",
                          "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], capture_output=True, check=True)
    return tuple(raw.stdout[:3])


def dominant(rgb):
    return "rgb"[int(np.argmax(rgb))]


# ---------------------------------------------------------------- bản YouTube không đổi
def test_youtube_outro_unchanged():
    """Đoạn kết YouTube: cấu hình, mã nguồn và khoá cache giữ nguyên như trước đề mục 32."""
    sha = lambda p: hashlib.sha256((outro.ROOT / p).read_bytes()).hexdigest()  # noqa: E731
    assert sha("assets/brand/outro.json") == "7a142aabfa3d6fd425fcad9b83d54a142415e8c11d3f448e7d0b876c15b9fbda"
    assert sha("video/src/Outro.tsx") == "55b7abb66d116d6157cff44c01b497a26e0ac91fcb6ea930cd848c8f576dab18"
    assert outro.cache_key(None, -24.0) == "7ce52738c95c642c"
    assert outro.COMPOSITION == {"wide": "OutroWide", "vertical": "OutroVertical"}


def test_facebook_cache_separate_from_youtube(tmp_path):
    write_script(tmp_path)
    assert facebook.cache_key(None, -24.0) != outro.cache_key(None, -24.0)
    assert facebook.cache_dir(SLUG, tmp_path).parent.name == "outro-facebook"
    assert set(facebook.COMPOSITION.values()) == {"OutroFacebookWide", "OutroFacebookVertical"}


# ---------------------------------------------------------------- cấu hình Facebook
def test_facebook_config_wording_and_voice():
    cfg, yt = facebook.load_config(), outro.load_config()
    for key in ("engine", "voice", "speed", "theme", "frames", "voiceStartFrame", "channel", "headline"):
        assert cfg[key] == yt[key], key
    line = cfg["line"]
    assert outro.foreign_words(line) == []
    for want in ("bấm thích", "theo dõi trang", "chia sẻ cho bạn bè"):
        assert want in line
    assert "đăng ký" not in line.lower()
    assert cfg["page"] == "facebook.com/bitstory168"
    assert cfg["likePress"] < cfg["followPress"] < cfg["sharePress"] < cfg["frames"]


def test_ensure_builds_once_with_vieneu_line(tmp_path):
    write_script(tmp_path)
    seen, calls = [], []

    def synth(cfg):
        seen.append(cfg["line"])
        t = np.arange(round(3.0 * OUT_SR)) / OUT_SR
        return (0.2 * np.sin(2 * np.pi * 220 * t)).astype(np.float32)

    def render(layout, out):
        calls.append(layout)
        color_clip(out, F_FB, "green", (1920, 1080) if layout == "wide" else (1080, 1920))

    d = facebook.ensure(SLUG, tmp_path, synth=synth, render=render)
    assert seen == [facebook.load_config()["line"]]
    assert sorted(calls) == ["vertical", "wide"]
    assert sorted(p.name for p in d.iterdir()) == ["mix.wav", "vertical.mp4", "wide.mp4"]
    assert facebook.ensure(SLUG, tmp_path, synth=lambda c: pytest.fail("x"), render=lambda *a: pytest.fail("x")) == d
    assert not (tmp_path / "out" / "outro").exists()  # không đụng cache YouTube


# ---------------------------------------------------------------- xuất
def test_long_video_swaps_youtube_outro_for_facebook(tmp_path):
    write_script(tmp_path)
    src = youtube_final(tmp_path, 60, WIDE, with_outro=True)
    before = hashlib.sha256(src.read_bytes()).hexdigest()
    out = facebook.export(SLUG, tmp_path, None, src, ensure_fn=fake_ensure(tmp_path))
    assert out == tmp_path / "out" / "facebook" / SLUG / f"{SLUG}.mp4"
    assert video_frames(out) == 60 + F_FB
    assert dominant(frame_rgb(out, 59)) == "r"
    assert dominant(frame_rgb(out, 60)) == "g"  # đoạn kết YouTube (xanh dương) đã bỏ
    assert dominant(frame_rgb(out, 60 + F_FB - 1)) == "g"
    assert hashlib.sha256(src.read_bytes()).hexdigest() == before  # bản YouTube giữ nguyên
    assert not list(out.parent.glob("*.work"))


def test_short_without_youtube_outro_just_appends(tmp_path):
    write_script(tmp_path)  # 6 phần: phần 1 không có đoạn kết YouTube
    src = youtube_final(tmp_path, 90, VERT, with_outro=False)
    out = facebook.export(SLUG, tmp_path, 1, src, ensure_fn=fake_ensure(tmp_path))
    assert out.name == f"{SLUG}-short-1.mp4"
    assert video_frames(out) == 90 + F_FB
    assert dominant(frame_rgb(out, 89)) == "r" and dominant(frame_rgb(out, 90)) == "g"


def test_short_with_youtube_outro_vertical(tmp_path):
    write_script(tmp_path)
    src = youtube_final(tmp_path, 75, VERT, with_outro=True)
    out = facebook.export(SLUG, tmp_path, 3, src, ensure_fn=fake_ensure(tmp_path))
    assert video_frames(out) == 75 + F_FB
    assert dominant(frame_rgb(out, 75)) == "g"


def test_missing_source_errors(tmp_path):
    write_script(tmp_path)
    with pytest.raises(facebook.FacebookError, match="thiếu"):
        facebook.export(SLUG, tmp_path, None, ensure_fn=fake_ensure(tmp_path))


def test_size_mismatch_errors(tmp_path):
    write_script(tmp_path, yt_outro=False)
    src = youtube_final(tmp_path, 30, (200, 180), with_outro=False)
    with pytest.raises(facebook.FacebookError, match="khác nguồn"):
        facebook.export(SLUG, tmp_path, None, src, ensure_fn=fake_ensure(tmp_path))


def test_export_all_finds_long_and_shorts(tmp_path, monkeypatch):
    write_script(tmp_path)
    d = tmp_path / "out" / "episodes" / SLUG
    d.mkdir(parents=True)
    for name in (f"{SLUG}.mp4", f"{SLUG}-short-1.mp4", f"{SLUG}-short-2.mp4"):
        (d / name).write_bytes(b"x")
    got = []
    monkeypatch.setattr(facebook, "export", lambda slug, root, short, **kw: got.append(short) or short)
    assert facebook.export_all(SLUG, tmp_path) == [None, 1, 2]
    assert got == [None, 1, 2]


def test_cli_rejects_src_with_all():
    with pytest.raises(SystemExit):
        facebook.main(["export", SLUG, "--all", "--src", "x.mp4"])
