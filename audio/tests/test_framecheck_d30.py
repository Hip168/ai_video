"""D30: `scan` không báo đột biến với fade đều và viền mảnh đang trượt.

Hai dạng báo sai gặp ở tập vi-sao-may-tinh-dung-nhi-phan: số điểm khác nền
(`c`) tụt vì một vùng fade đều qua ngưỡng đếm, hoặc vì viền mảnh trượt nửa
điểm ảnh ở nửa độ phân giải. Hình không mất, nên không được báo.
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
import pytest

from aivideo.framecheck import count_series, find_dips, read_frames, scan
from rd_support import BG, draw_frame, write_video

N = 40


def _fade(i: int) -> np.ndarray:
    """Thêm một khối 120x60 (1800 điểm nửa độ phân giải, ~4,8%) tối dần 3 mức mỗi khung."""
    f = draw_frame()
    f[700:760, 1500:1620] = max(BG, BG + 110 - 3 * i)
    return f


def _border(i: int) -> np.ndarray:
    """Hai viền ngang dày 2 px, mờ (BG+130), trượt 1 px mỗi khung như viền thẻ đang vào."""
    f = draw_frame()
    for y0 in (40, 440):
        y = y0 + i
        f[y:y + 2, 60:1860] = BG + 130
    return f


@pytest.fixture(scope="module", params=["fade", "border"])
def video(request, tmp_path_factory) -> Path:
    fn = {"fade": _fade, "border": _border}[request.param]
    return write_video(tmp_path_factory.mktemp("d30") / f"{request.param}.mp4", N, fn=fn)


def test_chuoi_dem_co_ung_vien_dot_bien(video):
    """Bảo đảm video thật sự gây báo sai ở bước lọc ứng viên (find_dips)."""
    assert find_dips(count_series(read_frames(video)))


def test_scan_khong_bao_dot_bien(video):
    assert scan(video) == []
