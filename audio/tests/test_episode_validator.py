"""[5-1] `validate_timeline2` và `validate_script` (giao diện: mục
`aivideo.episode` trong `5-dung-tap-giao-dien.md`). Mỗi lỗi bắt đầu
`luật N:`; mỗi luật 1-12 có mẫu sai."""

from __future__ import annotations

import json

import pytest

from aivideo.episode import validate_script, validate_timeline2
from ep_support import MUTANTS, ROOT, load_sample2, make_mutant


def rules_of(errors: list[str]) -> set[int]:
    out = set()
    for e in errors:
        assert e.startswith("luật "), e
        out.add(int(e.split(":")[0].split()[1]))
    return out


def test_file_mau_v2_qua_validator_tra_list_rong():
    assert validate_timeline2(load_sample2()) == []


@pytest.mark.parametrize(
    "case", MUTANTS, ids=[f"luat{c[0]}-{c[1]}" for c in MUTANTS]
)
def test_mau_sai_bi_validator_bao_dung_luat(case):
    errors = validate_timeline2(make_mutant(case))
    assert case[0] in rules_of(errors), errors


def test_luat_8_bo_het_cue_van_hop_le():
    doc = load_sample2()
    for sc in doc["scenes"]:
        for b in sc["beats"]:
            b.pop("cue", None)
    assert validate_timeline2(doc) == []


def test_luat_11_dung_do_dai_wav_hop_le():
    # ceil((19.5 + 0.5) * 30) == 600
    assert validate_timeline2(load_sample2(), None, 19.5) == []


@pytest.mark.parametrize("seconds", [19.4, 19.51, 25.0, 0.0])
def test_luat_11_sai_do_dai_wav_bi_bao(seconds):
    errors = validate_timeline2(load_sample2(), None, seconds)
    assert 11 in rules_of(errors), errors


def test_luat_11_khong_kiem_khi_khong_co_narration_seconds():
    doc = load_sample2()
    assert validate_timeline2(doc, None, None) == []


def test_catalog_chi_nhan_loai_canh_trong_catalog_hoac_custom():
    doc = load_sample2()
    ok = {"cold-open", "chapter-title"}
    assert validate_timeline2(doc, ok) == []
    doc["scenes"][0]["type"] = "khong-co-trong-catalog"
    assert 3 in rules_of(validate_timeline2(doc, ok))


def test_khong_catalog_loai_canh_sai_dinh_dang_bi_bao_luat_3():
    doc = load_sample2()
    doc["scenes"][0]["type"] = "Bad_Type"
    assert 3 in rules_of(validate_timeline2(doc))


@pytest.mark.parametrize("bad", [None, [], "x", 5, {}])
def test_doc_khong_phai_timeline_tra_loi_khong_nem_ngoai_le(bad):
    errors = validate_timeline2(bad)
    assert isinstance(errors, list) and errors


def test_mot_mau_nhieu_loi_thi_bao_nhieu_luat():
    doc = load_sample2()
    doc["version"] = 1
    doc["theme"] = ""
    assert {1, 12} <= rules_of(validate_timeline2(doc))


def _script() -> dict:
    p = ROOT / "episodes" / "_template" / "script.json"
    return json.loads(p.read_text(encoding="utf-8"))


def test_script_template_hop_le():
    assert validate_script(_script()) == []


@pytest.mark.parametrize("bad", [None, [], "x", {}])
def test_script_khong_phai_dict_day_du_tra_loi(bad):
    errors = validate_script(bad)
    assert isinstance(errors, list) and errors


def _break(fn):
    doc = _script()
    fn(doc)
    return doc


SCRIPT_BAD = {
    "beat_id_trung": lambda d: d["scenes"][0]["beats"][1].__setitem__(
        "id", d["scenes"][0]["beats"][0]["id"]),
    "text_rong": lambda d: d["scenes"][0]["beats"][0].__setitem__("text", " "),
    "text_101_ky_tu": lambda d: d["scenes"][0]["beats"][0].__setitem__(
        "text", "a" * 101),
    "canh_tro_toi_chuong_la": lambda d: d["scenes"][0].__setitem__(
        "chapter", "khong-co"),
    "scene_id_trung": lambda d: d["scenes"][1].__setitem__(
        "id", d["scenes"][0]["id"]),
    "thieu_meta": lambda d: d.pop("meta"),
    "thieu_scenes": lambda d: d.pop("scenes"),
}


@pytest.mark.parametrize("name", list(SCRIPT_BAD))
def test_script_sai_bi_validate_script_bao_loi(name):
    assert validate_script(_break(SCRIPT_BAD[name])) != []
