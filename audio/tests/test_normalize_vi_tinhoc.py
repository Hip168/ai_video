"""[5-2] Đọc số kiểu tin học: IP, phiên bản, cổng, giờ, gạch nối, ngày,
khoá lexicon có chữ số. Nguồn: mục "Đọc số" của
`.team/features/0b-hop-dong-timeline-v2.md`."""

from __future__ import annotations

import re

import pytest

from aivideo.normalize_vi import normalize_vi, speak

def _tu(text: str) -> str:
    """Hợp đồng viết "mươi tư" (x86-64, 2024) nhưng `number_to_words` của
    đề mục 1 đọc "mươi bốn"; chưa chốt (CẦN BA), nên so hai cách đọc 4 là
    một. Mọi chỗ khác so nguyên văn."""
    return text.replace("mươi bốn", "mươi tư")


CASES = [
    # IP và phiên bản: từ 3 nhóm số nối bằng "." trở lên, mỗi nhóm như số
    ("192.168.1.1",
     "một trăm chín mươi hai chấm một trăm sáu mươi tám chấm một chấm một"),
    ("10.0.0.1", "mười chấm không chấm không chấm một"),
    ("1.2.3", "một chấm hai chấm ba"),
    ("3.11.4", "ba chấm mười một chấm bốn"),
    ("Mở 8.8.8.8 ngay", "Mở tám chấm tám chấm tám chấm tám ngay"),
    # IP:cổng
    ("127.0.0.1:80",
     "một trăm hai mươi bảy chấm không chấm không chấm một cổng tám mươi"),
    ("192.168.1.1:443",
     "một trăm chín mươi hai chấm một trăm sáu mươi tám chấm một chấm một"
     " cổng bốn trăm bốn mươi ba"),
    # giờ hợp lệ
    ("23:59", "hai mươi ba giờ năm mươi chín"),
    ("7:05", "bảy giờ không năm"),
    ("12:30", "mười hai giờ ba mươi"),
    # gạch nối không phải khoảng
    ("x86-64", "x tám mươi sáu sáu mươi tư"),
    ("ARMv8-A", "ARMv tám A"),
    ("IPv4-6", "IPv bốn sáu"),
    # ngày
    ("2024-01-15",
     "ngày mười lăm tháng một năm hai nghìn không trăm hai mươi tư"),
    # phải giữ nguyên cách đọc cũ: hai số trần đứng riêng -> "đến"
    ("1995–2005",
     "một nghìn chín trăm chín mươi lăm đến hai nghìn không trăm linh năm"),
    ("3-5", "ba đến năm"),
    ("10 – 20", "mười đến hai mươi"),
    ("1995-2005",
     "một nghìn chín trăm chín mươi lăm đến hai nghìn không trăm linh năm"),
]


@pytest.mark.parametrize("raw, want", CASES, ids=[c[0] for c in CASES])
def test_doc_so_tin_hoc_bang_dau_vao_dau_ra(raw, want):
    assert _tu(normalize_vi(raw)) == want


@pytest.mark.parametrize("raw, _", CASES, ids=[c[0] for c in CASES])
def test_doc_so_tin_hoc_khong_con_chu_so(raw, _):
    assert not re.search(r"[0-9]", normalize_vi(raw))


# Giờ không hợp lệ hoặc đứng sau chữ / số / dấu "." thì KHÔNG đọc "giờ".
NOT_TIME = ["25:99", "24:00", "10:60", "99:99", "a12:30", "x1:30",
            "1.12:30", "5112:30", "1:80", "ver2:15"]


@pytest.mark.parametrize("raw", NOT_TIME)
def test_chuoi_giong_gio_nhung_khong_hop_le_thi_khong_doc_gio(raw):
    got = normalize_vi(raw)
    assert "giờ" not in got, got
    assert not re.search(r"[0-9]", got), got


def test_1_80_trong_ip_cong_la_cong_khong_phai_gio():
    got = normalize_vi("127.0.0.1:80")
    assert "giờ" not in got and got.endswith("cổng tám mươi")


@pytest.mark.parametrize("raw", ["x86-64", "ARMv8-A", "IPv4-6", "COVID-19",
                                 "A-5", "5-B", "2024-01-15",
                                 "H264-AVC", "3-5a", "7-9v2"])
def test_gach_noi_khong_phai_hai_so_tran_thi_khong_doc_den(raw):
    got = normalize_vi(raw)
    assert "đến" not in got, got
    assert "-" not in got, got  # đọc như khoảng trắng
    assert not re.search(r"[0-9]", got), got


@pytest.mark.parametrize("raw", ["3-5", "1995–2005", "1-2"])
def test_hai_so_tran_dung_rieng_van_la_den(raw):
    assert " đến " in normalize_vi(raw)


@pytest.mark.parametrize(
    "raw",
    ["1.2.3.4.5", "255.255.255.0", "10.0.0.1:8080", "0.0.0.0", "5.4.3.2.1",
     "v1.2.3", "Chrome 120.0.6099.109", "9.9.9", "100.200.300.400:65535",
     "192.168.0.1-192.168.0.9", "2025-12-31", "0001-01-01", "1999-1-1"],
)
def test_ip_phien_ban_ngay_khong_bao_gio_con_chu_so(raw):
    got = normalize_vi(raw)
    assert not re.search(r"[0-9]", got), got


# ---- khoá lexicon có chữ số: so trên chữ gốc, TRƯỚC normalize_vi ----------
def test_khoa_lexicon_co_chu_so_duoc_thay_truoc_khi_doc_so():
    assert speak("Chip x86 chạy nhanh", {"x86": "ích tám sáu"}) == (
        "Chip ích tám sáu chạy nhanh")


def test_khoa_lexicon_co_chu_so_trong_chuoi_co_gach_noi():
    assert _tu(speak("x86-64", {"x86": "ích tám sáu"})) == (
        "ích tám sáu sáu mươi tư")


def test_khoa_lexicon_ba_d_khong_bi_doc_thanh_ba_d_truoc():
    assert speak("Phim 3D", {"3D": "ba đê"}) == "Phim ba đê"


def test_khoa_lexicon_khong_phan_biet_hoa_thuong_co_chu_so():
    assert speak("CHIP X86", {"x86": "ích tám sáu"}) == "CHIP ích tám sáu"


def test_lexicon_khong_khop_thi_van_doc_so_binh_thuong():
    assert speak("Chip x86", {"arm64": "a rờm"}) == "Chip x tám mươi sáu"


def test_speak_ip_va_cong_khi_co_lexicon_khac():
    assert speak("Router 192.168.1.1:80", {"router": "rao tơ"}) == (
        "rao tơ một trăm chín mươi hai chấm một trăm sáu mươi tám chấm một"
        " chấm một cổng tám mươi")
