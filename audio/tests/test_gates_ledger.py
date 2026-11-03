"""Đề mục 11 [11-4]: ledger.json, chuỗi hash, trần vòng lặp, handoff."""

from __future__ import annotations

import json
import sys

from aivideo import gates

from gates_support import (
    SLUG,
    finding,
    make_episode,
    run_cli,
    write_findings,
)

PAIR = "scriptwriter/script-editor"


def _setup(tmp_path):
    eps, ep = make_episode(tmp_path)
    (ep / "a.txt").write_text("Dòng một có lỗi A.\nDòng hai có lỗi B.\n", encoding="utf-8")
    return eps, ep


def _check(capsys, eps, ep, sev, quote, *, stage="bien-tap", pair=PAIR,
           rule="r", name="f.json", return_to=None):
    f = write_findings(
        ep / name, [finding(sev, quote, file="a.txt", rule=rule)] if sev else []
    )
    argv = [
        "ledger", "add", SLUG, "--episodes-dir", str(eps), "--stage", stage,
        "--role", "script-editor", "--pair", pair, "--findings", str(f),
        "--root", str(ep),
    ]
    if return_to:
        argv += ["--return-to", return_to]
    return run_cli(capsys, argv)


def _make_add(capsys, eps, stage="viet", role="scriptwriter"):
    return run_cli(
        capsys,
        ["ledger", "add", SLUG, "--episodes-dir", str(eps), "--stage", stage,
         "--role", role],
    )


# ---- vòng -------------------------------------------------------------------

def test_ledger_vong_1_den_3_nguoi_kiem_duoc_ghi(tmp_path, capsys):
    eps, ep = _setup(tmp_path)
    for n, q in enumerate(["lỗi A", "lỗi B", "Dòng một"], start=1):
        code, out, _ = _check(capsys, eps, ep, "MAJOR", q, rule=f"r{n}")
        assert code == 0
        assert out["state"] == "OK"
        assert out["round"] == n
        assert out["verdict"] == "SUA"


def test_ledger_vong_thu_4_cua_mot_cap_bi_tu_choi(tmp_path, capsys):
    eps, ep = _setup(tmp_path)
    for n, q in enumerate(["lỗi A", "lỗi B", "Dòng một"], start=1):
        _check(capsys, eps, ep, "MAJOR", q, rule=f"r{n}")
    before = (ep / "ledger.json").read_bytes()
    code, out, _ = _check(capsys, eps, ep, "MAJOR", "Dòng hai", rule="r4")
    assert code == 3
    assert out["state"] == "CAN_NGUOI_DUNG"
    assert out["reason"]
    assert (ep / "ledger.json").read_bytes() == before
    assert len(gates.Ledger(ep).entries()) == 3


def test_ledger_vong_4_bi_tu_choi_du_phan_quyet_la_dat_hay_chan(tmp_path, capsys):
    eps, ep = _setup(tmp_path)
    for n, q in enumerate(["lỗi A", "lỗi B", "Dòng một"], start=1):
        _check(capsys, eps, ep, "CRITICAL", q, rule=f"r{n}")
    code, out, _ = _check(capsys, eps, ep, None, "")
    assert code == 3
    assert out["state"] == "CAN_NGUOI_DUNG"


def test_ledger_dat_dat_lai_dem_vong(tmp_path, capsys):
    eps, ep = _setup(tmp_path)
    for n, q in enumerate(["lỗi A", "lỗi B"], start=1):
        _check(capsys, eps, ep, "MAJOR", q, rule=f"r{n}")
    code, out, _ = _check(capsys, eps, ep, None, "")
    assert (code, out["verdict"]) == (0, "DAT")
    code, out, _ = _check(capsys, eps, ep, "MAJOR", "Dòng hai", rule="moi")
    assert code == 0
    assert out["round"] == 1


def test_ledger_cap_khac_nhau_dem_vong_rieng(tmp_path, capsys):
    eps, ep = _setup(tmp_path)
    for n, q in enumerate(["lỗi A", "lỗi B", "Dòng một"], start=1):
        _check(capsys, eps, ep, "MAJOR", q, rule=f"r{n}")
    code, out, _ = _check(
        capsys, eps, ep, "MAJOR", "Dòng hai",
        stage="fact", pair="researcher/fact-checker",
    )
    assert code == 0
    assert out["round"] == 1


def test_ledger_muc_nguoi_kiem_can_pair(tmp_path, capsys):
    eps, ep = _setup(tmp_path)
    f = write_findings(ep / "f.json", [])
    code, out, err = run_cli(
        capsys,
        ["ledger", "add", SLUG, "--episodes-dir", str(eps), "--stage", "x",
         "--role", "qc", "--findings", str(f), "--root", str(ep)],
    )
    assert code == 1
    assert out is None
    assert "lỗi" in err


def test_ledger_phan_quyet_do_script_tinh_khong_nhap_tay(capsys):
    import pytest as _pt

    with _pt.raises(SystemExit) as e:
        gates.main(["ledger", "add", SLUG, "--stage", "x", "--role", "r",
                    "--verdict", "DAT"])
    assert e.value.code == 2
    capsys.readouterr()


def test_ledger_phat_hien_bi_loai_khong_tinh_vao_phan_quyet(tmp_path, capsys):
    eps, ep = _setup(tmp_path)
    code, out, _ = _check(capsys, eps, ep, "CRITICAL", "câu bịa không có")
    assert code == 0
    assert out["verdict"] == "DAT"
    assert out["complete"] is False


def test_ledger_json_hong_cua_nguoi_kiem_van_ghi_chua_duyet(tmp_path, capsys):
    eps, ep = _setup(tmp_path)
    (ep / "f.json").write_text("rác", encoding="utf-8")
    code, out, _ = run_cli(
        capsys,
        ["ledger", "add", SLUG, "--episodes-dir", str(eps), "--stage", "x",
         "--role", "r", "--pair", PAIR, "--findings", str(ep / "f.json"),
         "--root", str(ep)],
    )
    assert code == 0
    assert out["verdict"] == "CHUA_DUYET"
    assert out["round"] == 1


# ---- trả xuyên khâu -----------------------------------------------------------

def test_ledger_tra_xuyen_khau_lan_3_bi_tu_choi(tmp_path, capsys):
    eps, ep = _setup(tmp_path)
    for n in (1, 2):
        code, out, _ = _check(
            capsys, eps, ep, None, "", stage=f"qc{n}", pair=f"qc/p{n}",
            return_to="scriptwriter",
        )
        assert (code, out["state"]) == (0, "OK")
    before = (ep / "ledger.json").read_bytes()
    code, out, _ = _check(
        capsys, eps, ep, None, "", stage="qc3", pair="qc/p3",
        return_to="scriptwriter",
    )
    assert code == 3
    assert out["state"] == "CAN_NGUOI_DUNG"
    assert (ep / "ledger.json").read_bytes() == before


def test_ledger_muc_khong_tra_xuyen_khau_khong_bi_dem(tmp_path, capsys):
    eps, ep = _setup(tmp_path)
    for n in (1, 2):
        _check(capsys, eps, ep, None, "", stage=f"qc{n}", pair=f"qc/p{n}",
               return_to="scriptwriter")
    code, out, _ = _check(capsys, eps, ep, None, "", stage="qc3", pair="qc/p3")
    assert (code, out["state"]) == (0, "OK")


# ---- lỗi lặp ------------------------------------------------------------------

def test_ledger_loi_cu_con_song_lan_2_len_nguoi_dung(tmp_path, capsys):
    eps, ep = _setup(tmp_path)
    code, out, _ = _check(capsys, eps, ep, "MAJOR", "lỗi A", rule="giong")
    assert (code, out["state"]) == (0, "OK")
    code, out, _ = _check(capsys, eps, ep, "MAJOR", "lỗi A", rule="giong")
    assert code == 3
    assert out["state"] == "CAN_NGUOI_DUNG"
    last = gates.Ledger(ep).entries()[-1]
    assert last["escalate"] is True
    assert last["findingKeys"]


def test_ledger_loi_khac_nhau_khong_leo_thang(tmp_path, capsys):
    eps, ep = _setup(tmp_path)
    _check(capsys, eps, ep, "MAJOR", "lỗi A", rule="r1")
    code, out, _ = _check(capsys, eps, ep, "MAJOR", "lỗi B", rule="r2")
    assert (code, out["state"]) == (0, "OK")
    assert gates.Ledger(ep).entries()[-1]["escalate"] is False


def test_ledger_dat_xoa_bo_nho_loi_cu(tmp_path, capsys):
    eps, ep = _setup(tmp_path)
    _check(capsys, eps, ep, "MAJOR", "lỗi A", rule="giong")
    _check(capsys, eps, ep, None, "")
    code, out, _ = _check(capsys, eps, ep, "MAJOR", "lỗi A", rule="giong")
    assert (code, out["state"]) == (0, "OK")


# ---- chuỗi hash ---------------------------------------------------------------

def _chain(tmp_path, capsys, n=3):
    eps, ep = _setup(tmp_path)
    for _ in range(n):
        assert _make_add(capsys, eps)[0] == 0
    return eps, ep


def test_ledger_chuoi_hash_noi_nhau(tmp_path, capsys):
    eps, ep = _chain(tmp_path, capsys)
    ents = gates.Ledger(ep).entries()
    assert [e["seq"] for e in ents] == [1, 2, 3]
    assert ents[0]["prevHash"] == ""
    assert ents[1]["prevHash"] == ents[0]["entryHash"]
    assert ents[2]["prevHash"] == ents[1]["entryHash"]
    for e in ents:
        assert len(e["entryHash"]) == 64
        assert e["entryHash"] == gates.entry_hash(e)


def _tamper(ep, fn):
    p = ep / "ledger.json"
    doc = json.loads(p.read_text(encoding="utf-8"))
    fn(doc)
    p.write_text(json.dumps(doc, ensure_ascii=False), encoding="utf-8")


def test_ledger_sua_mot_muc_lam_vo_chuoi(tmp_path, capsys):
    eps, ep = _chain(tmp_path, capsys)
    _tamper(ep, lambda d: d["entries"][1].update(role="gia-mao"))
    assert gates.Ledger(ep).valid() is False
    code, out, _ = run_cli(
        capsys, ["ledger", "show", SLUG, "--episodes-dir", str(eps)]
    )
    assert out["ok"] is False


def test_ledger_xoa_muc_giua_lam_vo_chuoi(tmp_path, capsys):
    eps, ep = _chain(tmp_path, capsys)
    _tamper(ep, lambda d: d["entries"].pop(1))
    assert gates.Ledger(ep).valid() is False


def test_ledger_xoa_muc_cuoi_va_chen_muc_deu_nhan_ra_khi_them(tmp_path, capsys):
    eps, ep = _chain(tmp_path, capsys)
    _tamper(ep, lambda d: d["entries"].insert(1, dict(d["entries"][0])))
    assert gates.Ledger(ep).valid() is False


def test_ledger_gia_mao_tinh_lai_entry_hash_nhung_prev_hash_lech_van_bi_bat(
    tmp_path, capsys
):
    eps, ep = _chain(tmp_path, capsys)

    def forge(d):
        d["entries"][0]["role"] = "gia-mao"
        d["entries"][0]["entryHash"] = gates.entry_hash(d["entries"][0])
        # mục sau tính lại entryHash nhưng giữ prevHash cũ
        for e in d["entries"][1:]:
            e["entryHash"] = gates.entry_hash(e)

    _tamper(ep, forge)
    assert gates.Ledger(ep).valid() is False


def test_ledger_chuoi_vo_thi_moi_lenh_them_bi_tu_choi(tmp_path, capsys):
    eps, ep = _chain(tmp_path, capsys)
    _tamper(ep, lambda d: d["entries"][0].update(stage="khac"))
    before = (ep / "ledger.json").read_bytes()
    code, out, err = _make_add(capsys, eps)
    assert code == 1
    assert "lỗi" in err
    assert (ep / "ledger.json").read_bytes() == before


def test_ledger_show_tom_tat(tmp_path, capsys):
    eps, ep = _chain(tmp_path, capsys, n=2)
    code, out, _ = run_cli(
        capsys, ["ledger", "show", SLUG, "--episodes-dir", str(eps)]
    )
    assert code == 0
    assert out["ok"] is True
    assert out["entries"] == 2
    assert out["last"]["seq"] == 2
    assert len(out["scriptHash"]) == 64
    assert out["rounds"] == {}


def test_ledger_show_dem_vong_theo_cap(tmp_path, capsys):
    eps, ep = _setup(tmp_path)
    _check(capsys, eps, ep, "MAJOR", "lỗi A", rule="r1")
    _check(capsys, eps, ep, "MAJOR", "lỗi B", rule="r2")
    _, out, _ = run_cli(capsys, ["ledger", "show", SLUG, "--episodes-dir", str(eps)])
    assert out["rounds"] == {PAIR: 2}


# ---- ledger run / handoff -----------------------------------------------------

def test_ledger_run_ma_thoat_0_ghi_dat(tmp_path, capsys):
    eps, ep = _setup(tmp_path)
    code, out, _ = run_cli(
        capsys,
        ["ledger", "run", SLUG, "--episodes-dir", str(eps), "--stage", "lint",
         "--", sys.executable, "-c", "print('ok')"],
    )
    assert code == 0
    assert out["verdict"] == "DAT"
    last = gates.Ledger(ep).last("lint")
    assert last["verdict"] == "DAT"
    assert last["scriptHash"] == gates.script_text_hash(
        json.loads((ep / "script.json").read_text(encoding="utf-8"))
    )
    assert len(last["outputHash"]) == 64


def test_ledger_run_ma_thoat_khac_0_ghi_chan(tmp_path, capsys):
    eps, ep = _setup(tmp_path)
    code, out, _ = run_cli(
        capsys,
        ["ledger", "run", SLUG, "--episodes-dir", str(eps), "--stage", "ky-thuat",
         "--", sys.executable, "-c", "import sys; sys.exit(7)"],
    )
    assert code == 1
    assert out["verdict"] == "CHAN"
    assert gates.Ledger(ep).last("ky-thuat")["verdict"] == "CHAN"


def test_ledger_run_stage_la_bi_tu_choi(tmp_path, capsys):
    eps, ep = _setup(tmp_path)
    code, _, err = run_cli(
        capsys,
        ["ledger", "run", SLUG, "--episodes-dir", str(eps), "--stage", "tuy-y",
         "--", sys.executable, "-c", "pass"],
    )
    assert code == 1
    assert not (ep / "ledger.json").exists()


def test_ledger_handoff_tao_nam_muc_va_khong_ghi_de(tmp_path, capsys):
    eps, ep = _setup(tmp_path)
    argv = ["ledger", "handoff", SLUG, "viet-kich-ban", "--episodes-dir", str(eps)]
    code = gates.main(argv)
    capsys.readouterr()
    assert code == 0
    p = ep / "handoff" / "viet-kich-ban.md"
    text = p.read_text(encoding="utf-8")
    heads = [ln for ln in text.splitlines() if ln.startswith("## ")]
    assert heads == [
        "## Đã chốt", "## Đã bỏ", "## Rủi ro", "## File", "## Còn lại",
    ]
    p.write_text(text + "\nGHI CHÚ", encoding="utf-8")
    assert gates.main(argv) == 1
    capsys.readouterr()
    assert "GHI CHÚ" in p.read_text(encoding="utf-8")


def test_ledger_handoff_ten_khau_sai_bi_tu_choi(tmp_path, capsys):
    eps, ep = _setup(tmp_path)
    code = gates.main(
        ["ledger", "handoff", SLUG, "../thoat", "--episodes-dir", str(eps)]
    )
    capsys.readouterr()
    assert code == 1


def test_ledger_qc_ghi_dong_phan_quyet(tmp_path, capsys):
    eps, ep = _setup(tmp_path)
    f = write_findings(ep / "q.json", [])
    code, out, _ = run_cli(
        capsys,
        ["ledger", "add", SLUG, "--episodes-dir", str(eps), "--stage", "qc",
         "--role", "qc", "--pair", "editor/qc", "--findings", str(f),
         "--root", str(ep)],
    )
    assert code == 0
    line = (ep / "handoff" / "qc.verdict").read_text(encoding="utf-8")
    ent = gates.Ledger(ep).entries()[-1]
    sh = gates.script_text_hash(
        json.loads((ep / "script.json").read_text(encoding="utf-8"))
    )
    assert line == (
        f"PHAN_QUYET: DAT findings_sha256={ent['findingsHash']} script_sha256={sh}\n"
    )

