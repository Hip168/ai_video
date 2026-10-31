"""[1-5] tổng hợp / cắt lặng / ghép / loudnorm / cache và
[1-6] xuất SRT + timeline, `build` đầu cuối, với engine `fake`."""

from __future__ import annotations

import math

import numpy as np
import soundfile as sf

from conftest import (
    FPS,
    PLAIN_SEGMENTS,
    ffmpeg_loudness,
    make_project,
    parse_srt,
    run_build,
    seg,
)


def _built(tmp_path, monkeypatch, segments=None):
    project = make_project(tmp_path, segments or PLAIN_SEGMENTS)
    run_build(project, monkeypatch)
    return project


def _all_beats(timeline):
    return [b for s in timeline["scenes"] for b in s["beats"]]


# ---------------------------------------------------------------- [1-6]


def test_build_ghi_du_ba_file_dau_ra_o_dung_cho(tmp_path, monkeypatch):
    project = _built(tmp_path, monkeypatch)
    assert project.timeline_path.is_file()
    assert project.wav_path.is_file()
    assert project.srt_path.is_file()


def test_timeline_do_build_ghi_qua_validate_va_dung_hang_so(
    tmp_path, monkeypatch
):
    from aivideo.audio import validate_timeline

    timeline = _built(tmp_path, monkeypatch).timeline()
    assert validate_timeline(timeline) == []
    assert timeline["version"] == 1
    assert timeline["fps"] == FPS
    assert (timeline["width"], timeline["height"]) == (1920, 1080)
    assert timeline["audio"] == {"src": "audio/narration.wav"}


def test_timeline_gom_nhip_lien_nhau_cung_canh_dung_thu_tu(
    tmp_path, monkeypatch
):
    timeline = _built(tmp_path, monkeypatch).timeline()
    assert [s["id"] for s in timeline["scenes"]] == [
        "phone",
        "dns",
        "packets",
    ]
    assert [[b["id"] for b in s["beats"]] for s in timeline["scenes"]] == [
        ["a1", "a2"],
        ["a3", "a4"],
        ["a5"],
    ]
    assert [b["text"] for b in _all_beats(timeline)] == [
        s["text"] for s in PLAIN_SEGMENTS
    ]


def test_canh_dau_bat_dau_o_0_va_canh_sau_theo_beat_dau_tien(
    tmp_path, monkeypatch
):
    scenes = _built(tmp_path, monkeypatch).timeline()["scenes"]
    assert scenes[0]["startFrame"] == 0
    for scene in scenes[1:]:
        assert scene["startFrame"] == scene["beats"][0]["startFrame"]


def test_cue_chi_xuat_hien_o_nhip_co_cue_trong_kich_ban(tmp_path, monkeypatch):
    beats = _all_beats(_built(tmp_path, monkeypatch).timeline())
    expected = {s["id"]: s.get("cue") for s in PLAIN_SEGMENTS}
    assert {b["id"]: b.get("cue") for b in beats} == expected


def test_do_dai_beat_tang_theo_do_dai_loi_doc(tmp_path, monkeypatch):
    beats = _all_beats(_built(tmp_path, monkeypatch).timeline())
    by_len = sorted(beats, key=lambda b: len(b["text"]))
    durations = [b["durationFrames"] for b in by_len]
    assert durations == sorted(durations)
    assert durations[-1] > durations[0] + 10


def test_khoang_nghi_giua_hai_nhip_bang_pause_ms(tmp_path, monkeypatch):
    beats = _all_beats(_built(tmp_path, monkeypatch).timeline())
    for prev, nxt, source in zip(beats, beats[1:], PLAIN_SEGMENTS):
        gap = nxt["startFrame"] - (prev["startFrame"] + prev["durationFrames"])
        expected = source["pause_ms"] * FPS / 1000
        assert abs(gap - expected) <= 2, (prev["id"], gap, expected)


def test_wav_la_pcm16_mono_48khz(tmp_path, monkeypatch):
    info = sf.info(str(_built(tmp_path, monkeypatch).wav_path))
    assert info.samplerate == 48000
    assert info.channels == 1
    assert info.subtype == "PCM_16"


def test_do_dai_wav_khop_durationInFrames_trong_1_frame(tmp_path, monkeypatch):
    project = _built(tmp_path, monkeypatch)
    timeline = project.timeline()
    info = sf.info(str(project.wav_path))
    seconds = info.frames / info.samplerate
    # Luật 9: durationInFrames = ceil((giây âm thanh + 0,5) * 30).
    assert timeline["durationInFrames"] == math.ceil((seconds + 0.5) * FPS)
    assert abs(seconds * FPS - (timeline["durationInFrames"] - 0.5 * FPS)) <= 1


def test_nhip_cuoi_ket_thuc_khong_qua_do_dai_wav_hon_1_frame(
    tmp_path, monkeypatch
):
    project = _built(tmp_path, monkeypatch)
    last = _all_beats(project.timeline())[-1]
    info = sf.info(str(project.wav_path))
    wav_frames = info.frames / info.samplerate * FPS
    assert last["startFrame"] + last["durationFrames"] <= wav_frames + 1


def test_srt_dung_dinh_dang_so_cue_bang_so_nhip(tmp_path, monkeypatch):
    project = _built(tmp_path, monkeypatch)
    cues = parse_srt(project.srt_path.read_text(encoding="utf-8"))
    assert len(cues) == len(PLAIN_SEGMENTS)
    assert [c["index"] for c in cues] == list(range(1, len(cues) + 1))
    for cue in cues:
        assert cue["end_ms"] > cue["start_ms"]


def test_srt_cung_chu_cung_thu_tu_voi_timeline(tmp_path, monkeypatch):
    project = _built(tmp_path, monkeypatch)
    cues = parse_srt(project.srt_path.read_text(encoding="utf-8"))
    beats = _all_beats(project.timeline())
    assert [c["text"] for c in cues] == [b["text"] for b in beats]


def test_srt_moc_khop_timeline_trong_nua_frame(tmp_path, monkeypatch):
    project = _built(tmp_path, monkeypatch)
    cues = parse_srt(project.srt_path.read_text(encoding="utf-8"))
    beats = _all_beats(project.timeline())
    # Nhịp lấy tròn về frame (sai tối đa 1/60 s = 16,7 ms) + làm tròn ms.
    tolerance_ms = 18
    for cue, beat in zip(cues, beats):
        start = beat["startFrame"] * 1000 / FPS
        end = (beat["startFrame"] + beat["durationFrames"]) * 1000 / FPS
        assert abs(cue["start_ms"] - start) <= tolerance_ms, beat["id"]
        assert abs(cue["end_ms"] - end) <= tolerance_ms, beat["id"]


# ---------------------------------------------------------------- [1-5]


def test_ket_qua_loudnorm_la_16_lufs_cong_tru_1_va_peak_duoi_1_5(
    tmp_path, monkeypatch
):
    project = _built(tmp_path, monkeypatch)
    lufs, true_peak = ffmpeg_loudness(project.wav_path)
    assert -17.0 <= lufs <= -15.0, lufs
    assert true_peak <= -1.5, true_peak


def test_lang_thua_moi_dau_nhip_va_cuoi_nhip_khong_qua_100ms(
    tmp_path, monkeypatch
):
    project = _built(tmp_path, monkeypatch)
    data, rate = sf.read(str(project.wav_path), dtype="float32")
    loud = np.abs(data)
    threshold = 0.05 * float(loud.max())
    # Mốc beat làm tròn về frame nên cho thêm 1/60 s mỗi phía.
    limit = 0.1 + 1 / 60
    for beat in _all_beats(project.timeline()):
        a = round(beat["startFrame"] / FPS * rate)
        b = round((beat["startFrame"] + beat["durationFrames"]) / FPS * rate)
        window = np.flatnonzero(loud[a:b] > threshold)
        assert window.size > 0, f"nhịp {beat['id']} không có tiếng"
        lead = window[0] / rate
        tail = (b - a - 1 - window[-1]) / rate
        assert lead <= limit, (beat["id"], "lặng đầu", lead)
        assert tail <= limit, (beat["id"], "lặng cuối", tail)


def test_khoang_nghi_giua_cac_nhip_la_im_lang_that(tmp_path, monkeypatch):
    project = _built(tmp_path, monkeypatch)
    data, rate = sf.read(str(project.wav_path), dtype="float32")
    loud = np.abs(data)
    threshold = 0.05 * float(loud.max())
    beats = _all_beats(project.timeline())
    checked = 0
    for prev, nxt in zip(beats, beats[1:]):
        a = round((prev["startFrame"] + prev["durationFrames"]) / FPS * rate)
        b = round(nxt["startFrame"] / FPS * rate)
        assert b - a > 4
        assert float(loud[a + 2 : b - 2].max()) <= threshold
        checked += 1
    assert checked == len(PLAIN_SEGMENTS) - 1


def test_chay_lan_hai_khong_goi_lai_synth(tmp_path, monkeypatch):
    project = make_project(tmp_path, PLAIN_SEGMENTS)
    run_build(project, monkeypatch)
    assert len(project.calls) == len(PLAIN_SEGMENTS)
    assert project.cache_dir.is_dir()
    assert any(project.cache_dir.iterdir())
    first_wav = project.wav_path.read_bytes()
    project.calls.clear()
    run_build(project, monkeypatch)
    assert project.calls == []
    assert project.wav_path.read_bytes() == first_wav


def test_sua_mot_nhip_chi_goi_synth_dung_mot_lan(tmp_path, monkeypatch):
    project = make_project(tmp_path, PLAIN_SEGMENTS)
    run_build(project, monkeypatch)
    project.calls.clear()
    edited = [dict(s) for s in PLAIN_SEGMENTS]
    edited[3]["text"] = "Câu số bốn đã được sửa lại hoàn toàn"
    project.write_script(edited)
    run_build(project, monkeypatch)
    assert project.calls == ["Câu số bốn đã được sửa lại hoàn toàn"]
    texts = [b["text"] for b in _all_beats(project.timeline())]
    assert texts == [s["text"] for s in edited]


def test_doi_pause_ms_khong_goi_lai_synth_nhung_doi_moc_thoi_gian(
    tmp_path, monkeypatch
):
    project = make_project(tmp_path, PLAIN_SEGMENTS)
    run_build(project, monkeypatch)
    before = _all_beats(project.timeline())
    project.calls.clear()
    edited = [dict(s) for s in PLAIN_SEGMENTS]
    edited[0]["pause_ms"] = 1200
    project.write_script(edited)
    run_build(project, monkeypatch)
    after = _all_beats(project.timeline())
    assert project.calls == []
    assert after[1]["startFrame"] > before[1]["startFrame"] + 20


def test_doi_giong_phai_tong_hop_lai_toan_bo(tmp_path, monkeypatch):
    project = make_project(tmp_path, PLAIN_SEGMENTS)
    run_build(project, monkeypatch, voice="giong-1")
    project.calls.clear()
    run_build(project, monkeypatch, voice="giong-2")
    assert len(project.calls) == len(PLAIN_SEGMENTS)


def test_hai_nhip_cung_loi_doc_dung_cache_goi_synth_mot_lan(
    tmp_path, monkeypatch
):
    segments = [
        seg("d1", "phone", "Câu lặp lại y hệt"),
        seg("d2", "phone", "Câu lặp lại y hệt"),
    ]
    project = make_project(tmp_path, segments)
    run_build(project, monkeypatch)
    assert project.calls == ["Câu lặp lại y hệt"]
