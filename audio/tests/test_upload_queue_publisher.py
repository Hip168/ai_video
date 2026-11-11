"""Đề mục 13 [13-3]: hàng đợi đề tài, vai publisher và PLAYBOOK theo D24/D25."""

from __future__ import annotations

import json
import re

import pytest

from gates_support import ROLES_DIR, ROOT

QUEUE = ROOT / "episodes" / "queue.json"
PLAYBOOK = ROOT / "episodes" / "PLAYBOOK.md"
PUBLISHER = ROLES_DIR / "publisher.md"
SLUG_RE = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")


def _queue():
    return json.loads(QUEUE.read_text(encoding="utf-8"))


def _publisher():
    return PUBLISHER.read_text(encoding="utf-8")


def _playbook():
    return PLAYBOOK.read_text(encoding="utf-8")


def _block(text, start_pat, end_pat):
    m = re.search(start_pat, text, re.M)
    assert m, f"không thấy {start_pat}"
    rest = text[m.end():]
    n = re.search(end_pat, rest, re.M)
    return rest[: n.start()] if n else rest


# --- hàng đợi ------------------------------------------------------------


def test_queue_json_la_mang():
    assert isinstance(_queue(), list)


def test_moi_phan_tu_hang_doi_chi_co_slug_va_topic():
    for item in _queue():
        assert isinstance(item, dict)
        assert set(item) == {"slug", "topic"}


def test_slug_hang_doi_dung_dang_va_khong_trung():
    slugs = [i["slug"] for i in _queue()]
    for s in slugs:
        assert isinstance(s, str) and SLUG_RE.match(s), s
    assert len(slugs) == len(set(slugs))


def test_topic_hang_doi_la_chuoi_khong_rong():
    for i in _queue():
        assert isinstance(i["topic"], str) and i["topic"].strip()


def test_queue_json_ket_thuc_bang_xuong_dong_va_la_utf8_hop_le():
    raw = QUEUE.read_bytes()
    raw.decode("utf-8")
    assert raw.strip()


def test_playbook_mo_ta_cach_lay_de_tai_tu_hang_doi():
    text = _playbook()
    assert "episodes/queue.json" in text
    assert "researcher" in text.split("queue.json", 1)[1][:600]


# --- publisher.md ----------------------------------------------------------


def test_publisher_nem_lenh_upload_that():
    assert "python -m aivideo.upload" in _publisher()


def test_publisher_khong_con_dung_trinh_duyet_de_dang():
    for ln in _publisher().splitlines():
        low = ln.lower()
        if "chrome" in low or "studio" in low or "trình duyệt" in low:
            assert "không" in low, ln


def test_publisher_khong_duoc_lam_giu_cac_y_an_toan():
    text = _publisher()
    sec = _block(text, r"^## Không được làm\s*$", r"^## ")
    assert "hash" in sec
    assert "Cổng 3" in sec
    assert "channelId" in sec
    assert "public" in sec
    assert "auth" in sec


def test_publisher_khong_hen_lam_viec_voi_ten_lenh_cu():
    text = _publisher()
    assert "claude-in-chrome" not in text.lower()
    assert "mcp__" not in text


# --- PLAYBOOK --------------------------------------------------------------


def test_playbook_dong_bang_vai_publisher_van_la_ops():
    rows = [ln for ln in _playbook().splitlines()
            if ln.startswith("| `publisher`")]
    assert len(rows) == 1
    assert "`ops`" in rows[0]
    assert "aivideo.upload" in rows[0]


def test_playbook_khau_13_chay_aivideo_upload_va_noi_run_daily():
    text = _playbook()
    blk = _block(text, r"^\*\*\[13\] đăng\.\*\*", r"^\*\*\[|^## ")
    assert "python -m aivideo.upload" in blk
    assert "scripts/run-daily.sh" in blk


def test_playbook_mau_4_13_bo_trinh_duyet():
    blk = _block(_playbook(), r"^\*\*4\.13 publisher\.\*\*", r"^## |^\*\*4\.")
    assert "python -m aivideo.upload" in blk
    low = blk.lower()
    for bad in ("chrome", "studio", "trình duyệt"):
        assert bad not in low


def test_playbook_muc_8_video_dau_khong_cong_khai():
    text = _playbook()
    sec = _block(text, r"^## 8\. Điểm dừng", r"^## ")
    assert "Video đầu của kênh: Không công khai" in sec
    assert "firstVideoApproved" in sec


def test_playbook_cau_can_nguoi_dung_co_upload_ma_3():
    text = _playbook()
    sec = _block(text, r"^## 8\. Điểm dừng", r"^## ")
    line = next(ln for ln in sec.splitlines() if "CẦN NGƯỜI DÙNG" in ln
                and "aivideo.upload" in ln)
    assert "mã 3" in line
    assert "private" in line


@pytest.mark.parametrize("bad", ["Claude in Chrome", "YouTube Studio"])
def test_playbook_khong_con_chi_dan_dung_trinh_duyet_de_dang(bad):
    for ln in _playbook().splitlines():
        if bad in ln:
            assert "không" in ln.lower(), ln
