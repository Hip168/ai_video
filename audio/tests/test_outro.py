"""[21] Đoạn kết thích + đăng ký dùng chung (D38): luật gắn, cache, nối vào tập / Short, TikTok không gắn.

Giọng (Korva) và render Remotion được thay bằng hàm giả; ffmpeg là thật.
"""
from __future__ import annotations

import json
import shutil

import numpy as np
import pytest

from aivideo import assemble, outro, shorts
from aivideo.audio import OUT_SR
from aivideo.mix import true_peak
from rd_support import FPS, Root, make_clip, make_wav, measure_lufs, video_frames

pytestmark = pytest.mark.skipif(not shutil.which("ffmpeg"), reason="cần ffmpeg")
SLUG = "tap-thu"
F = outro.frames()


def write_script(root, slug=SLUG, **meta):
    meta.setdefault("outro", True)
    meta = {k: v for k, v in meta.items() if v is not None}
    ep = root / "episodes" / slug
    ep.mkdir(parents=True, exist_ok=True)
    (ep / "script.json").write_text(json.dumps({"meta": {"title": "t", "theme": "mau-a", **meta}}), "utf-8")
    return ep


def write_shorts(root, n, slug=SLUG):
    (root / "episodes" / slug / "shorts.json").write_text(
        json.dumps({"version": 1, "shorts": [{"part": i} for i in range(1, n + 1)]}), "utf-8")


def fake_cache(root, *, size="1920x1080", name="wide.mp4"):
    d = outro.cache_dir(SLUG, root)
    d.mkdir(parents=True, exist_ok=True)
    make_clip(d / name, F, size=size)
    make_wav(d / "mix.wav", F / FPS)
    return d


# ---------------------------------------------------------------- cấu hình, luật
def test_config_5_to_7_seconds_and_vietnamese_line():
    cfg = outro.load_config()
    assert 150 <= cfg["frames"] <= 210
    assert (cfg["engine"], cfg["voice"], cfg["speed"]) == ("korva", "hoang_nam", 1.25)
    assert outro.foreign_words(cfg["line"]) == []
    assert "bấm thích" in cfg["line"] and "đăng ký kênh" in cfg["line"]


def test_foreign_words_flags_english():
    assert outro.foreign_words("Nhớ bấm like và subscribe nhé") == ["like", "subscribe"]


@pytest.mark.parametrize("total,parts", [(1, {1}), (2, {2}), (3, {3}), (4, {3, 4}), (5, {3, 5}),
                                         (6, {3, 6}), (7, {3, 6}), (8, {3, 6})])
def test_short_parts(total, parts):
    assert outro.short_parts(total) == parts


def test_wanted_opt_in(tmp_path):
    assert not outro.wanted(SLUG, tmp_path)  # không có script.json
    write_script(tmp_path, outro=None)
    assert not outro.wanted(SLUG, tmp_path)  # thiếu meta.outro: không gắn (tập đã đăng)
    write_script(tmp_path)
    assert outro.wanted(SLUG, tmp_path)
    write_script(tmp_path, outro=False)
    assert not outro.wanted(SLUG, tmp_path)
    write_script(tmp_path, outro=True)
    write_shorts(tmp_path, 6)
    assert [n for n in range(1, 7) if outro.wanted(SLUG, tmp_path, n)] == [3, 6]


def test_published_episodes_unchanged_new_ones_opt_in():
    for slug in ("vi-sao-may-tinh-dung-nhi-phan", "vi-sao-0-1-cong-0-2-khong-bang-0-3"):
        assert not outro.wanted(slug, outro.ROOT)
    assert outro.wanted("khi-may-tinh-dem-qua-gioi-han", outro.ROOT)


def test_meta_outro_must_be_bool():
    from aivideo.episode import validate_script
    errs = validate_script({"meta": {"title": "t", "theme": "mau-a", "outro": "co"}, "chapters": [], "scenes": []})
    assert any("meta.outro" in e for e in errs)


def test_paths_missing_cache_errors(tmp_path):
    write_script(tmp_path)
    with pytest.raises(outro.OutroError, match="outro ensure"):
        outro.paths(SLUG, tmp_path)


# ---------------------------------------------------------------- làm đoạn kết
def _voice(seconds):
    t = np.arange(round(seconds * OUT_SR)) / OUT_SR
    return (0.2 * np.sin(2 * np.pi * 220 * t)).astype(np.float32)


def test_ensure_builds_once_and_caches(tmp_path):
    write_script(tmp_path)
    calls = []

    def render(layout, out):
        calls.append(layout)
        make_clip(out, F, size="1920x1080" if layout == "wide" else "1080x1920")

    d = outro.ensure(SLUG, tmp_path, synth=lambda cfg: _voice(3.0), render=render)
    assert sorted(calls) == ["vertical", "wide"]
    assert sorted(p.name for p in d.iterdir()) == ["mix.wav", "vertical.mp4", "wide.mp4"]
    assert abs(measure_lufs(d / "mix.wav") + 16) <= 1 and true_peak(d / "mix.wav") <= -1.5
    assert outro.ensure(SLUG, tmp_path, synth=lambda cfg: pytest.fail("không được tổng hợp lại"),
                        render=lambda *a: pytest.fail("không được render lại")) == d
    assert outro.paths(SLUG, tmp_path)["frames"] == F


def test_ensure_skips_when_not_wanted(tmp_path):
    write_script(tmp_path, outro=False)
    assert outro.ensure(SLUG, tmp_path, synth=lambda cfg: pytest.fail("x"), render=lambda *a: pytest.fail("x")) is None


def test_cache_key_follows_music_gain():
    assert outro.cache_key(None, -24.0) != outro.cache_key(None, -20.0)


def test_voice_too_long_rejected(tmp_path):
    cfg = outro.load_config()
    with pytest.raises(outro.OutroError, match="không vừa"):
        outro.make_audio(cfg, _voice(F / FPS), tmp_path / "mix.wav", None, -24.0)


# ---------------------------------------------------------------- nối vào tập
def test_long_video_gets_outro_appended(tmp_path):
    r = Root(tmp_path, SLUG)
    r.add_segment(60)
    r.write_meta()
    write_script(tmp_path)
    fake_cache(tmp_path)
    assemble.concat(SLUG, tmp_path)
    assert r.manifest()["outro"]["frames"] == F
    final = assemble.mux(SLUG, tmp_path)
    assert video_frames(final) == 60 + F
    res = assemble.verify(SLUG, tmp_path)
    assert res["checks"]["frames"]["value"] == 60 + F


def test_opted_out_episode_unchanged(tmp_path):
    r = Root(tmp_path, SLUG)
    r.add_segment(60)
    r.write_meta()
    write_script(tmp_path, outro=False)
    assemble.concat(SLUG, tmp_path)
    assert "outro" not in r.manifest()
    assert video_frames(assemble.mux(SLUG, tmp_path)) == 60


def test_short_too_long_with_outro_rejected(tmp_path, monkeypatch):
    write_script(tmp_path)
    tl = {"fps": 30}
    monkeypatch.setattr(shorts, "_load", lambda slug, root: ([{"part": 1}], tl))
    monkeypatch.setattr(shorts, "validate", lambda s, t: ([], []))
    monkeypatch.setattr(shorts, "entry", lambda s, n: {"from": "a", "to": "b"})
    monkeypatch.setattr(shorts, "scene_range", lambda *a: (0, 0))
    monkeypatch.setattr(shorts, "clip_range", lambda *a: (0, shorts.MAX_FRAMES - F + 1))
    write_shorts(tmp_path, 1)
    with pytest.raises(shorts.ShortsError, match="đoạn kết"):
        shorts.cut(SLUG, 1, tmp_path)


def test_tiktok_export_never_copies_outro_part(tmp_path, monkeypatch):
    """Tập 3 phần: nhãn TikTok trùng nhãn Short, nhưng phần 3 có đoạn kết nên phải render bản không có."""
    write_script(tmp_path)
    items = [{"part": i, "total": 3, "title": "T", "hook": "h", "from": "a", "to": "b"} for i in (1, 2, 3)]
    (tmp_path / "episodes" / SLUG / "shorts.json").write_text(json.dumps({"version": 1, "shorts": items}), "utf-8")
    out = tmp_path / "out" / "episodes" / SLUG
    out.mkdir(parents=True)
    for k in (1, 2, 3):
        (out / f"{SLUG}-short-{k}.mp4").write_bytes(b"youtube")
    rendered = []

    def render(slug, root, sel, n, work):
        rendered.append(n)
        p = tmp_path / f"tiktok-{n}.mp4"
        p.write_bytes(b"tiktok")
        return p

    monkeypatch.setattr("aivideo.upload.recorded_video_id", lambda ep: None)
    d = shorts.export(SLUG, tmp_path, "1-3", render=render)
    assert rendered == [3]
    assert (d / "phan-3.mp4").read_bytes() == b"tiktok"
    assert (d / "phan-1.mp4").read_bytes() == b"youtube"

