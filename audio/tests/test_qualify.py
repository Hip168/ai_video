"""Đề mục 11 [11-5]: bộ cài lỗi và bộ chấm độ bắt / báo sai."""

from __future__ import annotations

import json
import pathlib

import pytest
from aivideo import gates, qualify

from gates_support import QUAL_DIR, ROLES_DIR, finding, write_findings, write_json


def _errors(n, severity="CRITICAL", file="items.json"):
    return [
        {"id": f"q{i:02d}", "severity": severity, "file": file,
         "marker": f"MARK{i:02d}", "kind": "year", "note": "n"}
        for i in range(1, n + 1)
    ]


@pytest.fixture
def root(tmp_path):
    body = "\n".join(f"dòng chứa MARK{i:02d} và FAKE{i:02d}" for i in range(1, 13))
    (tmp_path / "items.json").write_text(body, encoding="utf-8")
    (tmp_path / "khac.json").write_text(body, encoding="utf-8")
    return tmp_path


def _score(root, kind, errs, found, clean=None, **kw):
    write_json(root / "errs.json", errs)
    fp = write_findings(root / "found.json", found)
    cp = write_findings(root / "clean.json", clean) if clean is not None else None
    return qualify.score(kind, root / "errs.json", fp, cp, root=root, **kw)


def _hit(i, severity="CRITICAL", file="items.json"):
    return finding(severity, f"MARK{i:02d}", file=file, rule="claim:x")


def _fake(i, severity="CRITICAL"):
    return finding(severity, f"FAKE{i:02d}", file="items.json", rule="claim:z")


# ---- fact: độ bắt -------------------------------------------------------------

def test_fact_bat_het_muoi_loi_dat_100_phan_tram(root):
    r = _score(root, "fact", _errors(10), [_hit(i) for i in range(1, 11)])
    assert (r["errors"], r["caught"], r["rate"]) == (10, 10, 1.0)
    assert r["missed"] == []
    assert r["falseAlarms"] == 0
    assert r["passRate"] and r["passFalse"] and r["pass"]


def test_fact_bat_9_tren_10_dung_nguong_90_thi_dat(root):
    r = _score(root, "fact", _errors(10), [_hit(i) for i in range(1, 10)])
    assert r["caught"] == 9
    assert r["rate"] == 0.9
    assert r["missed"] == ["q10"]
    assert r["pass"] is True


def test_fact_bat_8_tren_10_duoi_nguong_thi_chua_dat(root):
    r = _score(root, "fact", _errors(10), [_hit(i) for i in range(1, 9)])
    assert r["rate"] == 0.8
    assert r["missed"] == ["q09", "q10"]
    assert r["passRate"] is False
    assert r["passFalse"] is True
    assert r["pass"] is False


def test_fact_khong_bat_duoc_gi(root):
    r = _score(root, "fact", _errors(10), [])
    assert (r["caught"], r["rate"], r["pass"]) == (0, 0.0, False)
    assert len(r["missed"]) == 10


def test_fact_nguong_tuy_chinh(root):
    found = [_hit(i) for i in range(1, 9)]
    assert _score(root, "fact", _errors(10), found, threshold=0.8)["pass"] is True
    assert _score(root, "fact", _errors(10), found, threshold=0.81)["pass"] is False


def test_fact_khong_co_loi_cai_thi_do_bat_la_100_phan_tram(root):
    r = _score(root, "fact", [], [])
    assert r["errors"] == 0
    assert r["rate"] == 1.0


# ---- fact: báo sai -------------------------------------------------------------

def test_fact_mot_bao_sai_tren_ban_cai_loi_van_dat(root):
    r = _score(root, "fact", _errors(10), [_hit(i) for i in range(1, 11)] + [_fake(1)])
    assert r["falseAlarms"] == 1
    assert r["passFalse"] is True
    assert r["pass"] is True


def test_fact_hai_bao_sai_thi_chua_dat_du_bat_du_loi(root):
    r = _score(
        root, "fact", _errors(10),
        [_hit(i) for i in range(1, 11)] + [_fake(1), _fake(2)],
    )
    assert r["rate"] == 1.0
    assert r["falseAlarms"] == 2
    assert r["passFalse"] is False
    assert r["pass"] is False


def test_fact_bao_sai_tren_ban_sach_duoc_tinh(root):
    r = _score(
        root, "fact", _errors(10), [_hit(i) for i in range(1, 11)],
        clean=[_fake(1), _fake(2)],
    )
    assert r["falseAlarms"] == 2
    assert r["pass"] is False


def test_fact_ban_sach_mot_bao_sai_cong_voi_mot_tren_ban_cai_loi_la_hai(root):
    r = _score(
        root, "fact", _errors(10), [_hit(i) for i in range(1, 11)] + [_fake(1)],
        clean=[_fake(2)],
    )
    assert r["falseAlarms"] == 2
    assert r["pass"] is False


def test_fact_max_false_tuy_chinh(root):
    found = [_hit(i) for i in range(1, 11)] + [_fake(1), _fake(2)]
    assert _score(root, "fact", _errors(10), found, max_false=2)["pass"] is True


def test_fact_phat_hien_minor_khong_tinh_bat_cung_khong_tinh_bao_sai(root):
    found = [_hit(i) for i in range(1, 10)] + [_hit(10, "MINOR"), _fake(1, "MINOR"), _fake(2, "MINOR")]
    r = _score(root, "fact", _errors(10), found)
    assert r["caught"] == 9
    assert r["falseAlarms"] == 0


def test_fact_phat_hien_major_cung_duoc_tinh_bat(root):
    r = _score(root, "fact", _errors(10), [_hit(i, "MAJOR") for i in range(1, 11)])
    assert r["caught"] == 10


def test_fact_nhieu_phat_hien_cho_cung_mot_loi_chi_tinh_mot_va_khong_bao_sai(root):
    found = [_hit(i) for i in range(1, 11)] + [_hit(1), _hit(1, "MAJOR")]
    r = _score(root, "fact", _errors(10), found)
    assert r["caught"] == 10
    assert r["falseAlarms"] == 0


def test_fact_hai_bao_sai_cung_noi_dung_chi_tinh_mot(root):
    r = _score(
        root, "fact", _errors(10),
        [_hit(i) for i in range(1, 11)] + [_fake(1), _fake(1)],
    )
    assert r["falseAlarms"] == 1


def test_fact_bat_theo_rule_chua_id_loi_du_quote_khong_co_marker(root):
    f = finding("CRITICAL", "FAKE01", file="items.json", rule="claim:q01")
    r = _score(root, "fact", _errors(1), [f])
    assert r["caught"] == 1
    assert r["falseAlarms"] == 0


def test_fact_khac_ten_tep_thi_khong_tinh_bat_ma_tinh_bao_sai(root):
    r = _score(root, "fact", _errors(1), [_hit(1, file="khac.json")])
    assert r["caught"] == 0
    assert r["falseAlarms"] == 1


def test_fact_quote_bia_khong_co_trong_tep_bi_loai_khong_tinh_bat(root):
    f = finding("CRITICAL", "MARK01 nhưng câu này bịa", file="items.json")
    r = _score(root, "fact", _errors(1), [f])
    assert r["caught"] == 0
    assert r["falseAlarms"] == 0


def test_fact_json_phat_hien_chua_duyet_thi_bao_loi(root):
    write_json(root / "errs.json", _errors(1))
    (root / "found.json").write_text("rác", encoding="utf-8")
    with pytest.raises(gates.GateError):
        qualify.score("fact", root / "errs.json", root / "found.json", root=root)


# ---- qc -----------------------------------------------------------------------

def test_qc_bat_moi_loi_critical_thi_dat_du_sot_major(root):
    errs = _errors(5) + _errors(1, "MAJOR")[0:1]
    errs[-1]["id"] = "q99"
    errs[-1]["marker"] = "MARK09"
    r = _score(root, "qc", errs, [_hit(i) for i in range(1, 6)])
    assert r["missed"] == ["q99"]
    assert r["pass"] is True


def test_qc_sot_mot_critical_thi_chua_dat_du_ti_le_cao(root):
    r = _score(root, "qc", _errors(5), [_hit(i) for i in range(1, 5)])
    assert r["rate"] == 0.8
    assert r["missed"] == ["q05"]
    assert r["pass"] is False


def test_qc_bao_sai_khong_lam_truot(root):
    r = _score(
        root, "qc", _errors(5),
        [_hit(i) for i in range(1, 6)] + [_fake(1), _fake(2), _fake(3)],
    )
    assert r["falseAlarms"] == 3
    assert r["pass"] is True


def test_qc_chi_bat_bang_phat_hien_minor_thi_chua_dat(root):
    r = _score(root, "qc", _errors(1), [_hit(1, "MINOR")])
    assert r["pass"] is False


# ---- hàng ghi sổ --------------------------------------------------------------

def test_hang_ghi_so_co_ten_vai_so_do_va_ket_luan(root):
    ok = _score(root, "fact", _errors(10), [_hit(i) for i in range(1, 11)])
    assert ok["row"].startswith("| ")
    assert "fact-checker" in ok["row"]
    assert "100%" in ok["row"]
    assert "ĐẠT" in ok["row"]
    assert "CHƯA ĐẠT" not in ok["row"]
    bad = _score(root, "fact", _errors(10), [_hit(1)])
    assert "CHƯA ĐẠT" in bad["row"]
    assert "10%" in bad["row"]
    qc = _score(root, "qc", _errors(2), [_hit(1), _hit(2)])
    assert "qc" in qc["row"]


def test_hang_ghi_so_co_hash_ngan_cua_prompt_vai(root):
    role = ROLES_DIR / "fact-checker.md"
    r = _score(root, "fact", _errors(1), [_hit(1)], role_file=role)
    import hashlib

    assert hashlib.sha256(role.read_bytes()).hexdigest()[:12] in r["row"]


# ---- CLI ----------------------------------------------------------------------

def test_cli_score_ma_thoat_theo_pass(root, capsys):
    write_json(root / "errs.json", _errors(10))
    write_findings(root / "ok.json", [_hit(i) for i in range(1, 11)])
    write_findings(root / "bad.json", [_hit(1)])
    base = ["score", "--kind", "fact", "--errors", str(root / "errs.json"),
            "--root", str(root)]
    assert qualify.main(base + ["--found", str(root / "ok.json")]) == 0
    assert json.loads(capsys.readouterr().out)["pass"] is True
    assert qualify.main(base + ["--found", str(root / "bad.json")]) == 1
    assert json.loads(capsys.readouterr().out)["pass"] is False


def test_cli_score_found_hong_ma_thoat_1_co_thong_bao(root, capsys):
    write_json(root / "errs.json", _errors(1))
    (root / "f.json").write_text("rác", encoding="utf-8")
    code = qualify.main(
        ["score", "--kind", "fact", "--errors", str(root / "errs.json"),
         "--found", str(root / "f.json"), "--root", str(root)]
    )
    cap = capsys.readouterr()
    assert code == 1
    assert "lỗi" in cap.err


# ---- bộ cài lỗi đã commit -----------------------------------------------------

def _load(rel):
    return json.loads((QUAL_DIR / rel).read_text(encoding="utf-8"))


def test_build_sinh_ra_dung_bo_da_commit_va_xac_dinh(tmp_path):
    a, b = tmp_path / "a", tmp_path / "b"
    qualify.build(a)
    qualify.build(b)
    files_a = sorted(p.relative_to(a) for p in a.rglob("*") if p.is_file())
    assert files_a == sorted(p.relative_to(b) for p in b.rglob("*") if p.is_file())
    for rel in files_a:
        assert (a / rel).read_bytes() == (b / rel).read_bytes()
        assert (a / rel).read_bytes() == (QUAL_DIR / rel).read_bytes(), rel


def test_bo_fact_it_nhat_muoi_loi_moi_loi_critical_co_marker_o_ban_cai_khong_o_ban_sach():
    errs = _load("fact/seeded-errors.json")
    seeded = (QUAL_DIR / "fact" / "seeded.json").read_text(encoding="utf-8")
    clean = (QUAL_DIR / "fact" / "clean.json").read_text(encoding="utf-8")
    assert len(errs) >= 10
    assert len({e["id"] for e in errs}) == len(errs)
    for e in errs:
        assert e["severity"] == "CRITICAL"
        assert e["marker"] in seeded, e
        assert e["marker"] not in clean, e


def test_bo_fact_hai_ban_cung_id_claim_va_con_claim_khong_bi_cai_loi():
    clean, seeded = _load("fact/clean.json"), _load("fact/seeded.json")
    assert [c["id"] for c in clean] == [c["id"] for c in seeded]
    assert len(clean) > len(_load("fact/seeded-errors.json"))


def test_bo_qc_nam_loi_critical_va_mot_major_marker_chi_o_ban_cai():
    errs = _load("qc/seeded-errors.json")
    assert sorted(e["severity"] for e in errs) == ["CRITICAL"] * 5 + ["MAJOR"]
    for e in errs:
        seeded = (QUAL_DIR / "qc" / "seeded" / e["file"]).read_text(encoding="utf-8")
        clean = (QUAL_DIR / "qc" / "clean" / e["file"]).read_text(encoding="utf-8")
        assert e["marker"] in seeded, e
        assert e["marker"] not in clean, e


def test_bo_qc_ban_sach_va_ban_cai_loi_cung_bo_tep():
    names = lambda d: sorted(p.name for p in (QUAL_DIR / "qc" / d).iterdir())  # noqa: E731
    assert names("clean") == names("seeded") == [
        "chapters.txt", "script.json", "timeline.json", "video.srt",
    ]


def test_end_to_end_fact_bat_het_loi_cai_tren_lo_mu_that(tmp_path):
    errs_path = QUAL_DIR / "fact" / "seeded-errors.json"
    errs = _load("fact/seeded-errors.json")
    seeded = qualify.prepare(
        "fact", "seeded", ROLES_DIR / "fact-checker.md", tmp_path / "t1"
    )
    clean = qualify.prepare(
        "fact", "clean", ROLES_DIR / "fact-checker.md", tmp_path / "t2"
    )
    found = write_findings(
        tmp_path / "found.json",
        [finding("CRITICAL", e["marker"], file="items.json", rule=f"claim:{e['id']}")
         for e in errs],
    )
    # mọi marker thật sự nằm trong items.json của lô cài lỗi (quote hợp lệ)
    res = gates.evaluate_findings(found, seeded["batchDir"])
    assert res["complete"] is True
    r = qualify.score(
        "fact", errs_path, found,
        write_findings(tmp_path / "c.json", []),
        root=seeded["batchDir"], clean_root=clean["batchDir"],
    )
    assert (r["caught"], r["falseAlarms"], r["pass"]) == (len(errs), 0, True)
    # người kiểm "mù" bắt nhầm chữ trên bản sạch thì tính báo sai
    clean_items = pathlib.Path(clean["items"]).read_text(encoding="utf-8")
    assert all(e["marker"] not in clean_items for e in errs)


def test_prepare_qc_chep_bon_tep_ra_ngoai_repo(tmp_path):
    res = qualify.prepare("qc", "seeded", tmp_parent=tmp_path / "t")
    pkg = pathlib.Path(res["packageDir"])
    assert sorted(p.name for p in pkg.iterdir()) == [
        "chapters.txt", "script.json", "timeline.json", "video.srt",
    ]
    assert QUAL_DIR.parent not in pkg.parents
    assert (pkg / "video.srt").read_text(encoding="utf-8") == (
        QUAL_DIR / "qc" / "seeded" / "video.srt"
    ).read_text(encoding="utf-8")


def test_prepare_fact_can_file_vai_va_which_hop_le(tmp_path):
    with pytest.raises(gates.GateError):
        qualify.prepare("fact", "clean", None, tmp_path)
    with pytest.raises(gates.GateError):
        qualify.prepare("fact", "la", ROLES_DIR / "fact-checker.md", tmp_path)
