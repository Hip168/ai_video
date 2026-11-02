"""[9-3] Trộn, ducking, loudnorm, kiểm; lỗi nhạc.

Mọi âm thanh là tone sinh tại chỗ, đo bằng FFmpeg thật. Nguồn:
`.team/features/9-am-thanh-tap.md` (Xong khi) và
`.team/features/9-am-thanh-tap-giao-dien.md` (mix.py).
"""

from __future__ import annotations

import hashlib
import json
import os
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
    doc = {
        "version": 2,
        "fps": 30,
        "width": 1920,
        "height": 1080,
        "durationInFrames": frames,
        "sfx": list(sfx_events),
    }
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


def test_true_peak_bat_duoc_dinh_lien_mau_vuot_0_dbfs(tmp_path):
    x = tone(997, 2, amp=1.0)
    p = write(tmp_path / "hot.wav", x)
    assert mix.true_peak(p) == pytest.approx(0.0, abs=0.3)
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
        assert sf.info(str(out)).frames == pytest.approx(240 * FRAME, abs=FRAME)
        stem = read(d / "sm.wav")
        # đoạn 5,2-5,8 s: hết giọng, chưa vào fade ra; nhạc phải còn tiếng
        # (nếu không lặp, nhạc 3 s đã tắt ở đây).
        assert rms_db(stem, 5.2, 5.8) > -45, seconds


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


def test_nhac_fade_vao_va_fade_ra(tmp_path):
    stem, _ = music_stem(tmp_path, tone(220, 8, amp=0.5), gain=0)
    assert rms_db(stem, 0.0, 0.1) < rms_db(stem, 1.2, 1.9) - 10
    assert rms_db(stem, 7.9, 8.0) < rms_db(stem, 5.4, 5.9) - 10


def test_nhac_qua_highpass_120hz_va_lowpass_8khz(tmp_path):
    levels = {}
    for f in (30, 1000, 12000):
        d = tmp_path / str(f)
        d.mkdir()
        stem, _ = music_stem(d, tone(f, 8, amp=0.5), gain=-12)
        levels[f] = rms_db(stem, 1.2, 1.9)  # đoạn không giọng, hết fade vào
    assert levels[30] < levels[1000] - 20
    assert levels[12000] < levels[1000] - 6


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


def test_manifest_commit_trong_repo_la_tracks_rong():
    path = ROOT / "assets" / "audio" / "manifest.json"
    assert json.loads(path.read_text(encoding="utf-8")) == {"tracks": []}


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
    with pytest.raises(RuntimeError):
        mix.verify_mix(quiet, 240)


def test_verify_mix_nem_loi_khi_do_dai_lech_qua_1_frame(tmp_path):
    out, _ = run_mix(tmp_path, narration=voice_wave())
    mix.verify_mix(out, 240)
    with pytest.raises(RuntimeError):
        mix.verify_mix(out, 243)


# ---------- CLI theo tập ----------


def build_episode(tmp_path, *, music="bai-thu", frames=240, stems_music=True):
    manifest, files, entry = make_music(tmp_path)
    slug = "tap-thu"
    (tmp_path / "episodes" / slug).mkdir(parents=True)
    meta = {"title": "Thử", "voice": "x", "speed": 1.0, "theme": "mau-a"}
    if music:
        meta["music"] = {"track": music, "gainDb": -12}
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
    sha = real_music(music_file)
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
    assert r.returncode != 0
    assert "bai.ogg" in r.stderr
    assert not (out / "mix.wav").exists()


def test_cli_lech_sha256_thoat_khac_0_neu_file_khong_ghi_mix(tmp_path):
    slug, out, music_file = build_episode(tmp_path)
    real_music(music_file)  # nội dung khác sha256 trong manifest
    r = run_cli(tmp_path, slug)
    assert r.returncode != 0
    assert "bai.ogg" in r.stderr
    assert not (out / "mix.wav").exists()


def test_cli_loi_khong_de_lai_mix_wav_cu_bi_ghi_de(tmp_path):
    slug, out, music_file = build_episode(tmp_path)
    music_file.unlink()
    old = out / "mix.wav"
    old.write_bytes(b"cu")
    r = run_cli(tmp_path, slug)
    assert r.returncode != 0
    assert old.read_bytes() == b"cu"


def test_cli_id_nhac_la_thoat_khac_0_neu_id(tmp_path):
    slug, out, _ = build_episode(tmp_path, music="bai-la-hoac")
    r = run_cli(tmp_path, slug)
    assert r.returncode != 0
    assert "bai-la-hoac" in r.stderr
    assert not (out / "mix.wav").exists()


def test_cli_thieu_narration_thoat_khac_0_neu_duong_dan(tmp_path):
    slug, out, music_file = build_episode(tmp_path)
    arm_music(tmp_path, music_file)
    (out / "narration.wav").unlink()
    r = run_cli(tmp_path, slug)
    assert r.returncode != 0
    assert "narration.wav" in r.stderr
    assert not (out / "mix.wav").exists()


def test_cli_thieu_script_thoat_khac_0_neu_duong_dan(tmp_path):
    slug, out, _ = build_episode(tmp_path)
    (tmp_path / "episodes" / slug / "script.json").unlink()
    r = run_cli(tmp_path, slug)
    assert r.returncode != 0
    assert "script.json" in r.stderr


def test_sfx_va_mix_dung_chung_sample_rate():
    assert sfx.SR == SR
