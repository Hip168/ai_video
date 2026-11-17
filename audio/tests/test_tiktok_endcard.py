"""[33] Thẻ kết TikTok chỉ có chữ "Xem full tại diu tiu bé @bitstory168", không giọng đọc (D42).

Bản TikTok từ tập 5 có thẻ kết; tập 1–4, Short YouTube và bản Facebook không đổi. Render Remotion thay bằng hàm giả;
ffmpeg là thật.
"""
from __future__ import annotations

import hashlib
import json
import shutil
import subprocess

import numpy as np
import pytest
from aivideo import facebook, outro, shorts, tiktok_endcard
from rd_support import FPS, make_wav, video_frames

pytestmark = pytest.mark.skipif(not shutil.which("ffmpeg"), reason="cần ffmpeg")
SLUG = "tap-thu"
F_CARD = tiktok_endcard.frames()
VERT = (180, 320)
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()  # noqa: E731


def color_clip(path, frames, color, size=VERT):
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i", f"color=c={color}:s={size[0]}x{size[1]}:r={FPS}",
                    "-frames:v", str(frames), "-c:v", "libx264", "-preset", "ultrafast", "-pix_fmt", "yuv420p",
                    str(path)], check=True)
    return path


def tiktok_src(path, frames, color="red", size=VERT):
    silent = color_clip(path.with_name(path.stem + "-v.mp4"), frames, color, size)
    wav = make_wav(path.with_name(path.stem + ".wav"), frames / FPS)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(silent), "-i", str(wav), "-c:v", "copy", "-c:a", "aac",
                    "-b:a", "192k", str(path)], check=True)
    return path


def fake_ensure(tmp_path, calls=None):
    def ensure(slug, root):
        if calls is not None:
            calls.append(slug)
        d = tmp_path / "cardcache"
        if not d.is_dir():
            d.mkdir()
            color_clip(d / "vertical.mp4", F_CARD, "green")
            make_wav(d / "mix.wav", F_CARD / FPS)
        return d
    return ensure


def frame_rgb(path, n):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-vf", f"select=eq(n\\,{n}),scale=1:1",
                          "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], capture_output=True, check=True)
    return "rgb"[int(np.argmax(tuple(raw.stdout[:3])))]


# ---------------------------------------------------------------- cấu hình thẻ
TEXT = "Xem full tại diu tiu bé @bitstory168"


def test_config_text_exact_no_platform_name():
    cfg = tiktok_endcard.load_config()
    assert cfg["text"] == TEXT == tiktok_endcard.text()
    assert " ".join(cfg["lines"]) == TEXT
    assert 2 * FPS <= cfg["frames"] <= 3 * FPS
    raw = (outro.ROOT / tiktok_endcard.CONFIG).read_text("utf-8") + (outro.ROOT / tiktok_endcard.SOURCE).read_text("utf-8")
    assert "youtube" not in raw.lower()
    assert "#ff0000" not in raw.lower() and "#ff0033" not in raw.lower()  # không màu đỏ đặc trưng
    assert not {"line", "engine", "voice"} & set(cfg)  # không có lời đọc


def test_safe_box_in_vertical_safe_area():
    """Khối chữ trong cột x 48–888 (chừa dải nút phải), tránh dải trên (tab) và dải đáy TikTok phủ chữ, nhạc."""
    s = tiktok_endcard.load_config()["safe"]
    w, h = tiktok_endcard.SIZE
    assert (w, h) == (1080, 1920)
    assert 48 <= s["x0"] < s["x1"] <= 888
    assert s["y0"] >= 200
    assert s["y1"] <= h - 480


def test_wanted_from_episode_5():
    assert [tiktok_endcard.wanted(n) for n in (1, 2, 3, 4, 5, 6, 12)] == [False] * 4 + [True] * 3


def test_cache_separate_from_youtube_and_facebook(tmp_path):
    (tmp_path / "episodes" / SLUG).mkdir(parents=True)
    keys = {tiktok_endcard.cache_key(None, -24.0), outro.cache_key(None, -24.0), facebook.cache_key(None, -24.0)}
    assert len(keys) == 3
    assert tiktok_endcard.cache_dir(SLUG, tmp_path).parent.name == "tiktok-endcard"


def _rms_db(path):
    import soundfile as sf
    x, _ = sf.read(str(path), dtype="float32")
    return 20 * np.log10(max(float(np.sqrt(np.mean(np.square(x)))), 1e-9))


@pytest.mark.parametrize("with_music", [False, True])
def test_ensure_builds_once_without_voice(tmp_path, monkeypatch, with_music):
    ep = tmp_path / "episodes" / SLUG
    ep.mkdir(parents=True)
    (ep / "script.json").write_text(json.dumps({"meta": {"title": "t", "outro": True}}), "utf-8")
    music = make_wav(tmp_path / "nhac.wav", 5.0, lufs=-16.0) if with_music else None
    monkeypatch.setattr(outro, "_music", lambda slug, root: (music, -24.0))
    monkeypatch.setattr(outro, "synth_voice", lambda cfg: pytest.fail("không được dựng giọng"))
    calls = []

    def render(out):
        calls.append(out.name)
        color_clip(out, F_CARD, "green", (1080, 1920))

    d = tiktok_endcard.ensure(SLUG, tmp_path, render=render)
    assert calls == ["vertical.mp4"]
    assert sorted(p.name for p in d.iterdir()) == ["mix.wav", "vertical.mp4"]
    import soundfile as sf
    info = sf.info(str(d / "mix.wav"))
    assert abs(info.frames / info.samplerate - F_CARD / FPS) < 0.01
    level = _rms_db(d / "mix.wav")
    assert level < (-30 if with_music else -80)  # nhạc nhẹ hoặc im, không có lời
    if with_music:
        assert level > -60
    assert tiktok_endcard.ensure(SLUG, tmp_path, render=lambda *a: pytest.fail("x")) == d
    assert not (tmp_path / "out" / "outro").exists() and not (tmp_path / "out" / "outro-facebook").exists()


# ---------------------------------------------------------------- nối thẻ
def test_append_card_at_end(tmp_path):
    src = tiktok_src(tmp_path / "phan-1.mp4", 75)
    before = sha(src)
    out = tiktok_endcard.append(SLUG, src, tmp_path / "o" / "phan-1.mp4", tmp_path, ensure_fn=fake_ensure(tmp_path))
    assert video_frames(out) == 75 + F_CARD
    assert frame_rgb(out, 74) == "r"
    assert frame_rgb(out, 75) == "g" and frame_rgb(out, 75 + F_CARD - 1) == "g"
    assert sha(src) == before
    assert not list(out.parent.glob("*.work"))
    info = json.loads(subprocess.run(["ffprobe", "-v", "error", "-show_format", "-show_streams", "-of", "json", str(out)],
                                     capture_output=True, text=True, check=True).stdout)
    assert sorted(x["codec_type"] for x in info["streams"]) == ["audio", "video"]  # không thêm track giọng
    assert "youtube" not in json.dumps(info, ensure_ascii=False).lower()
    assert b"youtube" not in out.read_bytes().lower()


def test_append_strips_source_metadata(tmp_path):
    src = tiktok_src(tmp_path / "s.mp4", 30)
    tagged = tmp_path / "tagged.mp4"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(src), "-c", "copy", "-metadata", "title=YouTube Short",
                    "-metadata", "comment=youtube", str(tagged)], check=True)
    out = tiktok_endcard.append(SLUG, tagged, tmp_path / "o.mp4", tmp_path, ensure_fn=fake_ensure(tmp_path))
    assert b"youtube" not in out.read_bytes().lower()


def test_append_size_mismatch_errors(tmp_path):
    src = tiktok_src(tmp_path / "s.mp4", 30, size=(200, 320))
    with pytest.raises(tiktok_endcard.EndCardError, match="khác nguồn"):
        tiktok_endcard.append(SLUG, src, tmp_path / "o.mp4", tmp_path, ensure_fn=fake_ensure(tmp_path))


def test_append_refuses_in_place(tmp_path):
    src = tiktok_src(tmp_path / "s.mp4", 30)
    with pytest.raises(tiktok_endcard.EndCardError, match="khác"):
        tiktok_endcard.append(SLUG, src, src, tmp_path, ensure_fn=fake_ensure(tmp_path))


def test_cli_append_needs_src_and_out():
    with pytest.raises(SystemExit):
        tiktok_endcard.main(["append", SLUG, "--src", "x.mp4"])


# ---------------------------------------------------------------- shorts export
def seed(root, ep_no, n_parts=3, yt_outro=False):
    """Tập thứ `ep_no` trong index.json, `n_parts` Short YouTube thật (đỏ) có tiếng."""
    ep = root / "episodes" / SLUG
    ep.mkdir(parents=True, exist_ok=True)
    (ep / "script.json").write_text(json.dumps({"meta": {"title": "t", "outro": yt_outro}}), "utf-8")
    items = [{"part": i, "total": n_parts, "title": "Tiêu đề", "hook": "Móc"} for i in range(1, n_parts + 1)]
    (ep / "shorts.json").write_text(json.dumps({"version": 1, "shorts": items}, ensure_ascii=False), "utf-8")
    slugs = [f"tap-{i}" for i in range(1, ep_no)] + [SLUG]
    (root / "episodes" / "index.json").write_text(json.dumps([{"slug": s} for s in slugs]), "utf-8")
    out = root / "out" / "episodes" / SLUG
    out.mkdir(parents=True, exist_ok=True)
    return {k: tiktok_src(out / f"{SLUG}-short-{k}.mp4", 40 + k) for k in range(1, n_parts + 1)}


def no_render(*a):
    pytest.fail("không cần render lại")


def test_export_ep5_every_part_has_card_youtube_shorts_unchanged(tmp_path):
    yt = seed(tmp_path, 5)
    before = {k: sha(p) for k, p in yt.items()}
    calls = []
    ensure = fake_ensure(tmp_path, calls)
    d = shorts.export(SLUG, tmp_path, "1-3", render=no_render,
                      append=lambda s, r, src, dst: tiktok_endcard.append(s, src, dst, r, ensure_fn=ensure))
    for k in (1, 2, 3):
        f = d / f"phan-{k}.mp4"
        assert video_frames(f) == 40 + k + F_CARD
        assert frame_rgb(f, 40 + k - 1) == "r" and frame_rgb(f, 40 + k) == "g"
    assert calls == [SLUG] * 3
    assert {k: sha(p) for k, p in yt.items()} == before  # Short YouTube giữ nguyên
    m = json.loads((d / "manifest.json").read_text("utf-8"))
    assert [x["endcard"] for x in m["parts"]] == [TEXT] * 3
    caption = (d / "phan-3.txt").read_text("utf-8")
    assert caption.startswith("#conbit5 ") and "youtube" not in caption.lower()  # caption D35 giữ nguyên


@pytest.mark.parametrize("ep_no", [1, 2, 3, 4])
def test_export_ep1_to_4_unchanged_copy(tmp_path, ep_no):
    yt = seed(tmp_path, ep_no)
    d = shorts.export(SLUG, tmp_path, "1-3", render=no_render, append=lambda *a: pytest.fail("không gắn thẻ"))
    for k in (1, 2, 3):
        assert (d / f"phan-{k}.mp4").read_bytes() == yt[k].read_bytes()
    assert all("endcard" not in x for x in json.loads((d / "manifest.json").read_text("utf-8"))["parts"])


def test_export_no_endcard_flag_copies(tmp_path):
    yt = seed(tmp_path, 6)
    d = shorts.export(SLUG, tmp_path, "1-3", render=no_render, endcard=False,
                      append=lambda *a: pytest.fail("không gắn thẻ"))
    assert (d / "phan-1.mp4").read_bytes() == yt[1].read_bytes()


def test_export_rerendered_part_gets_card_not_youtube_outro(tmp_path):
    """Tập 6 phần, có đoạn kết YouTube: TikTok render lại phần không đoạn kết rồi mới gắn thẻ TikTok."""
    seed(tmp_path, 5, n_parts=6, yt_outro=True)
    got = []

    def render(slug, root, items, n, work):
        work.mkdir(parents=True, exist_ok=True)
        return tiktok_src(work / f"r{n}.mp4", 50, color="red")

    shorts.export(SLUG, tmp_path, "1-3", render=render, append=lambda s, r, src, dst: got.append((src.name, dst.name)))
    assert got == [("r1.mp4", "phan-1.mp4"), ("r2.mp4", "phan-2.mp4"), ("r3.mp4", "phan-3.mp4")]


def test_cli_export_has_no_endcard_option(capsys):
    with pytest.raises(SystemExit) as e:
        shorts.main(["export", "--help"])
    assert e.value.code == 0
    assert "--no-endcard" in capsys.readouterr().out


# ---------------------------------------------------------------- YouTube và Facebook không đổi
def test_youtube_and_facebook_sources_unchanged():
    root = outro.ROOT
    pins = {
        "assets/brand/outro.json": "7a142aabfa3d6fd425fcad9b83d54a142415e8c11d3f448e7d0b876c15b9fbda",
        "video/src/Outro.tsx": "55b7abb66d116d6157cff44c01b497a26e0ac91fcb6ea930cd848c8f576dab18",
        "audio/src/aivideo/facebook.py": "fdf36193bb25fa14d2754c4c5ad12671af029f205af418e36c6f53983d970d40",
        "video/src/OutroFacebook.tsx": "a82e918f6ec67710f6f6ad010e93572fe0401a1323d94078705c9cdfa6c9b963",
        "assets/brand/outro-facebook.json": "7e61f8fadcfb190d1c7e04aaf12d7d75cb699cfd0f68ea1c7c48958dd26d93be",
    }
    for rel, want in pins.items():
        assert sha(root / rel) == want, rel
    assert outro.cache_key(None, -24.0) == "7ce52738c95c642c"
    # Short YouTube (assemble, make-episode) và bản Facebook không gọi tới thẻ TikTok.
    for rel in ("audio/src/aivideo/assemble.py", "audio/src/aivideo/facebook.py", "audio/src/aivideo/outro.py",
                "make-episode.sh", "video/src/Outro.tsx", "video/src/OutroFacebook.tsx", "video/src/Short.tsx"):
        text = (root / rel).read_text("utf-8")
        assert "tiktok_endcard" not in text and "TiktokEndCard" not in text, rel
