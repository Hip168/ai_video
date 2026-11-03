"""Đề mục 11 [11-2]: extract-claims, gate1, gate2 (sổ fact, D22)."""

from __future__ import annotations

import pytest
from aivideo import gates

from gates_support import (
    claim,
    edit_script,
    first_beat,
    make_episode,
    make_script,
    problems_text,
    run_cli,
    SLUG,
)


def _items(text, **kw):
    doc = make_script(texts={"b001": text}, **kw)
    return [i for i in gates.extract_items(doc) if i["beat"] == "b001"]


# ---- extract-claims -----------------------------------------------------------

def test_extract_bat_so_dang_phay_thap_phan():
    got = _items("Giá trị pi xấp xỉ 3,14 trong toán.")
    assert [(i["kind"], i["match"]) for i in got] == [("number", "3,14")]


def test_extract_bat_so_dang_cham_nghin():
    got = _items("Có 1.000 người xem video này.")
    assert [(i["kind"], i["match"]) for i in got] == [("number", "1.000")]


def test_extract_bat_nam_ngay_va_chu_dinh_kem():
    got = _items("Vào 2024-01-15 có bản v2 chạy trên x86.")
    matches = {i["match"] for i in got if i["kind"] == "number"}
    assert "2024-01-15" in matches
    # `v2` và `x86`: phần chữ số phải bị bắt (hợp đồng ghi cả `v2`/`x86`).
    assert any(m.endswith("2") and "2024" not in m for m in matches)
    assert any(m.endswith("86") for m in matches)


def test_extract_khong_bat_so_viet_bang_chu():
    assert _items("Có một nghìn người xem và ba phẩy mười bốn.") == []


def test_extract_bat_ten_rieng_giua_cau_khong_bat_dau_cau():
    got = _items("Hôm nay Linus viết nhân và iPhone ra đời.")
    names = {i["match"] for i in got if i["kind"] == "name"}
    assert names == {"Linus", "iPhone"}


def test_extract_dau_cau_khong_bi_tinh_la_ten_rieng():
    assert _items("Đây là câu thường. Sau đó là câu khác.") == []


def test_extract_bat_viet_tat_ten_nhung_bo_thuat_ngu_chung():
    got = _items("Hãng IBM và CERN dùng CPU với RAM.")
    names = {i["match"] for i in got if i["kind"] == "name"}
    assert names == {"IBM", "CERN"}


def test_extract_ghi_vi_tri_scene_beat_field():
    got = _items("Có 3,14 ở đây.")
    assert got[0]["scene"] == "sc01"
    assert got[0]["beat"] == "b001"
    assert got[0]["field"] == "text"


def test_extract_bat_so_trong_spoken_khi_co_chu_so():
    doc = make_script(spoken={"b001": "Ba phẩy 14 đó."})
    got = [
        i for i in gates.extract_items(doc)
        if i["beat"] == "b001" and i["field"] == "spoken"
    ]
    assert [i["match"] for i in got] == ["14"]


def test_extract_cli_ma_thoat_0_va_ghi_file(tmp_path, capsys):
    eps, ep = make_episode(tmp_path, texts={"b001": "Có 1.000 người."})
    out = tmp_path / "items.json"
    code, data, _ = run_cli(
        capsys, ["extract-claims", str(ep / "script.json"), "-o", str(out)]
    )
    assert code == 0
    assert any(i["match"] == "1.000" for i in data)
    assert out.is_file()


# ---- gate1 --------------------------------------------------------------------

def test_gate1_so_claim_hop_le_thi_dat(tmp_path):
    eps, _ = make_episode(tmp_path, claims=[claim("c001", "Pi là 3,14.")])
    r = gates.gate1(SLUG, eps)
    assert r["gate"] == "gate1"
    assert r["pass"] is True
    assert r["problems"] == []


def test_gate1_mang_rong_hop_le(tmp_path):
    eps, _ = make_episode(tmp_path, claims=[])
    assert gates.gate1(SLUG, eps)["pass"] is True


def test_gate1_chan_claim_chua_kiem(tmp_path):
    eps, _ = make_episode(
        tmp_path, claims=[claim("c001", "Một sự thật.", status="CHUA_KIEM")]
    )
    r = gates.gate1(SLUG, eps)
    assert r["pass"] is False
    assert r["problems"][0]["claim"] == "c001"


def test_gate1_chan_claim_sai(tmp_path):
    eps, _ = make_episode(tmp_path, claims=[claim("c001", "x", status="SAI")])
    assert gates.gate1(SLUG, eps)["pass"] is False


def test_gate1_chan_dat_nhung_nguon_giai_thoai(tmp_path):
    src = [{"url": "https://example.org/a", "credibility": "anecdotal"}]
    eps, _ = make_episode(
        tmp_path, claims=[claim("c001", "Một điều.", sources=src)]
    )
    assert gates.gate1(SLUG, eps)["pass"] is False


def test_gate1_chan_dat_khong_co_nguon(tmp_path):
    eps, _ = make_episode(tmp_path, claims=[claim("c001", "x", sources=[])])
    assert gates.gate1(SLUG, eps)["pass"] is False


def test_gate1_claim_so_chi_mot_nguon_secondary_bi_chan(tmp_path):
    src = [{"url": "https://example.org/a", "credibility": "secondary"}]
    eps, _ = make_episode(
        tmp_path, claims=[claim("c001", "Pi là 3,14.", sources=src)]
    )
    r = gates.gate1(SLUG, eps)
    assert r["pass"] is False
    assert r["problems"][0]["claim"] == "c001"


def test_gate1_claim_so_hai_secondary_khac_ten_mien_goc_dat(tmp_path):
    src = [
        {"url": "https://a.example.org/x", "credibility": "secondary"},
        {"url": "https://www.other.net/y", "credibility": "secondary"},
    ]
    eps, _ = make_episode(
        tmp_path, claims=[claim("c001", "Pi là 3,14.", sources=src)]
    )
    assert gates.gate1(SLUG, eps)["pass"] is True


def test_gate1_claim_so_hai_nguon_cung_ten_mien_goc_bi_chan(tmp_path):
    src = [
        {"url": "https://a.example.org/x", "credibility": "secondary"},
        {"url": "https://b.example.org/y", "credibility": "secondary"},
    ]
    eps, _ = make_episode(
        tmp_path, claims=[claim("c001", "Pi là 3,14.", sources=src)]
    )
    assert gates.gate1(SLUG, eps)["pass"] is False


def test_gate1_claim_khong_so_mot_nguon_secondary_du(tmp_path):
    src = [{"url": "https://example.org/a", "credibility": "secondary"}]
    eps, _ = make_episode(
        tmp_path, claims=[claim("c001", "Một điều.", sources=src)]
    )
    assert gates.gate1(SLUG, eps)["pass"] is True


def test_gate1_chan_id_trung(tmp_path):
    eps, _ = make_episode(
        tmp_path, claims=[claim("c001", "a"), claim("c001", "b")]
    )
    assert gates.gate1(SLUG, eps)["pass"] is False


def test_gate1_chan_thieu_truong_bat_buoc(tmp_path):
    bad = claim("c001", "a")
    del bad["question"]
    eps, _ = make_episode(tmp_path, claims=[bad])
    assert gates.gate1(SLUG, eps)["pass"] is False


def test_gate1_chan_status_la(tmp_path):
    eps, _ = make_episode(tmp_path, claims=[claim("c001", "a", status="OK")])
    assert gates.gate1(SLUG, eps)["pass"] is False


def test_gate1_chan_khi_khong_phai_mang(tmp_path):
    eps, _ = make_episode(tmp_path, claims={"id": "c001"})
    assert gates.gate1(SLUG, eps)["pass"] is False


def test_gate1_chan_khi_thieu_file_claims(tmp_path):
    eps, ep = make_episode(tmp_path)
    (ep / "claims.json").unlink()
    assert gates.gate1(SLUG, eps)["pass"] is False


def test_gate1_cli_ma_thoat_theo_ket_qua(tmp_path, capsys):
    eps, _ = make_episode(tmp_path, claims=[claim("c001", "a", status="CHUA_KIEM")])
    code, data, _ = run_cli(
        capsys, ["gate1", SLUG, "--episodes-dir", str(eps)]
    )
    assert code == 1
    assert data["pass"] is False


# ---- gate2 --------------------------------------------------------------------

def _g2(eps):
    return gates.gate2(SLUG, eps, write_ledger=False)


def test_gate2_kich_ban_khong_so_khong_ten_thi_dat(tmp_path):
    eps, _ = make_episode(tmp_path)
    r = _g2(eps)
    assert r["pass"] is True
    assert len(r["scriptHash"]) == 64
    assert len(r["claimsHash"]) == 64


def test_gate2_chan_them_mot_so_khong_co_claim(tmp_path):
    eps, _ = make_episode(tmp_path, texts={"b001": "Có 42 người xem."})
    r = _g2(eps)
    assert r["pass"] is False
    assert any(
        p.get("beat") == "b001" and p.get("match") == "42" for p in r["problems"]
    )


def test_gate2_so_co_claim_hop_le_thi_dat(tmp_path):
    eps, _ = make_episode(
        tmp_path,
        texts={"b001": "Có 42 người xem."},
        beat_claims={"b001": ["c001"]},
        claims=[claim("c001", "Có 42 người xem video đầu tiên.")],
    )
    assert _g2(eps)["pass"] is True


def test_gate2_chan_claim_chua_kiem_duoc_tro_toi(tmp_path):
    eps, _ = make_episode(
        tmp_path,
        texts={"b001": "Có 42 người xem."},
        beat_claims={"b001": ["c001"]},
        claims=[claim("c001", "Có 42 người xem.", status="CHUA_KIEM")],
    )
    r = _g2(eps)
    assert r["pass"] is False
    assert "c001" in problems_text(r)


def test_gate2_chan_claim_sai_duoc_tro_toi(tmp_path):
    eps, _ = make_episode(
        tmp_path,
        texts={"b001": "Có 42 người xem."},
        beat_claims={"b001": ["c001"]},
        claims=[claim("c001", "Có 42 người xem.", status="SAI")],
    )
    assert _g2(eps)["pass"] is False


def test_gate2_chan_id_claim_khong_ton_tai(tmp_path):
    eps, _ = make_episode(
        tmp_path,
        texts={"b001": "Có 42 người xem."},
        beat_claims={"b001": ["c999"]},
        claims=[claim("c001", "Có 42 người xem.")],
    )
    r = _g2(eps)
    assert r["pass"] is False
    assert "c999" in problems_text(r)


def test_gate2_chan_claim_co_that_nhung_khong_chua_so_trong_loi(tmp_path):
    eps, _ = make_episode(
        tmp_path,
        texts={"b001": "Có 42 người xem."},
        beat_claims={"b001": ["c001"]},
        claims=[claim("c001", "Có 99 người xem.")],
    )
    r = _g2(eps)
    assert r["pass"] is False
    assert any(p.get("match") == "42" for p in r["problems"])


def test_gate2_chan_claim_cua_beat_khac_khong_tinh(tmp_path):
    eps, _ = make_episode(
        tmp_path,
        texts={"b001": "Có 42 người xem."},
        beat_claims={"b002": ["c001"]},
        claims=[claim("c001", "Có 42 người xem.")],
    )
    assert _g2(eps)["pass"] is False


def test_gate2_so_dang_phay_3_14_khop_claim_3_14(tmp_path):
    eps, _ = make_episode(
        tmp_path,
        texts={"b001": "Pi bằng 3,14 nhé."},
        beat_claims={"b001": ["c001"]},
        claims=[claim("c001", "Pi xấp xỉ 3,14.")],
    )
    assert _g2(eps)["pass"] is True


def test_gate2_chan_so_3_14_khi_claim_noi_3_15(tmp_path):
    eps, _ = make_episode(
        tmp_path,
        texts={"b001": "Pi bằng 3,14 nhé."},
        beat_claims={"b001": ["c001"]},
        claims=[claim("c001", "Pi xấp xỉ 3,15.")],
    )
    assert _g2(eps)["pass"] is False


def test_gate2_chan_so_3_14_khong_co_claim(tmp_path):
    eps, _ = make_episode(tmp_path, texts={"b001": "Pi bằng 3,14 nhé."})
    r = _g2(eps)
    assert r["pass"] is False
    assert any(p.get("match") == "3,14" for p in r["problems"])


def test_gate2_so_1_000_khop_claim_1000_va_1_000(tmp_path):
    for claim_text in ("Có 1000 người.", "Có 1.000 người."):
        eps, _ = make_episode(
            tmp_path / claim_text.split()[1],
            texts={"b001": "Có 1.000 người."},
            beat_claims={"b001": ["c001"]},
            claims=[claim("c001", claim_text)],
        )
        assert _g2(eps)["pass"] is True, claim_text


def test_gate2_chan_so_1_000_khong_co_claim(tmp_path):
    eps, _ = make_episode(tmp_path, texts={"b001": "Có 1.000 người."})
    r = _g2(eps)
    assert r["pass"] is False
    assert any(p.get("match") == "1.000" for p in r["problems"])


def test_gate2_chan_1_000_khi_claim_chi_noi_1(tmp_path):
    eps, _ = make_episode(
        tmp_path,
        texts={"b001": "Có 1.000 người."},
        beat_claims={"b001": ["c001"]},
        claims=[claim("c001", "Có 1 người.")],
    )
    assert _g2(eps)["pass"] is False


def test_gate2_chan_so_chi_nam_trong_spoken(tmp_path):
    eps, _ = make_episode(
        tmp_path, spoken={"b001": "Có 77 người nghe."}
    )
    r = _g2(eps)
    assert r["pass"] is False
    assert any(
        p.get("beat") == "b001" and p.get("match") == "77" for p in r["problems"]
    )


def test_gate2_spoken_co_claim_thi_dat(tmp_path):
    eps, _ = make_episode(
        tmp_path,
        spoken={"b001": "Có 77 người nghe."},
        beat_claims={"b001": ["c001"]},
        claims=[claim("c001", "Có 77 người nghe.")],
    )
    assert _g2(eps)["pass"] is True


def test_gate2_chan_ten_rieng_khong_co_claim(tmp_path):
    eps, _ = make_episode(tmp_path, texts={"b001": "Hôm nay Linus viết nhân."})
    r = _g2(eps)
    assert r["pass"] is False
    assert any(p.get("match") == "Linus" for p in r["problems"])


def test_gate2_ten_rieng_co_claim_khong_phan_biet_hoa_thuong(tmp_path):
    eps, _ = make_episode(
        tmp_path,
        texts={"b001": "Hôm nay Linus viết nhân."},
        beat_claims={"b001": ["c001"]},
        claims=[claim("c001", "linus torvalds công bố nhân linux")],
    )
    assert _g2(eps)["pass"] is True


def test_gate2_chan_ten_rieng_khi_claim_noi_nguoi_khac(tmp_path):
    eps, _ = make_episode(
        tmp_path,
        texts={"b001": "Hôm nay Linus viết nhân."},
        beat_claims={"b001": ["c001"]},
        claims=[claim("c001", "Richard công bố nhân")],
    )
    assert _g2(eps)["pass"] is False


def test_gate2_bao_gom_kiem_gate1_claim_chua_kiem_khong_duoc_tro_toi(tmp_path):
    eps, _ = make_episode(
        tmp_path, claims=[claim("c001", "Không ai dùng.", status="CHUA_KIEM")]
    )
    assert _g2(eps)["pass"] is False


def test_gate2_chan_kich_ban_sai_dinh_dang(tmp_path):
    eps, ep = make_episode(tmp_path)
    edit_script(ep, lambda d: d["scenes"][0].pop("beats"))
    assert _g2(eps)["pass"] is False


def test_gate2_chan_thieu_script(tmp_path):
    eps, ep = make_episode(tmp_path)
    (ep / "script.json").unlink()
    r = _g2(eps)
    assert r["pass"] is False
    assert r["scriptHash"] is None


def test_gate2_dat_ghi_so_tap_cong2_con_no_ledger_thi_khong(tmp_path):
    eps, ep = make_episode(tmp_path)
    gates.gate2(SLUG, eps, write_ledger=False)
    assert not (ep / "ledger.json").exists()
    r = gates.gate2(SLUG, eps)
    led = gates.Ledger(ep)
    last = led.last("cong2")
    assert last["verdict"] == "DAT"
    assert last["outputHash"] == r["scriptHash"]
    assert last["claimsHash"] == r["claimsHash"]


def test_gate2_chan_khong_ghi_so_tap(tmp_path):
    eps, ep = make_episode(tmp_path, texts={"b001": "Có 42 người."})
    assert gates.gate2(SLUG, eps)["pass"] is False
    assert not (ep / "ledger.json").exists()


def test_gate2_cli_ma_thoat(tmp_path, capsys):
    eps, _ = make_episode(tmp_path, texts={"b001": "Có 42 người."})
    code, data, _ = run_cli(
        capsys, ["gate2", SLUG, "--episodes-dir", str(eps), "--no-ledger"]
    )
    assert code == 1
    assert data["pass"] is False


# ---- hash lời -----------------------------------------------------------------

def test_hash_loi_doi_mot_ky_tu_text_thi_doi(tmp_path):
    _, ep = make_episode(tmp_path)
    from gates_support import read_script

    doc = read_script(ep)
    h1 = gates.script_text_hash(doc)
    first_beat(doc)["text"] = first_beat(doc)["text"].replace("câu", "cậu")
    assert gates.script_text_hash(doc) != h1


def test_hash_loi_doi_spoken_tieu_de_chuong_claims_thi_doi(tmp_path):
    _, ep = make_episode(tmp_path)
    from gates_support import read_script

    base = gates.script_text_hash(read_script(ep))
    for mutate in (
        lambda d: first_beat(d).__setitem__("spoken", "đọc khác"),
        lambda d: d["chapters"][0].__setitem__("title", "Mở đầu!"),
        lambda d: first_beat(d).__setitem__("claims", ["c001"]),
        lambda d: d["meta"].__setitem__("title", "Tên khác"),
    ):
        doc = read_script(ep)
        mutate(doc)
        assert gates.script_text_hash(doc) != base


def test_hash_loi_khong_doi_khi_chi_doi_phan_canh(tmp_path):
    _, ep = make_episode(tmp_path)
    from gates_support import read_script

    base = gates.script_text_hash(read_script(ep))
    doc = read_script(ep)
    doc["scenes"][0]["props"] = {"x": 1}
    doc["scenes"][0]["sfx"] = "pop"
    first_beat(doc)["pause_ms"] = 999
    first_beat(doc)["sfx"] = "tick"
    first_beat(doc)["cue"] = "khac"
    doc["meta"]["music"] = {"track": "khac", "gainDb": -30}
    assert gates.script_text_hash(doc) == base


@pytest.mark.parametrize("bad", ["../x", "A B", "", "x/y"])
def test_slug_sai_bi_tu_choi(tmp_path, bad):
    eps, _ = make_episode(tmp_path)
    with pytest.raises(gates.GateError):
        gates.gate1(bad, eps)



@pytest.mark.parametrize(
    ("spoken_num", "claim_num"),
    [
        ("3,14", "31,4"),
        ("3,14", "314"),
        ("31,4", "3,14"),
        ("2,5", "25"),
        ("25", "2,5"),
        ("1.000", "1,5"),
    ],
)
def test_gate2_chan_so_khac_gia_tri_du_cung_day_chu_so(
    tmp_path, spoken_num, claim_num
):
    eps, _ = make_episode(
        tmp_path,
        texts={"b001": f"Giá trị là {spoken_num} nhé."},
        beat_claims={"b001": ["c001"]},
        claims=[claim("c001", f"Giá trị là {claim_num}.")],
    )
    r = _g2(eps)
    assert r["pass"] is False
    assert any(p.get("match") == spoken_num for p in r["problems"])


@pytest.mark.parametrize(
    ("spoken_num", "claim_num"),
    [
        ("3,14", "3.14"),
        ("2,5", "2.5"),
        ("1.000", "1000"),
        ("1000", "1.000"),
        ("1.000.000", "1000000"),
        ("1.000,5", "1000,5"),
        ("1000,5", "1.000,5"),
        ("1.000,5", "1000.5"),
    ],
)
def test_gate2_dat_so_cung_gia_tri_khac_cach_viet(
    tmp_path, spoken_num, claim_num
):
    eps, _ = make_episode(
        tmp_path,
        texts={"b001": f"Giá trị là {spoken_num} nhé."},
        beat_claims={"b001": ["c001"]},
        claims=[claim("c001", f"Giá trị là {claim_num}.")],
    )
    assert _g2(eps)["pass"] is True


def test_gate2_chan_1_000_5_khi_claim_noi_1_000_55(tmp_path):
    eps, _ = make_episode(
        tmp_path,
        texts={"b001": "Giá trị là 1.000,5 nhé."},
        beat_claims={"b001": ["c001"]},
        claims=[claim("c001", "Giá trị là 1.000,55.")],
    )
    assert _g2(eps)["pass"] is False


@pytest.mark.parametrize(
    ("spoken_num", "claim_num", "ok"),
    [
        ("2024-01-15", "2024-01-15", True),
        ("2024-01-15", "2024-01-16", False),
        ("10:30", "10:30", True),
        ("10:30", "10:35", False),
        ("007", "7", False),
    ],
)
def test_gate2_so_dang_ngay_gio_va_so_khong_dau_phai_khop_tung_phan(
    tmp_path, spoken_num, claim_num, ok
):
    eps, _ = make_episode(
        tmp_path,
        texts={"b001": f"Mốc là {spoken_num} nhé."},
        beat_claims={"b001": ["c001"]},
        claims=[claim("c001", f"Mốc là {claim_num}.")],
    )
    assert _g2(eps)["pass"] is ok
