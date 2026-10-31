"""[1-5] tổng hợp / cắt lặng / ghép / loudnorm / cache và
[1-6] xuất SRT + timeline, `build` đầu cuối, với engine `fake`."""

from __future__ import annotations

import json
import math
import re

import numpy as np
import pytest
import soundfile as sf

from aivideo.audio import (
    srt_timestamp,
    validate_timeline,
    write_srt,
)
from conftest import (
    FPS,
    PLAIN_SEGMENTS,
    ROOT,
    ffmpeg_loudness,
    make_project,
    parse_srt,
    seg,
)


def _all_beats(timeline):
    return [b for s in timeline["scenes"] for b in s["beats"]]


@pytest.fixture
def built(project):
    project.build()
    return project


# ---------------------------------------------------------------- [1-6]


def test_build_tra_dict_bang_timeline_da_ghi(project):
    result = project.build()
    assert isinstance(result, dict)
    assert result == json.loads(project.timeline_path.read_text("utf-8"))


def test_build_ghi_du_ba_file_dau_ra_o_dung_cho(built):
    assert built.timeline_path.is_file()
    assert built.wav_path.is_file()
    assert built.srt_path.is_file()


def test_timeline_do_build_ghi_qua_validate_va_dung_hang_so(built):
    timeline = built.timeline()
    assert validate_timeline(timeline) == []
    assert timeline["version"] == 1
    assert timeline["fps"] == FPS
    assert (timeline["width"], timeline["height"]) == (1920, 1080)
    assert timeline["audio"] == {"src": "audio/narration.wav"}


def test_timeline_gom_nhip_lien_nhau_cung_canh_dung_thu_tu(built):
    timeline = built.timeline()
    assert [s["id"] for s in timeline["scenes"]] == ["phone", "dns", "packets"]
    assert [[b["id"] for b in s["beats"]] for s in timeline["scenes"]] == [
        ["a1", "a2"],
        ["a3", "a4"],
        ["a5"],
    ]
    assert [b["text"] for b in _all_beats(timeline)] == [
        s["text"] for s in PLAIN_SEGMENTS
    ]


def test_canh_dau_bat_dau_o_0_va_canh_sau_theo_beat_dau_tien(built):
    scenes = built.timeline()["scenes"]
    assert scenes[0]["startFrame"] == 0
    for scene in scenes[1:]:
        assert scene["startFrame"] == scene["beats"][0]["startFrame"]


def test_cue_chi_co_o_nhip_co_cue_nhip_khac_khong_co_khoa_cue(built):
    beats = _all_beats(built.timeline())
    for beat, source in zip(beats, PLAIN_SEGMENTS):
        if "cue" in source:
            assert beat["cue"] == source["cue"]
        else:
            assert "cue" not in beat, beat["id"]


def test_do_dai_beat_tang_theo_do_dai_loi_doc(built):
    beats = _all_beats(built.timeline())
    by_len = sorted(beats, key=lambda b: len(b["text"]))
    durations = [b["durationFrames"] for b in by_len]
    assert durations == sorted(durations)
    assert durations[-1] > durations[0] + 10


def test_khoang_nghi_giua_hai_nhip_bang_pause_ms_sai_toi_da_1_frame(built):
    beats = _all_beats(built.timeline())
    for prev, nxt, source in zip(beats, beats[1:], PLAIN_SEGMENTS):
        gap = nxt["startFrame"] - (prev["startFrame"] + prev["durationFrames"])
        expected = source["pause_ms"] * FPS / 1000
        assert abs(gap - expected) <= 1, (prev["id"], gap, expected)


def test_wav_la_pcm16_mono_48khz(built):
    info = sf.info(str(built.wav_path))
    assert info.samplerate == 48000
    assert info.channels == 1
    assert info.subtype == "PCM_16"


def test_do_dai_wav_khop_durationInFrames_trong_1_frame(built):
    timeline = built.timeline()
    info = sf.info(str(built.wav_path))
    seconds = info.frames / info.samplerate
    assert timeline["durationInFrames"] == math.ceil((seconds + 0.5) * FPS)
    assert abs(seconds * FPS - (timeline["durationInFrames"] - 15)) <= 1


def test_nhip_cuoi_ket_thuc_dung_do_dai_wav_khong_chen_nghi(built):
    last = _all_beats(built.timeline())[-1]
    info = sf.info(str(built.wav_path))
    wav_frames = info.frames / info.samplerate * FPS
    # Hai chiều: nhịp cuối không bị chèn khoảng nghỉ (pause_ms=200 ≈ 6 frame).
    assert abs(last["startFrame"] + last["durationFrames"] - wav_frames) <= 1


def test_srt_dung_dinh_dang_so_cue_bang_so_nhip(built):
    cues = parse_srt(built.srt_path.read_text(encoding="utf-8"))
    assert len(cues) == len(PLAIN_SEGMENTS)
    assert [c["index"] for c in cues] == list(range(1, len(cues) + 1))
    for cue in cues:
        assert cue["end_ms"] > cue["start_ms"]


def test_srt_cung_chu_cung_thu_tu_voi_timeline(built):
    cues = parse_srt(built.srt_path.read_text(encoding="utf-8"))
    beats = _all_beats(built.timeline())
    assert [c["text"] for c in cues] == [b["text"] for b in beats]


def test_srt_moc_khop_timeline_trong_1_ms(built):
    cues = parse_srt(built.srt_path.read_text(encoding="utf-8"))
    beats = _all_beats(built.timeline())
    for cue, beat in zip(cues, beats):
        start = beat["startFrame"] * 1000 / FPS
        end = (beat["startFrame"] + beat["durationFrames"]) * 1000 / FPS
        assert abs(cue["start_ms"] - start) <= 1, beat["id"]
        assert abs(cue["end_ms"] - end) <= 1, beat["id"]


def test_srt_cue_cach_nhau_dung_mot_dong_trong(built):
    raw = built.srt_path.read_text(encoding="utf-8")
    assert raw.count("\n\n") == len(PLAIN_SEGMENTS) - 1
    assert "\n\n\n" not in raw


@pytest.mark.parametrize(
    ("seconds", "expected"),
    [
        (0, "00:00:00,000"),
        (1.0, "00:00:01,000"),
        (59.9996, "00:01:00,000"),
        (3661.5, "01:01:01,500"),
        (0.0004, "00:00:00,000"),
        (2.3456, "00:00:02,346"),
    ],
)
def test_srt_timestamp_dinh_dang_va_lam_tron_ms(seconds, expected):
    assert srt_timestamp(seconds) == expected


def test_write_srt_ghi_dung_noi_dung(tmp_path):
    beats = [
        {
            "id": "x1",
            "startFrame": 30,
            "durationFrames": 60,
            "text": "Xin chào",
        },
        {
            "id": "x2",
            "startFrame": 105,
            "durationFrames": 15,
            "text": "Tạm biệt",
        },
    ]
    path = tmp_path / "t.srt"
    write_srt(beats, path, 30)
    assert path.read_text(encoding="utf-8") == (
        "1\n00:00:01,000 --> 00:00:03,000\nXin chào\n\n"
        "2\n00:00:03,500 --> 00:00:04,000\nTạm biệt\n"
    )


def test_build_dau_cuoi_voi_script_that_va_fake(tmp_path, spy):
    project = make_project(tmp_path, spy, [])
    real_script = ROOT / "content" / "script.json"
    project.script_path.write_bytes(real_script.read_bytes())
    project.lexicon_path.write_bytes(
        (ROOT / "content" / "lexicon.json").read_bytes()
    )
    timeline = project.build()
    expected = json.loads(real_script.read_text("utf-8"))["segments"]
    assert validate_timeline(timeline) == []
    beats = _all_beats(timeline)
    assert [b["id"] for b in beats] == [s["id"] for s in expected]
    assert [b["text"] for b in beats] == [s["text"] for s in expected]
    cues = parse_srt(project.srt_path.read_text(encoding="utf-8"))
    assert len(cues) == 19


# ---------------------------------------------------------------- [1-5]


def test_ket_qua_loudnorm_la_16_lufs_cong_tru_1_va_peak_duoi_1_5(built):
    lufs, true_peak = ffmpeg_loudness(built.wav_path)
    assert -17.0 <= lufs <= -15.0, lufs
    assert true_peak <= -1.5, true_peak


def test_lang_thua_moi_dau_nhip_va_cuoi_nhip_khong_qua_100ms(built):
    data, rate = sf.read(str(built.wav_path), dtype="float32")
    loud = np.abs(data)
    threshold = 0.05 * float(loud.max())
    # Mốc beat làm tròn về frame nên cho thêm 1/60 s mỗi phía.
    limit = 0.1 + 1 / 60
    for beat in _all_beats(built.timeline()):
        a = round(beat["startFrame"] / FPS * rate)
        b = round((beat["startFrame"] + beat["durationFrames"]) / FPS * rate)
        window = np.flatnonzero(loud[a:b] > threshold)
        assert window.size > 0, f"nhịp {beat['id']} không có tiếng"
        lead = window[0] / rate
        tail = (b - a - 1 - window[-1]) / rate
        assert lead <= limit, (beat["id"], "lặng đầu", lead)
        assert tail <= limit, (beat["id"], "lặng cuối", tail)


def test_khoang_nghi_giua_cac_nhip_la_im_lang_that(built):
    data, rate = sf.read(str(built.wav_path), dtype="float32")
    loud = np.abs(data)
    threshold = 0.05 * float(loud.max())
    beats = _all_beats(built.timeline())
    checked = 0
    for prev, nxt in zip(beats, beats[1:]):
        a = round((prev["startFrame"] + prev["durationFrames"]) / FPS * rate)
        b = round(nxt["startFrame"] / FPS * rate)
        assert b - a > 4
        assert float(loud[a + 2 : b - 2].max()) <= threshold
        checked += 1
    assert checked == len(PLAIN_SEGMENTS) - 1


def test_cache_moi_nhip_mot_file_ten_sha256_wav(project):
    project.build()
    names = sorted(p.name for p in project.cache_dir.iterdir())
    assert len(names) == len(PLAIN_SEGMENTS)
    assert all(re.fullmatch(r"[0-9a-f]{64}\.wav", n) for n in names), names


def test_chay_lan_hai_khong_goi_lai_synth(project):
    project.build()
    assert len(project.calls) == len(PLAIN_SEGMENTS)
    first_wav = project.wav_path.read_bytes()
    project.spy.clear()
    project.build()
    assert project.calls == []
    assert project.wav_path.read_bytes() == first_wav


def test_sua_mot_nhip_chi_goi_synth_dung_mot_lan(project):
    project.build()
    project.spy.clear()
    edited = [dict(s) for s in PLAIN_SEGMENTS]
    edited[3]["text"] = "Câu số bốn đã được sửa lại hoàn toàn"
    project.write_script(edited)
    project.build()
    assert project.calls == ["Câu số bốn đã được sửa lại hoàn toàn"]
    texts = [b["text"] for b in _all_beats(project.timeline())]
    assert texts == [s["text"] for s in edited]


def test_doi_pause_ms_khong_goi_lai_synth_nhung_doi_moc_thoi_gian(project):
    project.build()
    before = _all_beats(project.timeline())
    project.spy.clear()
    edited = [dict(s) for s in PLAIN_SEGMENTS]
    edited[0]["pause_ms"] = 1200
    project.write_script(edited)
    project.build()
    after = _all_beats(project.timeline())
    assert project.calls == []
    assert after[1]["startFrame"] > before[1]["startFrame"] + 20


def test_doi_giong_phai_tong_hop_lai_toan_bo(project):
    project.build(voice="giong-1")
    project.spy.clear()
    project.build(voice="giong-2")
    assert len(project.calls) == len(PLAIN_SEGMENTS)


def test_doi_speed_phai_tong_hop_lai_toan_bo_va_truyen_speed(project):
    project.build(speed=1.0)
    project.spy.clear()
    project.build(speed=1.5)
    assert len(project.calls) == len(PLAIN_SEGMENTS)
    assert {c["speed"] for c in project.spy.calls} == {1.5}
    assert len(list(project.cache_dir.iterdir())) == 2 * len(PLAIN_SEGMENTS)


def test_hai_nhip_cung_loi_doc_dung_cache_goi_synth_mot_lan(tmp_path, spy):
    segments = [
        seg("d1", "phone", "Câu lặp lại y hệt"),
        seg("d2", "phone", "Câu lặp lại y hệt"),
    ]
    project = make_project(tmp_path, spy, segments)
    project.build()
    assert project.calls == ["Câu lặp lại y hệt"]


# ---------------------------------------------------- tham số, lỗi, CLI


def test_build_goi_synth_voi_engine_voice_va_speed_da_chon(project):
    project.build(engine="fake", voice="giong-x", speed=1.25)
    assert {
        (c["engine"], c["voice"], c["speed"]) for c in project.spy.calls
    } == {("fake", "giong-x", 1.25)}


def test_speed_lon_hon_thi_nhip_ngan_hon(tmp_path, spy):
    slow = make_project(tmp_path / "slow", spy, PLAIN_SEGMENTS)
    fast = make_project(tmp_path / "fast", spy, PLAIN_SEGMENTS)
    slow.build(speed=1.0)
    fast.build(speed=2.0)
    long_slow = _all_beats(slow.timeline())[3]["durationFrames"]
    long_fast = _all_beats(fast.timeline())[3]["durationFrames"]
    assert long_fast <= 0.6 * long_slow


def test_build_engine_la_nem_value_error(project):
    with pytest.raises(ValueError):
        project.build(engine="khong-co")


def test_build_timeline_hong_nem_runtime_error(tmp_path, spy):
    # phone / dns / phone: cảnh phone xuất hiện hai lần (luật 3).
    segments = [
        seg("b1", "phone", "Nhịp một"),
        seg("b2", "dns", "Nhịp hai"),
        seg("b3", "phone", "Nhịp ba"),
    ]
    project = make_project(tmp_path, spy, segments)
    with pytest.raises(RuntimeError):
        project.build()
    assert not project.timeline_path.exists()


def test_cli_build_thanh_cong_tra_0_va_ghi_file_mac_dinh(project, monkeypatch):
    code = project.cli(
        monkeypatch, ["build", "--engine", "fake", "--voice", "x"]
    )
    assert code == 0
    assert validate_timeline(project.timeline()) == []
    assert project.wav_path.is_file()
    assert project.srt_path.is_file()


def test_cli_build_truyen_speed(project, monkeypatch):
    code = project.cli(
        monkeypatch,
        ["build", "--engine", "fake", "--voice", "x", "--speed", "2.0"],
    )
    assert code == 0
    assert {c["speed"] for c in project.spy.calls} == {2.0}


def test_cli_build_dung_script_lexicon_public_out_tuy_chon(
    project, monkeypatch
):
    alt = project.base / "alt"
    alt.mkdir()
    script = alt / "s.json"
    lexicon = alt / "l.json"
    script.write_text(
        json.dumps(
            {
                "title": "Thử",
                "voice": "x",
                "segments": [seg("z1", "wifi", "Qua DNS nhé")],
            },
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )
    lexicon.write_text(json.dumps({"DNS": "di en et"}), encoding="utf-8")
    public, out = alt / "pub", alt / "out"
    code = project.cli(
        monkeypatch,
        [
            "build",
            "--engine",
            "fake",
            "--voice",
            "x",
            "--script",
            str(script),
            "--lexicon",
            str(lexicon),
            "--public-dir",
            str(public),
            "--out-dir",
            str(out),
        ],
    )
    assert code == 0
    assert project.calls == ["Qua di en et nhé"]
    assert (public / "timeline.json").is_file()
    assert (public / "audio" / "narration.wav").is_file()
    assert (out / "video.srt").is_file()
    assert not project.out_dir.exists()
    assert not project.public_dir.exists()


@pytest.mark.parametrize(
    "argv",
    [
        ["build", "--voice", "x"],
        ["build", "--engine", "fake"],
        ["build"],
        ["build", "--engine", "khong-co", "--voice", "x"],
    ],
)
def test_cli_build_thieu_hoac_sai_engine_voice_thoat_ma_2(
    project, monkeypatch, argv
):
    with pytest.raises(SystemExit) as info:
        project.cli(monkeypatch, argv)
    assert info.value.code == 2
    assert project.calls == []


def test_cli_build_loi_thi_tra_ma_khac_0_khong_nem(tmp_path, spy, monkeypatch):
    segments = [
        seg("b1", "phone", "Nhịp một"),
        seg("b2", "dns", "Nhịp hai"),
        seg("b3", "phone", "Nhịp ba"),
    ]
    project = make_project(tmp_path, spy, segments)
    code = project.cli(
        monkeypatch, ["build", "--engine", "fake", "--voice", "x"]
    )
    assert isinstance(code, int)
    assert code != 0
