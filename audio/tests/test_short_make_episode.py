"""[14-3] `make-episode.sh <slug> --short <n>`: tham số và dừng sớm.

Giao diện: `.team/features/14-shorts-giao-dien.md` mục 6 (D32, D33). Chỉ
kiểm các nhánh dừng sớm (không render). Script chạy trên BẢN CHÉP cây mã
(`repo_copy`). Cần Mac, zsh, `audio/.venv`.
"""

from __future__ import annotations

import os
import shutil
import subprocess
import sys

import pytest

from rd_support import repo_copy

pytestmark = pytest.mark.skipif(
    sys.platform != "darwin" or not shutil.which("zsh"),
    reason="make-episode.sh chỉ chạy trên Mac với zsh",
)


def mk(repo, *args, timeout=120):
    e = dict(os.environ)
    for k in ("AIVIDEO_FREE_GB", "AIVIDEO_MIN_FREE_GB"):
        e.pop(k, None)
    return subprocess.run([str(repo / "make-episode.sh"), *args],
                          capture_output=True, text=True, env=e, cwd=repo,
                          timeout=timeout)


@pytest.fixture
def repo(tmp_path):
    r = repo_copy(tmp_path / "repo")
    ep = r / "episodes" / "_template"
    ep.mkdir()
    (ep / "script.json").write_text("{}", "utf-8")
    return r


def test_short_1_thieu_shorts_json_dung_ma_1_va_noi_ro_file(repo):
    r = mk(repo, "_template", "--short", "1")
    assert r.returncode == 1, r.stdout + r.stderr
    assert "shorts.json" in r.stdout + r.stderr
    assert not (repo / "out" / "episodes" / "_template" / "shorts").exists()


@pytest.mark.parametrize("args", [
    ["--short"],
    ["--short", "0"],
    ["--short", "9"],
    ["--short", "-1"],
    ["--short", "x"],
    ["--short", "1", "--short", "2"],
])
def test_short_tham_so_sai_thoat_ma_2_va_khong_tao_gi(repo, args):
    # điều kiện cần: --short 1 được nhận (không phải "tham số lạ", mã 2)
    ok = mk(repo, "_template", "--short", "1")
    assert ok.returncode != 2, ok.stdout + ok.stderr
    before = set((repo / "out" / "episodes").rglob("*"))
    r = mk(repo, "_template", *args)
    assert r.returncode == 2, r.stdout + r.stderr
    assert r.stderr.strip()
    assert "Bước" not in r.stdout
    assert set((repo / "out" / "episodes").rglob("*")) == before
