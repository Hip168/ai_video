"""Kiểm chứng DỮ LIỆU TEST, không kiểm code của DEV.

Các test ở đây chỉ chứng minh danh mục mẫu sai trong `ep_support.py` đúng
là vi phạm luật nó nhắm tới (bằng bộ kiểm độc lập của tester), để cùng danh
mục đó đem thử vào `validate_timeline2` ở `test_episode_validator.py`.
Phủ code thật là việc của `test_episode_validator.py`, không phải file này.
"""

from __future__ import annotations

import pytest

from ep_support import (
    MUTANTS,
    VALID_BOUNDARIES,
    broken_rules,
    load_sample2,
    make_boundary,
    make_mutant,
)


def test_file_mau_v2_doc_thang_tu_contract_khong_vi_pham_luat_nao():
    assert broken_rules(load_sample2()) == set()


@pytest.mark.parametrize(
    "case", MUTANTS, ids=[f"luat{c[0]}-{c[1]}" for c in MUTANTS]
)
def test_mau_sai_vi_pham_dung_luat_no_nham_toi(case):
    assert case[0] in broken_rules(make_mutant(case))


def test_danh_muc_mau_sai_phu_cac_luat_1_den_13_tru_11_them_luat_13():
    # Luật 11 cần độ dài wav, kiểm ở test_episode_validator.
    assert {c[0] for c in MUTANTS} == {1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 13}


def test_luat_13_sfx_rong_van_hop_le():
    doc = load_sample2()
    doc["sfx"] = []
    assert broken_rules(doc) == set()


def test_luat_8_khong_co_cue_van_hop_le():
    doc = load_sample2()
    for sc in doc["scenes"]:
        for b in sc["beats"]:
            b.pop("cue", None)
    assert broken_rules(doc) == set()


@pytest.mark.parametrize(
    "case", VALID_BOUNDARIES, ids=[c[0] for c in VALID_BOUNDARIES]
)
def test_ca_bien_hop_le_khong_vi_pham_luat_nao(case):
    assert broken_rules(make_boundary(case)) == set()
