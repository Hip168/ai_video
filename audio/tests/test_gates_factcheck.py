"""Đề mục 11: input mù của fact-checker và apply-factcheck."""

from __future__ import annotations

import json
import pathlib

import pytest
from aivideo import gates

from gates_support import (
    ROLES_DIR,
    SLUG,
    claim,
    finding,
    make_episode,
    run_cli,
    write_findings,
)

SECRET = "CAU-DOC-RIENG-CUA-KICH-BAN-XYZ"
CLAIMS = [
    claim("c001", "Pi xấp xỉ 3,14.", question="Pi bằng bao nhiêu?",
          status="CHUA_KIEM"),
    claim("c002", "Linus công bố Linux năm 1991.", question="Ai công bố?"),
]


@pytest.fixture
def ep_env(tmp_path):
    eps, ep = make_episode(
        tmp_path,
        texts={"b001": f"{SECRET} về pi 3,14.", "b002": f"{SECRET} khác."},
        beat_claims={"b001": ["c001"], "b002": ["c002"]},
        claims=CLAIMS,
    )
    out = tmp_path / "ngoai-repo"
    return eps, ep, out


def _prepare(eps, out, role=None, **kw):
    role = role or ROLES_DIR / "fact-checker.md"
    return gates.prepare_factcheck(SLUG, eps, role, tmp_parent=out, **kw)


def _all_text(batch):
    return "\n".join(
        p.read_text(encoding="utf-8")
        for p in pathlib.Path(batch).rglob("*") if p.is_file()
    )


def test_prepare_chi_co_hai_file_va_ten_thu_muc_trung_tinh(ep_env):
    eps, ep, out = ep_env
    res = _prepare(eps, out)
    batch = out / res["batchDir"].split("/")[-1]
    assert sorted(p.name for p in batch.iterdir()) == ["items.json", "prompt.txt"]
    assert batch.name.startswith("lo-")
    assert SLUG not in batch.name
    assert str(batch) == res["batchDir"]


def test_prepare_input_khong_chua_noi_dung_script_json(ep_env):
    eps, ep, out = ep_env
    res = _prepare(eps, out)
    text = _all_text(res["batchDir"])
    assert SECRET not in text
    assert "script.json" not in text
    assert "kịch bản" not in text.casefold()
    assert "episodes/" not in text
    assert "scenes" not in text and "beats" not in text


def test_prepare_items_chi_co_claim_va_cau_hoi_khong_trang_thai_nguon_tin_cay(ep_env):
    eps, ep, out = ep_env
    res = _prepare(eps, out)
    items = json.loads(open(res["items"], encoding="utf-8").read())
    assert [i["id"] for i in items] == ["c001", "c002"]
    assert items[0]["claim"] == "Pi xấp xỉ 3,14."
    assert items[0]["question"] == "Pi bằng bao nhiêu?"
    for it in items:
        assert "status" not in it
        assert "credibility" not in it
        assert "sources" not in it
    raw = open(res["items"], encoding="utf-8").read()
    assert "CHUA_KIEM" not in raw
    assert "primary" not in raw


def test_prepare_prompt_co_noi_dung_vai_va_duong_dan_lo(ep_env):
    eps, ep, out = ep_env
    res = _prepare(eps, out)
    prompt = open(res["prompt"], encoding="utf-8").read()
    role = (ROLES_DIR / "fact-checker.md").read_text(encoding="utf-8")
    assert role.strip() in prompt
    assert res["batchDir"] in prompt
    assert "claim:" in prompt


def test_prepare_hai_lan_goi_ra_hai_thu_muc_khac_nhau(ep_env):
    eps, ep, out = ep_env
    assert _prepare(eps, out)["batchDir"] != _prepare(eps, out)["batchDir"]


def test_prepare_tu_choi_thu_muc_tam_trong_repo(ep_env):
    eps, ep, out = ep_env
    with pytest.raises(gates.GateError):
        gates.prepare_factcheck(
            SLUG, eps, ROLES_DIR / "fact-checker.md",
            tmp_parent=eps.parent / "tam",
        )
    assert list((eps.parent / "tam").glob("*")) == []


@pytest.mark.parametrize("bad", ["script.json", "kịch bản", "KỊCH BẢN", "episodes/"])
def test_prepare_tu_choi_file_vai_co_huong_dan_doc_kich_ban(ep_env, tmp_path, bad):
    eps, ep, out = ep_env
    role = tmp_path / "vai.md"
    role.write_text(f"# Vai\nHãy đọc {bad} để kiểm.\n", encoding="utf-8")
    with pytest.raises(gates.GateError):
        _prepare(eps, out, role=role)
    assert not out.exists() or not any(out.iterdir())


def test_prepare_file_vai_that_cua_fact_checker_khong_co_chuoi_cam():
    text = (ROLES_DIR / "fact-checker.md").read_text(encoding="utf-8").casefold()
    for bad in ("script.json", "kịch bản", "episodes/"):
        assert bad.casefold() not in text


def test_build_prompt_tu_choi_chuoi_cam_trong_vai():
    with pytest.raises(gates.GateError):
        gates.build_factcheck_prompt("đọc script.json đi", "/tmp/lo-abc")
    assert "/tmp/lo-abc" in gates.build_factcheck_prompt("vai sạch", "/tmp/lo-abc")


def test_prepare_with_lines_chi_them_chu_cua_beat_tro_toi_claim(ep_env):
    eps, ep, out = ep_env
    res = _prepare(eps, out, with_lines=True)
    items = {i["id"]: i for i in json.loads(open(res["items"], encoding="utf-8").read())}
    assert items["c001"]["lines"] == [f"{SECRET} về pi 3,14."]
    assert items["c002"]["lines"] == [f"{SECRET} khác."]
    batch_files = sorted(p.name for p in pathlib.Path(res["batchDir"]).iterdir())
    assert batch_files == ["items.json", "prompt.txt"]
    assert "script.json" not in _all_text(res["batchDir"])


def test_prepare_cli_in_json_ba_khoa(ep_env, capsys):
    eps, ep, out = ep_env
    code, data, _ = run_cli(
        capsys,
        ["prepare-factcheck", SLUG, "--episodes-dir", str(eps), "--role",
         str(ROLES_DIR / "fact-checker.md"), "--tmp-parent", str(out)],
    )
    assert code == 0
    assert set(data) == {"batchDir", "items", "prompt"}


def test_prepare_thieu_claim_json_bi_tu_choi(tmp_path):
    eps, ep = make_episode(tmp_path)
    (ep / "claims.json").unlink()
    with pytest.raises(gates.GateError):
        gates.prepare_factcheck(
            SLUG, eps, ROLES_DIR / "fact-checker.md", tmp_parent=tmp_path / "o"
        )


# ---- apply-factcheck ----------------------------------------------------------

def _apply(ep_env, items_findings):
    eps, ep, out = ep_env
    res = _prepare(eps, out)
    batch = res["batchDir"]
    f = write_findings(pathlib.Path(batch) / "findings.json", items_findings)
    return eps, ep, batch, f


def _statuses(ep):
    return {c["id"]: c["status"] for c in json.loads((ep / "claims.json").read_text(encoding="utf-8"))}


def test_apply_critical_thanh_sai_major_thanh_chua_kiem_con_lai_dat(ep_env):
    eps, ep, batch, f = _apply(
        ep_env,
        [finding("CRITICAL", "Pi xấp xỉ 3,14.", file="items.json", rule="claim:c001")],
    )
    res = gates.apply_factcheck(SLUG, eps, f, batch)
    assert res["updated"] == {"c001": "SAI", "c002": "DAT"}
    assert _statuses(ep) == {"c001": "SAI", "c002": "DAT"}
    f2 = write_findings(
        pathlib.Path(batch) / "f2.json",
        [finding("MAJOR", "Linus công bố", file="items.json", rule="claim:c002")],
    )
    res = gates.apply_factcheck(SLUG, eps, f2, batch)
    assert res["updated"] == {"c001": "DAT", "c002": "CHUA_KIEM"}
    assert _statuses(ep) == {"c001": "DAT", "c002": "CHUA_KIEM"}


def test_apply_chi_ghi_lai_truong_status(ep_env):
    eps, ep, batch, f = _apply(ep_env, [])
    before = json.loads((ep / "claims.json").read_text(encoding="utf-8"))
    gates.apply_factcheck(SLUG, eps, f, batch)
    after = json.loads((ep / "claims.json").read_text(encoding="utf-8"))
    for b, a in zip(before, after):
        b2 = dict(b)
        b2.pop("status")
        a2 = dict(a)
        a2.pop("status")
        assert a2 == b2
    assert [c["status"] for c in after] == ["DAT", "DAT"]


def test_apply_quote_bia_bi_loai_khong_doi_status(ep_env):
    eps, ep, batch, f = _apply(
        ep_env,
        [finding("CRITICAL", "câu không có trong lô", file="items.json",
                 rule="claim:c001")],
    )
    res = gates.apply_factcheck(SLUG, eps, f, batch)
    assert res["updated"]["c001"] == "DAT"


def test_apply_json_chua_duyet_thi_loi_va_khong_doi_gi(ep_env):
    eps, ep, batch, _ = _apply(ep_env, [])
    before = (ep / "claims.json").read_bytes()
    bad = pathlib.Path(batch) / "bad.json"
    bad.write_text("rác", encoding="utf-8")
    with pytest.raises(gates.GateError):
        gates.apply_factcheck(SLUG, eps, bad, batch)
    assert (ep / "claims.json").read_bytes() == before


def test_apply_rule_khong_phai_claim_di_vao_unmapped(ep_env):
    eps, ep, batch, f = _apply(
        ep_env,
        [finding("CRITICAL", "Pi xấp xỉ 3,14.", file="items.json", rule="khac")],
    )
    res = gates.apply_factcheck(SLUG, eps, f, batch)
    assert len(res["unmapped"]) == 1
    assert _statuses(ep)["c001"] == "DAT"


def test_apply_cli_in_verdict_va_updated(ep_env, capsys):
    eps, ep, batch, f = _apply(
        ep_env,
        [finding("CRITICAL", "Pi xấp xỉ 3,14.", file="items.json", rule="claim:c001")],
    )
    code, data, _ = run_cli(
        capsys,
        ["apply-factcheck", SLUG, "--episodes-dir", str(eps), "--findings",
         str(f), "--batch", batch],
    )
    assert data["verdict"] == "CHAN"
    assert data["updated"]["c001"] == "SAI"
