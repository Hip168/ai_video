"""[5-1] [5-3] Dựng tập bằng `aivideo.episode` với engine `fake`.

Giả định (chưa có `5-dung-tap-giao-dien.md`, xem báo cáo CẦN BA):
`aivideo.episode.main(argv) -> int`, chạy với cwd = `audio/`; đọc
`../episodes/<slug>/script.json`, `../content/lexicon.json`; ghi
`../out/episodes/<slug>/{timeline.json,narration.wav,video.srt,
chapters.txt,cache/}`.
"""

from __future__ import annotations

import json
import math
import re
import shutil
import subprocess

import numpy as np
import pytest
import soundfile as sf

from aivideo import engines
from ep_support import (
    FPS,
    ROOT,
    Tree,
    broken_rules,
    parse_srt,
    small_script,
)

TEMPLATE_DIR = ROOT / "episodes" / "_template"


def run(tree, monkeypatch, *extra, voice=True, speed=True):
    from aivideo import episode

    argv = ["build", tree.slug, "--engine", "fake"]
    if voice:
        argv += ["--voice", "giong-thu"]
    if speed:
        argv += ["--speed", "1.25"]
    argv += list(extra)
    monkeypatch.chdir(tree.base / "audio")
    try:
        return episode.main(argv)
    except SystemExit as e:
        return e.code if isinstance(e.code, int) else 1


def make_small(tmp_path, doc=None, slug="tap-thu"):
    tree = Tree(tmp_path, slug)
    tree.write_script(doc or small_script())
    return tree


@pytest.fixture
def small(tmp_path, spy, monkeypatch):
    tree = make_small(tmp_path)
    assert run(tree, monkeypatch) == 0
    return tree


# -------------------------------------------------------- tập mẫu 130 nhịp
@pytest.fixture(scope="module")
def template_build(tmp_path_factory):
    """Dựng slug dành riêng `_template` một lần cho cả module (nặng nhất của bộ test)."""
    mp = pytest.MonkeyPatch()
    base = tmp_path_factory.mktemp("tpl")
    tree = Tree(base, "_template")
    shutil.copytree(TEMPLATE_DIR, tree.ep_dir, dirs_exist_ok=True)
    code = run(tree, mp)
    mp.undo()
    script = json.loads((tree.ep_dir / "script.json").read_text("utf-8"))
    return tree, code, script


def test_template_co_dung_130_nhip_trong_script(template_build):
    _, _, script = template_build
    beats = [b for sc in script["scenes"] for b in sc["beats"]]
    assert len(beats) == 130


def test_build_slug_template_chay_duoc_bang_engine_fake(template_build):
    tree, code, _ = template_build
    assert tree.slug == "_template"
    assert code == 0
    assert (tree.out_dir / "timeline.json").is_file()


def test_template_timeline_khong_vi_pham_luat_1_den_10_va_12(template_build):
    tree, _, _ = template_build
    assert broken_rules(tree.timeline()) == set()


def test_template_timeline_giu_du_130_nhip_dung_thu_tu_va_chu(template_build):
    tree, _, script = template_build
    want = [(b["id"], b["text"]) for sc in script["scenes"]
            for b in sc["beats"]]
    got = [(b["id"], b["text"]) for sc in tree.timeline()["scenes"]
           for b in sc["beats"]]
    assert got == want


def test_template_srt_130_cue_khop_timeline_trong_1ms(template_build):
    tree, _, _ = template_build
    beats = [b for sc in tree.timeline()["scenes"] for b in sc["beats"]]
    cues = parse_srt(tree.out_dir / "video.srt")
    assert len(cues) == 130
    for (s, e, text), b in zip(cues, beats):
        assert abs(s - b["startFrame"] * 1000 / FPS) <= 1
        assert abs(e - (b["startFrame"] + b["durationFrames"]) * 1000 / FPS) <= 1
        assert text == b["text"]


def test_template_chapters_txt_dung_dinh_dang_dong_dau_00_00(template_build):
    tree, _, _ = template_build
    lines = (tree.out_dir / "chapters.txt").read_text("utf-8").strip().split("\n")
    chapters = tree.timeline()["chapters"]
    assert len(lines) == len(chapters)
    assert lines[0].startswith("00:00 ")
    for line, ch in zip(lines, chapters):
        m = re.fullmatch(r"((?:\d+:)?\d\d:\d\d) (.+)", line)
        assert m, line
        assert m.group(2) == ch["title"]


def test_template_chapters_txt_thoi_diem_khop_startframe_chuong(template_build):
    tree, _, _ = template_build
    lines = (tree.out_dir / "chapters.txt").read_text("utf-8").strip().split("\n")
    for line, ch in zip(lines, tree.timeline()["chapters"]):
        parts = [int(x) for x in line.split(" ", 1)[0].split(":")]
        secs = 0
        for p in parts:
            secs = secs * 60 + p
        assert secs == ch["startFrame"] // FPS


def test_template_moi_chuong_dai_it_nhat_10_giay(template_build):
    tree, _, _ = template_build
    tl = tree.timeline()
    starts = [c["startFrame"] for c in tl["chapters"]] + [tl["durationInFrames"]]
    for a, b in zip(starts, starts[1:]):
        assert (b - a) / FPS >= 10


def test_template_wav_pcm16_mono_48k_va_khong_ngan_hon_nhip_cuoi(template_build):
    tree, _, _ = template_build
    info = sf.info(str(tree.out_dir / "narration.wav"))
    assert (info.subtype, info.channels, info.samplerate) == ("PCM_16", 1, 48000)
    last = tree.timeline()["scenes"][-1]["beats"][-1]
    end = last["startFrame"] + last["durationFrames"]
    assert info.duration * FPS >= end - 1


def test_template_timeline_qua_validate_timeline2_voi_do_dai_wav_that(
        template_build):
    from aivideo.episode import validate_timeline2

    tree, _, _ = template_build
    info = sf.info(str(tree.out_dir / "narration.wav"))
    assert validate_timeline2(tree.timeline(), None, info.duration) == []


def test_template_duration_theo_luat_11_tu_do_dai_wav(template_build):
    tree, _, _ = template_build
    d = sf.info(str(tree.out_dir / "narration.wav")).duration
    assert tree.timeline()["durationInFrames"] == math.ceil((d + 0.5) * FPS)


def test_template_khong_ghi_video_public(template_build):
    tree, _, _ = template_build
    assert not (tree.base / "video").exists()


# ----------------------------------------------------- tập nhỏ: timeline
def test_canh_cam_co_dung_do_dai_holdms_va_khong_co_nhip(small):
    sc02 = small.timeline()["scenes"][1]
    assert sc02["id"] == "sc02"
    assert sc02["beats"] == []
    assert sc02["durationFrames"] == 90  # 3000 ms * 30 fps


def test_timeline_tap_nho_khong_vi_pham_luat_nao_va_giu_loai_canh(small):
    tl = small.timeline()
    assert broken_rules(tl) == set()
    assert [s["type"] for s in tl["scenes"]] == [
        "cold-open", "chapter-title", "custom:mo-phong"]
    assert tl["theme"] == "mau-a"
    assert tl["audio"]["src"] == "narration.wav"
    assert tl["scenes"][1]["props"] == {"title": "Chương một"}


def test_chuong_lay_tu_script_va_start_bang_canh_dau_cua_chuong(small):
    tl = small.timeline()
    assert [(c["id"], c["title"]) for c in tl["chapters"]] == [
        ("mo-dau", "Mở đầu"), ("chuong-1", "Chương một")]
    assert tl["chapters"][1]["startFrame"] == tl["scenes"][1]["startFrame"]
    assert [s["chapter"] for s in tl["scenes"]] == [
        "mo-dau", "chuong-1", "chuong-1"]


def test_sfx_canh_o_dau_canh_sfx_nhip_o_dau_nhip(small):
    tl = small.timeline()
    pop_beat = tl["scenes"][2]["beats"][1]
    assert pop_beat["id"] == "b005"
    assert [(fx["frame"], fx["name"]) for fx in tl["sfx"]] == [
        (0, "whoosh"), (pop_beat["startFrame"], "pop")]
    assert all(fx["gainDb"] <= 0 for fx in tl["sfx"])


def test_duration_tap_nho_theo_luat_11_va_qua_validator_hop_dong(small):
    from aivideo.episode import validate_timeline2

    d = sf.info(str(small.out_dir / "narration.wav")).duration
    tl = small.timeline()
    assert tl["durationInFrames"] == math.ceil((d + 0.5) * FPS)
    assert validate_timeline2(tl, None, d) == []


def test_khoang_nghi_pause_ms_giua_hai_nhip_lien_nhau_ca_qua_canh(small):
    # pause_ms = 300 -> 9 frame giữa hai nhịp; dung sai 2 frame do cắt lặng.
    tl = small.timeline()
    b = [x for s in tl["scenes"] for x in s["beats"]]
    for prev, nxt in [(b[0], b[1]), (b[1], b[2]), (b[3], b[4]), (b[4], b[5])]:
        gap = nxt["startFrame"] - (prev["startFrame"] + prev["durationFrames"])
        assert abs(gap - 9) <= 2, (prev["id"], gap)


def test_in_dong_tong_ket_timeline_ra_stdout(tmp_path, spy, monkeypatch, capsys):
    tree = make_small(tmp_path)
    assert run(tree, monkeypatch) == 0
    frames = tree.timeline()["durationInFrames"]
    assert f"timeline: {frames} frame" in capsys.readouterr().out


def test_cue_cua_nhip_di_vao_timeline_nhip_khong_cue_thi_khong_co(small):
    beats = [b for s in small.timeline()["scenes"] for b in s["beats"]]
    assert beats[0]["cue"] == "hook"
    assert all(b.get("cue") is None for b in beats[1:])


def test_wav_chen_im_lang_dung_cho_canh_cam_va_co_tieng_o_nhip(small):
    tl = small.timeline()
    data, sr = sf.read(str(small.out_dir / "narration.wav"))
    sc02 = tl["scenes"][1]
    a = int((sc02["startFrame"] + 3) / FPS * sr)
    b = int((sc02["startFrame"] + sc02["durationFrames"] - 3) / FPS * sr)
    assert np.max(np.abs(data[a:b])) < 0.01
    beat = tl["scenes"][0]["beats"][0]
    c = int((beat["startFrame"] + 10) / FPS * sr)
    d = int((beat["startFrame"] + beat["durationFrames"] - 10) / FPS * sr)
    assert np.max(np.abs(data[c:d])) > 0.05


def test_srt_dung_so_thu_tu_noi_dung_la_text_goc(small):
    beats = [b for s in small.timeline()["scenes"] for b in s["beats"]]
    cues = parse_srt(small.out_dir / "video.srt")
    assert [c[2] for c in cues] == [b["text"] for b in beats]


def test_srt_dung_text_goc_khi_nhip_co_spoken(tmp_path, spy, monkeypatch):
    doc = small_script()
    doc["scenes"][0]["beats"][0]["spoken"] = "alo alo bạn ơi"
    tree = make_small(tmp_path, doc)
    assert run(tree, monkeypatch) == 0
    assert "alo alo bạn ơi" in spy.texts
    first = parse_srt(tree.out_dir / "video.srt")[0][2]
    assert first == doc["scenes"][0]["beats"][0]["text"]
    assert tree.timeline()["scenes"][0]["beats"][0]["text"] == first


def test_lexicon_tap_chong_len_lexicon_chung(tmp_path, spy, monkeypatch):
    doc = small_script()
    doc["scenes"][0]["beats"][0]["text"] = "router và gateway"
    doc["scenes"][0]["beats"][1]["text"] = "chỉ router thôi"
    tree = make_small(tmp_path, doc)
    (tree.base / "content" / "lexicon.json").write_text(
        json.dumps({"router": "râu tơ", "gateway": "ghết uây"}), "utf-8")
    (tree.ep_dir / "lexicon.json").write_text(
        json.dumps({"router": "rao tơ"}), "utf-8")
    assert run(tree, monkeypatch) == 0
    assert "rao tơ và ghết uây" in spy.texts
    assert "chỉ rao tơ thôi" in spy.texts


def test_mac_dinh_giong_va_toc_do_lay_tu_meta_cua_script(
        tmp_path, spy, monkeypatch):
    tree = make_small(tmp_path, small_script(voice="giong-meta", speed=1.5))
    assert run(tree, monkeypatch, voice=False, speed=False) == 0
    assert {(c["voice"], c["speed"]) for c in spy.calls} == {
        ("giong-meta", 1.5)}


def test_co_dong_lenh_ghi_de_meta(tmp_path, spy, monkeypatch):
    tree = make_small(tmp_path, small_script(voice="giong-meta", speed=1.5))
    assert run(tree, monkeypatch) == 0  # --voice giong-thu --speed 1.25
    assert {(c["voice"], c["speed"]) for c in spy.calls} == {
        ("giong-thu", 1.25)}


# --------------------------------------------------------- cache và resume
def test_chay_lai_khong_doi_gi_thi_engine_khong_duoc_goi(small, spy, monkeypatch):
    spy.clear()
    assert run(small, monkeypatch) == 0
    assert spy.calls == []


def test_doi_dung_mot_nhip_thi_engine_goi_dung_mot_lan(small, spy, monkeypatch):
    doc = small_script()
    doc["scenes"][2]["beats"][2]["text"] = "Một câu hoàn toàn khác ở nhịp cuối."
    small.write_script(doc)
    spy.clear()
    assert run(small, monkeypatch) == 0
    assert spy.texts == ["Một câu hoàn toàn khác ở nhịp cuối."]


def test_doi_toc_do_thi_phai_doc_lai_ca_6_nhip(small, spy, monkeypatch):
    spy.clear()
    assert run(small, monkeypatch, "--speed", "1.1") == 0
    assert len(spy.calls) == 6
    assert {c["speed"] for c in spy.calls} == {1.1}


def test_doi_giong_thi_phai_doc_lai_ca_6_nhip(small, spy, monkeypatch):
    spy.clear()
    assert run(small, monkeypatch, "--voice", "giong-khac") == 0
    assert len(spy.calls) == 6


def test_cache_nam_trong_out_episodes_slug_cache(small):
    cached = list((small.out_dir / "cache").glob("*.wav"))
    assert len(cached) == 6


def test_ngat_giua_chung_roi_chay_lai_chi_goi_nhip_thieu(
        tmp_path, spy, monkeypatch):
    tree = make_small(tmp_path)
    wrapped = engines.synth  # spy bọc hàm thật

    def flaky(engine, text, voice, speed=1.0):
        if len(spy.calls) >= 2:
            raise RuntimeError("mất điện giữa chừng")
        return wrapped(engine, text, voice, speed)

    monkeypatch.setattr(engines, "synth", flaky)
    assert run(tree, monkeypatch) != 0
    assert len(spy.calls) == 2
    first_two = list(spy.texts)
    monkeypatch.setattr(engines, "synth", wrapped)
    spy.clear()
    assert run(tree, monkeypatch) == 0
    assert len(spy.calls) == 4
    assert not set(first_two) & set(spy.texts)
    assert broken_rules(tree.timeline()) == set()


def test_ket_qua_chay_lai_sau_khi_ngat_giong_het_chay_mot_mach(
        tmp_path, spy, monkeypatch):
    a = make_small(tmp_path / "a")
    assert run(a, monkeypatch) == 0
    b = make_small(tmp_path / "b")
    wrapped = engines.synth

    def flaky(engine, text, voice, speed=1.0):
        if len(spy.calls) >= 3:
            raise RuntimeError("ngắt")
        return wrapped(engine, text, voice, speed)

    monkeypatch.setattr(engines, "synth", flaky)
    assert run(b, monkeypatch) != 0
    monkeypatch.setattr(engines, "synth", wrapped)
    assert run(b, monkeypatch) == 0
    assert a.timeline() == b.timeline()
    assert (a.out_dir / "video.srt").read_text("utf-8") == (
        b.out_dir / "video.srt").read_text("utf-8")


# ------------------------------------------------------------------- lỗi
def test_slug_sai_dinh_dang_thoat_khac_0(tmp_path, spy, monkeypatch):
    tree = make_small(tmp_path, slug="tap-thu")
    shutil.copytree(tree.ep_dir, tree.base / "episodes" / "Tap_Sai")
    tree.slug = "Tap_Sai"
    assert run(tree, monkeypatch) != 0
    assert spy.calls == []


def test_tap_khong_ton_tai_thoat_khac_0_khong_goi_engine(
        tmp_path, spy, monkeypatch):
    tree = make_small(tmp_path)
    tree.slug = "khong-co"
    assert run(tree, monkeypatch) != 0
    assert spy.calls == []


def test_build_chan_loai_canh_ngoai_catalog_nhung_nhan_custom(
        tmp_path, spy, monkeypatch):
    doc = small_script()
    doc["scenes"][0]["type"] = "khong-co-trong-catalog"
    tree = make_small(tmp_path / "bad", doc)
    assert run(tree, monkeypatch) != 0
    assert not (tree.out_dir / "timeline.json").exists()
    ok = make_small(tmp_path / "ok")  # có custom:mo-phong
    assert run(ok, monkeypatch) == 0


def test_thieu_engine_thoat_ma_2(tmp_path, spy, monkeypatch):
    from aivideo import episode

    tree = make_small(tmp_path)
    monkeypatch.chdir(tree.base / "audio")
    with pytest.raises(SystemExit) as e:
        episode.main(["build", tree.slug])
    assert e.value.code == 2


def test_script_co_chuong_khong_khai_bao_thi_loi_va_khong_ghi_timeline(
        tmp_path, spy, monkeypatch):
    doc = small_script()
    doc["scenes"][1]["chapter"] = "khong-khai-bao"
    tree = make_small(tmp_path, doc)
    assert run(tree, monkeypatch) != 0
    assert not (tree.out_dir / "timeline.json").exists()


def test_nhip_text_dai_hon_100_ky_tu_thi_loi(tmp_path, spy, monkeypatch):
    doc = small_script()
    doc["scenes"][0]["beats"][0]["text"] = "a" * 101
    tree = make_small(tmp_path, doc)
    assert run(tree, monkeypatch) != 0
    assert not (tree.out_dir / "timeline.json").exists()


def test_id_nhip_trung_thi_loi(tmp_path, spy, monkeypatch):
    doc = small_script()
    doc["scenes"][2]["beats"][0]["id"] = "b001"
    tree = make_small(tmp_path, doc)
    assert run(tree, monkeypatch) != 0
    assert not (tree.out_dir / "timeline.json").exists()


# ------------------------------------------------------ file khoá, bất biến
def test_khong_doi_file_nao_trong_video_public_so_voi_main():
    out = subprocess.run(
        ["git", "-C", str(ROOT), "diff", "--name-only", "main", "--",
         "video/public"],
        capture_output=True, text=True, check=True,
    ).stdout.strip()
    assert out == ""


# ------------------------------------------------- cache hỏng hoặc dở dang
def _cache_file(tree, text):
    from aivideo.audio import _cache_key

    key = _cache_key("fake", "giong-thu", 1.25, text)
    return tree.out_dir / "cache" / f"{key}.wav"


def _corrupt_truncate(path):
    data = path.read_bytes()
    path.write_bytes(data[: len(data) // 2])


def _corrupt_garbage(path):
    path.write_bytes(b"\x00\xffkhong-phai-wav" * 50)


def _corrupt_empty(path):
    path.write_bytes(b"")


def _corrupt_header_only(path):
    path.write_bytes(path.read_bytes()[:44])


CORRUPTIONS = {
    "cat_ngan_mot_nua": _corrupt_truncate,
    "ghi_rac": _corrupt_garbage,
    "file_rong": _corrupt_empty,
    "chi_con_header": _corrupt_header_only,
}


@pytest.mark.parametrize("how", list(CORRUPTIONS))
def test_cache_hong_thi_chay_lai_tong_hop_lai_dung_nhip_do(
        small, spy, monkeypatch, how):
    ref_tl = small.timeline()
    ref_wav, _ = sf.read(str(small.out_dir / "narration.wav"))
    ref_srt = (small.out_dir / "video.srt").read_text("utf-8")
    victim = small_script()["scenes"][0]["beats"][1]["text"]
    path = _cache_file(small, victim)
    assert path.is_file()
    CORRUPTIONS[how](path)
    spy.clear()
    assert run(small, monkeypatch) == 0
    assert spy.texts == [victim]
    # Không ra tiếng cụt: kết quả giống hệt lần dựng sạch.
    assert small.timeline() == ref_tl
    assert (small.out_dir / "video.srt").read_text("utf-8") == ref_srt
    new_wav, _ = sf.read(str(small.out_dir / "narration.wav"))
    assert new_wav.shape == ref_wav.shape
    assert np.max(np.abs(new_wav - ref_wav)) < 1e-4


def test_cache_hong_duoc_ghi_de_bang_file_nguyen_ven(small, spy, monkeypatch):
    victim = small_script()["scenes"][2]["beats"][0]["text"]
    path = _cache_file(small, victim)
    good = sf.info(str(path)).frames
    _corrupt_truncate(path)
    assert run(small, monkeypatch) == 0
    assert sf.info(str(path)).frames == good
    spy.clear()
    assert run(small, monkeypatch) == 0
    assert spy.calls == []


def test_nhieu_cache_hong_cung_luc_chi_goi_lai_cac_nhip_hong(
        small, spy, monkeypatch):
    beats = small_script()["scenes"][0]["beats"]
    for beat, how in zip(beats, CORRUPTIONS.values()):
        how(_cache_file(small, beat["text"]))
    spy.clear()
    assert run(small, monkeypatch) == 0
    assert sorted(spy.texts) == sorted(b["text"] for b in beats)


def test_build_don_file_tmp_mo_coi_trong_cache_cua_tien_trinh_chet(
        small, spy, monkeypatch):
    cache = small.out_dir / "cache"
    victim = small_script()["scenes"][0]["beats"][0]["text"]
    key_file = _cache_file(small, victim)
    orphan = cache / f"{key_file.name}.99999.tmp"
    orphan.write_bytes(b"ghi dở dang")
    other = cache / "khac.wav.12345.tmp"
    other.write_bytes(b"")
    assert run(small, monkeypatch) == 0
    assert list(cache.glob("*.tmp")) == []
    assert key_file.is_file()
    assert len(list(cache.glob("*.wav"))) == 6


def test_build_khong_de_lai_file_tmp_sau_lan_dung_sach(small):
    assert list((small.out_dir / "cache").glob("*.tmp")) == []
