"""[5-2] `normalize_vi` và `speak` theo `5-dung-tap-giao-dien.md`."""

from __future__ import annotations

import re

import pytest

from aivideo.normalize_vi import normalize_vi, speak

CASES = [
    # thập phân
    ("3,14", "ba phẩy mười bốn"),
    ("3.14", "ba phẩy mười bốn"),
    ("2,4", "hai phẩy bốn"),
    ("0,05", "không phẩy không năm"),
    ("3,141", "ba phẩy một bốn một"),
    ("0,125", "không phẩy một hai năm"),
    ("0,5", "không phẩy năm"),
    ("2,75", "hai phẩy bảy mươi lăm"),
    # phân cách nghìn
    ("1.000", "một nghìn"),
    ("2.500", "hai nghìn năm trăm"),
    ("1.000.000", "một triệu"),
    ("1.000.000.000", "một tỷ"),
    # phần trăm
    ("50%", "năm mươi phần trăm"),
    ("100%", "một trăm phần trăm"),
    ("12,5%", "mười hai phẩy năm phần trăm"),
    # đơn vị
    ("3 GHz", "ba gi-ga-héc"),
    ("3GHz", "ba gi-ga-héc"),
    ("800 MHz", "tám trăm mê-ga-héc"),
    ("10 kHz", "mười ki-lô-héc"),
    ("60 Hz", "sáu mươi héc"),
    ("16 GB", "mười sáu gi-ga-bai"),
    ("512 MB", "năm trăm mười hai mê-ga-bai"),
    ("32 KB", "ba mươi hai ki-lô-bai"),
    ("2 TB", "hai tê-ra-bai"),
    ("100 Mbps", "một trăm mê-ga-bít trên giây"),
    ("1 Gbps", "một gi-ga-bít trên giây"),
    ("5 ms", "năm mili giây"),
    ("10 ns", "mười na-nô giây"),
    ("7 µs", "bảy micro giây"),
    ("2 s", "hai giây"),
    ("90 km/h", "chín mươi ki-lô-mét trên giờ"),
    ("5 km", "năm ki-lô-mét"),
    ("8 cm", "tám xen-ti-mét"),
    ("4 mm", "bốn mi-li-mét"),
    ("10 kg", "mười ki-lô-gam"),
    ("25°C", "hai mươi lăm độ xê"),
    # năm
    ("năm 1995", "năm một nghìn chín trăm chín mươi lăm"),
    ("năm 2000", "năm hai nghìn"),
    # khoảng
    ("1995–2005",
     "một nghìn chín trăm chín mươi lăm đến hai nghìn không trăm linh năm"),
    ("1995-2005",
     "một nghìn chín trăm chín mươi lăm đến hai nghìn không trăm linh năm"),
    ("1995 – 2005",
     "một nghìn chín trăm chín mươi lăm đến hai nghìn không trăm linh năm"),
    ("10-20", "mười đến hai mươi"),
    # nhân
    ("1920x1080",
     "một nghìn chín trăm hai mươi nhân một nghìn không trăm tám mươi"),
    ("1920×1080",
     "một nghìn chín trăm hai mươi nhân một nghìn không trăm tám mươi"),
    # số trần
    ("42", "bốn mươi hai"),
    ("7", "bảy"),
    ("0", "không"),
    # nằm trong câu, dấu câu giữ nguyên
    ("Có 3 cái, rồi 5 cái.", "Có ba cái, rồi năm cái."),
    ("CPU chạy 3,5 GHz!", "CPU chạy ba phẩy năm gi-ga-héc!"),
]


def test_bang_test_co_it_nhat_30_dong():
    assert len(CASES) >= 30


@pytest.mark.parametrize("raw, want", CASES, ids=[c[0] for c in CASES])
def test_normalize_vi_bang_dau_vao_dau_ra(raw, want):
    assert normalize_vi(raw) == want


@pytest.mark.parametrize("raw, _", CASES, ids=[c[0] for c in CASES])
def test_ket_qua_khong_con_chu_so(raw, _):
    assert not re.search(r"[0-9]", normalize_vi(raw))


@pytest.mark.parametrize(
    "plain",
    ["Xin chào các bạn", "", "Máy tính chỉ hiểu không và một.", "Wi-Fi nhanh"],
)
def test_van_ban_khong_co_so_thi_giu_nguyen(plain):
    assert normalize_vi(plain) == plain


def test_chay_hai_lan_cho_cung_ket_qua():
    once = normalize_vi("Năm 1995, 3,14 GHz và 50%")
    assert normalize_vi(once) == once


def test_speak_chuan_hoa_so_roi_ap_lexicon_khong_phan_biet_hoa_thuong():
    assert speak("Router 5 GHz", {"router": "rao tơ"}) == "rao tơ năm gi-ga-héc"


def test_speak_khong_lexicon_bang_normalize_vi_cho_van_ban_thuong():
    text = "Tốc độ 100 Mbps"
    assert speak(text, {}) == normalize_vi(text)


def test_speak_khong_sua_chuoi_goc_ham_thuan_tuy():
    lex = {"router": "rao tơ"}
    src = "router 3,14"
    speak(src, lex)
    assert src == "router 3,14" and lex == {"router": "rao tơ"}
