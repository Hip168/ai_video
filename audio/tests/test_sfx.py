"""[9-1] [9-2] SFX sinh bằng numpy và bus SFX theo timeline.

Nguồn: `.team/features/9-am-thanh-tap-giao-dien.md` (sfx.py) và
`.team/features/9-am-thanh-tap.md`.
"""

from __future__ import annotations

import numpy as np
import pytest

from aivideo import sfx

SR = 48000
FRAME = SR // 30  # 1600 mẫu
REQUIRED = {"pop", "tick", "whoosh", "ding", "buzz"}


def test_names_co_du_nam_sfx_toi_thieu():
    assert REQUIRED <= set(sfx.NAMES)


def test_sr_mac_dinh_la_48000():
    assert sfx.SR == SR


@pytest.mark.parametrize("name", sorted(REQUIRED))
def test_generate_float32_mono_huu_han_dinh_0_9(name):
    x = sfx.generate(name)
    assert x.dtype == np.float32
    assert x.ndim == 1
    assert np.isfinite(x).all()
    assert float(np.max(np.abs(x))) == pytest.approx(0.9, abs=0.01)


@pytest.mark.parametrize("name", sorted(REQUIRED))
def test_generate_do_dai_tu_0_05_den_1_5_giay(name):
    seconds = len(sfx.generate(name)) / SR
    assert 0.05 <= seconds <= 1.5


@pytest.mark.parametrize("name", sorted(REQUIRED))
def test_generate_co_tieng_ngay_tu_dau_va_ket_thuc_ve_0(name):
    x = sfx.generate(name)
    # 10 ms đầu đã có tiếng đáng kể (không có im lặng đầu).
    assert float(np.max(np.abs(x[: SR // 100]))) > 0.01
    assert abs(float(x[-1])) < 1e-3


@pytest.mark.parametrize("name", sorted(REQUIRED))
def test_generate_tat_dinh_hai_lan_giong_het(name):
    assert np.array_equal(sfx.generate(name), sfx.generate(name))


def test_generate_cac_sfx_khac_nhau_doi_mot():
    names = sorted(REQUIRED)
    waves = {n: sfx.generate(n) for n in names}
    for i, a in enumerate(names):
        for b in names[i + 1 :]:
            same = len(waves[a]) == len(waves[b]) and np.array_equal(
                waves[a], waves[b]
            )
            assert not same, f"{a} và {b} giống hệt nhau"


def test_generate_ten_la_nem_value_error_neu_ten_va_danh_sach():
    with pytest.raises(ValueError) as e:
        sfx.generate("khong-co-sfx-nay")
    msg = str(e.value)
    assert "khong-co-sfx-nay" in msg
    assert "pop" in msg


@pytest.mark.parametrize("dur", [1, 30, 241, 600])
def test_render_bus_dai_dung_round_duration_frames(dur):
    bus = sfx.render_bus([], dur)
    assert len(bus) == round(dur * SR / 30)
    assert bus.dtype == np.float32
    assert not bus.any()


def test_render_bus_sfx_bat_dau_dung_mau_va_ap_gain():
    bus = sfx.render_bus([{"frame": 30, "name": "pop", "gainDb": -6}], 120)
    ref = sfx.generate("pop") * 10 ** (-6 / 20)
    start = 30 * FRAME
    assert not bus[:start].any()
    assert np.allclose(bus[start : start + len(ref)], ref, atol=1e-5)
    assert not bus[start + len(ref) :].any()


def test_render_bus_dat_dung_mau_sai_so_duoi_5ms_voi_nhieu_sfx():
    events = [
        {"frame": 7, "name": "tick", "gainDb": 0},
        {"frame": 90, "name": "ding", "gainDb": -3},
        {"frame": 200, "name": "buzz", "gainDb": -12},
    ]
    bus = sfx.render_bus(events, 300)
    tol = int(0.005 * SR)
    for ev in events:
        expected = round(ev["frame"] * SR / 30)
        ref = sfx.generate(ev["name"]) * 10 ** (ev["gainDb"] / 20)
        seg = bus[expected - tol : expected + tol]
        # trước vị trí mong đợi 5 ms là im lặng (không có SFX khác ở đó)
        assert not bus[expected - tol : expected].any()
        assert np.allclose(
            bus[expected : expected + len(ref)], ref, atol=1e-5
        ), ev
        assert seg.any()


def test_render_bus_sfx_chong_nhau_thi_cong():
    events = [
        {"frame": 10, "name": "pop", "gainDb": -6},
        {"frame": 10, "name": "ding", "gainDb": -9},
    ]
    bus = sfx.render_bus(events, 100)
    a = sfx.generate("pop") * 10 ** (-6 / 20)
    b = sfx.generate("ding") * 10 ** (-9 / 20)
    want = np.zeros_like(bus)
    start = 10 * FRAME
    want[start : start + len(a)] += a
    want[start : start + len(b)] += b
    assert np.allclose(bus, want, atol=1e-5)


def test_render_bus_phan_vuot_cuoi_bi_cat_khong_loi():
    dur = 31
    bus = sfx.render_bus([{"frame": 30, "name": "ding", "gainDb": 0}], dur)
    assert len(bus) == dur * FRAME
    ref = sfx.generate("ding")
    n = len(bus) - 30 * FRAME
    assert len(ref) > n
    assert np.allclose(bus[30 * FRAME :], ref[:n], atol=1e-5)


@pytest.mark.parametrize("frame", [-1, 100, 101])
def test_render_bus_frame_ngoai_khoang_nem_value_error(frame):
    with pytest.raises(ValueError):
        sfx.render_bus([{"frame": frame, "name": "pop", "gainDb": 0}], 100)


def test_render_bus_frame_cuoi_hop_le_la_duration_tru_1():
    bus = sfx.render_bus([{"frame": 99, "name": "pop", "gainDb": 0}], 100)
    assert bus[99 * FRAME :].any()


def test_render_bus_gain_duong_nem_value_error():
    with pytest.raises(ValueError):
        sfx.render_bus([{"frame": 1, "name": "pop", "gainDb": 0.5}], 100)


def test_render_bus_ten_la_nem_value_error():
    with pytest.raises(ValueError):
        sfx.render_bus([{"frame": 1, "name": "xxx", "gainDb": 0}], 100)
