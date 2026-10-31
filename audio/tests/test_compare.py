"""[1-4] Lệnh `compare` và [1-7] bản giọng thật.

PHẦN KHÔNG TỰ ĐỘNG ĐƯỢC (CẦN NGƯỜI DÙNG):
- [1-4] Nghe các file `<engine>_<giọng>.wav` rồi chọn engine + giọng. Test
  chỉ kiểm file có đủ, cùng văn bản, cùng mức loudness.
- [1-7] Nghe bản `narration.wav` thật, duyệt cách đọc `router`, `packet`,
  `DNS`, `Wi-Fi`, `IP`. Test chỉ kiểm độ dài và timeline.

Test không `real` dùng engine `fake` qua `--engines fake`, không cần mô hình.
"""

from __future__ import annotations

import json
import subprocess
import sys

import pytest
import soundfile as sf

from aivideo import audio, engines
from conftest import FPS, REAL_SYNTH, ROOT, ffmpeg_loudness

AUDIO_DIR = ROOT / "audio"
PUBLIC = ROOT / "video" / "public"


@pytest.fixture
def compare_dir(tmp_path):
    (tmp_path / "audio").mkdir()
    text = tmp_path / "compare.txt"
    text.write_text("Router gửi packet qua DNS.\n", encoding="utf-8")
    lexicon = tmp_path / "lexicon.json"
    lexicon.write_text(
        json.dumps({"DNS": "đi en ét", "router": "ru tơ"}), encoding="utf-8"
    )
    return tmp_path


def _run(compare_dir, monkeypatch, *extra, lexicon=True):
    monkeypatch.chdir(compare_dir / "audio")
    argv = [
        "compare",
        "--text-file", str(compare_dir / "compare.txt"),
        "--out-dir", str(compare_dir / "out"),
        "--engines", "fake",
        *extra,
    ]  # fmt: skip
    if lexicon:
        argv += ["--lexicon", str(compare_dir / "lexicon.json")]
    return audio.main(argv)


def _names(compare_dir):
    return sorted(p.name for p in (compare_dir / "out").glob("*.wav"))


def test_compare_fake_ra_du_hai_file_theo_ten_engine_giong(
    compare_dir, monkeypatch, spy
):
    assert _run(compare_dir, monkeypatch) == 0
    assert _names(compare_dir) == ["fake_a.wav", "fake_b.wav"]
    assert [(c["engine"], c["voice"]) for c in spy.calls] == [
        ("fake", "a"),
        ("fake", "b"),
    ]


def test_compare_cung_van_ban_cho_moi_giong_va_ap_lexicon(
    compare_dir, monkeypatch, spy
):
    _run(compare_dir, monkeypatch)
    assert spy.texts == ["ru tơ gửi packet qua đi en ét."] * 2


def test_compare_cung_loudness_chenh_khong_qua_0_5_lu(
    compare_dir, monkeypatch, spy
):
    _run(compare_dir, monkeypatch)
    levels = [
        ffmpeg_loudness(compare_dir / "out" / n)[0] for n in _names(compare_dir)
    ]
    assert max(levels) - min(levels) <= 0.5, levels
    assert all(-17.0 <= v <= -15.0 for v in levels), levels


def test_compare_file_la_wav_khong_rong(compare_dir, monkeypatch, spy):
    _run(compare_dir, monkeypatch)
    for name in _names(compare_dir):
        info = sf.info(str(compare_dir / "out" / name))
        assert info.frames > 0
        assert info.channels == 1


def test_compare_voices_ten_co_khoang_trang_thay_bang_gach_noi(
    compare_dir, monkeypatch, spy
):
    assert _run(compare_dir, monkeypatch, "--voices", "fake=x y") == 0
    assert _names(compare_dir) == ["fake_x-y.wav"]
    assert [c["voice"] for c in spy.calls] == ["x y"]  # synth nhận tên gốc


def test_compare_ten_giong_co_dau_duoc_bo_dau_d_thanh_d(
    compare_dir, monkeypatch, spy
):
    _run(
        compare_dir,
        monkeypatch,
        "--voices", "fake=Trúc Ly",
        "--voices", "fake=Hải Đăng",
    )  # fmt: skip
    assert _names(compare_dir) == ["fake_Hai-Dang.wav", "fake_Truc-Ly.wav"]
    assert [c["voice"] for c in spy.calls] == ["Trúc Ly", "Hải Đăng"]


def test_compare_khong_lexicon_thi_giu_nguyen_van_ban(
    compare_dir, monkeypatch, spy
):
    audio.compare(
        compare_dir / "compare.txt",
        compare_dir / "out",
        ["fake"],
        {"fake": ["a"]},
        lexicon_path=None,
    )
    assert spy.texts == ["Router gửi packet qua DNS."]


def test_compare_ham_tra_danh_sach_duong_dan_da_ghi(
    compare_dir, monkeypatch, spy
):
    paths = audio.compare(
        compare_dir / "compare.txt",
        compare_dir / "out",
        ["fake"],
        None,
        lexicon_path=None,
    )
    assert [p.name for p in paths] == ["fake_a.wav", "fake_b.wav"]
    assert all(p.is_file() for p in paths)


def test_compare_mac_dinh_dung_hai_engine_that_khong_dung_fake(
    compare_dir, monkeypatch
):
    seen = []

    def stub(engine, text, voice, speed=1.0):  # thay engine thật bằng sóng fake
        seen.append((engine, voice))
        return REAL_SYNTH("fake", text, voice, speed)

    monkeypatch.setattr(engines, "synth", stub)
    paths = audio.compare(
        compare_dir / "compare.txt",
        compare_dir / "out",
        None,
        {"korva": ["k"], "vieneu": ["Trúc Ly"]},
    )
    assert seen == [("korva", "k"), ("vieneu", "Trúc Ly")]
    assert [p.name for p in paths] == ["korva_k.wav", "vieneu_Truc-Ly.wav"]


# ----------------------------------------------------- cần Mac, mô hình thật


@pytest.mark.real
def test_real_compare_ra_file_cho_ca_hai_engine_chenh_loudness_duoi_0_5_lu(
    tmp_path,
):
    out = tmp_path / "compare"
    korva_voice = engines.VOICES["korva"][0]
    vieneu_voice = engines.VOICES["vieneu"][0]
    subprocess.run(
        [
            sys.executable, "-m", "aivideo.audio", "compare",
            "--text-file", "../content/compare.txt",
            "--lexicon", "../content/lexicon.json",
            "--out-dir", str(out),
            "--voices", f"korva={korva_voice}",
            "--voices", f"vieneu={vieneu_voice}",
        ],
        cwd=AUDIO_DIR,
        check=True,
    )  # fmt: skip
    files = sorted(out.glob("*.wav"))
    assert len([f for f in files if f.name.startswith("korva_")]) == 1
    assert len([f for f in files if f.name.startswith("vieneu_")]) == 1
    assert len(files) == 2
    levels = []
    for path in files:
        assert sf.info(str(path)).frames > 0
        levels.append(ffmpeg_loudness(path)[0])
    assert max(levels) - min(levels) <= 0.5, levels


@pytest.mark.real
def test_real_ban_giong_that_dai_60_den_90_giay_va_timeline_hop_le():
    assert (PUBLIC / "timeline.json").is_file(), (
        "chưa có bản dựng thật: chạy `build --engine <korva|vieneu>` trước"
    )
    timeline = json.loads((PUBLIC / "timeline.json").read_text("utf-8"))
    assert audio.validate_timeline(timeline) == []
    assert 1800 <= timeline["durationInFrames"] <= 2700
    info = sf.info(str(PUBLIC / "audio" / "narration.wav"))
    seconds = info.frames / info.samplerate
    assert 60 <= seconds <= 90, seconds
    assert abs(seconds * FPS + 0.5 * FPS - timeline["durationInFrames"]) <= 1
    beats = [b for s in timeline["scenes"] for b in s["beats"]]
    assert len(beats) == 19
