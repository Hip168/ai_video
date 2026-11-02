"""[5-1] Hợp đồng v2: file mẫu và danh mục mẫu sai (luật 1-12).

Các test ở đây dùng bộ kiểm độc lập trong `ep_support.py` để chứng minh
mỗi mẫu sai đúng là vi phạm luật nó nhắm tới. Cùng danh mục mẫu sai này
được đưa vào validator của DEV-5 khi có chữ ký hàm (xem báo cáo).
"""

from __future__ import annotations

import pytest

from ep_support import MUTANTS, broken_rules, load_sample2, make_mutant


def test_file_mau_v2_doc_thang_tu_contract_khong_vi_pham_luat_nao():
    assert broken_rules(load_sample2()) == set()


@pytest.mark.parametrize(
    "case", MUTANTS, ids=[f"luat{c[0]}-{c[1]}" for c in MUTANTS]
)
def test_mau_sai_vi_pham_dung_luat_no_nham_toi(case):
    assert case[0] in broken_rules(make_mutant(case))


def test_danh_muc_mau_sai_phu_cac_luat_1_den_12_tru_8_va_11():
    # Luật 8 (cue tuỳ chọn) chỉ có ca đúng; luật 11 cần độ dài wav.
    assert {c[0] for c in MUTANTS} == {1, 2, 3, 4, 5, 6, 7, 9, 10, 12}


def test_luat_8_khong_co_cue_van_hop_le():
    doc = load_sample2()
    for sc in doc["scenes"]:
        for b in sc["beats"]:
            b.pop("cue", None)
    assert broken_rules(doc) == set()
