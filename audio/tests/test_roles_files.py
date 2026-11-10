"""Đề mục 11 [11-1]: mười file vai và PLAYBOOK."""

from __future__ import annotations

import json
import re

import pytest

from gates_support import ROLES_DIR, ROOT

ROLES = [
    "researcher", "scriptwriter", "fact-checker", "script-editor",
    "scene-director", "voice-producer", "editor", "qc", "packager", "publisher",
]
CHECKERS = ["fact-checker", "script-editor", "qc"]
MAKERS = [r for r in ROLES if r not in CHECKERS]
SECTIONS = [
    "## Nhiệm vụ", "## Đầu vào", "## Đầu ra", "## Được ghi",
    "## Không được làm", "## Mẫu báo cáo",
]
FIELDS = {"severity", "rule", "file", "quote", "failing_case", "owner"}


def _text(role):
    return (ROLES_DIR / f"{role}.md").read_text(encoding="utf-8")


def _section(text, head):
    m = re.search(rf"^{re.escape(head)}\s*$", text, re.M)
    assert m, head
    rest = text[m.end():]
    nxt = re.search(r"^## ", rest, re.M)
    return (rest[: nxt.start()] if nxt else rest).strip()


def test_dung_muoi_file_vai():
    assert sorted(p.stem for p in ROLES_DIR.glob("*.md")) == sorted(ROLES)
    assert len(ROLES) == 10


@pytest.mark.parametrize("role", ROLES)
def test_file_vai_co_tieu_de_dung_ten_vai(role):
    first = _text(role).splitlines()[0]
    assert first.startswith(f"# Vai: {role}")


@pytest.mark.parametrize("role", ROLES)
def test_file_vai_du_sau_muc_bat_buoc_dung_thu_tu_va_khong_rong(role):
    text = _text(role)
    pos = []
    for head in SECTIONS:
        m = re.search(rf"^{re.escape(head)}\s*$", text, re.M)
        assert m, f"{role} thiếu {head}"
        pos.append(m.start())
        assert len(_section(text, head)) > 10, f"{role}: {head} rỗng"
    assert pos == sorted(pos)


@pytest.mark.parametrize("role", ROLES)
def test_khong_vai_nao_tro_vao_thu_muc_claude(role):
    text = _text(role)
    assert ".claude" not in text
    assert "~/.claude" not in text


@pytest.mark.parametrize("role", CHECKERS)
def test_vai_kiem_khong_duoc_ghi_file(role):
    body = _section(_text(role), "## Được ghi")
    assert body == "Không ghi file."


@pytest.mark.parametrize("role", [r for r in MAKERS if r != "publisher"])
def test_vai_lam_noi_ro_duoc_ghi_gi_khong_phai_khong_ghi(role):
    body = _section(_text(role), "## Được ghi")
    assert not body.startswith("Không ghi file")


@pytest.mark.parametrize("role", CHECKERS)
def test_vai_kiem_co_mau_json_phat_hien_dung_truong(role):
    out = _section(_text(role), "## Đầu ra")
    blocks = re.findall(r"```json\n(.*?)\n```", out, re.S)
    assert blocks, f"{role} không có khối JSON mẫu"
    doc = json.loads(blocks[0])
    assert isinstance(doc["findings"], list) and doc["findings"]
    assert set(doc["findings"][0]) == FIELDS
    assert doc["findings"][0]["severity"] in ("CRITICAL", "MAJOR", "MINOR")


@pytest.mark.parametrize("role", CHECKERS)
def test_vai_kiem_nhac_cac_muc_do_nghiem_trong(role):
    out = _section(_text(role), "## Đầu ra")
    for sev in ("CRITICAL", "MAJOR", "MINOR"):
        assert sev in out


@pytest.mark.parametrize("role", CHECKERS)
def test_vai_kiem_cam_sua_thu_duoc_kiem(role):
    body = _section(_text(role), "## Không được làm").casefold()
    assert "sửa" in body


def test_fact_checker_khong_co_huong_dan_doc_kich_ban():
    text = _text("fact-checker").casefold()
    for bad in ("script.json", "kịch bản", "episodes/"):
        assert bad not in text


def test_fact_checker_khong_nhan_bash_va_khong_ghi():
    text = _text("fact-checker")
    assert "Bash" not in text.split("## Được ghi")[1].split("## Không")[0]
    assert "Bash" not in _section(text, "## Đầu vào")


def test_playbook_ton_tai_va_ghi_bang_vai_loai_agent():
    pb = (ROOT / "episodes" / "PLAYBOOK.md").read_text(encoding="utf-8")
    for role in ROLES:
        assert f"`{role}`" in pb, role
    row = {
        r: next(
            ln for ln in pb.splitlines() if ln.startswith(f"| `{r}` |")
        )
        for r in ROLES
    }
    assert "feature-dev:code-reviewer" in row["fact-checker"]
    assert "feature-dev:code-reviewer" in row["script-editor"]
    assert "Explore" in row["qc"]
    assert "ops" in row["publisher"]
    for r in MAKERS:
        if r != "publisher":
            assert "general-purpose" in row[r], r


def test_playbook_khong_dat_gi_trong_thu_muc_claude():
    pb = (ROOT / "episodes" / "PLAYBOOK.md").read_text(encoding="utf-8")
    assert ".claude/agents" not in pb
    assert ".claude/skills" not in pb


def test_repo_khong_co_agents_hay_skills_trong_thu_muc_claude():
    assert not (ROOT / ".claude" / "agents").exists()
    assert not (ROOT / ".claude" / "skills").exists()
