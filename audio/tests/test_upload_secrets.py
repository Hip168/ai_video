"""Đề mục 13 [13-1]: không có file bí mật YouTube nào trong repo."""

from __future__ import annotations

import fnmatch
import subprocess

from gates_support import ROOT

SECRET_PATTERNS = ["client_secret*.json", "token*.json"]


def _git(*args):
    return subprocess.run(
        ["git", "-C", str(ROOT), *args],
        capture_output=True, text=True, check=False,
    )


def _tracked_names():
    out = _git("ls-files").stdout.splitlines()
    return [p for p in out if p]


def test_khong_file_bi_mat_nao_duoc_git_theo_doi():
    bad = [
        p for p in _tracked_names()
        for pat in SECRET_PATTERNS
        if fnmatch.fnmatch(p.rsplit("/", 1)[-1], pat)
    ]
    assert bad == []


def test_gitignore_co_mau_client_secret_va_token():
    lines = {
        ln.strip()
        for ln in (ROOT / ".gitignore").read_text(encoding="utf-8").splitlines()
    }
    for pat in SECRET_PATTERNS:
        assert pat in lines


def test_gitignore_chan_that_su_cac_ten_file_bi_mat():
    names = [
        "client_secret.json",
        "client_secret_123-abc.apps.googleusercontent.com.json",
        "token.json",
        "token-kenh.json",
        "audio/src/aivideo/token.json",
        "episodes/x/client_secret.json",
    ]
    res = _git("check-ignore", "--no-index", *names)
    assert sorted(res.stdout.split()) == sorted(names)


def test_gitignore_khong_chan_nham_file_thuong():
    res = _git("check-ignore", "--no-index", "episodes/queue.json",
               "audio/src/aivideo/upload.py", "episodes/x/publish.json")
    assert res.stdout.split() == []
