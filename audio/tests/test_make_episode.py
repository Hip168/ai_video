"""[10-3] `make-episode.sh`: tham số, bước 1 (công cụ, trình duyệt, đĩa), nhật ký.

Giao diện: `.team/features/10-render-dai-giao-dien.md` mục 1. Chỉ kiểm các
nhánh dừng sớm (không render) nên chạy nhanh. Script chạy trên BẢN CHÉP cây
mã trong thư mục tạm (`repo_copy`), không ghi vào repo thật. Cần Mac, zsh,
`audio/.venv`, `video/node_modules`.
"""

from __future__ import annotations

import os
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

import pytest

from rd_support import repo_copy

pytestmark = pytest.mark.skipif(
    sys.platform != "darwin" or not shutil.which("zsh"),
    reason="make-episode.sh chỉ chạy trên Mac với zsh",
)
STAMP = re.compile(r"^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d ")


@pytest.fixture
def repo(tmp_path):
    """Bản chép cây mã trong thư mục tạm, có sẵn episodes/_template/script.json."""
    r = repo_copy(tmp_path / "repo")
    ep = r / "episodes" / "_template"
    ep.mkdir()
    (ep / "script.json").write_text("{}", "utf-8")
    return r


def mk(repo, *args, env=None, timeout=120):
    e = dict(os.environ)
    for k in ("AIVIDEO_FREE_GB", "AIVIDEO_MIN_FREE_GB"):
        e.pop(k, None)
    e.update(env or {})
    return subprocess.run([str(repo / "make-episode.sh"), *args],
                          capture_output=True, text=True, env=e, cwd=repo,
                          timeout=timeout)


def out_of(repo, slug="_template") -> Path:
    return repo / "out" / "episodes" / slug


@pytest.mark.parametrize("args", [
    [],
    ["_template", "--khong-co"],
    ["_template", "--from", "khong-co"],
    ["_template", "--procs", "0"],
    ["_template", "--procs", "ba"],
    ["_template", "--engine"],
    ["Slug Sai"],
    ["tap-a", "tap-b"],
    ["_template", "--skip-lint"],
    ["_template", "--no-lint"],
    ["_template", "--skip-mix"],
    ["_template", "--no-mix"],
    ["_template", "--skip", "lint"],
])
def test_tham_so_sai_thoat_ma_2_va_in_cach_dung_khong_tao_gi(repo, args):
    before = set((repo / "out" / "episodes").glob("*"))
    r = mk(repo, *args)
    assert r.returncode == 2, r.stdout + r.stderr
    assert r.stderr.strip()
    assert "Bước" not in r.stdout
    assert set((repo / "out" / "episodes").glob("*")) == before == set()


def snap(d: Path) -> dict:
    """Tên file -> (mtime, size), bỏ render.log (nhật ký luôn được ghi thêm)."""
    return {str(p.relative_to(d)): (p.stat().st_mtime_ns, p.stat().st_size)
            for p in d.rglob("*") if p.is_file() and p.name != "render.log"}


def test_dia_duoi_6gb_dung_o_buoc_1_ma_1_khong_dung_tap(repo):
    out = out_of(repo)
    out.mkdir()
    (out / "timeline.json").write_text("{}", "utf-8")
    before = snap(out)
    r = mk(repo, "_template", "--engine", "fake", env={"AIVIDEO_FREE_GB": "5.5"})
    assert r.returncode == 1, r.stdout + r.stderr
    assert "== Bước 1/7:" in r.stdout
    assert "Bước 2/7" not in r.stdout
    assert re.search(r"LỖI ở .*đĩa", r.stderr), r.stderr
    assert snap(out) == before


def test_nhat_ky_render_log_moi_dong_co_gio_va_ghi_loi(repo):
    out = out_of(repo)
    out.mkdir()
    log = out / "render.log"
    old = "2020-01-01 00:00:00 dòng cũ\n".encode()
    log.write_bytes(old)
    r = mk(repo, "_template", "--engine", "fake", env={"AIVIDEO_FREE_GB": "1"})
    assert r.returncode == 1
    new = log.read_bytes()
    assert new.startswith(old)  # nhật ký chỉ được ghi thêm, không ghi đè
    lines = new[len(old):].decode("utf-8").splitlines()
    assert lines
    assert all(STAMP.match(ln) for ln in lines), lines
    assert any("LỖI" in ln for ln in lines)
    assert any("Bước 1/7" in ln for ln in lines)


def test_dia_dung_6gb_qua_cua_dia(repo):
    """Đủ 6 GB thì không còn báo lỗi đĩa; dừng ở lý do khác (trình duyệt hỏng)."""
    r = mk(repo, "_template", "--engine", "fake",
           env={"AIVIDEO_FREE_GB": "6",
                "REMOTION_BROWSER_EXECUTABLE": "/khong/co/trinh-duyet"})
    assert r.returncode == 1
    assert "đĩa" not in r.stderr
    assert "REMOTION_BROWSER_EXECUTABLE" in r.stderr


def test_bien_trinh_duyet_tro_vao_file_khong_co_la_loi_ro_o_buoc_1(repo):
    r = mk(repo, "_template", "--engine", "fake", env={
        "AIVIDEO_FREE_GB": "50",
        "REMOTION_BROWSER_EXECUTABLE": "/khong/co/trinh-duyet"})
    assert r.returncode == 1
    assert "LỖI ở" in r.stderr
    assert "/khong/co/trinh-duyet" in r.stderr
    assert "Bước 2/7" not in r.stdout


def test_khong_co_trinh_duyet_nao_nen_cach_cai_theo_d23(repo, tmp_path):
    home = tmp_path / "home"
    home.mkdir()
    env = dict(os.environ)
    env.pop("REMOTION_BROWSER_EXECUTABLE", None)
    env.update({"AIVIDEO_FREE_GB": "50", "HOME": str(home)})
    r = subprocess.run([str(repo / "make-episode.sh"), "_template", "--engine",
                        "fake"], capture_output=True, text=True, env=env,
                       cwd=repo, timeout=120)
    assert r.returncode == 1, r.stdout + r.stderr
    assert "LỖI ở" in r.stderr
    assert "chrome-headless-shell" in r.stderr
    assert "Bước 2/7" not in r.stdout


def test_slug_khong_co_kich_ban_la_loi_buoc_1(repo):
    r = mk(repo, "tap-khong-ton-tai", "--engine", "fake", env={
        "AIVIDEO_FREE_GB": "50",
        "REMOTION_BROWSER_EXECUTABLE": sys.executable})
    assert r.returncode == 1, r.stdout + r.stderr
    assert "LỖI ở" in r.stderr and "script.json" in r.stderr
    assert "Bước 2/7" not in r.stdout


def test_script_khong_co_co_bo_qua_lint_hay_mix():
    text = (Path(__file__).resolve().parents[2] / "make-episode.sh").read_text(
        "utf-8").lower()
    assert "skip" not in text and "--no-" not in text


def test_moi_dong_nhat_ky_ke_ca_dong_lenh_con_deu_co_gio(repo):
    """Bước build lỗi (script.json hỏng): đầu ra lệnh con đi qua tee phải có giờ."""
    slug = "zz-test-tee"
    ep = repo / "episodes" / slug
    ep.mkdir()
    (ep / "script.json").write_text("{khong phai json", "utf-8")
    r = mk(repo, slug, "--engine", "fake", env={
        "AIVIDEO_FREE_GB": "50",
        "REMOTION_BROWSER_EXECUTABLE": sys.executable})
    assert r.returncode == 1, r.stdout + r.stderr
    assert "Bước 2/7" in r.stdout
    lines = (out_of(repo, slug) / "render.log").read_text("utf-8").splitlines()
    assert len(lines) >= 4, lines
    assert all(STAMP.match(ln) for ln in lines), lines
    child = [ln for ln in lines if "Bước" not in ln and "LỖI" not in ln]
    assert child, lines  # có ít nhất một dòng từ lệnh con
