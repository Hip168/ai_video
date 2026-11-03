"""Đề mục 11: input mù của fact-checker và apply-factcheck."""

from __future__ import annotations

import json
import pathlib
import shutil

import pytest
from aivideo import gates

from gates_support import (
    ROLES_DIR,
    SLUG,
    claim,
    write_json,
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
        fact=False,
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
    # lần hai: lô MỚI (một lô chỉ được áp một lần)
    res2 = _prepare(eps, pathlib.Path(batch).parent)
    f2 = write_findings(
        pathlib.Path(res2["batchDir"]) / "f2.json",
        [finding("MAJOR", "Linus công bố", file="items.json", rule="claim:c002")],
    )
    res = gates.apply_factcheck(SLUG, eps, f2, res2["batchDir"])
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


# ---- claim đổi sau prepare ------------------------------------------------------

def test_apply_chan_khi_claim_doi_sau_prepare_va_findings_rong(ep_env):
    eps, ep, batch, f = _apply(ep_env, [])
    claims = json.loads((ep / "claims.json").read_text(encoding="utf-8"))
    claims[0]["claim"] = "Pi xấp xỉ 3,15 (đã bị sửa sau khi gửi đi kiểm)."
    (ep / "claims.json").write_text(
        json.dumps(claims, ensure_ascii=False), encoding="utf-8"
    )
    before = (ep / "claims.json").read_bytes()
    with pytest.raises(gates.GateError):
        gates.apply_factcheck(SLUG, eps, f, batch)
    assert (ep / "claims.json").read_bytes() == before
    assert _statuses(ep)["c001"] == "CHUA_KIEM"


def test_apply_chan_khi_them_hoac_xoa_claim_sau_prepare(ep_env):
    eps, ep, batch, f = _apply(ep_env, [])
    claims = json.loads((ep / "claims.json").read_text(encoding="utf-8"))
    (ep / "claims.json").write_text(
        json.dumps(claims[:1], ensure_ascii=False), encoding="utf-8"
    )
    with pytest.raises(gates.GateError):
        gates.apply_factcheck(SLUG, eps, f, batch)


def test_apply_cli_claim_doi_sau_prepare_ma_thoat_1(ep_env, capsys):
    eps, ep, batch, f = _apply(ep_env, [])
    claims = json.loads((ep / "claims.json").read_text(encoding="utf-8"))
    claims[1]["claim"] = "Linus công bố Linux năm 1992."
    (ep / "claims.json").write_text(
        json.dumps(claims, ensure_ascii=False), encoding="utf-8"
    )
    code, data, err = run_cli(
        capsys,
        ["apply-factcheck", SLUG, "--episodes-dir", str(eps), "--findings",
         str(f), "--batch", batch],
    )
    assert code == 1
    assert data is None
    assert "lỗi" in err
    assert _statuses(ep)["c002"] == "DAT"


# ---- sổ tập ghi fact-prepare và fact (P6, P7) -----------------------------------

import hashlib  # noqa: E402


def _sha(path):
    return hashlib.sha256(pathlib.Path(path).read_bytes()).hexdigest()


def test_prepare_ghi_muc_fact_prepare_voi_ten_lo_va_hash_claim(ep_env):
    eps, ep, out = ep_env
    res = _prepare(eps, out)
    ents = [e for e in gates.Ledger(ep).entries() if e["stage"] == "fact-prepare"]
    assert len(ents) == 1
    e = ents[0]
    assert e["note"] == pathlib.Path(res["batchDir"]).name
    assert set(e["claimHashes"]) == {"c001", "c002"}
    assert e["claimsHash"] == _sha(ep / "claims.json")
    assert all(len(h) == 64 for h in e["claimHashes"].values())


def test_prepare_khong_ghi_file_meta_canh_thu_muc_lo(ep_env):
    eps, ep, out = ep_env
    res = _prepare(eps, out)
    assert sorted(p.name for p in out.iterdir()) == [
        pathlib.Path(res["batchDir"]).name
    ]


def test_apply_ghi_muc_fact_voi_hash_claims_sau_khi_ap_va_ten_lo(ep_env):
    eps, ep, batch, f = _apply(
        ep_env,
        [finding("CRITICAL", "Pi xấp xỉ 3,14.", file="items.json", rule="claim:c001")],
    )
    res = gates.apply_factcheck(SLUG, eps, f, batch)
    last = gates.Ledger(ep).last("fact")
    assert last["note"] == pathlib.Path(batch).name
    assert last["claimsHash"] == _sha(ep / "claims.json")
    assert last["verdict"] == res["verdict"] == "CHAN"


def test_apply_hai_lo_khac_nhau_ghi_hai_muc_fact_va_hash_moi_nhat_khop(ep_env):
    eps, ep, out = ep_env
    a = _prepare(eps, out)
    gates.apply_factcheck(
        SLUG, eps, write_findings(pathlib.Path(a["batchDir"]) / "f.json", []),
        a["batchDir"],
    )
    b = _prepare(eps, out)
    f2 = write_findings(
        pathlib.Path(b["batchDir"]) / "f2.json",
        [finding("MAJOR", "Linus công bố", file="items.json", rule="claim:c002")],
    )
    gates.apply_factcheck(SLUG, eps, f2, b["batchDir"])
    facts = [e for e in gates.Ledger(ep).entries() if e["stage"] == "fact"]
    assert len(facts) == 2
    assert facts[-1]["claimsHash"] == _sha(ep / "claims.json")
    assert facts[0]["claimsHash"] != facts[-1]["claimsHash"]


def test_apply_chan_khi_lo_khong_co_muc_fact_prepare_trong_so(ep_env, tmp_path):
    # P7: lô do kẻ sửa tay dựng, tên không có trong sổ tập
    eps, ep, batch, f = _apply(ep_env, [])
    fake = tmp_path / "ngoai-repo" / "lo-gia-mao"
    shutil.copytree(batch, fake)
    before = (ep / "claims.json").read_bytes()
    with pytest.raises(gates.GateError):
        gates.apply_factcheck(SLUG, eps, fake / "findings.json", fake)
    assert (ep / "claims.json").read_bytes() == before
    assert gates.Ledger(ep).last("fact") is None


def test_apply_chan_khi_sua_claim_roi_chinh_lai_hash_trong_file_phu_khong_co_tac_dung(
    ep_env,
):
    # không còn file meta để sửa: đổi claim thì vẫn lệch hash trong sổ
    eps, ep, batch, f = _apply(ep_env, [])
    claims = json.loads((ep / "claims.json").read_text(encoding="utf-8"))
    claims[0]["claim"] = "Pi xấp xỉ 3,15."
    write_json(ep / "claims.json", claims)
    pathlib.Path(batch + ".meta.json").write_text("{}", encoding="utf-8")
    with pytest.raises(gates.GateError):
        gates.apply_factcheck(SLUG, eps, f, batch)


def test_apply_chan_khi_sua_tay_muc_fact_prepare_lam_vo_chuoi_hash_so(ep_env):
    eps, ep, batch, f = _apply(ep_env, [])
    claims = json.loads((ep / "claims.json").read_text(encoding="utf-8"))
    claims[0]["claim"] = "Pi xấp xỉ 3,15."
    write_json(ep / "claims.json", claims)
    led = json.loads((ep / "ledger.json").read_text(encoding="utf-8"))
    prep = [e for e in led["entries"] if e["stage"] == "fact-prepare"][-1]
    prep["claimHashes"]["c001"] = gates.claim_hash(claims[0])
    (ep / "ledger.json").write_text(json.dumps(led, ensure_ascii=False), encoding="utf-8")
    with pytest.raises(gates.GateError, match="chuỗi hash"):
        gates.apply_factcheck(SLUG, eps, f, batch)
    stages = [
        e["stage"]
        for e in json.loads((ep / "ledger.json").read_text(encoding="utf-8"))["entries"]
    ]
    assert "fact" not in stages


def test_apply_chi_so_voi_muc_fact_prepare_cua_dung_lo(ep_env):
    eps, ep, out = ep_env
    a = _prepare(eps, out)
    b = _prepare(eps, out)
    fa = write_findings(pathlib.Path(a["batchDir"]) / "f.json", [])
    gates.apply_factcheck(SLUG, eps, fa, a["batchDir"])
    fb = write_findings(pathlib.Path(b["batchDir"]) / "f.json", [])
    gates.apply_factcheck(SLUG, eps, fb, b["batchDir"])
    notes = [e["note"] for e in gates.Ledger(ep).entries() if e["stage"] == "fact"]
    assert notes == [
        pathlib.Path(a["batchDir"]).name, pathlib.Path(b["batchDir"]).name
    ]


# ---- P9: một lô chỉ được áp một lần ----------------------------------------------

def _crit(rule_id, quote):
    return finding(
        "CRITICAL", quote, file="items.json", rule=f"claim:{rule_id}",
        owner="researcher",
    )


def test_apply_lan_hai_cung_lo_bi_tu_choi_va_khong_lat_sai_thanh_dat(ep_env):
    eps, ep, batch, f = _apply(ep_env, [_crit("c001", "Pi xấp xỉ 3,14.")])
    first = gates.apply_factcheck(SLUG, eps, f, batch)
    assert first["updated"]["c001"] == "SAI"
    before = (ep / "claims.json").read_bytes()
    empty = write_findings(pathlib.Path(batch) / "empty.json", [])
    with pytest.raises(gates.GateError):
        gates.apply_factcheck(SLUG, eps, empty, batch)
    assert (ep / "claims.json").read_bytes() == before
    assert _statuses(ep)["c001"] == "SAI"
    facts = [e for e in gates.Ledger(ep).entries() if e["stage"] == "fact"]
    assert len(facts) == 1


def test_apply_lan_hai_cung_lo_bi_tu_choi_ke_ca_findings_giong_het(ep_env):
    eps, ep, batch, f = _apply(ep_env, [_crit("c001", "Pi xấp xỉ 3,14.")])
    gates.apply_factcheck(SLUG, eps, f, batch)
    with pytest.raises(gates.GateError):
        gates.apply_factcheck(SLUG, eps, f, batch)


def test_apply_lo_moi_sau_khi_lo_cu_da_ap_van_chay_duoc(ep_env):
    eps, ep, out = ep_env
    a = _prepare(eps, out)
    fa = write_findings(
        pathlib.Path(a["batchDir"]) / "f.json", [_crit("c001", "Pi xấp xỉ 3,14.")]
    )
    gates.apply_factcheck(SLUG, eps, fa, a["batchDir"])
    b = _prepare(eps, out)
    fb = write_findings(pathlib.Path(b["batchDir"]) / "f.json", [])
    res = gates.apply_factcheck(SLUG, eps, fb, b["batchDir"])
    assert res["updated"]["c001"] == "DAT"  # kiểm lại có chủ ý bằng lô mới


def test_apply_cli_lan_hai_cung_lo_ma_thoat_1(ep_env, capsys):
    eps, ep, batch, f = _apply(ep_env, [])
    argv = ["apply-factcheck", SLUG, "--episodes-dir", str(eps),
            "--findings", str(f), "--batch", batch]
    assert run_cli(capsys, argv)[0] == 0
    code, data, err = run_cli(capsys, argv)
    assert code == 1
    assert "lỗi" in err


# ---- P8: không được bớt claim khỏi items.json của lô -------------------------------

def _strip_item(batch, cid):
    p = pathlib.Path(batch) / "items.json"
    items = json.loads(p.read_text(encoding="utf-8"))
    p.write_text(
        json.dumps([i for i in items if i["id"] != cid], ensure_ascii=False),
        encoding="utf-8",
    )


def test_apply_khong_cho_claim_sua_tay_giu_dat_bang_cach_bot_khoi_items(tmp_path):
    from gates_support import write_json

    eps, ep = make_episode(
        tmp_path,
        fact=False,
        claims=[
            claim("c001", "Pi xấp xỉ 3,14.", status="CHUA_KIEM"),
            claim("c002", "Linus công bố Linux năm 1991.", status="CHUA_KIEM"),
        ],
    )
    # kẻ gian đặt tay c002 = DAT (chưa ai kiểm), rồi bớt c002 khỏi lô
    docs = json.loads((ep / "claims.json").read_text(encoding="utf-8"))
    docs[1]["status"] = "DAT"
    write_json(ep / "claims.json", docs)
    res = gates.prepare_factcheck(
        SLUG, eps, ROLES_DIR / "fact-checker.md", tmp_parent=tmp_path / "lo"
    )
    _strip_item(res["batchDir"], "c002")
    f = write_findings(pathlib.Path(res["batchDir"]) / "f.json", [])
    try:
        gates.apply_factcheck(SLUG, eps, f, res["batchDir"])
    except gates.GateError:
        return  # bị chặn ngay: đạt
    # nếu cho áp thì claim ngoài lô không được còn DAT, và Cổng 2 phải chặn
    assert _statuses(ep)["c002"] != "DAT"
    assert gates.gate2(SLUG, eps, write_ledger=False)["pass"] is False


def test_apply_lo_day_du_van_ap_binh_thuong_sau_khi_chan_p8(ep_env):
    eps, ep, batch, f = _apply(ep_env, [])
    res = gates.apply_factcheck(SLUG, eps, f, batch)
    assert set(res["updated"]) == {"c001", "c002"}
