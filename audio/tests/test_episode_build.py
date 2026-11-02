"""[5-1] [5-3] Dựng tập bằng `aivideo.episode` với engine `fake`.

Giao diện: `5-dung-tap-giao-dien.md`. `aivideo.episode.main(argv) -> int`
chạy với cwd = `audio/`; đọc `../episodes/<slug>/script.json`,
`../content/lexicon.json`; ghi `../out/episodes/<slug>/{timeline.json,
narration.wav,video.srt,chapters.txt,cache/}`.
"""

from __future__ import annotations

import hashlib
import json
import math
import re
import shutil
from pathlib import Path

import numpy as np
import pytest
import soundfile as sf

from aivideo import audio, engines, episode
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


def test_duration_tap_nho_theo_luat_11_va_qua_validator_hop_dong(small):
    from aivideo.episode import validate_timeline2

    d = sf.info(str(small.out_dir / "narration.wav")).duration
    tl = small.timeline()
    assert tl["durationInFrames"] == math.ceil((d + 0.5) * FPS)
    assert validate_timeline2(tl, None, d) == []


def test_in_dong_tong_ket_timeline_ra_stdout(tmp_path, spy, monkeypatch, capsys):
    tree = make_small(tmp_path)
    assert run(tree, monkeypatch) == 0
    frames = tree.timeline()["durationInFrames"]
    assert f"timeline: {frames} frame" in capsys.readouterr().out


def test_cue_cua_nhip_di_vao_timeline_nhip_khong_cue_thi_khong_co(small):
    beats = [b for s in small.timeline()["scenes"] for b in s["beats"]]
    assert beats[0]["cue"] == "hook"
    assert all("cue" not in b for b in beats[1:])


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


# ------------------------------------------------------ file khoá, bất biến
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
    orphan.write_bytes("ghi dở dang".encode())
    other = cache / "khac.wav.12345.tmp"
    other.write_bytes(b"")
    assert run(small, monkeypatch) == 0
    assert list(cache.glob("*.tmp")) == []
    assert key_file.is_file()
    assert len(list(cache.glob("*.wav"))) == 6




# ============================================================ vòng sửa 1
SFX_NAMES = {"pop", "tick", "whoosh", "ding", "buzz"}


def _run_err(tree, monkeypatch, capsys, *extra, **kw):
    capsys.readouterr()
    code = run(tree, monkeypatch, *extra, **kw)
    return code, capsys.readouterr().err


def _beats(tl):
    return [b for s in tl["scenes"] for b in s["beats"]]


def _tree_hash(root):
    h = hashlib.sha256()
    for p in sorted(root.rglob("*")):
        h.update(str(p.relative_to(root)).encode())
        if p.is_file():
            h.update(p.read_bytes())
    return h.hexdigest()


# ---- 1. không ghi vào video/public (băm thật, không cần git) -------------
def test_build_khong_doi_mot_byte_nao_trong_video_public(
        tmp_path, spy, monkeypatch):
    tree = make_small(tmp_path)
    pub = tree.base / "video" / "public"
    (pub / "audio").mkdir(parents=True)
    (pub / "timeline.json").write_text('{"giu": "nguyen"}', encoding="utf-8")
    (pub / "audio" / "narration.wav").write_bytes(b"RIFF-gia-lap")
    (pub / "fonts.txt").write_text("khong-bi-git-theo-doi", encoding="utf-8")
    before = _tree_hash(pub)
    assert run(tree, monkeypatch) == 0
    assert _tree_hash(pub) == before
    assert not list((tree.base / "video").glob("**/*.srt"))


# ---- 2. spoken ghi đè hoàn toàn --------------------------------------------
def _spoken_tree(tmp_path, spoken):
    doc = small_script()
    doc["scenes"][0]["beats"][0]["text"] = "Router chạy 3,5 GHz"
    doc["scenes"][0]["beats"][0]["spoken"] = spoken
    tree = make_small(tmp_path, doc)
    (tree.base / "content" / "lexicon.json").write_text(
        json.dumps({"router": "râu tơ"}), encoding="utf-8")
    return tree


def test_spoken_dung_nguyen_van_khong_qua_normalize_vi_va_lexicon(
        tmp_path, spy, monkeypatch):
    tree = _spoken_tree(tmp_path, "Router 3,5 GHz đọc Y NGUYÊN 42")
    assert run(tree, monkeypatch) == 0
    assert "Router 3,5 GHz đọc Y NGUYÊN 42" in spy.texts
    assert not any("râu tơ" in t or "phẩy" in t for t in spy.texts[:1])


def test_srt_va_timeline_giu_text_goc_khi_co_spoken(
        tmp_path, spy, monkeypatch):
    tree = _spoken_tree(tmp_path, "xin chào")
    assert run(tree, monkeypatch) == 0
    first = parse_srt(tree.out_dir / "video.srt")[0][2]
    assert first == "Router chạy 3,5 GHz"
    assert _beats(tree.timeline())[0]["text"] == "Router chạy 3,5 GHz"


@pytest.mark.parametrize("empty", ["", None])
def test_spoken_rong_hoac_null_thi_doc_text_da_chuan_hoa(
        tmp_path, spy, monkeypatch, empty):
    tree = _spoken_tree(tmp_path, empty)
    assert run(tree, monkeypatch) == 0
    assert "" not in spy.texts
    first = spy.texts[0].lower()
    assert "râu tơ" in first and "ba phẩy năm" in first
    assert not re.search(r"[0-9]", first)


# ---- 3. build có chuẩn hoá số trước khi gửi engine -----------------------
def test_chuoi_gui_engine_da_duoc_doc_so_thanh_chu(
        tmp_path, spy, monkeypatch):
    doc = small_script()
    doc["scenes"][0]["beats"][0]["text"] = "Tốc độ 3,14 GHz, tăng 50% từ 1995"
    tree = make_small(tmp_path, doc)
    assert run(tree, monkeypatch) == 0
    sent = spy.texts[0]
    assert not re.search(r"[0-9]", sent), sent
    assert "ba phẩy mười bốn gi-ga-héc" in sent
    assert "năm mươi phần trăm" in sent
    assert "một nghìn chín trăm chín mươi lăm" in sent


# ---- 4. khoảng nghỉ pause_ms ---------------------------------------------
def _pause_script(pauses):
    doc = small_script()
    beats = [b for s in doc["scenes"] for b in s["beats"]]
    for b, p in zip(beats, pauses):
        b["pause_ms"] = p
    return doc


def test_khoang_nghi_dung_pause_ms_tung_nhip_ke_ca_qua_canh_va_truoc_canh_cam(
        tmp_path, spy, monkeypatch):
    # b001..b006; b003 là nhịp cuối cảnh sc01 (sau đó là cảnh câm sc02),
    # b004 là nhịp đầu cảnh sc03.
    pauses = [300, 900, 1500, 0, 600, 2000]
    tree = make_small(tmp_path, _pause_script(pauses))
    assert run(tree, monkeypatch) == 0
    tl = tree.timeline()
    b = _beats(tl)
    for i in (0, 1, 3, 4):  # hai nhịp cùng cảnh
        gap = b[i + 1]["startFrame"] - (b[i]["startFrame"] + b[i]["durationFrames"])
        assert abs(gap - round(pauses[i] * FPS / 1000)) <= 1, (b[i]["id"], gap)
    # pause 1500 ms của b003 nằm TRƯỚC cảnh câm: cảnh câm bắt đầu sau nghỉ
    sc01, sc02, sc03 = tl["scenes"]
    end3 = b[2]["startFrame"] + b[2]["durationFrames"]
    assert abs(sc02["startFrame"] - end3 - 45) <= 1
    assert sc02["durationFrames"] == 90
    # b004 (đầu cảnh sc03) bắt đầu ngay sau cảnh câm, pause b003 không lặp lại
    assert abs(b[3]["startFrame"] - (sc02["startFrame"] + 90)) <= 1


def test_khoang_nghi_qua_ranh_gioi_canh_giua_hai_canh_co_nhip(
        tmp_path, spy, monkeypatch):
    doc = small_script()
    # bỏ cảnh câm: b003 (cuối sc01) liền kề b004 (đầu sc03)
    doc["scenes"] = [doc["scenes"][0], doc["scenes"][2]]
    doc["scenes"][1]["chapter"] = "mo-dau"
    doc["chapters"] = doc["chapters"][:1]
    doc["scenes"][0]["beats"][2]["pause_ms"] = 1200
    tree = make_small(tmp_path, doc)
    assert run(tree, monkeypatch) == 0
    b = _beats(tree.timeline())
    gap = b[3]["startFrame"] - (b[2]["startFrame"] + b[2]["durationFrames"])
    assert abs(gap - 36) <= 1, gap


def test_khong_chen_khoang_nghi_sau_nhip_cuoi_tap(tmp_path, spy, monkeypatch):
    pauses = [300] * 5 + [5000]
    tree = make_small(tmp_path, _pause_script(pauses))
    assert run(tree, monkeypatch) == 0
    tl = tree.timeline()
    last = _beats(tl)[-1]
    tail = tl["durationInFrames"] - (last["startFrame"] + last["durationFrames"])
    assert tail <= 15 + 2, tail  # chỉ 0,5 giây đệm, không có 5 giây nghỉ
    info = sf.info(str(tree.out_dir / "narration.wav"))
    assert info.duration * FPS - (last["startFrame"] + last["durationFrames"]) <= 2


# ---- 5. loudness -----------------------------------------------------------
def test_narration_wav_dat_minus_16_lufs_dung_sai_1_lu(small):
    lufs = audio.measure_lufs(small.out_dir / "narration.wav")
    assert abs(lufs - (-16)) <= 1, lufs


def test_template_narration_wav_dat_minus_16_lufs(template_build):
    tree, _, _ = template_build
    lufs = audio.measure_lufs(tree.out_dir / "narration.wav")
    assert abs(lufs - (-16)) <= 1, lufs


# ---- 6. sfx ----------------------------------------------------------------
def _sfx_script():
    doc = small_script()
    doc["scenes"][0]["sfx"] = "whoosh"
    doc["scenes"][1]["sfx"] = "ding"  # cảnh câm, KHÔNG ở frame 0
    doc["scenes"][2]["sfx"] = "tick"
    doc["scenes"][2]["beats"][0]["sfx"] = "buzz"  # cùng frame với sfx cảnh
    doc["scenes"][2]["beats"][1]["sfx"] = "pop"
    return doc


def test_sfx_canh_o_startframe_canh_khac_0_va_gain_dung_minus_18(
        tmp_path, spy, monkeypatch):
    tree = make_small(tmp_path, _sfx_script())
    assert run(tree, monkeypatch) == 0
    tl = tree.timeline()
    sc01, sc02, sc03 = tl["scenes"]
    assert sc02["startFrame"] > 0 and sc03["startFrame"] > sc02["startFrame"]
    got = [(f["frame"], f["name"]) for f in tl["sfx"]]
    assert got == [
        (0, "whoosh"),
        (sc02["startFrame"], "ding"),
        (sc03["startFrame"], "tick"),
        (sc03["beats"][0]["startFrame"], "buzz"),
        (sc03["beats"][1]["startFrame"], "pop"),
    ]
    assert [f["gainDb"] for f in tl["sfx"]] == [-18] * 5


def test_sfx_cung_frame_scene_truoc_beat_sau_thu_tu_on_dinh(
        tmp_path, spy, monkeypatch):
    tree = make_small(tmp_path, _sfx_script())
    assert run(tree, monkeypatch) == 0
    tl = tree.timeline()
    sc03 = tl["scenes"][2]
    if sc03["beats"][0]["startFrame"] == sc03["startFrame"]:
        names = [f["name"] for f in tl["sfx"] if f["frame"] == sc03["startFrame"]]
        assert names == ["tick", "buzz"]


def test_template_chi_dung_ten_sfx_trong_danh_sach_hop_dong():
    script = json.loads((TEMPLATE_DIR / "script.json").read_text("utf-8"))
    used = set()
    for sc in script["scenes"]:
        used.add(sc.get("sfx"))
        used.update(b.get("sfx") for b in sc["beats"])
    used.discard(None)
    assert used and used <= SFX_NAMES, used - SFX_NAMES


# ---- 7. chapters.txt và cảnh báo chương ngắn -----------------------------
def _tl_with_chapters(starts_s, total_s):
    return {
        "durationInFrames": total_s * FPS,
        "chapters": [
            {"id": f"c{i}", "title": f"Chương {i}", "startFrame": s * FPS}
            for i, s in enumerate(starts_s)
        ],
    }


def test_chapters_txt_duoi_1_gio_dung_mm_ss():
    txt = episode.chapters_txt(_tl_with_chapters([0, 65, 599, 3599], 3599))
    assert txt == "00:00 Chương 0\n01:05 Chương 1\n09:59 Chương 2\n59:59 Chương 3\n"


def test_chapters_txt_tu_dung_1_gio_dung_h_mm_ss():
    txt = episode.chapters_txt(
        _tl_with_chapters([0, 3000, 3600, 7325, 36000], 40000))
    lines = txt.split("\n")
    assert "1:00:00 Chương 2" in lines
    assert "2:02:05 Chương 3" in lines
    assert "10:00:00 Chương 4" in lines
    assert lines[-1] == "" and txt.endswith("\n")


def test_chapters_txt_cat_xuong_giay_khong_lam_tron():
    tl = _tl_with_chapters([0], 100)
    tl["chapters"].append({"id": "x", "title": "Lẻ", "startFrame": 89})
    assert episode.chapters_txt(tl).split("\n")[1] == "00:02 Lẻ"


def test_chuong_duoi_10_giay_in_canh_bao_stderr_nhung_van_xong(
        tmp_path, spy, monkeypatch, capsys):
    tree = make_small(tmp_path)
    code, err = _run_err(tree, monkeypatch, capsys)
    assert code == 0
    assert "cảnh báo: chương 'mo-dau'" in err and "10 giây" in err
    assert (tree.out_dir / "timeline.json").is_file()


def test_tap_mau_khong_co_canh_bao_chuong_ngan(tmp_path, spy, monkeypatch, capsys):
    tree = Tree(tmp_path, "_template")
    shutil.copytree(TEMPLATE_DIR, tree.ep_dir, dirs_exist_ok=True)
    code, err = _run_err(tree, monkeypatch, capsys)
    assert code == 0
    assert "cảnh báo: chương" not in err


# ---- 9. ghi cache nguyên tử ------------------------------------------------
def _atomic_dir(tmp_path):
    d = tmp_path / "cache"
    d.mkdir()
    return d


def _state(d):
    return sorted(p.name for p in d.iterdir())


def test_ghi_cache_thanh_cong_chi_con_dung_mot_file_wav_nguyen_ven(tmp_path):
    d = _atomic_dir(tmp_path)
    wav, sr = episode._synth_cached(d, "fake", "v", 1.0, "xin chào bạn")
    files = _state(d)
    assert len(files) == 1 and files[0].endswith(".wav")
    assert sf.info(str(d / files[0])).frames == len(wav)
    assert sf.info(str(d / files[0])).samplerate == sr


def test_sf_write_hong_giua_chung_khong_de_lai_wav_hay_tmp(
        tmp_path, monkeypatch):
    d = _atomic_dir(tmp_path)
    real = sf.write

    def half_then_die(file, data, sr, **kw):
        real(file, data, sr, **kw)
        Path(file).write_bytes(Path(file).read_bytes()[:30])  # file dở
        raise OSError("đầy ổ đĩa")

    monkeypatch.setattr(episode.sf, "write", half_then_die)
    with pytest.raises(OSError):
        episode._synth_cached(d, "fake", "v", 1.0, "xin chào bạn")
    assert _state(d) == []


def test_os_replace_hong_khong_de_lai_wav_hay_tmp(tmp_path, monkeypatch):
    d = _atomic_dir(tmp_path)

    def boom(src, dst):
        raise OSError("không đổi tên được")

    monkeypatch.setattr(episode.os, "replace", boom)
    with pytest.raises(OSError):
        episode._synth_cached(d, "fake", "v", 1.0, "xin chào bạn")
    assert _state(d) == []


def test_sau_loi_ghi_cache_lan_chay_sau_tong_hop_lai_binh_thuong(
        tmp_path, monkeypatch):
    d = _atomic_dir(tmp_path)
    monkeypatch.setattr(
        episode.os, "replace",
        lambda s, t: (_ for _ in ()).throw(OSError("x")))
    with pytest.raises(OSError):
        episode._synth_cached(d, "fake", "v", 1.0, "xin chào bạn")
    monkeypatch.undo()
    wav, _ = episode._synth_cached(d, "fake", "v", 1.0, "xin chào bạn")
    assert len(wav) > 0 and len(_state(d)) == 1


def test_build_khong_de_lai_tmp_nao_va_moi_wav_cache_nguyen_ven(small):
    cache = small.out_dir / "cache"
    assert list(cache.glob("*.tmp")) == []
    wavs = list(cache.glob("*.wav"))
    assert len(wavs) == 6
    assert all(sf.info(str(w)).frames > 0 for w in wavs)


# ---- 10. mã thoát và thông báo lỗi ------------------------------------------
def _expect_error(tree, monkeypatch, capsys, code_want=1, **kw):
    code, err = _run_err(tree, monkeypatch, capsys, **kw)
    assert code == code_want
    if code_want == 1:
        assert err.startswith("lỗi:") or "\nlỗi:" in err, err
    assert not (tree.out_dir / "timeline.json").exists()
    return err


def test_slug_sai_dinh_dang_ma_1_va_in_loi(tmp_path, spy, monkeypatch, capsys):
    tree = make_small(tmp_path)
    for bad in ("Tap_Sai", "_khac", "a--b", "a-", "a b"):
        tree.slug = bad
        (tree.base / "episodes" / bad).mkdir(parents=True, exist_ok=True)
        shutil.copy(tree.base / "episodes" / "tap-thu" / "script.json",
                    tree.base / "episodes" / bad / "script.json")
        _expect_error(tree, monkeypatch, capsys)
    assert spy.calls == []


def test_tap_khong_ton_tai_ma_1_khong_goi_engine(
        tmp_path, spy, monkeypatch, capsys):
    tree = make_small(tmp_path)
    tree.slug = "khong-co"
    _expect_error(tree, monkeypatch, capsys)
    assert spy.calls == []


def test_chuong_khong_khai_bao_ma_1(tmp_path, spy, monkeypatch, capsys):
    doc = small_script()
    doc["scenes"][1]["chapter"] = "khong-khai-bao"
    _expect_error(make_small(tmp_path, doc), monkeypatch, capsys)


def test_text_dai_101_ky_tu_ma_1_con_100_thi_duoc(
        tmp_path, spy, monkeypatch, capsys):
    doc = small_script()
    doc["scenes"][0]["beats"][0]["text"] = "a" * 101
    _expect_error(make_small(tmp_path / "x", doc), monkeypatch, capsys)
    doc["scenes"][0]["beats"][0]["text"] = "a" * 100
    ok = make_small(tmp_path / "y", doc)
    assert run(ok, monkeypatch) == 0


def test_id_nhip_trung_ma_1(tmp_path, spy, monkeypatch, capsys):
    doc = small_script()
    doc["scenes"][2]["beats"][0]["id"] = "b001"
    _expect_error(make_small(tmp_path, doc), monkeypatch, capsys)


def test_id_nhip_sai_kieu_ma_1(tmp_path, spy, monkeypatch, capsys):
    doc = small_script()
    doc["scenes"][0]["beats"][0]["id"] = 7
    _expect_error(make_small(tmp_path, doc), monkeypatch, capsys)


def test_tap_toan_canh_cam_ma_1_khong_goi_engine(
        tmp_path, spy, monkeypatch, capsys):
    doc = small_script()
    doc["chapters"] = doc["chapters"][:1]
    doc["scenes"] = [{"id": "sc01", "chapter": "mo-dau",
                      "type": "chapter-title", "props": {}, "holdMs": 2000,
                      "sfx": None, "beats": []}]
    _expect_error(make_small(tmp_path, doc), monkeypatch, capsys)
    assert spy.calls == []


def test_ten_sfx_ngoai_hop_dong_ma_1(tmp_path, spy, monkeypatch, capsys):
    doc = small_script()
    doc["scenes"][0]["sfx"] = "chime"
    _expect_error(make_small(tmp_path, doc), monkeypatch, capsys)


def test_script_json_khong_phai_json_ma_1_khong_traceback(
        tmp_path, spy, monkeypatch, capsys):
    tree = make_small(tmp_path)
    (tree.ep_dir / "script.json").write_text("{khong phai json", "utf-8")
    err = _expect_error(tree, monkeypatch, capsys)
    assert "Traceback" not in err


def test_engine_la_va_thieu_slug_thoat_ma_2(tmp_path, monkeypatch):
    tree = make_small(tmp_path)
    monkeypatch.chdir(tree.base / "audio")
    for argv in (["build", tree.slug, "--engine", "khong-co"],
                 ["build", "--engine", "fake"],
                 ["build", tree.slug, "--engine", "fake", "--speed", "nhanh"]):
        with pytest.raises(SystemExit) as e:
            episode.main(argv)
        assert e.value.code == 2, argv
