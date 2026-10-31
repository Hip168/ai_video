"""[1-3] Chuẩn hóa văn bản, bảng phát âm, `spoken`, phụ đề giữ chữ gốc.

Quan sát qua giao diện công khai: chuỗi thực sự gửi vào `synth` (được ghi
lại trong `project.calls`) và các file `build` ghi ra.
"""

from __future__ import annotations

import re

from conftest import make_project, run_build, seg

LEXICON = {"DNS": "đi en ét", "Wi-Fi": "wai phai", "IP": "ai pi"}


def _build(tmp_path, monkeypatch, segments, lexicon=None):
    project = make_project(tmp_path, segments, lexicon)
    run_build(project, monkeypatch)
    return project


def test_so_thanh_chu_trong_loi_doc(tmp_path, monkeypatch):
    project = _build(
        tmp_path, monkeypatch, [seg("n1", "phone", "Có 3 gói và 10 giây")]
    )
    (spoken,) = project.calls
    assert not re.search(r"\d", spoken)
    assert "ba" in spoken.split()
    assert "mười" in spoken.split()


def test_so_hai_chu_so_doc_dung_quy_tac_tieng_viet(tmp_path, monkeypatch):
    project = _build(
        tmp_path, monkeypatch, [seg("n1", "phone", "Đợi 25 phút nữa")]
    )
    (spoken,) = project.calls
    assert "hai mươi lăm" in spoken


def test_bang_phat_am_thay_nguyen_tu_trong_loi_doc(tmp_path, monkeypatch):
    project = _build(
        tmp_path,
        monkeypatch,
        [seg("l1", "dns", "Nó hỏi DNS qua Wi-Fi rồi lấy IP")],
        LEXICON,
    )
    (spoken,) = project.calls
    assert "đi en ét" in spoken
    assert "wai phai" in spoken
    assert "ai pi" in spoken
    for original in ("DNS", "Wi-Fi", "IP"):
        assert original not in spoken


def test_bang_phat_am_chi_thay_nguyen_tu_khong_thay_giua_tu(
    tmp_path, monkeypatch
):
    project = _build(
        tmp_path,
        monkeypatch,
        [seg("l1", "dns", "Giao thức DNSSEC an toàn")],
        LEXICON,
    )
    (spoken,) = project.calls
    assert "dnssec" in spoken.lower()
    assert "đi en ét" not in spoken


def test_spoken_ghi_de_loi_doc_cua_rieng_nhip_do(tmp_path, monkeypatch):
    project = _build(
        tmp_path,
        monkeypatch,
        [
            seg("o1", "phone", "Chữ phụ đề hiển thị", spoken="xin chào bạn"),
            seg("o2", "phone", "Nhịp thứ hai đọc nguyên văn"),
        ],
    )
    first, second = project.calls
    assert "xin chào bạn" in first
    assert "phụ đề" not in first
    assert "Nhịp thứ hai đọc nguyên văn" in second


def test_phu_de_trong_timeline_va_srt_giu_chu_goc(tmp_path, monkeypatch):
    original = "Nó hỏi DNS qua Wi-Fi và có 3 gói"
    project = _build(
        tmp_path,
        monkeypatch,
        [seg("p1", "dns", original)],
        LEXICON,
    )
    beats = project.timeline()["scenes"][0]["beats"]
    assert [b["text"] for b in beats] == [original]
    srt = project.srt_path.read_text(encoding="utf-8")
    assert original in srt
    assert "đi en ét" not in srt
    assert "ba gói" not in srt


def test_phu_de_giu_chu_goc_ca_khi_co_spoken(tmp_path, monkeypatch):
    project = _build(
        tmp_path,
        monkeypatch,
        [seg("p1", "dns", "Chữ gốc có DNS", spoken="lời đọc khác hẳn")],
        LEXICON,
    )
    beats = project.timeline()["scenes"][0]["beats"]
    assert beats[0]["text"] == "Chữ gốc có DNS"
    assert "lời đọc khác hẳn" not in project.srt_path.read_text("utf-8")
