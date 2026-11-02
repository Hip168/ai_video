"""[9-3] Trộn, ducking, loudnorm, kiểm; lỗi nhạc.

Mọi âm thanh là tone sinh tại chỗ, đo bằng FFmpeg thật. Nguồn:
`.team/features/9-am-thanh-tap.md` (Xong khi) và
`.team/features/9-am-thanh-tap-giao-dien.md` (mix.py).
"""

from __future__ import annotations

import hashlib
import json
import os
import re
import subprocess
import sys
from pathlib import Path

import numpy as np
import pytest
import soundfile as sf
from conftest import ROOT, ffmpeg_loudness

from aivideo import mix, sfx

SR = 48000
FRAME = SR // 30
SRC = ROOT / "audio" / "src"
SAMPLE_TIMELINE = ROOT / ".team" / "contract" / "timeline2.sample.json"


def tone(freq, seconds, amp=0.3):
    t = np.arange(int(seconds * SR)) / SR
    return (amp * np.sin(2 * np.pi * freq * t)).astype(np.float32)


def voice_wave(total=8.0, start=2.0, end=5.0, amp=0.3):
    x = np.zeros(int(total * SR), dtype=np.float32)
    a, b = int(start * SR), int(end * SR)
    x[a:b] = tone(440, end - start, amp)
    return x


def write(path, x):
    sf.write(str(path), x, SR, subtype="FLOAT")
    return path


def timeline(path, frames, sfx_events=()):
    """Timeline v2 hợp lệ về hình thức: lấy file mẫu hợp đồng, chỉ đổi
    độ dài và sfx (cảnh, chương, theme, audio giữ nguyên từ mẫu)."""
    doc = json.loads(SAMPLE_TIMELINE.read_text(encoding="utf-8"))
    doc["durationInFrames"] = frames
    doc["sfx"] = list(sfx_events)
    path.write_text(json.dumps(doc), encoding="utf-8")
    return path


def rms_db(x, a, b):
    seg = x[int(a * SR) : int(b * SR)].astype(np.float64)
    return 20 * np.log10(max(float(np.sqrt(np.mean(seg**2))), 1e-9))


def read(path):
    x, sr = sf.read(str(path), dtype="float32")
    assert sr == SR
    return x


def run_mix(tmp_path, *, narration, music=None, gain=-24.0, frames=240,
            events=(), stems=False):
    nar = write(tmp_path / "nar.wav", narration)
    tl = timeline(tmp_path / "tl.json", frames, events)
    out = tmp_path / "mix.wav"
    kw = {}
    if music is not None:
        kw["music_path"] = write(tmp_path / "music.wav", music)
        kw["music_gain_db"] = gain
    if stems:
        kw["stem_voice_path"] = tmp_path / "sv.wav"
        if music is not None:
            kw["stem_music_path"] = tmp_path / "sm.wav"
    result = mix.mix_episode(tl, nar, out, **kw)
    return out, result


# ---------- đo lường: loudness, true peak, độ dài ----------


def test_mix_co_nhac_va_sfx_dat_16_lufs_va_true_peak(tmp_path):
    events = [{"frame": 10, "name": "pop", "gainDb": -12}]
    out, result = run_mix(
        tmp_path, narration=voice_wave(), music=tone(220, 8), events=events
    )
    lufs, peak = ffmpeg_loudness(out)
    assert lufs == pytest.approx(-16, abs=1.0)
    assert peak <= -1.5
    assert result["lufs"] == pytest.approx(lufs, abs=0.2)
    assert result["true_peak"] == pytest.approx(peak, abs=0.3)


def test_mix_khong_nhac_van_dat_chuan(tmp_path):
    out, _ = run_mix(tmp_path, narration=voice_wave())
    lufs, peak = ffmpeg_loudness(out)
    assert lufs == pytest.approx(-16, abs=1.0)
    assert peak <= -1.5


def test_mix_giong_rat_nho_va_rat_to_deu_ve_chuan(tmp_path):
    for i, amp in enumerate([0.01, 0.95]):
        d = tmp_path / str(i)
        d.mkdir()
        out, _ = run_mix(
            d, narration=voice_wave(amp=amp), music=tone(220, 8)
        )
        lufs, peak = ffmpeg_loudness(out)
        assert lufs == pytest.approx(-16, abs=1.0), amp
        assert peak <= -1.5, amp


def test_true_peak_khop_do_doc_lap_bang_ffmpeg(tmp_path):
    out, _ = run_mix(tmp_path, narration=voice_wave())
    assert mix.true_peak(out) == pytest.approx(
        ffmpeg_loudness(out)[1], abs=0.1
    )


def test_true_peak_bat_duoc_dinh_giua_cac_mau(tmp_path):
    # 12 kHz pha 45 độ ở 48 kHz: mọi mẫu chỉ bằng 0,707 đỉnh thật, nên
    # đỉnh mẫu là -3,9 dBFS còn đỉnh thật là 20*log10(0,9) = -0,92 dBTP.
    # ebur128 (nội suy 4x) báo cao hơn đỉnh thật ~0,6 dB ở tần số này,
    # nên dung sai ±0,7 quanh -0,6.
    n = np.arange(2 * SR)
    x = (0.9 * np.sin(2 * np.pi * 12000 * n / SR + np.pi / 4)).astype(
        np.float32
    )
    sample_peak = 20 * np.log10(float(np.max(np.abs(x))))
    assert sample_peak == pytest.approx(-3.9, abs=0.1)
    p = write(tmp_path / "isp.wav", x)
    assert mix.true_peak(p) == pytest.approx(-0.6, abs=0.7)
    assert mix.true_peak(p) > sample_peak + 2


def test_true_peak_tone_nua_bien_do_la_tru_6_db(tmp_path):
    q = write(tmp_path / "half.wav", tone(997, 2, amp=0.5))
    assert mix.true_peak(q) == pytest.approx(-6.0, abs=0.3)


@pytest.mark.parametrize(
    "nar_seconds,frames", [(8, 240), (4, 240), (12, 240), (8, 241)]
)
def test_mix_do_dai_dung_duration_frames_giong_dai_ngan_hay_vua(
    tmp_path, nar_seconds, frames
):
    nar = voice_wave(total=nar_seconds, start=1.0, end=nar_seconds - 0.5)
    out, result = run_mix(tmp_path, narration=nar, frames=frames)
    info = sf.info(str(out))
    assert abs(info.frames - frames * FRAME) <= FRAME
    assert result["frames"] == frames or abs(result["frames"] - frames) <= 1


def test_mix_dinh_dang_wav_16bit_mono_48k(tmp_path):
    out, _ = run_mix(tmp_path, narration=voice_wave())
    info = sf.info(str(out))
    assert (info.samplerate, info.channels) == (SR, 1)
    assert info.subtype == "PCM_16"


def test_mix_nhac_ngan_hon_duoc_lap_nhac_dai_hon_duoc_cat(tmp_path):
    n = 240 * FRAME
    for i, seconds in enumerate([3, 25]):
        d = tmp_path / str(i)
        d.mkdir()
        out, _ = run_mix(
            d,
            narration=voice_wave(),
            music=tone(220, seconds),
            gain=-12,
            stems=True,
        )
        assert sf.info(str(out)).frames == pytest.approx(n, abs=FRAME)
        stem = read(d / "sm.wav")
        assert len(stem) == n, seconds
        # đoạn 5,2-5,8 s: hết giọng, chưa vào fade ra; nhạc phải còn tiếng
        # (nếu không lặp, nhạc 3 s đã tắt ở đây).
        assert rms_db(stem, 5.2, 5.8) > -45, seconds


@pytest.mark.parametrize("nar_seconds", [4, 8, 12])
def test_stem_giong_va_nhac_dai_dung_duration_frames(tmp_path, nar_seconds):
    nar = voice_wave(total=nar_seconds, start=1.0, end=nar_seconds - 0.5)
    run_mix(tmp_path, narration=nar, music=tone(220, 5), stems=True)
    n = 240 * FRAME
    assert len(read(tmp_path / "sv.wav")) == n
    assert len(read(tmp_path / "sm.wav")) == n


# ---------- nhạc: fade, lọc, ducking ----------


def music_stem(tmp_path, music, gain=-12, narration=None):
    run_mix(
        tmp_path,
        narration=voice_wave() if narration is None else narration,
        music=music,
        gain=gain,
        stems=True,
    )
    return read(tmp_path / "sm.wav"), read(tmp_path / "sv.wav")


def quiet_stem(tmp_path, music, gain=0, frames=240):
    """Giọng im lặng hoàn toàn: ducking không tác động lên nhạc."""
    nar = np.zeros(frames * FRAME, dtype=np.float32)
    run_mix(
        tmp_path,
        narration=nar,
        music=music,
        gain=gain,
        frames=frames,
        stems=True,
    )
    return read(tmp_path / "sm.wav")


def test_nhac_fade_vao_dai_1_giay_tuyen_tinh_giua_fade_la_tru_6_db(tmp_path):
    stem = quiet_stem(tmp_path, tone(1000, 8, amp=0.5))
    full = rms_db(stem, 2.5, 3.5)
    assert rms_db(stem, 0.48, 0.52) - full == pytest.approx(-6.0, abs=0.7)
    assert rms_db(stem, 0.0, 0.02) < full - 20
    # sau 1 giây fade đã xong: 1,2 s ngang mức đầy
    assert rms_db(stem, 1.2, 1.3) - full == pytest.approx(0.0, abs=0.3)


def test_nhac_fade_ra_dai_2_giay_giua_fade_la_tru_6_db(tmp_path):
    stem = quiet_stem(tmp_path, tone(1000, 8, amp=0.5))
    full = rms_db(stem, 2.5, 3.5)
    # 8 s - 1 s = 7 s: giữa fade ra 2 s (6 s -> 8 s)
    assert rms_db(stem, 6.98, 7.02) - full == pytest.approx(-6.0, abs=0.7)
    # trước 6 s vẫn mức đầy; fade ra bắt đầu đúng 2 s trước cuối
    assert rms_db(stem, 5.8, 5.9) - full == pytest.approx(0.0, abs=0.3)
    assert rms_db(stem, 7.98, 8.0) < full - 20


def test_nhac_fade_ra_neo_theo_cuoi_khi_do_dai_khac(tmp_path):
    stem = quiet_stem(tmp_path, tone(1000, 12, amp=0.5), frames=360)
    full = rms_db(stem, 2.5, 3.5)
    # cuối ở 12 s; giữa fade ra là 11 s
    assert rms_db(stem, 10.98, 11.02) - full == pytest.approx(-6.0, abs=0.7)


# Đáp ứng bộ lọc đo bằng tone trên đoạn không giọng; mức vào chuẩn:
# biên độ 0,5 -> RMS -9,03 dBFS, cộng gain -12 dB = -21,03 dBFS.
EXPECT_DB = 20 * np.log10(0.5 / np.sqrt(2)) - 12


def filter_response(tmp_path, freq):
    stem = quiet_stem(tmp_path, tone(freq, 8, amp=0.5), gain=-12)
    return rms_db(stem, 2.5, 3.5) - EXPECT_DB


@pytest.mark.parametrize("freq", [120, 8000])
def test_nhac_bo_loc_giam_3_db_tai_tan_so_cat_120hz_va_8khz(tmp_path, freq):
    assert filter_response(tmp_path, freq) == pytest.approx(-3.0, abs=1.0)


@pytest.mark.parametrize("freq", [200, 1000, 4000])
def test_nhac_giu_nguyen_muc_trong_dai_thong_va_ap_dung_gain(tmp_path, freq):
    # 200 Hz và 4 kHz không giảm quá 1 dB; 1 kHz đúng gain -12 dB.
    resp = filter_response(tmp_path, freq)
    assert resp >= -1.0
    assert resp == pytest.approx(0.0, abs=1.0)


@pytest.mark.parametrize("freq", [30, 12000])
def test_nhac_bo_loc_chan_manh_ngoai_dai_thong(tmp_path, freq):
    assert filter_response(tmp_path, freq) <= -8.0


def test_nhac_gain_mac_dinh_la_tru_24_db(tmp_path):
    nar = write(tmp_path / "nar.wav", np.zeros(240 * FRAME, np.float32))
    tl = timeline(tmp_path / "tl.json", 240)
    mus = write(tmp_path / "m.wav", tone(1000, 8, amp=0.5))
    mix.mix_episode(
        tl, nar, tmp_path / "o.wav", music_path=mus,
        stem_voice_path=tmp_path / "sv.wav",
        stem_music_path=tmp_path / "sm.wav",
    )
    level = rms_db(read(tmp_path / "sm.wav"), 2.5, 3.5)
    assert level == pytest.approx(EXPECT_DB + 12 - 24, abs=0.5)


def test_nhac_stereo_44k1_van_tron_dung_do_dai_va_ducking(tmp_path):
    t = np.arange(int(8 * 44100)) / 44100
    mono = (0.5 * np.sin(2 * np.pi * 220 * t)).astype(np.float32)
    stereo = np.stack([mono, mono], axis=1)
    mus = tmp_path / "st.wav"
    sf.write(str(mus), stereo, 44100, subtype="FLOAT")
    nar = write(tmp_path / "nar.wav", voice_wave())
    tl = timeline(tmp_path / "tl.json", 240)
    out = tmp_path / "o.wav"
    mix.mix_episode(
        tl, nar, out, music_path=mus, music_gain_db=0,
        stem_voice_path=tmp_path / "sv.wav",
        stem_music_path=tmp_path / "sm.wav",
    )
    n = 240 * FRAME
    assert len(read(tmp_path / "sm.wav")) == n
    lufs, peak = ffmpeg_loudness(out)
    assert lufs == pytest.approx(-16, abs=1.0)
    assert peak <= -1.5
    v = rms_db(read(tmp_path / "sv.wav"), 3.5, 4.5)
    m = rms_db(read(tmp_path / "sm.wav"), 3.5, 4.5)
    assert v - m >= 12


def test_nhac_khong_co_mau_nao_nem_music_error_nhanh(tmp_path):
    empty = tmp_path / "rong.wav"
    sf.write(str(empty), np.zeros(0, np.float32), SR, subtype="FLOAT")
    nar = write(tmp_path / "nar.wav", voice_wave())
    tl = timeline(tmp_path / "tl.json", 240)
    with pytest.raises(mix.MusicError, match="rong.wav"):
        mix.mix_episode(tl, nar, tmp_path / "o.wav", music_path=empty)


@pytest.mark.parametrize("gain", [-24, -12, -6, 0])
def test_ducking_nhac_thap_hon_giong_it_nhat_12_db_khi_co_giong(
    tmp_path, gain
):
    # Nhạc nguồn biên độ 0,5 (to hơn giọng 0,3): kể cả gain 0 dB, trong
    # lúc có giọng nhạc vẫn phải thấp hơn giọng >= 12 dB.
    stem_m, stem_v = music_stem(
        tmp_path, tone(220, 8, amp=0.5), gain=gain
    )
    voice = rms_db(stem_v, 3.5, 4.5)
    music = rms_db(stem_m, 3.5, 4.5)
    assert voice > -30, "stem giọng phải có tiếng"
    assert voice - music >= 12, f"gain {gain}: chênh {voice - music:.1f} dB"


def test_ducking_co_tac_dung_that_nhac_khi_co_giong_nho_hon_khi_im(tmp_path):
    stem, _ = music_stem(tmp_path, tone(220, 8, amp=0.5), gain=0)
    # cùng nhạc, cùng mức: lúc có giọng phải thấp hơn lúc im lặng.
    assert rms_db(stem, 3.5, 4.5) < rms_db(stem, 1.2, 1.9) - 6


def test_stem_giong_la_giong_goc_khong_bi_nhac_lam_do(tmp_path):
    _, stem_v = music_stem(tmp_path, tone(220, 8, amp=0.5), gain=0)
    src = voice_wave()
    assert len(stem_v) == len(src)
    assert rms_db(stem_v, 3.5, 4.5) == pytest.approx(
        rms_db(src, 3.5, 4.5), abs=0.5
    )
    assert rms_db(stem_v, 0.0, 1.5) < -80


# ---------- SFX trong bản trộn ----------


def test_sfx_xuat_hien_dung_mau_trong_ban_tron_sai_so_5ms(tmp_path):
    events = [
        {"frame": 30, "name": "ding", "gainDb": 0},
        {"frame": 120, "name": "pop", "gainDb": 0},
    ]
    nar = voice_wave(total=8.0, start=6.0, end=7.5)
    out, _ = run_mix(tmp_path, narration=nar, events=events)
    x = read(out)
    pre = x[: 6 * SR]
    thr = 0.1 * float(np.max(np.abs(pre)))
    tol = int(0.005 * SR)
    for ev in events:
        expected = round(ev["frame"] * SR / 30)
        lo = expected - SR // 2
        idx = lo + int(np.argmax(np.abs(x[lo : lo + SR]) > thr))
        assert abs(idx - expected) <= tol, (ev, idx, expected)
        assert not (np.abs(x[lo : expected - tol]) > thr).any()


# ---------- lỗi nhạc ----------


def make_music(tmp_path, content=b"nhac-gia"):
    files = tmp_path / "assets" / "audio" / "files"
    files.mkdir(parents=True)
    (files / "bai.ogg").write_bytes(content)
    manifest = tmp_path / "assets" / "audio" / "manifest.json"
    sha = hashlib.sha256(content).hexdigest()
    entry = {
        "id": "bai-thu",
        "file": "bai.ogg",
        "sourceUrl": "https://example.invalid/bai",
        "license": "CC0",
        "downloadedAt": "2026-11-03",
        "sha256": sha,
        "attribution": "",
    }
    manifest.write_text(json.dumps({"tracks": [entry]}), encoding="utf-8")
    return manifest, files, entry


def test_resolve_track_dung_tra_duong_dan_file(tmp_path):
    manifest, files, _ = make_music(tmp_path)
    assert mix.resolve_track("bai-thu", manifest, files) == files / "bai.ogg"


def test_resolve_track_id_la_nem_music_error_neu_id(tmp_path):
    manifest, files, _ = make_music(tmp_path)
    with pytest.raises(mix.MusicError, match="khong-co"):
        mix.resolve_track("khong-co", manifest, files)


def test_resolve_track_thieu_file_nem_music_error_neu_file(tmp_path):
    manifest, files, _ = make_music(tmp_path)
    (files / "bai.ogg").unlink()
    with pytest.raises(mix.MusicError, match="bai.ogg"):
        mix.resolve_track("bai-thu", manifest, files)


def test_resolve_track_lech_sha256_nem_music_error_neu_file(tmp_path):
    manifest, files, _ = make_music(tmp_path)
    (files / "bai.ogg").write_bytes(b"da-bi-sua")
    with pytest.raises(mix.MusicError, match="bai.ogg"):
        mix.resolve_track("bai-thu", manifest, files)


def test_music_error_la_runtime_error():
    assert issubclass(mix.MusicError, RuntimeError)


def test_load_manifest_dung_cau_truc_tracks(tmp_path):
    manifest, _, entry = make_music(tmp_path)
    assert mix.load_manifest(manifest) == {"tracks": [entry]}


MANIFEST_FIELDS = {
    "id", "file", "sourceUrl", "license", "downloadedAt", "sha256",
    "attribution",
}


def test_manifest_trong_repo_dung_cau_truc_tracks_va_du_7_truong():
    path = ROOT / "assets" / "audio" / "manifest.json"
    doc = json.loads(path.read_text(encoding="utf-8"))
    assert set(doc) == {"tracks"}
    assert isinstance(doc["tracks"], list)
    ids = [t["id"] for t in doc["tracks"]]
    assert len(ids) == len(set(ids)), "id nhạc trùng"
    for t in doc["tracks"]:
        assert set(t) == MANIFEST_FIELDS, t.get("id")
        assert re.fullmatch(r"[0-9a-f]{64}", t["sha256"]), t["id"]
        assert t["sourceUrl"].startswith("https://"), t["id"]
        assert t["license"].strip() and t["downloadedAt"].strip(), t["id"]


def test_mix_episode_thieu_file_nhac_nem_music_error_neu_duong_dan(tmp_path):
    nar = write(tmp_path / "nar.wav", voice_wave())
    tl = timeline(tmp_path / "tl.json", 240)
    ghost = tmp_path / "khong-co-nhac.ogg"
    with pytest.raises(mix.MusicError, match="khong-co-nhac.ogg"):
        mix.mix_episode(tl, nar, tmp_path / "o.wav", music_path=ghost)


def test_stem_nhac_ma_khong_co_nhac_la_loi(tmp_path):
    nar = write(tmp_path / "nar.wav", voice_wave())
    tl = timeline(tmp_path / "tl.json", 240)
    with pytest.raises(ValueError):
        mix.mix_episode(
            tl, nar, tmp_path / "o.wav", stem_music_path=tmp_path / "s.wav"
        )


def test_verify_mix_nem_loi_khi_loudness_lech(tmp_path):
    quiet = write(tmp_path / "q.wav", tone(440, 8, amp=0.01))
    with pytest.raises(RuntimeError, match="LUFS"):
        mix.verify_mix(quiet, 240)


def test_verify_mix_nem_loi_khi_true_peak_vuot_du_loudness_dat(tmp_path):
    x = tone(440, 8, amp=0.24)
    x[SR * 4] = 1.0  # một mẫu đỉnh 0 dBFS, loudness gần như không đổi
    p = write(tmp_path / "peak.wav", x)
    assert ffmpeg_loudness(p)[0] == pytest.approx(-16, abs=1.0)
    with pytest.raises(RuntimeError, match="dBTP"):
        mix.verify_mix(p, 240)


def test_verify_mix_nem_loi_khi_do_dai_lech_qua_1_frame(tmp_path):
    out, _ = run_mix(tmp_path, narration=voice_wave())
    assert mix.verify_mix(out, 240)["frames"] == 240
    assert mix.verify_mix(out, 241)["frames"] == 240  # lệch đúng 1: được
    with pytest.raises(RuntimeError, match="frame"):
        mix.verify_mix(out, 243)
    with pytest.raises(RuntimeError, match="frame"):
        mix.verify_mix(out, 237)


def test_mix_dung_timeline_mau_hop_dong_nguyen_ven(tmp_path):
    # timeline2.sample.json đọc thẳng, không sửa: 600 frame, sfx ở 0 và 390.
    nar = write(tmp_path / "nar.wav", voice_wave(total=20, start=15, end=19))
    out = tmp_path / "mix.wav"
    result = mix.mix_episode(SAMPLE_TIMELINE, nar, out)
    assert result["frames"] == 600
    assert sf.info(str(out)).frames == pytest.approx(600 * FRAME, abs=FRAME)
    x = read(out)
    expected = round(390 * SR / 30)
    seg = np.abs(x[expected - SR // 2 : expected + SR // 2])
    thr = 0.1 * float(np.max(np.abs(x[: 15 * SR])))
    idx = expected - SR // 2 + int(np.argmax(seg > thr))
    assert abs(idx - expected) <= int(0.005 * SR)


def test_sfx_gain_db_trong_ban_tron_chenh_dung_12_db(tmp_path):
    events = [
        {"frame": 30, "name": "ding", "gainDb": -6},
        {"frame": 120, "name": "ding", "gainDb": -18},
    ]
    nar = voice_wave(total=8.0, start=6.0, end=7.5)
    out, _ = run_mix(tmp_path, narration=nar, events=events)
    x = read(out)
    n = len(sfx.generate("ding"))
    loud = rms_db(x, 1.0, 1.0 + n / SR)
    soft = rms_db(x, 4.0, 4.0 + n / SR)
    # Mức cuối là gain cố định (không loudnorm động) và cả hai SFX thấp
    # hơn trần alimiter 0,84, nên chênh bằng đúng chênh gainDb.
    assert loud - soft == pytest.approx(12, abs=0.7)


# ---------- CLI theo tập ----------


def build_episode(tmp_path, *, music="bai-thu", frames=240, gain=-12):
    manifest, files, entry = make_music(tmp_path)
    slug = "tap-thu"
    (tmp_path / "episodes" / slug).mkdir(parents=True)
    meta = {"title": "Thử", "voice": "x", "speed": 1.0, "theme": "mau-a"}
    if music:
        meta["music"] = {"track": music, "gainDb": gain}
    script = {"meta": meta, "chapters": [], "scenes": []}
    (tmp_path / "episodes" / slug / "script.json").write_text(
        json.dumps(script), encoding="utf-8"
    )
    out = tmp_path / "out" / "episodes" / slug
    out.mkdir(parents=True)
    write(out / "narration.wav", voice_wave())
    timeline(out / "timeline.json", frames)
    return slug, out, files / "bai.ogg"


def run_cli(tmp_path, slug, *extra):
    env = dict(os.environ, PYTHONPATH=str(SRC))
    return subprocess.run(
        [sys.executable, "-m", "aivideo.mix", slug, "--root", str(tmp_path),
         *extra],
        capture_output=True,
        text=True,
        env=env,
    )


def real_music(path):
    """Ghi nhạc thật (tone) và trả sha256, để manifest khớp."""
    sf.write(str(path), tone(220, 8, amp=0.5), SR, format="WAV")
    return hashlib.sha256(path.read_bytes()).hexdigest()


def arm_music(tmp_path, music_file):
    real_music(music_file)
    arm_sha(tmp_path, music_file)


def arm_sha(tmp_path, music_file):
    sha = hashlib.sha256(music_file.read_bytes()).hexdigest()
    mpath = tmp_path / "assets" / "audio" / "manifest.json"
    doc = json.loads(mpath.read_text(encoding="utf-8"))
    doc["tracks"][0]["sha256"] = sha
    mpath.write_text(json.dumps(doc), encoding="utf-8")


def test_cli_chay_thanh_cong_ra_mix_wav_dat_chuan_va_stems(tmp_path):
    slug, out, music_file = build_episode(tmp_path)
    arm_music(tmp_path, music_file)
    r = run_cli(tmp_path, slug, "--stems")
    assert r.returncode == 0, r.stderr
    lufs, peak = ffmpeg_loudness(out / "mix.wav")
    assert lufs == pytest.approx(-16, abs=1.0)
    assert peak <= -1.5
    assert (out / "mix.voice.wav").is_file()
    assert (out / "mix.music.wav").is_file()
    assert sf.info(str(out / "mix.wav")).frames == pytest.approx(
        240 * FRAME, abs=FRAME
    )


def test_cli_khong_co_stems_thi_khong_ghi_stem(tmp_path):
    slug, out, music_file = build_episode(tmp_path)
    arm_music(tmp_path, music_file)
    r = run_cli(tmp_path, slug)
    assert r.returncode == 0, r.stderr
    assert (out / "mix.wav").is_file()
    assert not (out / "mix.voice.wav").exists()
    assert not (out / "mix.music.wav").exists()


def test_cli_stems_nhac_thap_hon_giong_it_nhat_12_db(tmp_path):
    slug, out, music_file = build_episode(tmp_path)
    arm_music(tmp_path, music_file)
    assert run_cli(tmp_path, slug, "--stems").returncode == 0
    v = rms_db(read(out / "mix.voice.wav"), 3.5, 4.5)
    m = rms_db(read(out / "mix.music.wav"), 3.5, 4.5)
    assert v - m >= 12


def test_cli_script_khong_co_music_thi_tron_khong_nhac(tmp_path):
    slug, out, _ = build_episode(tmp_path, music=None)
    r = run_cli(tmp_path, slug, "--stems")
    assert r.returncode == 0, r.stderr
    assert (out / "mix.wav").is_file()
    assert not (out / "mix.music.wav").exists()


def test_cli_thieu_file_nhac_thoat_khac_0_neu_file_khong_ghi_mix(tmp_path):
    slug, out, music_file = build_episode(tmp_path)
    music_file.unlink()
    r = run_cli(tmp_path, slug)
    assert r.returncode == 1
    assert r.stderr.startswith("lỗi:")
    assert "bai.ogg" in r.stderr
    assert not (out / "mix.wav").exists()


def test_cli_lech_sha256_thoat_khac_0_neu_file_khong_ghi_mix(tmp_path):
    slug, out, music_file = build_episode(tmp_path)
    real_music(music_file)  # nội dung khác sha256 trong manifest
    r = run_cli(tmp_path, slug)
    assert r.returncode == 1
    assert r.stderr.startswith("lỗi:")
    assert "bai.ogg" in r.stderr
    assert not (out / "mix.wav").exists()


def test_cli_loi_khong_de_lai_mix_wav_cu_bi_ghi_de(tmp_path):
    slug, out, music_file = build_episode(tmp_path)
    music_file.unlink()
    old = out / "mix.wav"
    old.write_bytes(b"cu")
    r = run_cli(tmp_path, slug)
    assert r.returncode == 1
    assert old.read_bytes() == b"cu"


def test_cli_id_nhac_la_thoat_khac_0_neu_id(tmp_path):
    slug, out, _ = build_episode(tmp_path, music="bai-la-hoac")
    r = run_cli(tmp_path, slug)
    assert r.returncode == 1
    assert r.stderr.startswith("lỗi:")
    assert "bai-la-hoac" in r.stderr
    assert not (out / "mix.wav").exists()


def test_cli_thieu_narration_thoat_khac_0_neu_duong_dan(tmp_path):
    slug, out, music_file = build_episode(tmp_path)
    arm_music(tmp_path, music_file)
    (out / "narration.wav").unlink()
    r = run_cli(tmp_path, slug)
    assert r.returncode == 1
    assert r.stderr.startswith("lỗi:")
    assert "narration.wav" in r.stderr
    assert not (out / "mix.wav").exists()


def test_cli_thieu_script_thoat_khac_0_neu_duong_dan(tmp_path):
    slug, out, _ = build_episode(tmp_path)
    (tmp_path / "episodes" / slug / "script.json").unlink()
    r = run_cli(tmp_path, slug)
    assert r.returncode == 1
    assert r.stderr.startswith("lỗi:")
    assert "script.json" in r.stderr


def test_cli_verify_mix_hong_thoat_1_neu_loi_khong_ghi_mix(tmp_path):
    slug, out, music_file = build_episode(tmp_path, music=None)
    click = np.zeros(8 * SR, dtype=np.float32)
    click[1000:1048] = 0.9  # thưa: loudnorm không đưa lên -16 được
    write(out / "narration.wav", click)
    old = out / "mix.wav"
    old.write_bytes(b"cu")
    r = run_cli(tmp_path, slug, "--stems")
    assert r.returncode == 1
    assert r.stderr.startswith("lỗi:")
    assert "mix không đạt" in r.stderr
    assert old.read_bytes() == b"cu"


def test_cli_doc_gain_db_tu_meta_music(tmp_path):
    levels = []
    for i, gain in enumerate([-12, -30]):
        d = tmp_path / str(i)
        d.mkdir()
        slug, out, music_file = build_episode(d, gain=gain)
        sf.write(str(music_file), tone(1000, 8, amp=0.5), SR, format="WAV")
        arm_sha(d, music_file)
        write(out / "narration.wav", np.zeros(240 * FRAME, np.float32))
        r = run_cli(d, slug, "--stems")
        assert r.returncode == 0, r.stderr
        levels.append(rms_db(read(out / "mix.music.wav"), 2.5, 3.5))
    assert levels[0] == pytest.approx(EXPECT_DB, abs=0.7)
    assert levels[0] - levels[1] == pytest.approx(18, abs=0.5)


@pytest.mark.parametrize("frames", [180, 300])
def test_cli_do_dai_mix_theo_timeline_va_stem_cung_do_dai(tmp_path, frames):
    slug, out, music_file = build_episode(tmp_path, frames=frames)
    arm_music(tmp_path, music_file)
    r = run_cli(tmp_path, slug, "--stems")
    assert r.returncode == 0, r.stderr
    n = frames * FRAME
    assert abs(sf.info(str(out / "mix.wav")).frames - n) <= FRAME
    assert len(read(out / "mix.voice.wav")) == n
    assert len(read(out / "mix.music.wav")) == n


def listing(d):
    return sorted(p.name for p in d.iterdir())


def test_cli_loi_verify_khong_de_stem_va_khong_de_ban_cu(tmp_path):
    slug, out, music_file = build_episode(tmp_path)
    arm_music(tmp_path, music_file)
    click = np.zeros(8 * SR, dtype=np.float32)
    click[1000:1048] = 0.9
    write(out / "narration.wav", click)
    old = {n: b"cu-" + n.encode() for n in
           ("mix.wav", "mix.voice.wav", "mix.music.wav")}
    for n, data in old.items():
        (out / n).write_bytes(data)
    before = listing(out)
    r = run_cli(tmp_path, slug, "--stems")
    assert r.returncode == 1
    assert "mix không đạt" in r.stderr
    for n, data in old.items():
        assert (out / n).read_bytes() == data, n
    assert listing(out) == before  # không thư mục/tệp tạm nào sót lại


def test_cli_loi_verify_khong_co_stem_moi_khi_chua_co_ban_cu(tmp_path):
    slug, out, music_file = build_episode(tmp_path)
    arm_music(tmp_path, music_file)
    click = np.zeros(8 * SR, dtype=np.float32)
    click[1000:1048] = 0.9
    write(out / "narration.wav", click)
    before = listing(out)
    r = run_cli(tmp_path, slug, "--stems")
    assert r.returncode == 1
    assert listing(out) == before


def test_gain_cuoi_khong_vuot_tran_true_peak_loi_chi_la_loudness(tmp_path):
    # Nội dung thưa: muốn -16 LUFS phải vượt -1,5 dBTP. Gain cuối phải
    # dừng ở trần true peak (bản trộn vẫn bị từ chối vì thiếu loudness,
    # nhưng KHÔNG được báo vượt true peak).
    click = np.zeros(8 * SR, dtype=np.float32)
    click[1000:1048] = 0.9
    nar = write(tmp_path / "nar.wav", click)
    tl = timeline(tmp_path / "tl.json", 240)
    with pytest.raises(RuntimeError) as e:
        mix.mix_episode(tl, nar, tmp_path / "o.wav")
    assert "LUFS" in str(e.value)
    assert "dBTP" not in str(e.value)


def test_mix_episode_loi_khong_de_file_nao_o_thu_muc_dich(tmp_path):
    click = np.zeros(8 * SR, dtype=np.float32)
    click[1000:1048] = 0.9
    d = tmp_path / "ra"
    d.mkdir()
    nar = write(tmp_path / "nar.wav", click)
    tl = timeline(tmp_path / "tl.json", 240)
    mus = write(tmp_path / "m.wav", tone(220, 8))
    with pytest.raises(RuntimeError, match="mix không đạt"):
        mix.mix_episode(
            tl, nar, d / "mix.wav", music_path=mus,
            stem_voice_path=d / "sv.wav", stem_music_path=d / "sm.wav",
        )
    assert listing(d) == []


@pytest.mark.parametrize("key", ["durationInFrames", "fps", "sfx"])
def test_timeline_thieu_khoa_nem_value_error_neu_ten_khoa(tmp_path, key):
    tl = timeline(tmp_path / "tl.json", 240)
    doc = json.loads(tl.read_text(encoding="utf-8"))
    del doc[key]
    tl.write_text(json.dumps(doc), encoding="utf-8")
    nar = write(tmp_path / "nar.wav", voice_wave())
    out = tmp_path / "mix.wav"
    with pytest.raises(ValueError, match=key):
        mix.mix_episode(tl, nar, out)
    assert not out.exists()


@pytest.mark.parametrize("key", ["durationInFrames", "fps", "sfx"])
def test_cli_timeline_thieu_khoa_in_loi_neu_ten_khoa_thoat_1(tmp_path, key):
    slug, out, _ = build_episode(tmp_path, music=None)
    doc = json.loads((out / "timeline.json").read_text(encoding="utf-8"))
    del doc[key]
    (out / "timeline.json").write_text(json.dumps(doc), encoding="utf-8")
    r = run_cli(tmp_path, slug)
    assert r.returncode == 1
    assert r.stderr.startswith("lỗi:")
    assert key in r.stderr
    assert not (out / "mix.wav").exists()


def test_noi_dung_co_khoang_lang_lra_lon_van_dat_16_lufs(tmp_path):
    x = np.zeros(10 * SR, dtype=np.float32)
    x[0 : 2 * SR] = tone(440, 2, amp=0.5)
    x[3 * SR : 6 * SR] = tone(440, 3, amp=0.01)  # đoạn thì thầm
    x[7 * SR : 9 * SR] = tone(440, 2, amp=0.4)
    out, _ = run_mix(
        tmp_path, narration=x, frames=300,
        events=[{"frame": 225, "name": "pop", "gainDb": -9}],
    )
    lufs, peak = ffmpeg_loudness(out)
    assert lufs == pytest.approx(-16, abs=1.0)
    assert peak <= -1.5
    # gain cố định: đoạn thì thầm vẫn thấp hơn đoạn to ~ đúng như nguồn
    # (loudnorm động sẽ nâng nó lên).
    y = read(out)
    assert rms_db(y, 0.5, 1.5) - rms_db(y, 4.0, 5.0) == pytest.approx(
        34, abs=1.5
    )


def test_sfx_va_mix_dung_chung_sample_rate():
    assert sfx.SR == mix.OUT_SR == SR
