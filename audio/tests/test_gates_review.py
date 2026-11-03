"""Đề mục 11: hành vi thêm theo review code (a11cfff, c45ae28)."""

from __future__ import annotations

import json
import pathlib
import re
import subprocess

import pytest
from aivideo import gates

from gates_support import (
    ROLES_DIR,
    ROOT,
    SLUG,
    claim,
    edit_script,
    finding,
    make_episode,
    make_script,
    problems_text,
    run_cli,
    write_findings,
    write_json,
)
from test_gates_gate3 import Env


# ---- 1. hash lời không băm cảnh -------------------------------------------------

def _hash(doc):
    return gates.script_text_hash(doc)


def _beats(doc):
    return [b for sc in doc["scenes"] for b in sc["beats"]]


def test_hash_khong_doi_khi_doi_id_canh():
    doc = make_script()
    base = _hash(doc)
    doc["scenes"][0]["id"] = "canh-doi-ten"
    assert _hash(doc) == base


def test_hash_khong_doi_khi_gom_beat_sang_canh_khac_giu_nguyen_thu_tu():
    doc = make_script()
    base = _hash(doc)
    last = doc["scenes"][0]["beats"].pop()
    doc["scenes"][1]["beats"].insert(0, last)
    assert _hash(doc) == base


def test_hash_khong_doi_khi_gop_hai_canh_thanh_mot():
    doc = make_script()
    base = _hash(doc)
    first, second = doc["scenes"][2], doc["scenes"][3]
    assert first["beats"] and second["beats"]  # cả hai cảnh đều có beat
    n = len(first["beats"]) + len(second["beats"])
    first["beats"].extend(second["beats"])
    doc["scenes"].pop(3)
    assert len(first["beats"]) == n
    assert _hash(doc) == base


@pytest.mark.parametrize(
    "mutate",
    [
        lambda d: _beats(d)[0].__setitem__("text", "Câu đã đổi."),
        lambda d: _beats(d)[0].__setitem__("spoken", "đọc khác đi"),
        lambda d: _beats(d)[0].__setitem__("claims", ["c001"]),
        lambda d: _beats(d)[0].__setitem__("id", "b999"),
        lambda d: d["scenes"][0]["beats"].reverse(),
        lambda d: d["scenes"][0]["beats"].pop(),
        lambda d: d["scenes"][0]["beats"].append(
            {"id": "bmoi", "text": "Thêm.", "spoken": None, "cue": None,
             "pause_ms": 0, "sfx": None, "claims": []}
        ),
        lambda d: d["scenes"][1]["beats"].insert(0, d["scenes"][0]["beats"].pop(0)),
    ],
)
def test_hash_doi_khi_lam_doi_loi_hoac_thu_tu_beat(mutate):
    doc = make_script()
    base = _hash(doc)
    mutate(doc)
    assert _hash(doc) != base


@pytest.fixture
def env(tmp_path, monkeypatch):
    return Env(tmp_path, monkeypatch)


def test_gate3_khong_bao_hash_kich_ban_khi_gom_lai_canh_sau_cong2(env):
    def regroup(d):
        last = d["scenes"][0]["beats"].pop()
        d["scenes"][1]["beats"].insert(0, last)
        d["scenes"][0]["id"] = "sc01-doi-ten"

    edit_script(env.ep, regroup)
    r = env.gate3()
    assert env.checks(r)["hash-kich-ban"]["ok"] is True


# ---- 2. quote khớp giá trị chuỗi đã giải mã (file .json) ---------------------------

VALUE = 'Ông nói "xin chào" rồi viết C:\\dir\\file\nvà xuống dòng.'


@pytest.fixture
def jroot(tmp_path):
    write_json(tmp_path / "items.json", [{"id": "c001", "claim": VALUE, "q": "khác"}])
    (tmp_path / "ghi-chu.txt").write_text(
        json.dumps({"claim": VALUE}, ensure_ascii=False), encoding="utf-8"
    )
    return tmp_path


def _kept(root, quote, file="items.json"):
    p = write_findings(root / "f.json", [finding("CRITICAL", quote, file=file)])
    return gates.evaluate_findings(p, root)


@pytest.mark.parametrize(
    "quote",
    [
        'nói "xin chào" rồi',
        "C:\\dir\\file",
        "file\nvà xuống dòng",
        VALUE,
    ],
)
def test_quote_giai_ma_tu_json_duoc_giu(jroot, quote):
    r = _kept(jroot, quote)
    assert r["verdict"] == "CHAN"
    assert r["dropped"] == []


def test_quote_dang_escape_nguyen_van_trong_file_van_duoc_giu(jroot):
    r = _kept(jroot, 'nói \\"xin chào\\" rồi')
    assert r["verdict"] == "CHAN"


def test_quote_ban_dich_khong_co_trong_gia_tri_bi_loai(jroot):
    r = _kept(jroot, 'nói "xin chào" rồi viết D:\\dir')
    assert r["verdict"] == "DAT"
    assert len(r["dropped"]) == 1


def test_quote_bac_cau_qua_hai_gia_tri_json_khac_nhau_bi_loai(jroot):
    r = _kept(jroot, "xuống dòng.khác")
    assert r["dropped"] != []


def test_quote_trich_dung_khoa_json_co_ky_tu_escape_duoc_giu(tmp_path):
    key = 'khoá "đặc biệt" và \\ngược'
    write_json(tmp_path / "items.json", {key: "giá trị"})
    r = _kept(tmp_path, key)
    assert r["verdict"] == "CHAN"
    assert r["dropped"] == []
    r = _kept(tmp_path, 'khoá "đặc biệt" và \\ngược nhưng sai')
    assert r["dropped"] != []


@pytest.mark.parametrize("quote_form", ["NFC", "NFD"])
def test_quote_giai_ma_khi_file_json_o_dang_nfd_co_escape(tmp_path, quote_form):
    import unicodedata

    value = 'Tiếng "Việt" mạnh mẽ\nxuống dòng'
    raw = json.dumps({"claim": value}, ensure_ascii=False)
    (tmp_path / "items.json").write_bytes(
        unicodedata.normalize("NFD", raw).encode("utf-8")
    )
    quote = unicodedata.normalize(quote_form, 'Tiếng "Việt" mạnh')
    r = _kept(tmp_path, quote)
    assert r["verdict"] == "CHAN"
    assert r["dropped"] == []


def test_quote_giai_ma_khong_ap_dung_cho_file_khong_phai_json(jroot):
    r = _kept(jroot, 'nói "xin chào" rồi', file="ghi-chu.txt")
    assert r["verdict"] == "DAT"
    assert len(r["dropped"]) == 1


# ---- 3. chuẩn hoá rule claim -------------------------------------------------------

def _three_claims_env(tmp_path):
    eps, ep = make_episode(
        tmp_path, fact=False,
        claims=[
            claim("c001", "Điều thứ nhất."),
            claim("c002", "Điều thứ hai."),
            claim("c003", "Điều thứ ba."),
        ],
    )
    res = gates.prepare_factcheck(
        SLUG, eps, ROLES_DIR / "fact-checker.md", tmp_parent=tmp_path / "lo"
    )
    return eps, ep, res


def _apply(eps, res, found):
    f = write_findings(pathlib.Path(res["batchDir"]) / "f.json", found)
    return gates.apply_factcheck(SLUG, eps, f, res["batchDir"])


@pytest.mark.parametrize("rule", ["claim: c003", "claim:c003 ", "claim:   c003   "])
def test_rule_claim_co_khoang_trang_anh_xa_toi_c003(tmp_path, rule):
    eps, ep, res = _three_claims_env(tmp_path)
    out = _apply(
        eps, res,
        [finding("CRITICAL", "Điều thứ ba.", file="items.json", rule=rule)],
    )
    assert out["updated"] == {"c001": "DAT", "c002": "DAT", "c003": "SAI"}
    assert out["unmapped"] == []


@pytest.mark.parametrize("rule", ["claim:3", "claim:c03", "claim: ", "claim:c003x"])
def test_rule_claim_khong_khop_id_khong_anh_xa_duoc(tmp_path, rule):
    eps, ep, res = _three_claims_env(tmp_path)
    out = _apply(
        eps, res,
        [finding("CRITICAL", "Điều thứ ba.", file="items.json", rule=rule)],
    )
    assert out["updated"] == {"c001": "DAT", "c002": "DAT", "c003": "DAT"}
    assert len(out["unmapped"]) == 1


# ---- 4. unresolvedSevere -----------------------------------------------------------

def _prep(eps, tmp_path, tag="lo"):
    return gates.prepare_factcheck(
        SLUG, eps, ROLES_DIR / "fact-checker.md", tmp_parent=tmp_path / tag
    )


def _bad_quote(sev="CRITICAL", rule="claim:c001"):
    return finding(sev, "câu bịa không có trong lô", file="items.json", rule=rule)


@pytest.fixture
def two(tmp_path):
    eps, ep = make_episode(
        tmp_path, fact=False,
        claims=[claim("c001", "Điều thứ nhất."), claim("c002", "Điều thứ hai.")],
    )
    return eps, ep, tmp_path


def _cli_apply(capsys, eps, res, found):
    f = write_findings(pathlib.Path(res["batchDir"]) / "f.json", found)
    return run_cli(
        capsys,
        ["apply-factcheck", SLUG, "--episodes-dir", str(eps), "--findings",
         str(f), "--batch", res["batchDir"]],
    )


def _name(res):
    return pathlib.Path(res["batchDir"]).name


@pytest.mark.parametrize("sev", ["CRITICAL", "MAJOR"])
def test_phat_hien_nang_bi_loai_ghi_vao_muc_fact_va_chan_hai_cong(two, sev):
    eps, ep, tmp = two
    res = _prep(eps, tmp)
    out = _apply(eps, res, [_bad_quote(sev)])
    assert [u["severity"] for u in out["unresolvedSevere"]] == [sev]
    assert out["unresolvedSevere"][0]["rule"] == "claim:c001"
    assert out["unresolvedSevere"][0]["reason"]
    last = gates.Ledger(ep).last("fact")
    assert last["unresolvedSevere"] == out["unresolvedSevere"]
    for g in (gates.gate1(SLUG, eps), gates.gate2(SLUG, eps, write_ledger=False)):
        assert g["pass"] is False
        assert _name(res) in problems_text(g)
        assert "claim:c001" in problems_text(g)


def test_phat_hien_nang_khong_anh_xa_duoc_cung_ghi_va_chan(two):
    eps, ep, tmp = two
    res = _prep(eps, tmp)
    out = _apply(
        eps, res,
        [finding("CRITICAL", "Điều thứ hai.", file="items.json", rule="claim:7")],
    )
    assert out["unresolvedSevere"][0]["rule"] == "claim:7"
    assert out["unresolvedSevere"][0]["reason"]
    assert "claim:7" in problems_text(gates.gate1(SLUG, eps))
    g2 = gates.gate2(SLUG, eps, write_ledger=False)
    assert g2["pass"] is False
    assert "claim:7" in problems_text(g2)


def test_unresolved_severe_nam_trong_entry_hash_sua_tay_la_vo_chuoi(two):
    eps, ep, tmp = two
    res = _prep(eps, tmp)
    _apply(eps, res, [_bad_quote()])
    assert gates.Ledger(ep).valid() is True
    doc = json.loads((ep / "ledger.json").read_text(encoding="utf-8"))
    fact = [e for e in doc["entries"] if e["stage"] == "fact"][-1]
    fact["unresolvedSevere"] = None
    (ep / "ledger.json").write_text(json.dumps(doc, ensure_ascii=False), encoding="utf-8")
    assert gates.Ledger(ep).valid() is False
    assert gates.gate1(SLUG, eps)["pass"] is False  # sổ vỡ cũng chặn


def test_cli_apply_thoat_ma_3_va_stderr_neu_rule(two, capsys):
    eps, ep, tmp = two
    res = _prep(eps, tmp)
    code, data, err = _cli_apply(capsys, eps, res, [_bad_quote(rule="claim:c002")])
    assert code == 3
    assert data["unresolvedSevere"][0]["rule"] == "claim:c002"
    assert "claim:c002" in err
    assert "gọi lại fact-checker (prepare-factcheck lô mới) hoặc hỏi người dùng" in err


def test_doi_chung_findings_rong_ma_0_va_hai_cong_dat(two, capsys):
    eps, ep, tmp = two
    res = _prep(eps, tmp)
    code, data, err = _cli_apply(capsys, eps, res, [])
    assert code == 0
    assert data["unresolvedSevere"] == []
    assert err == ""
    assert gates.Ledger(ep).last("fact")["unresolvedSevere"] is None
    assert gates.gate1(SLUG, eps)["pass"] is True
    assert gates.gate2(SLUG, eps, write_ledger=False)["pass"] is True


@pytest.mark.parametrize(
    "found",
    [
        [_bad_quote("MINOR")],
        [finding("MINOR", "Điều thứ hai.", file="items.json", rule="claim:9")],
    ],
)
def test_phat_hien_minor_bi_loai_hay_khong_anh_xa_khong_chan(two, capsys, found):
    eps, ep, tmp = two
    res = _prep(eps, tmp)
    code, data, err = _cli_apply(capsys, eps, res, found)
    assert code == 0
    assert data["unresolvedSevere"] == []
    assert gates.gate1(SLUG, eps)["pass"] is True
    assert gates.gate2(SLUG, eps, write_ledger=False)["pass"] is True


def test_het_chan_sau_khi_co_lo_moi_sach_bao_du_claim(two):
    eps, ep, tmp = two
    r1 = _prep(eps, tmp, "lo1")
    _apply(eps, r1, [_bad_quote()])
    assert gates.gate1(SLUG, eps)["pass"] is False
    r2 = _prep(eps, tmp, "lo2")
    _apply(eps, r2, [])
    g1 = gates.gate1(SLUG, eps)
    assert g1["pass"] is True, g1
    assert gates.gate2(SLUG, eps, write_ledger=False)["pass"] is True


def test_lo_moi_van_con_phat_hien_nang_thi_van_chan_va_nen_ten_lo_moi(two):
    eps, ep, tmp = two
    r1 = _prep(eps, tmp, "lo1")
    _apply(eps, r1, [_bad_quote()])
    r2 = _prep(eps, tmp, "lo2")
    _apply(eps, r2, [_bad_quote(rule="claim:c002")])
    txt = problems_text(gates.gate1(SLUG, eps))
    assert _name(r2) in txt
    assert _name(r1) not in txt


def test_lo_moi_chi_bao_mot_phan_claim_thi_claim_con_lai_van_bi_chan(two):
    eps, ep, tmp = two
    r1 = _prep(eps, tmp, "lo1")
    _apply(eps, r1, [_bad_quote(rule="claim:c002")])  # c002 còn phát hiện nặng
    # bỏ c002 khỏi sổ fact để lô mới chỉ bao c001, rồi thêm lại c002 bằng tay
    docs = json.loads((ep / "claims.json").read_text(encoding="utf-8"))
    c002 = docs[1]
    write_json(ep / "claims.json", docs[:1])
    r2 = _prep(eps, tmp, "lo2")
    assert [i["id"] for i in json.loads(pathlib.Path(r2["items"]).read_text(encoding="utf-8"))] == ["c001"]
    _apply(eps, r2, [])
    write_json(ep / "claims.json", [docs[0], c002])
    g1 = gates.gate1(SLUG, eps)
    assert g1["pass"] is False
    assert _name(r1) in problems_text(g1)
    assert _name(r2) not in problems_text(g1)


def test_xoa_claim_bi_gan_co_roi_lo_moi_sach_thi_gate1_va_gate2_dat(two):
    eps, ep, tmp = two
    r1 = _prep(eps, tmp, "lo1")
    _apply(eps, r1, [_bad_quote(rule="claim:c002")])
    assert gates.gate1(SLUG, eps)["pass"] is False
    docs = json.loads((ep / "claims.json").read_text(encoding="utf-8"))
    write_json(ep / "claims.json", docs[:1])  # xoá c002 khỏi sổ fact
    r2 = _prep(eps, tmp, "lo2")
    _apply(eps, r2, [])
    g1 = gates.gate1(SLUG, eps)
    assert g1["pass"] is True, g1
    g2 = gates.gate2(SLUG, eps, write_ledger=False)
    assert g2["pass"] is True, g2


def test_xoa_claim_bi_gan_co_nhung_chua_co_lo_moi_van_chan(two):
    eps, ep, tmp = two
    r1 = _prep(eps, tmp, "lo1")
    _apply(eps, r1, [_bad_quote(rule="claim:c002")])
    docs = json.loads((ep / "claims.json").read_text(encoding="utf-8"))
    write_json(ep / "claims.json", docs[:1])
    # chưa prepare/apply lô mới: claims.json đổi so với lần apply cuối
    assert gates.gate2(SLUG, eps, write_ledger=False)["pass"] is False


# ---- 5. gate3 không có --video: cảnh báo, kết quả không đổi -----------------------------

def _g3(capsys, env, *extra):
    return run_cli(
        capsys,
        ["gate3", SLUG, "--episodes-dir", str(env.eps), "--kenh", str(env.kenh),
         *extra],
    )


def test_gate3_khong_video_canh_bao_stderr_ket_qua_van_dat(env, capsys):
    code, data, err = _g3(capsys, env)
    assert code == 0
    assert data["pass"] is True
    assert "--video" in err
    assert "--video" in err


def test_gate3_co_video_khong_canh_bao(env, capsys):
    code, data, err = _g3(capsys, env, "--video", str(env.video))
    assert code == 0
    assert data["pass"] is True
    assert err == ""


def test_gate3_canh_bao_khong_lam_doi_danh_sach_muc_kiem_va_ma_thoat_khi_do(env, capsys):
    env.publish(privacy="lung-tung")
    env.commit()
    code, data, err = _g3(capsys, env)
    assert code == 1
    assert data["pass"] is False
    assert "--video" in err
    assert [c["name"] for c in data["checks"] if not c["ok"]] == ["publish"]


# ---- 6. không còn tên dự án khác trong sản phẩm của kênh ---------------------------------

SCAN_PREFIXES = (
    "episodes/roles/", "episodes/PLAYBOOK.md", "episodes/_template/",
    "audio/src/", ".team/doi-san-xuat.md", "qualification/",
)
TEXT_SUFFIX = {".md", ".py", ".json", ".txt", ".toml", ".cfg", ".srt"}
FORBIDDEN = re.compile(r"\bG3\b|\bRipt\b", re.IGNORECASE)


def _scan_files():
    """Chỉ các tệp git theo dõi trong sản phẩm của đội (không quét episodes/<tập>/)."""
    r = subprocess.run(
        ["git", "ls-files"], cwd=ROOT, capture_output=True, text=True, check=True
    )
    return [
        ROOT / name for name in r.stdout.splitlines()
        if name.startswith(SCAN_PREFIXES)
        and pathlib.Path(name).suffix in TEXT_SUFFIX
        and "__pycache__" not in name
    ]


def test_quet_duoc_du_so_tep_de_khong_xanh_vi_rong():
    names = {p.name for p in _scan_files()}
    assert {"gates.py", "qualify.py", "PLAYBOOK.md", "doi-san-xuat.md"} <= names
    assert len(_scan_files()) >= 20
    assert not any(p.parts[-3:-1] == ("episodes", "tap-khac") for p in _scan_files())


def test_khong_con_chuoi_g3_hay_ript_trong_episodes_audio_src_va_doi_san_xuat():
    hits = []
    for p in _scan_files():
        for n, line in enumerate(p.read_text(encoding="utf-8").splitlines(), 1):
            if FORBIDDEN.search(line):
                hits.append(f"{p.relative_to(ROOT)}:{n}")
    assert hits == []


def test_bo_loc_ranh_gioi_tu_khong_bat_nham_script_hay_g30():
    assert FORBIDDEN.search("script.json") is None
    assert FORBIDDEN.search("G30 và AG3") is None
    assert FORBIDDEN.search("dự án G3 Mobility") is not None
    assert FORBIDDEN.search("công ty Ript.") is not None
    assert FORBIDDEN.search("dự án g3 mobility") is not None
    assert FORBIDDEN.search("RIPT") is not None

