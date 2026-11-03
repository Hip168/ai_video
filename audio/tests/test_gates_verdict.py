"""Đề mục 11 [11-3]: `verdict` tính phán quyết bằng script."""

from __future__ import annotations

import json

import pytest
from aivideo import gates

from gates_support import finding, run_cli, write_findings

BODY = "Năm 1991 Linus công bố nhân.\nDòng thứ hai của tệp.\n"


@pytest.fixture
def root(tmp_path):
    (tmp_path / "a.txt").write_text(BODY, encoding="utf-8")
    return tmp_path


def _eval(root, findings):
    p = write_findings(root / "f.json", findings)
    return gates.evaluate_findings(p, root)


def test_verdict_co_critical_ra_chan(root):
    r = _eval(root, [finding("CRITICAL", "Năm 1991"), finding("MINOR", "Dòng thứ hai")])
    assert r["verdict"] == "CHAN"


def test_verdict_co_major_khong_critical_ra_sua(root):
    r = _eval(root, [finding("MAJOR", "Năm 1991"), finding("MINOR", "Dòng thứ hai")])
    assert r["verdict"] == "SUA"


def test_verdict_chi_minor_ra_dat(root):
    r = _eval(root, [finding("MINOR", "Năm 1991")])
    assert r["verdict"] == "DAT"
    assert r["counts"] == {"CRITICAL": 0, "MAJOR": 0, "MINOR": 1}


def test_verdict_khong_phat_hien_ra_dat(root):
    r = _eval(root, [])
    assert r["verdict"] == "DAT"
    assert r["kept"] == []
    assert r["complete"] is True


def test_verdict_critical_thang_major(root):
    r = _eval(root, [finding("MAJOR", "Năm 1991"), finding("CRITICAL", "Dòng thứ hai")])
    assert r["verdict"] == "CHAN"
    assert r["counts"]["MAJOR"] == 1
    assert r["counts"]["CRITICAL"] == 1


def test_verdict_thieu_file_json_ra_chua_duyet(root):
    r = gates.evaluate_findings(root / "khong-co.json", root)
    assert r["verdict"] == "CHUA_DUYET"


def test_verdict_khong_phai_json_ra_chua_duyet(root):
    p = root / "f.json"
    p.write_text("không phải json", encoding="utf-8")
    assert gates.evaluate_findings(p, root)["verdict"] == "CHUA_DUYET"


@pytest.mark.parametrize(
    "doc",
    [
        [],
        {"findings": "x"},
        {"findings": [1]},
        {"khac": []},
    ],
)
def test_verdict_sai_dang_tong_the_ra_chua_duyet(root, doc):
    p = root / "f.json"
    p.write_text(json.dumps(doc), encoding="utf-8")
    assert gates.evaluate_findings(p, root)["verdict"] == "CHUA_DUYET"


@pytest.mark.parametrize(
    "mutate",
    [
        lambda f: f.pop("quote"),
        lambda f: f.pop("owner"),
        lambda f: f.pop("rule"),
        lambda f: f.pop("failing_case"),
        lambda f: f.pop("file"),
        lambda f: f.update(quote=""),
        lambda f: f.update(severity="NGHIEM_TRONG"),
        lambda f: f.update(severity="critical"),
    ],
)
def test_verdict_mot_phat_hien_sai_dang_ra_chua_duyet(root, mutate):
    bad = finding("MINOR", "Năm 1991")
    mutate(bad)
    r = _eval(root, [finding("CRITICAL", "Dòng thứ hai"), bad])
    assert r["verdict"] == "CHUA_DUYET"


def test_verdict_quote_khong_co_trong_file_bi_loai(root):
    r = _eval(root, [finding("CRITICAL", "câu không hề có trong tệp")])
    assert r["verdict"] == "DAT"
    assert r["kept"] == []
    assert len(r["dropped"]) == 1
    assert r["dropped"][0]["finding"]["severity"] == "CRITICAL"
    assert r["dropped"][0]["reason"]
    assert r["complete"] is False


def test_verdict_chi_tinh_phat_hien_da_giu(root):
    r = _eval(
        root,
        [
            finding("CRITICAL", "bịa đặt"),
            finding("MAJOR", "Năm 1991"),
        ],
    )
    assert r["verdict"] == "SUA"
    assert r["counts"] == {"CRITICAL": 0, "MAJOR": 1, "MINOR": 0}
    assert len(r["kept"]) == 1


def test_verdict_file_khong_ton_tai_bi_loai(root):
    r = _eval(root, [finding("CRITICAL", "Năm", file="khong-co.txt")])
    assert r["verdict"] == "DAT"
    assert len(r["dropped"]) == 1
    assert r["complete"] is False


def test_verdict_file_ngoai_root_bi_loai(root, tmp_path_factory):
    outside = tmp_path_factory.mktemp("ngoai") / "x.txt"
    outside.write_text("Năm 1991", encoding="utf-8")
    r = _eval(root, [finding("CRITICAL", "Năm 1991", file=str(outside))])
    assert r["verdict"] == "DAT"
    assert len(r["dropped"]) == 1


def test_verdict_file_duong_len_ngoai_bang_cham_cham_bi_loai(root):
    sub = root / "con"
    sub.mkdir()
    r = gates.evaluate_findings(
        write_findings(root / "f.json", [finding("CRITICAL", "Năm 1991", file="../a.txt")]),
        sub,
    )
    assert r["verdict"] == "DAT"
    assert len(r["dropped"]) == 1


def test_verdict_quote_khop_theo_nfc(root):
    import unicodedata

    nfd = unicodedata.normalize("NFD", "Năm 1991 Linus")
    r = _eval(root, [finding("CRITICAL", nfd)])
    assert r["verdict"] == "CHAN"


def test_verdict_quote_phan_biet_hoa_thuong(root):
    r = _eval(root, [finding("CRITICAL", "NĂM 1991")])
    assert r["verdict"] == "DAT"
    assert len(r["dropped"]) == 1


def test_verdict_hash_phat_hien_theo_noi_dung_file(root):
    a = _eval(root, [finding("MINOR", "Năm 1991")])
    b = _eval(root, [finding("MINOR", "Năm 1991")])
    c = _eval(root, [finding("MINOR", "Dòng thứ hai")])
    assert len(a["findingsHash"]) == 64
    assert a["findingsHash"] == b["findingsHash"]
    assert a["findingsHash"] != c["findingsHash"]


def test_verdict_cli_ma_thoat_0_chi_khi_dat(root, capsys):
    p = write_findings(root / "ok.json", [finding("MINOR", "Năm 1991")])
    code, data, _ = run_cli(capsys, ["verdict", str(p), "--root", str(root)])
    assert (code, data["verdict"]) == (0, "DAT")
    p = write_findings(root / "sua.json", [finding("MAJOR", "Năm 1991")])
    code, data, _ = run_cli(capsys, ["verdict", str(p), "--root", str(root)])
    assert (code, data["verdict"]) == (1, "SUA")
    p = write_findings(root / "chan.json", [finding("CRITICAL", "Năm 1991")])
    code, data, _ = run_cli(capsys, ["verdict", str(p), "--root", str(root)])
    assert (code, data["verdict"]) == (1, "CHAN")


def test_verdict_cli_thieu_file_ra_chua_duyet_ma_thoat_1(root, capsys):
    code, data, _ = run_cli(
        capsys, ["verdict", str(root / "khong-co.json"), "--root", str(root)]
    )
    assert code == 1
    assert data["verdict"] == "CHUA_DUYET"


def test_verdict_quote_dai_dung_300_ky_tu_van_giu(tmp_path):
    (tmp_path / "a.txt").write_text("x" * 400, encoding="utf-8")
    p = write_findings(tmp_path / "f.json", [finding("CRITICAL", "x" * 300)])
    r = gates.evaluate_findings(p, tmp_path)
    assert r["verdict"] == "CHAN"
    assert r["dropped"] == []


def test_verdict_quote_dai_301_ky_tu_bi_loai_du_co_trong_file(tmp_path):
    (tmp_path / "a.txt").write_text("x" * 400, encoding="utf-8")
    p = write_findings(tmp_path / "f.json", [finding("CRITICAL", "x" * 301)])
    r = gates.evaluate_findings(p, tmp_path)
    assert r["verdict"] == "DAT"
    assert r["kept"] == []
    assert len(r["dropped"]) == 1
    assert r["complete"] is False


def test_verdict_quote_ca_tep_items_json_bi_loai(tmp_path):
    body = "\n".join(f"dòng số {i} có chữ MARK{i:02d}" * 3 for i in range(40))
    (tmp_path / "items.json").write_text(body, encoding="utf-8")
    p = write_findings(
        tmp_path / "f.json", [finding("CRITICAL", body, file="items.json")]
    )
    r = gates.evaluate_findings(p, tmp_path)
    assert r["kept"] == []
    assert r["verdict"] == "DAT"
