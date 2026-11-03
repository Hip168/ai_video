"""[5-2] Đọc số kiểu tin học: IP, phiên bản, cổng, giờ, gạch nối, ngày,
khoá lexicon có chữ số. Nguồn: mục "Đọc số" của
`.team/features/0b-hop-dong-timeline-v2.md`."""

from __future__ import annotations

import re

import pytest

from aivideo.normalize_vi import normalize_vi, speak

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
    ("x86-64", "x tám mươi sáu sáu mươi bốn"),
    ("ARMv8-A", "ARMv tám A"),
    ("IPv4-6", "IPv bốn sáu"),
    # ngày
    ("2024-01-15",
     "ngày mười lăm tháng một năm hai nghìn không trăm hai mươi bốn"),
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
    assert normalize_vi(raw) == want


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
    assert speak("x86-64", {"x86": "ích tám sáu"}) == (
        "ích tám sáu sáu mươi bốn")


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


# ================================================== vòng sửa theo duyệt 1
IP = {
    "192.168.1.1": "một trăm chín mươi hai chấm một trăm sáu mươi tám"
                   " chấm một chấm một",
    "192.168.1.9": "một trăm chín mươi hai chấm một trăm sáu mươi tám"
                   " chấm một chấm chín",
}

ROUND2 = [
    # hậu tố sau phiên bản / IP: "-" như khoảng trắng
    ("1.2.3-beta", "một chấm hai chấm ba beta"),
    ("v2.0.1-rc1", "v hai chấm không chấm một rc một"),
    ("192.168.1.1-192.168.1.9", IP["192.168.1.1"] + " " + IP["192.168.1.9"]),
    # luật 1: đúng 4 nhóm 1-3 chữ số, mỗi nhóm <= 255, nhóm cuối khác 000
    ("10.255.255.255",
     "mười chấm hai trăm năm mươi lăm chấm hai trăm năm mươi lăm"
     " chấm hai trăm năm mươi lăm"),
    ("192.168.100.200",
     "một trăm chín mươi hai chấm một trăm sáu mươi tám"
     " chấm một trăm chấm hai trăm"),
    ("172.217.160.142",
     "một trăm bảy mươi hai chấm hai trăm mười bảy"
     " chấm một trăm sáu mươi chấm một trăm bốn mươi hai"),
    # luật 2: số có phân cách nghìn
    ("1.000.000", "một triệu"),
    ("1.200.000.000", "một tỷ hai trăm triệu"),
    ("1.000.000.000", "một tỷ"),
    ("2.500.000", "hai triệu năm trăm nghìn"),
    # luật 3: phiên bản
    ("v1.2", "v một chấm hai"),
    ("1.2.3.4.5", "một chấm hai chấm ba chấm bốn chấm năm"),
    ("256.1.1.1", "hai trăm năm mươi sáu chấm một chấm một chấm một"),
    # luật 4: hai nhóm không chữ cái phía trước là thập phân
    ("3.14", "ba phẩy mười bốn"),
    # giờ có giây
    ("12:30:45", "mười hai giờ ba mươi phút bốn mươi lăm giây"),
    # nhiều gạch không phải ngày
    ("1-2-3", "một hai ba"),
    ("10-20-30", "mười hai mươi ba mươi"),
    # ngày YYYY-M-D 1-2 chữ số
    ("2024-1-5",
     "ngày năm tháng một năm hai nghìn không trăm hai mươi bốn"),
    ("2024-12-31",
     "ngày ba mươi mốt tháng mười hai năm hai nghìn không trăm hai mươi bốn"),
    # cổng nhiều chữ số đọc như số
    ("127.0.0.1:123456",
     "một trăm hai mươi bảy chấm không chấm không chấm một cổng"
     " một trăm hai mươi ba nghìn bốn trăm năm mươi sáu"),
    ("10.0.0.1:65535",
     "mười chấm không chấm không chấm một cổng sáu mươi lăm nghìn"
     " năm trăm ba mươi lăm"),
]


@pytest.mark.parametrize("raw, want", ROUND2, ids=[c[0] for c in ROUND2])
def test_doc_so_tin_hoc_vong_2_dung_nguyen_van(raw, want):
    assert normalize_vi(raw) == want


@pytest.mark.parametrize("raw, _", ROUND2, ids=[c[0] for c in ROUND2])
def test_doc_so_tin_hoc_vong_2_khong_con_chu_so_va_gach(raw, _):
    got = normalize_vi(raw)
    assert not re.search(r"[0-9]", got), got
    assert "-" not in got, got


def test_nhom_cuoi_000_khong_phai_ip():
    got = normalize_vi("1.200.000.000")
    assert "chấm" not in got


def test_nhom_vuot_255_khong_phai_ip_ma_la_phien_ban():
    assert "chấm" in normalize_vi("256.1.1.1")
    assert "tỷ" not in normalize_vi("256.1.1.1")


# ---- lexicon: ranh giới từ ------------------------------------------------
@pytest.mark.parametrize(
    "text, lex, want",
    [
        ("MAIL và AI", {"AI": "ây ai"}, "MAIL và ây ai"),
        ("AIR và AI", {"AI": "ây ai"}, "AIR và ây ai"),
        ("PAID, AI.", {"AI": "ây ai"}, "PAID, ây ai."),
        ("tip và ip", {"ip": "ai pi"}, "tip và ai pi"),
        ("ipad ip", {"ip": "ai pi"}, "ipad ai pi"),
        ("(AI)", {"AI": "ây ai"}, "(ây ai)"),
        ("AI-first", {"AI": "ây ai"}, "ây ai-first"),
    ],
)
def test_lexicon_chi_thay_nguyen_tu_khong_thay_trong_tu_khac(text, lex, want):
    assert speak(text, lex) == want


def test_khoa_lexicon_co_chu_so_khong_thay_trong_chuoi_so_dai_hon():
    got = speak("x860 và x86", {"x86": "ích tám sáu"})
    assert got.count("ích tám sáu") == 1
    assert got.endswith("ích tám sáu")


# ---- ca biên luật IP / số (luật 1 sau điều chỉnh) --------------------------
BIEN_IP_SO = [
    # mọi nhóm sau nhóm đầu đúng 3 chữ số và có nhóm 000 -> SỐ
    ("192.168.000.001",
     "một trăm chín mươi hai tỷ một trăm sáu mươi tám triệu không trăm linh một"),
    ("2.000.000.100", "hai tỷ một trăm"),
    ("1.000.000.001", "một tỷ không trăm linh một"),
    ("1.000.000.005", "một tỷ không trăm linh năm"),
    ("255.255.255.256",
     "hai trăm năm mươi lăm tỷ hai trăm năm mươi lăm triệu"
     " hai trăm năm mươi lăm nghìn hai trăm năm mươi sáu"),
    # có nhóm khác 3 chữ số, hoặc không có nhóm 000 -> IP
    ("10.100.100.100", "mười chấm một trăm chấm một trăm chấm một trăm"),
    ("100.100.100.100",
     "một trăm chấm một trăm chấm một trăm chấm một trăm"),
    ("255.255.255.255",
     "hai trăm năm mươi lăm chấm hai trăm năm mươi lăm"
     " chấm hai trăm năm mươi lăm chấm hai trăm năm mươi lăm"),
    ("10.0.0.1", "mười chấm không chấm không chấm một"),
]


@pytest.mark.parametrize("raw, want", BIEN_IP_SO, ids=[c[0] for c in BIEN_IP_SO])
def test_ca_bien_giua_ip_va_so_co_phan_cach_nghin(raw, want):
    assert normalize_vi(raw) == want


@pytest.mark.parametrize("raw, want", BIEN_IP_SO, ids=[c[0] for c in BIEN_IP_SO])
def test_ca_bien_ip_so_chi_co_chu_cham_khi_la_ip(raw, want):
    got = normalize_vi(raw)
    assert ("chấm" in got) == ("chấm" in want)
    assert not re.search(r"[0-9]", got)


def test_ip_nhom_000_doc_la_khong_theo_gia_tri_so():
    assert normalize_vi("192.168.1.000") == (
        "một trăm chín mươi hai chấm một trăm sáu mươi tám chấm một"
        " chấm không")


def test_ip_nhom_co_so_0_dau_doc_theo_gia_tri_so_010_la_muoi():
    assert normalize_vi("10.010.0.1") == (
        "mười chấm mười chấm không chấm một")


def test_ip_nhom_001_doc_la_mot_khong_phai_khong_khong_mot():
    assert normalize_vi("10.001.0.1") == "mười chấm một chấm không chấm một"
