"""[10-2] Validator Python và TypeScript cho cùng kết quả trên bộ mẫu chung.

Bộ mẫu chung: `tests/data/timeline2-cases.json` (mỗi ca có `valid`), cùng
file mà `video/tests/timeline2-parity.test.ts` đọc. Mỗi bên kiểm kết quả
của mình bằng đúng `valid` đó nên hai bên cho cùng kết quả. Timeline của
`_template` do Python sinh (engine fake) được ghim ở
`tests/data/template-timeline.json` để phía TypeScript kiểm.
Nguồn: `.team/features/10-render-dai.md` mục "Xong khi".
"""

from __future__ import annotations

import contextlib
import io
import json
import shutil
from pathlib import Path

import pytest

from aivideo import episode
from aivideo.episode import validate_timeline2
from ep_support import (
    MUTANTS,
    ROOT,
    VALID_BOUNDARIES,
    Tree,
    broken_rules,
    load_sample2,
    make_boundary,
    make_mutant,
)

DATA = Path(__file__).resolve().parent / "data"
CASES_PATH = DATA / "timeline2-cases.json"
GOLDEN_PATH = DATA / "template-timeline.json"
# JSON `600.0` đọc vào JavaScript thành số nguyên 600, TypeScript không thể
# thấy khác biệt; chỉ Python kiểm được nên không đưa vào bộ mẫu chung.
JS_CANNOT_SEE = {"duration_in_frames_so_thuc"}
SFX_OK = ("pop", "tick", "whoosh", "ding", "buzz")


def _expected_cases() -> list[dict]:
    cases = [{"name": "mau_hop_dong", "valid": True, "timeline": load_sample2()}]
    for c in MUTANTS:
        if c[1] in JS_CANNOT_SEE:
            continue
        cases.append(
            {"name": f"luat{c[0]}_{c[1]}", "valid": False,
             "timeline": make_mutant(c)}
        )
    for c in VALID_BOUNDARIES:
        cases.append(
            {"name": f"bien_hop_le_{c[0]}", "valid": True,
             "timeline": make_boundary(c)}
        )

    def sfx(name: str, valid: bool, label: str, idx: int = 0) -> None:
        d = load_sample2()
        d["sfx"][idx]["name"] = name
        cases.append({"name": f"sfx_ten_{label}", "valid": valid, "timeline": d})

    for n in SFX_OK:
        sfx(n, True, n)
    sfx("chime", False, "ngoai_danh_sach")
    sfx("Pop", False, "viet_hoa")
    sfx(" pop", False, "co_khoang_trang")
    sfx("pop ", False, "khoang_trang_cuoi")
    sfx("swoosh", False, "sai_o_phan_tu_thu_hai", 1)
    return cases


def _load_cases() -> list[dict]:
    return json.loads(CASES_PATH.read_text("utf-8"))["cases"]


CASES = _load_cases()


def _sfx_names_ok(doc: dict) -> bool:
    return all(
        fx.get("name") in SFX_OK for fx in (doc.get("sfx") or [])
    )


def test_bo_mau_chung_khop_nguon_sinh_ra_khong_bi_sua_tay():
    assert CASES == _expected_cases()


def test_bo_mau_chung_du_lon_va_du_loai():
    names = [c["name"] for c in CASES]
    assert len(set(names)) == len(names) >= 70
    assert sum(not c["valid"] for c in CASES) >= 55
    assert sum(c["valid"] for c in CASES) >= 12
    rules = {n.split("_")[0] for n in names if n.startswith("luat")}
    # luật 11 cần file wav nên không có mẫu trong bộ chung
    assert rules == {f"luat{i}" for i in range(1, 14) if i != 11}


@pytest.mark.parametrize("case", CASES, ids=[c["name"] for c in CASES])
def test_moi_mau_sai_that_su_sai_va_mau_dung_that_su_dung(case):
    """Kiểm độc lập (không qua validator): ca `valid` khớp bộ luật/tên SFX."""
    doc = case["timeline"]
    really_valid = not broken_rules(doc) and _sfx_names_ok(doc)
    assert really_valid == case["valid"]


@pytest.mark.parametrize("case", CASES, ids=[c["name"] for c in CASES])
def test_validate_timeline2_python_cho_cung_ket_qua_voi_bo_mau_chung(case):
    errors = validate_timeline2(case["timeline"])
    assert (errors == []) == case["valid"], errors
    if not case["valid"]:
        assert errors and all(isinstance(e, str) and e for e in errors)


@pytest.mark.parametrize("name", ["chime", "Pop", "swoosh", ""])
def test_validate_timeline2_bao_ten_sfx_ngoai_danh_sach_va_nhac_ten(name):
    doc = load_sample2()
    doc["sfx"][1]["name"] = name
    errors = validate_timeline2(doc)
    assert errors
    assert any("sfx[1]" in e for e in errors), errors


def test_timeline_template_python_sinh_khop_ban_ghim_cho_phia_typescript(
    tmp_path, monkeypatch
):
    """Dựng `_template` bằng engine fake; bản ghim là thứ vitest cho qua
    validator TypeScript, nên phải trùng bản Python sinh ra."""
    tree = Tree(tmp_path, "_template")
    shutil.copytree(ROOT / "episodes" / "_template", tree.ep_dir,
                    dirs_exist_ok=True)
    monkeypatch.chdir(tree.base / "audio")
    with contextlib.redirect_stderr(io.StringIO()):
        code = episode.main(
            ["build", "_template", "--engine", "fake", "--voice",
             "giong-thu", "--speed", "1.25"]
        )
    assert code == 0
    built = tree.timeline()
    assert built == json.loads(GOLDEN_PATH.read_text("utf-8"))
    assert validate_timeline2(built) == []
    assert _sfx_names_ok(built)
