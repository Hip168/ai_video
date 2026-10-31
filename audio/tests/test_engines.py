"""[1-2] Engine `fake` và bọc hai engine thật; cấu hình dự án."""

from __future__ import annotations

import subprocess
import sys
import tomllib
import types

import numpy as np
import pytest

from aivideo import engines
from conftest import ROOT

AUDIO_DIR = ROOT / "audio"
FAKE_RATE = 24000
PAD = int(0.3 * FAKE_RATE)


def fake(text: str, voice: str = "test", speed: float = 1.0):
    return engines.synth("fake", text, voice, speed)


def test_fake_tra_float32_mono_24khz_trong_khoang_chuan():
    wav, rate = fake("Xin chào các bạn")
    assert isinstance(wav, np.ndarray)
    assert wav.dtype == np.float32
    assert wav.ndim == 1
    assert rate == FAKE_RATE
    assert np.isfinite(wav).all()
    assert float(np.max(np.abs(wav))) <= 1.0


@pytest.mark.parametrize(
    ("chars", "speed"), [(20, 1.0), (50, 1.0), (50, 2.0), (30, 0.5)]
)
def test_fake_do_dai_dung_cong_thuc_giao_dien(chars, speed):
    wav, _ = fake("a" * chars, speed=speed)
    body = round(chars * 0.06 / speed * FAKE_RATE)
    assert abs(len(wav) - (body + 2 * PAD)) <= 1


def test_fake_co_0_3_giay_lang_tuyet_doi_o_hai_dau():
    wav, _ = fake("Xin chào các bạn thân mến")
    assert np.array_equal(wav[:PAD], np.zeros(PAD, dtype=np.float32))
    assert np.array_equal(wav[-PAD:], np.zeros(PAD, dtype=np.float32))
    body = wav[PAD + 2 : len(wav) - PAD - 2]
    assert len(body) > 0
    assert float(np.max(np.abs(body))) > 0.05


def test_fake_la_tat_dinh_cung_dau_vao_cung_dau_ra():
    first, rate1 = fake("Lặp lại", "v", 1.0)
    second, rate2 = fake("Lặp lại", "v", 1.0)
    assert rate1 == rate2
    assert np.array_equal(first, second)


def test_fake_doi_voice_doi_song_nhung_giu_nguyen_do_dai():
    one, _ = fake("Cùng một câu", voice="a")
    two, _ = fake("Cùng một câu", voice="b")
    assert len(one) == len(two)
    assert not np.array_equal(one, two)


def test_fake_voices_co_hai_giong_a_b():
    assert engines.VOICES["fake"] == ["a", "b"]
    assert set(engines.ENGINES) == {"korva", "vieneu", "fake"}


@pytest.mark.parametrize("bad", ["", "   ", "\n\t"])
def test_text_rong_hoac_khoang_trang_nem_value_error(bad):
    with pytest.raises(ValueError):
        fake(bad)


def test_engine_la_nem_value_error():
    with pytest.raises(ValueError):
        engines.synth("khong-co", "xin chào", "v", 1.0)


@pytest.mark.parametrize(
    ("engine", "package"), [("korva", "korvatts"), ("vieneu", "vieneu")]
)
def test_thieu_goi_engine_that_nem_runtime_error_co_huong_dan(
    monkeypatch, engine, package
):
    monkeypatch.setitem(sys.modules, package, None)  # import sẽ lỗi
    with pytest.raises(RuntimeError) as info:
        engines.synth(engine, "xin chào", "v", 1.0)
    message = str(info.value)
    assert engine in message
    assert "install" in message


def test_import_luoi_khong_nap_korvatts_vieneu_khi_dung_fake(tmp_path):
    code = (
        "import sys\n"
        "import aivideo.audio\n"
        "from aivideo import engines\n"
        "engines.synth('fake', 'xin chào', 'v', 1.0)\n"
        "assert 'korvatts' not in sys.modules\n"
        "assert 'vieneu' not in sys.modules\n"
    )
    subprocess.run([sys.executable, "-c", code], check=True, cwd=tmp_path)


def test_vieneu_speed_khac_1_nem_value_error_voi_goi_gia(monkeypatch):
    called = []

    class FakeVieneu:  # thay gói vieneu thật để chạy được trên CI
        def __init__(self):
            called.append("init")

    stub = types.ModuleType("vieneu")
    stub.Vieneu = FakeVieneu
    monkeypatch.setitem(sys.modules, "vieneu", stub)
    with pytest.raises(ValueError):
        engines.synth("vieneu", "xin chào", "Trúc Ly", 1.2)
    assert called == []  # từ chối trước khi nạp mô hình


@pytest.fixture(scope="module")
def pyproject() -> dict:
    return tomllib.loads((AUDIO_DIR / "pyproject.toml").read_text("utf-8"))


def test_pyproject_yeu_cau_python_3_12(pyproject):
    spec = pyproject["project"]["requires-python"].replace(" ", "")
    assert spec.startswith(">=3.12")


def test_pyproject_co_ba_extras_va_ghim_phien_ban(pyproject):
    extras = pyproject["project"]["optional-dependencies"]
    assert {"korva", "vieneu", "dev"} <= set(extras)
    korva = extras["korva"]
    vieneu = extras["vieneu"]
    assert any(d.replace(" ", "") == "korvatts==0.1.3" for d in korva)
    assert any(d.replace(" ", "") == "vieneu==3.8.3" for d in vieneu)
    for dep in extras["dev"]:
        assert "==" in dep, f"chưa ghim phiên bản: {dep}"
    deps = pyproject["project"]["dependencies"]
    names = {d.split("=")[0].strip().lower() for d in deps}
    assert {"numpy", "soundfile"} <= names
    for dep in deps:
        assert "==" in dep, f"chưa ghim phiên bản: {dep}"


def test_pyproject_dang_ky_marker_real(pyproject):
    markers = pyproject["tool"]["pytest"]["ini_options"]["markers"]
    assert any(m.split(":")[0].strip() == "real" for m in markers)


def test_readme_audio_ghi_kieu_du_lieu_sample_rate_va_xung_dot_phu_thuoc():
    text = (AUDIO_DIR / "README.md").read_text("utf-8").lower()
    assert "korva" in text
    assert "vieneu" in text
    assert "float32" in text
    assert "44100" in text
    assert "48000" in text
    assert "xung đột" in text  # mục xung đột phụ thuộc (tiêu chí 1-2)


# --- Test cần giọng thật, chỉ chạy trên Mac: `pytest -m real` ---


@pytest.mark.real
@pytest.mark.parametrize(
    ("engine", "expected_rate"), [("korva", 44100), ("vieneu", 48000)]
)
def test_real_engine_tra_float32_mono_va_sample_rate(engine, expected_rate):
    voice = engines.VOICES[engine][0]
    wav, rate = engines.synth(engine, "Router gửi packet qua DNS.", voice, 1.0)
    assert isinstance(wav, np.ndarray)
    assert wav.dtype == np.float32
    assert wav.ndim == 1
    assert len(wav) > rate // 4  # ít nhất 0,25 giây tiếng
    # Sample rate theo tài liệu và README audio/.
    assert rate == expected_rate
    assert np.isfinite(wav).all()
    assert float(np.max(np.abs(wav))) > 0.01  # không phải toàn lặng
