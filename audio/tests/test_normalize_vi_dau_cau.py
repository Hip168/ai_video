"""[5-2] Mẫu số đứng sát dấu câu `.` `,` `?` `!` `;` `)`: phải đọc đúng như
khi đứng riêng và dấu câu còn nguyên."""

from __future__ import annotations

import re

import pytest

from aivideo.normalize_vi import normalize_vi

IP1 = ("một trăm chín mươi hai chấm một trăm sáu mươi tám chấm một"
       " chấm một")
NGAY = "ngày mười lăm tháng một năm hai nghìn không trăm hai mươi bốn"

CASES = [
    ("Mất khoảng 5-10.", "Mất khoảng năm đến mười."),
    ("từ 5-10, rồi", "từ năm đến mười, rồi"),
    ("Ngày 2024-01-15.", "Ngày " + NGAY + "."),
    ("2024-01-15, sau đó", NGAY + ", sau đó"),
    ("IP 192.168.1.1.", "IP " + IP1 + "."),
    ("lúc 12:30.", "lúc mười hai giờ ba mươi."),
    ("bản 3.11.4,", "bản ba chấm mười một chấm bốn,"),
    ("1.000.000.", "một triệu."),
    # các dấu câu và dạng số khác cũng không được hỏng
    ("IP 192.168.1.1, rồi", "IP " + IP1 + ", rồi"),
    ("IP 192.168.1.1?", "IP " + IP1 + "?"),
    ("(IP 192.168.1.1)", "(IP " + IP1 + ")"),
    ("127.0.0.1:80.",
     "một trăm hai mươi bảy chấm không chấm không chấm một cổng tám mươi."),
    ("giá 1.000.000, rẻ", "giá một triệu, rẻ"),
    ("giá 100.000đ.", "giá một trăm nghìn đồng."),
    ("pi là 3,14.", "pi là ba phẩy mười bốn."),
    ("còn 50%.", "còn năm mươi phần trăm."),
    ("còn 50%, hết", "còn năm mươi phần trăm, hết"),
    ("chạy 5 GHz.", "chạy năm gi-ga-héc."),
    ("năm 1995–2005.", "năm một nghìn chín trăm chín mươi lăm đến"
                       " hai nghìn không trăm linh năm."),
    ("lúc 12:30, rồi", "lúc mười hai giờ ba mươi, rồi"),
    ("lúc 12:30:05.", "lúc mười hai giờ ba mươi phút không năm giây."),
    ("số 42.", "số bốn mươi hai."),
    ("số 42, 43; 44!", "số bốn mươi hai, bốn mươi ba; bốn mươi bốn!"),
    ("v1.2.", "v một chấm hai."),
    ("1/2.", "một phần hai."),
    ("-5°C.", "âm năm độ xê."),
    # hệ mười sáu
    ("0x10", "không x một không"),
    ("0xFF", "không x F F"),
]


@pytest.mark.parametrize("raw, want", CASES, ids=[c[0] for c in CASES])
def test_so_sat_dau_cau_doc_dung_va_giu_nguyen_dau_cau(raw, want):
    assert normalize_vi(raw) == want


@pytest.mark.parametrize("raw, _", CASES, ids=[c[0] for c in CASES])
def test_so_sat_dau_cau_khong_con_chu_so(raw, _):
    assert not re.search(r"[0-9]", normalize_vi(raw))


@pytest.mark.parametrize("p", [".", ",", "?", "!", ";", ")", "…"])
@pytest.mark.parametrize(
    "token, spoken",
    [
        ("5-10", "năm đến mười"),
        ("2024-01-15", NGAY),
        ("192.168.1.1", IP1),
        ("12:30", "mười hai giờ ba mươi"),
        ("3.11.4", "ba chấm mười một chấm bốn"),
        ("1.000.000", "một triệu"),
        ("3,14", "ba phẩy mười bốn"),
        ("50%", "năm mươi phần trăm"),
    ],
)
def test_moi_mau_so_giu_nguyen_cach_doc_khi_theo_sau_boi_dau_cau(
        token, spoken, p):
    assert normalize_vi(f"x {token}{p}") == f"x {spoken}{p}"
    assert normalize_vi(f"{token}{p} y") == f"{spoken}{p} y"


@pytest.mark.parametrize("raw", ["3.2024-01-15", "3,2024-01-15"])
def test_ngay_dinh_sau_so_thap_phan_khong_phai_ngay_iso(raw):
    got = normalize_vi(raw)
    assert "ngày" not in got
    assert not re.search(r"[0-9]", got)


def test_khoang_giua_hai_so_co_thap_phan_van_la_den_khi_co_dau_cau():
    assert normalize_vi("2.5-10.") == "hai phẩy năm đến mười."
    assert normalize_vi("1,5-10, rồi") == "một phẩy năm đến mười, rồi"
