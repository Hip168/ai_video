"""Mặc định giọng là VieNeu "Thiện Minh", tốc độ 1.0 (D40), khớp `assets/brand/outro.json`.

Cache KorvaTTS đã xoá: chỗ nào còn mặc định korva thì lần chạy quên truyền engine sẽ tải lại
mô hình và dựng ra giọng sai. `make-video.sh` (video mẫu v1, D12) giữ korva, test khoá
`test_make_video.py` ghim mặc định đó, nên không quét ở đây.
"""

from __future__ import annotations

import json
import re
import shlex
from pathlib import Path

import pytest
from aivideo import phatam

ROOT = Path(__file__).resolve().parents[2]
BRAND = json.loads((ROOT / "assets" / "brand" / "outro.json").read_text("utf-8"))
EXPECTED = (BRAND["engine"], BRAND["voice"], float(BRAND["speed"]))


def test_outro_json_la_vieneu_thien_minh_toc_do_1():
    assert EXPECTED == ("vieneu", "Thiện Minh", 1.0)


def _shell_default(name: str) -> str:
    text = (ROOT / "make-episode.sh").read_text("utf-8")
    m = re.search(rf"^{name}=(.*)$", text, re.M)
    assert m, f"make-episode.sh không có dòng mặc định {name}="
    return shlex.split(m.group(1))[0] if m.group(1).strip() not in ('""', "''") else ""


def test_make_episode_mac_dinh_vieneu_thien_minh_toc_do_1():
    got = (_shell_default("engine"), _shell_default("voice"), float(_shell_default("speed")))
    assert got == EXPECTED


def test_phatam_hang_mac_dinh_khop_outro():
    assert (phatam.ENGINE, phatam.VOICE, float(phatam.SPEED)) == EXPECTED


def test_phatam_pick_khong_truyen_giong_thi_doc_bang_vieneu(monkeypatch):
    seen = {}

    def fake_pick(term, cands, context, meaning, voice, speed, engine):
        seen.update(engine=engine, voice=voice, speed=speed)
        return {"winner": None}

    monkeypatch.setattr(phatam, "pick", fake_pick)
    monkeypatch.setattr(phatam, "print_pick", lambda res: None)
    phatam.main(["pick", "false"])
    assert (seen["engine"], seen["voice"], float(seen["speed"])) == EXPECTED


KORVA_DEFAULT = re.compile(
    r"^engine=korva\b"                       # zsh: engine=korva
    r"|ENGINE[^=\n]*=\s*[\"']korva[\"']"     # Python: ENGINE = "korva"
    r"|default\s*=\s*[\"']korva[\"']"        # argparse default="korva"
    r"|--engine korva\b",                    # lệnh mẫu trong tài liệu quy trình
    re.M,
)
SCANNED = [
    "make-episode.sh",
    "episodes/PLAYBOOK.md",
    "episodes/roles/voice-producer.md",
    *sorted(str(p.relative_to(ROOT)) for p in (ROOT / "audio" / "src" / "aivideo").glob("*.py")),
]


@pytest.mark.parametrize("rel", SCANNED)
def test_khong_con_cho_nao_mac_dinh_korva(rel):
    text = (ROOT / rel).read_text("utf-8")
    hits = [m.group(0) for m in KORVA_DEFAULT.finditer(text)]
    assert not hits, f"{rel} còn mặc định korva: {hits}"
