"""[1-3]/[1-4] dữ liệu nội dung: kịch bản, bảng phát âm, văn bản so sánh.

Kịch bản đối chiếu với bảng trong `.team/features/kich-ban-mau.md`
(nguồn "nguyên văn") và file mẫu hợp đồng.
"""

from __future__ import annotations

import json
import re

import pytest

from conftest import ROOT, SCRIPT_TABLE_PATH, load_sample

CONTENT = ROOT / "content"
KEY_WORDS = ["router", "packet", "DNS", "Wi-Fi", "IP"]


def _table_rows() -> list[dict]:
    rows = []
    for line in SCRIPT_TABLE_PATH.read_text(encoding="utf-8").splitlines():
        cells = [c.strip() for c in line.strip().strip("|").split("|")]
        if len(cells) == 4 and re.fullmatch(r"s\d\d", cells[0]):
            rows.append(
                {
                    "id": cells[0],
                    "scene": cells[1],
                    "cue": cells[2],
                    "text": cells[3],
                }
            )
    return rows


@pytest.fixture(scope="module")
def script() -> dict:
    return json.loads((CONTENT / "script.json").read_text(encoding="utf-8"))


def test_bang_kich_ban_nguon_co_19_nhip():
    assert len(_table_rows()) == 19


def test_script_json_co_19_nhip_nguyen_van_theo_bang_kich_ban(script):
    rows = _table_rows()
    segments = script["segments"]
    assert [s["id"] for s in segments] == [r["id"] for r in rows]
    assert [s["scene"] for s in segments] == [r["scene"] for r in rows]
    assert [s["text"] for s in segments] == [r["text"] for r in rows]
    assert [s.get("cue") or "" for s in segments] == [r["cue"] for r in rows]


def test_script_json_khop_file_mau_hop_dong(script):
    beats = [b for s in load_sample()["scenes"] for b in s["beats"]]
    segments = script["segments"]
    assert [s["id"] for s in segments] == [b["id"] for b in beats]
    assert [s["text"] for s in segments] == [b["text"] for b in beats]
    assert [s.get("cue") for s in segments if s.get("cue")] == [
        b["cue"] for b in beats if "cue" in b
    ]


def test_script_json_truong_bat_buoc_va_kieu_du_lieu(script):
    assert script["title"] == "Một tin nhắn đi qua Internet thế nào"
    assert isinstance(script["voice"], str)
    for segment in script["segments"]:
        assert isinstance(segment["pause_ms"], int)
        assert segment["pause_ms"] >= 0
        assert set(segment) <= {
            "id",
            "scene",
            "text",
            "spoken",
            "pause_ms",
            "cue",
        }


def test_lexicon_co_5_tu_khoa_voi_loi_doc_khong_rong():
    lexicon = json.loads((CONTENT / "lexicon.json").read_text("utf-8"))
    for word in KEY_WORDS:
        assert isinstance(lexicon[word], str)
        assert lexicon[word].strip() != ""
        assert lexicon[word] != word


def test_compare_txt_co_2_den_3_cau_va_du_5_tu_khoa():
    text = (CONTENT / "compare.txt").read_text(encoding="utf-8")
    sentences = [s for s in re.split(r"[.!?]+", text) if s.strip()]
    assert 2 <= len(sentences) <= 3
    for word in KEY_WORDS:
        assert re.search(rf"(?<![\w-]){re.escape(word)}(?![\w-])", text), word
