"""Đề mục 9: ràng buộc kho mã của âm thanh tập (không cần chữ ký hàm).

Nguồn: `.team/features/9-am-thanh-tap.md` (Kiến trúc đã chọn, Xong khi)
và D17 trong `.team/decisions.md`.
"""

from __future__ import annotations

import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ASSETS = ROOT / "assets" / "audio"


def _git(*args: str) -> subprocess.CompletedProcess:
    return subprocess.run(
        ["git", "-C", str(ROOT), *args], capture_output=True, text=True
    )


def test_khong_co_file_media_nao_duoc_theo_doi_boi_git():
    out = _git("ls-files", "*.wav", "*.mp3", "*.mp4")
    assert out.returncode == 0, out.stderr
    assert out.stdout.strip() == ""


def test_thu_muc_nhac_assets_audio_files_bi_gitignore_ca_dinh_dang_khac():
    # .ogg không nằm trong quy tắc *.wav/*.mp3/*.mp4 chung, nên chỉ bị
    # bỏ qua nếu thư mục assets/audio/files/ được gitignore riêng.
    out = _git("check-ignore", "-q", "assets/audio/files/bai-hat.ogg")
    assert out.returncode == 0, "assets/audio/files/ chưa bị gitignore"


def test_manifest_nhac_ton_tai_va_la_json_hop_le():
    path = ASSETS / "manifest.json"
    assert path.is_file(), f"thiếu {path}"
    json.loads(path.read_text(encoding="utf-8"))


def test_readme_nguon_nhac_ton_tai_va_khong_rong():
    path = ASSETS / "README.md"
    assert path.is_file(), f"thiếu {path}"
    assert path.read_text(encoding="utf-8").strip() != ""
