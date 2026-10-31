"""[1-3] Chuẩn hóa văn bản, bảng phát âm, `spoken`, phụ đề giữ chữ gốc.

Gọi trực tiếp `number_to_words`, `normalize_text`, `spoken_text` và quan
sát qua `build` (chuỗi thật gửi vào `synth`, phụ đề ghi ra).
"""

from __future__ import annotations

import copy

import pytest

from aivideo.audio import (
    load_lexicon,
    load_script,
    normalize_text,
    number_to_words,
    spoken_text,
)
from conftest import ROOT, make_project, seg

LEXICON = {"DNS": "đi en ét", "Wi-Fi": "wai phai", "IP": "ai pi"}


@pytest.mark.parametrize(
    ("number", "words"),
    [
        (0, "không"),
        (1, "một"),
        (3, "ba"),
        (10, "mười"),
        (11, "mười một"),
        (15, "mười lăm"),
        (20, "hai mươi"),
        (21, "hai mươi mốt"),
        (25, "hai mươi lăm"),
        (99, "chín mươi chín"),
    ],
)
def test_number_to_words_so_khong_mo_ho(number, words):
    assert number_to_words(number) == words


def test_normalize_so_thanh_chu_giu_dau_cau():
    assert normalize_text("Có 3 gói, rồi 10 giây!", {}) == (
        "Có ba gói, rồi mười giây!"
    )


def test_normalize_nhieu_so_trong_mot_cau():
    assert normalize_text("Đợi 15 phút hoặc 21 phút", {}) == (
        "Đợi mười lăm phút hoặc hai mươi mốt phút"
    )


def test_normalize_thay_tu_theo_bang_phat_am_giu_dau_cau():
    result = normalize_text("Nó hỏi DNS, qua Wi-Fi rồi lấy IP.", LEXICON)
    assert result == "Nó hỏi đi en ét, qua wai phai rồi lấy ai pi."


def test_normalize_khong_phan_biet_hoa_thuong():
    lexicon = {"router": "ru tơ"}
    assert normalize_text("Router giống người gác cổng", lexicon) == (
        "ru tơ giống người gác cổng"
    )
    assert normalize_text("nhiều ROUTER khác", lexicon) == "nhiều ru tơ khác"


def test_normalize_khoa_dai_uu_tien_khong_tach_wi_fi():
    lexicon = {"Wi": "oai", "Wi-Fi": "wai phai", "Fi": "phi"}
    assert normalize_text("sóng Wi-Fi mạnh", lexicon) == "sóng wai phai mạnh"


def test_normalize_chi_thay_nguyen_tu_khong_thay_giua_tu():
    assert normalize_text("DNSSEC và ZIP", LEXICON) == "DNSSEC và ZIP"


def test_normalize_la_ham_thuan_khong_doi_dau_vao():
    lexicon = dict(LEXICON)
    text = "Có 3 DNS"
    normalize_text(text, lexicon)
    assert text == "Có 3 DNS"
    assert lexicon == LEXICON


def test_spoken_text_dung_text_khi_khong_co_spoken():
    segment = seg("x", "phone", "Nó hỏi DNS lúc 3 giờ")
    assert spoken_text(segment, LEXICON) == "Nó hỏi đi en ét lúc ba giờ"


def test_spoken_text_uu_tien_spoken_va_van_qua_chuan_hoa():
    segment = seg("x", "phone", "Chữ phụ đề", spoken="gọi DNS 3 lần")
    assert spoken_text(segment, LEXICON) == "gọi đi en ét ba lần"


@pytest.mark.parametrize("empty", ["", None])
def test_spoken_rong_quay_ve_text(empty):
    segment = seg("x", "phone", "Đọc chữ gốc có 3 gói", spoken=empty)
    assert spoken_text(segment, LEXICON) == "Đọc chữ gốc có ba gói"


def test_spoken_text_khong_doi_segment():
    segment = seg("x", "phone", "Có DNS", spoken="đọc 3 DNS")
    before = copy.deepcopy(segment)
    spoken_text(segment, LEXICON)
    assert segment == before


def test_kich_ban_that_s10_router_duoc_thay_theo_bang_that_neu_co():
    script = load_script(ROOT / "content" / "script.json")
    lexicon = load_lexicon(ROOT / "content" / "lexicon.json")
    s10 = next(s for s in script["segments"] if s["id"] == "s10")
    assert s10["text"].startswith("Router ")
    spoken = spoken_text(s10, lexicon)
    if "router" in lexicon:  # bảng sửa được: bỏ router thì giữ nguyên chữ
        assert spoken.startswith(lexicon["router"])
        assert "Router" not in spoken
    else:
        assert spoken.startswith("Router ")
    assert s10["text"].startswith("Router ")  # phụ đề không đổi


# ------------------------------------------------ qua build (đầu cuối nhỏ)


def _build(tmp_path, spy, segments, lexicon=None):
    project = make_project(tmp_path, spy, segments, lexicon)
    project.build()
    return project


def test_build_gui_vao_synth_loi_doc_da_chuan_hoa(tmp_path, spy):
    project = _build(
        tmp_path,
        spy,
        [seg("n1", "dns", "Có 3 gói qua DNS và Wi-Fi")],
        LEXICON,
    )
    assert project.calls == ["Có ba gói qua đi en ét và wai phai"]


def test_build_spoken_ghi_de_loi_doc_cua_rieng_nhip_do(tmp_path, spy):
    project = _build(
        tmp_path,
        spy,
        [
            seg("o1", "phone", "Chữ phụ đề hiển thị", spoken="xin chào bạn"),
            seg("o2", "phone", "Nhịp thứ hai đọc nguyên văn"),
        ],
    )
    assert project.calls == ["xin chào bạn", "Nhịp thứ hai đọc nguyên văn"]


def test_phu_de_trong_timeline_va_srt_giu_chu_goc(tmp_path, spy):
    original = "Nó hỏi DNS qua Wi-Fi và có 3 gói"
    project = _build(tmp_path, spy, [seg("p1", "dns", original)], LEXICON)
    beats = project.timeline()["scenes"][0]["beats"]
    assert [b["text"] for b in beats] == [original]
    srt = project.srt_path.read_text(encoding="utf-8")
    assert original in srt
    assert "đi en ét" not in srt
    assert "ba gói" not in srt


def test_phu_de_giu_chu_goc_ca_khi_co_spoken(tmp_path, spy):
    project = _build(
        tmp_path,
        spy,
        [seg("p1", "dns", "Chữ gốc có DNS", spoken="lời đọc khác hẳn")],
        LEXICON,
    )
    beats = project.timeline()["scenes"][0]["beats"]
    assert beats[0]["text"] == "Chữ gốc có DNS"
    assert "lời đọc khác hẳn" not in project.srt_path.read_text("utf-8")
