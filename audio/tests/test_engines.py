"""[1-2] Engine `fake` và bọc hai engine thật; cấu hình dự án."""

from __future__ import annotations

import tomllib

import numpy as np
import pytest

from conftest import ROOT

AUDIO_DIR = ROOT / "audio"


def fake(text: str, speed: float = 1.0):
    from aivideo.engines import synth

    return synth("fake", text, "test", speed)


def test_fake_tra_float32_mono_voi_sample_rate_nguyen_duong():
    wav, rate = fake("Xin chào các bạn")
    assert isinstance(wav, np.ndarray)
    assert wav.dtype == np.float32
    assert wav.ndim == 1
    assert isinstance(rate, int)
    assert rate > 0
    assert len(wav) > 0
    assert np.isfinite(wav).all()
    assert float(np.max(np.abs(wav))) <= 1.0


def test_fake_do_dai_ty_le_tuyen_tinh_voi_so_ky_tu():
    n20, rate = fake("a" * 20)
    n40 = fake("a" * 40)[0]
    n60 = fake("a" * 60)[0]
    step_a = len(n40) - len(n20)
    step_b = len(n60) - len(n40)
    assert step_a > 0
    assert abs(step_a - step_b) <= 2  # đúng tuyến tính, sai số làm tròn mẫu
    assert rate > 0


def test_fake_co_0_3_giay_lang_o_hai_dau():
    wav, rate = fake("Xin chào các bạn thân mến")
    lead = int(0.3 * rate)
    quiet = 1e-3
    assert float(np.max(np.abs(wav[: lead - 2]))) < quiet
    assert float(np.max(np.abs(wav[-(lead - 2) :]))) < quiet
    body = wav[lead + 2 : len(wav) - lead - 2]
    assert len(body) > 0
    assert float(np.max(np.abs(body))) > 0.05


def test_fake_la_tat_dinh_cung_dau_vao_cung_dau_ra():
    first, rate1 = fake("Lặp lại")
    second, rate2 = fake("Lặp lại")
    assert rate1 == rate2
    assert np.array_equal(first, second)


def test_fake_khong_dung_den_engine_that(monkeypatch):
    import sys

    for name in ("korvatts", "vieneu"):
        monkeypatch.setitem(sys.modules, name, None)  # import sẽ lỗi
    wav, _ = fake("Không cần mô hình")
    assert wav.dtype == np.float32


@pytest.fixture(scope="module")
def pyproject() -> dict:
    return tomllib.loads((AUDIO_DIR / "pyproject.toml").read_text("utf-8"))


def test_pyproject_yeu_cau_python_3_12(pyproject):
    spec = pyproject["project"]["requires-python"].replace(" ", "")
    assert spec.startswith(">=3.12")


def test_pyproject_co_ba_extras_va_ghim_phien_ban(pyproject):
    extras = pyproject["project"]["optional-dependencies"]
    assert {"korva", "vieneu", "dev"} <= set(extras)
    assert any(d.replace(" ", "") == "korvatts==0.1.3" for d in extras["korva"])
    assert any(d.replace(" ", "") == "vieneu==3.8.3" for d in extras["vieneu"])
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


def test_readme_audio_ghi_ket_qua_hai_engine_that():
    text = (AUDIO_DIR / "README.md").read_text("utf-8").lower()
    assert "korva" in text
    assert "vieneu" in text
    assert "float32" in text
    assert "hz" in text


# --- Test cần giọng thật, chỉ chạy trên Mac: `pytest -m real` ---
# Giả định (chưa có nguồn): `voice=None` chọn giọng mặc định của engine;
# giao diện chưa ghi id giọng. Khi DEV-1 ghi `1-am-thanh-giao-dien.md` thì
# TESTER đối chiếu lại.


@pytest.mark.real
@pytest.mark.parametrize(
    ("engine", "expected_rate"), [("korva", 44100), ("vieneu", 48000)]
)
def test_real_engine_tra_float32_mono_va_sample_rate(engine, expected_rate):
    from aivideo.engines import synth

    wav, rate = synth(engine, "Router gửi packet qua DNS.", None, 1.0)
    assert isinstance(wav, np.ndarray)
    assert wav.dtype == np.float32
    assert wav.ndim == 1
    assert len(wav) > rate // 4  # ít nhất 0,25 giây tiếng
    assert isinstance(rate, int)
    # Sample rate theo tài liệu (1-am-thanh.md), chưa chạy thật.
    assert rate == expected_rate
    assert np.isfinite(wav).all()
    assert float(np.max(np.abs(wav))) > 0.01  # không phải toàn lặng
