"""Kiểm local thay CI (GitHub hết phút): đọc file đổi so với origin/main rồi chọn đường kiểm.

- Đường nhanh: chỉ đổi dữ liệu tập (`episodes/**/*.json`, `episodes/**/*.md`, trừ `episodes/_template/`; `.team/*.md`).
  Chạy kiểm khoá, kiểm media, lint tập và `shorts validate` cho tập bị đổi, các test schema dữ liệu tập.
- Đường đầy đủ: mọi trường hợp khác. Chạy đúng các bước của `.github/workflows/ci.yml`.

Mỗi bước là một tiến trình con riêng; mã thoát 0 khi mọi bước đạt, 1 nếu có bước trượt.
Dùng: `python -m aivideo.kiemlocal [--base origin/main] [--dry-run]` (chạy từ đâu cũng được trong repo).
"""
from __future__ import annotations

import argparse
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
FAST = "nhanh"
FULL = "đầy đủ"
ALLOWED = (re.compile(r"^episodes/(?!_template/)[^\0]+\.(json|md)$"), re.compile(r"^\.team/[^/]+\.md$"))
NOT_EPISODES = {"roles", "_template"}
SCHEMA_PYTEST = ["tests/test_episode_contract.py", "tests/test_episode_files.py", "tests/test_episode_validator.py",
                 "tests/test_short_json.py", "tests/test_content.py", "tests/test_roles_files.py",
                 "tests/test_upload_queue_publisher.py"]
SCHEMA_VITEST = ["tests/short-validate.test.ts", "tests/lint-core.test.ts", "tests/timeline2.test.ts"]
D23_BROWSER = Path.home() / ".cache" / "aivideo" / "chrome-headless-shell" / "chrome-headless-shell"

# Hai bước đầu chép từ job repo-checks của ci.yml (sha256sum thay bằng shasum trên Mac).
LOCKS_SH = r"""
shopt -s nullglob
sum="sha256sum"; command -v sha256sum >/dev/null || sum="shasum -a 256"
files=(.team/locks/*.sha256)
if [ ${#files[@]} -gt 0 ]; then $sum -c --quiet "${files[@]}"; fi
if [ -f .team/locks/dirs.txt ]; then
  while IFS= read -r d; do
    [ -z "$d" ] && continue
    find "$d" -type f | while IFS= read -r f; do
      grep -qF "  $f" "${files[@]}" || { echo "File lạ trong thư mục khoá: $f"; exit 1; }
    done || exit 1
  done < .team/locks/dirs.txt
fi
"""
MEDIA_SH = r"""
bad=$(git ls-files -- '*.wav' '*.mp3' '*.mp4')
if [ -n "$bad" ]; then echo "Không được commit file media (sinh ra khi chạy):"; echo "$bad"; exit 1; fi
"""
# Bước chuẩn bị của job video (ci.yml): timeline mẫu + tiếng câm đúng thời lượng.
PREPARE_SH = r"""
set -euo pipefail
sample=.team/contract/timeline.sample.json
mkdir -p video/public
cp "$sample" video/public/timeline.json
src=$(jq -r '.audio.src' "$sample")
dur=$(jq -r '(.durationInFrames / .fps) - 0.5' "$sample")
mkdir -p "video/public/$(dirname "$src")"
ffmpeg -hide_banner -loglevel error -y -f lavfi -i "anullsrc=r=44100:cl=mono" -t "$dur" "video/public/$src"
"""


def changed_files(root: Path, base: str) -> list[str]:
    """File đổi từ điểm tách với `base` tới cây làm việc (gồm cả chưa commit và file mới chưa track)."""
    mb = subprocess.run(["git", "merge-base", base, "HEAD"], cwd=root, capture_output=True, text=True, check=True)
    diff = subprocess.run(["git", "diff", "--name-only", mb.stdout.strip()], cwd=root, capture_output=True,
                          text=True, check=True)
    new = subprocess.run(["git", "ls-files", "--others", "--exclude-standard"], cwd=root, capture_output=True,
                         text=True, check=True)
    return sorted({x for x in (diff.stdout + new.stdout).splitlines() if x.strip()})


def choose(files: list[str]) -> tuple[str, list[str]]:
    """(đường, các file buộc đi đường đầy đủ). Không có file đổi thì đi đường đầy đủ cho chắc."""
    other = [f for f in files if not any(p.match(f) for p in ALLOWED)]
    return (FAST if files and not other else FULL), other


def episode_slugs(files: list[str]) -> list[str]:
    out = []
    for f in files:
        parts = f.split("/")
        if len(parts) >= 3 and parts[0] == "episodes" and parts[1] not in NOT_EPISODES and parts[1] not in out:
            out.append(parts[1])
    return out


def steps(path: str, root: Path, slugs: list[str]) -> list[tuple[str, list[str], Path, dict]]:
    py = str(root / "audio" / ".venv" / "bin" / "python")
    pyenv = {"PYTHONPATH": str(root / "audio" / "src")}
    s = [("kiểm khoá", ["bash", "-c", LOCKS_SH], root, {}),
         ("kiểm media", ["bash", "-c", MEDIA_SH], root, {})]
    if path == FAST:
        for slug in slugs:
            ep = root / "episodes" / slug
            if (ep / "script.json").is_file():
                s.append((f"lint {slug}", ["npm", "run", "--silent", "lint:episode", "--", slug], root / "video", {}))
            if (ep / "shorts.json").is_file():
                s.append((f"shorts validate {slug}", [py, "-m", "aivideo.shorts", "validate", slug, "--root", str(root)],
                          root / "audio", pyenv))
        s.append(("pytest schema tập", [py, "-m", "pytest", "-q", "-p", "no:cacheprovider", *SCHEMA_PYTEST],
                  root / "audio", pyenv))
        s.append(("vitest schema tập", ["npx", "vitest", "run", *SCHEMA_VITEST], root / "video", {}))
        return s
    render_env = {"RENDER_TEST": "1"}
    if not os.environ.get("REMOTION_BROWSER_EXECUTABLE") and D23_BROWSER.is_file():
        render_env["REMOTION_BROWSER_EXECUTABLE"] = str(D23_BROWSER)  # helper test khoá chỉ đọc biến này (D23)
    vitest = ["npx", "vitest", "run"]
    if shutil.which("lockf"):
        vitest = ["lockf", "-t", "3600", "/tmp/aivideo-render.lock", *vitest]  # stack.md: render nặng chạy lần lượt
    s += [("pytest -m 'not real'", [py, "-m", "pytest", "-m", "not real", "-q", "-p", "no:cacheprovider"],
           root / "audio", pyenv),
          ("tsc", ["npx", "tsc", "--noEmit"], root / "video", {}),
          ("chuẩn bị timeline + tiếng câm", ["bash", "-c", PREPARE_SH], root, {}),
          ("vitest RENDER_TEST=1", vitest, root / "video", render_env)]
    return s


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(prog="aivideo.kiemlocal")
    ap.add_argument("--base", default="origin/main")
    ap.add_argument("--root", default=str(ROOT))
    ap.add_argument("--dry-run", action="store_true", help="chỉ in đường và các bước, không chạy")
    a = ap.parse_args(argv)
    root = Path(a.root)
    try:
        files = changed_files(root, a.base)
    except subprocess.CalledProcessError as e:
        print(f"lỗi: không đọc được file đổi so với {a.base}: {e.stderr.strip()}", file=sys.stderr)
        return 1
    path, other = choose(files)
    why = (f"chỉ đổi dữ liệu tập ({len(files)} file)" if path == FAST else
           "không có file đổi" if not files else f"có file ngoài dữ liệu tập, vd {other[0]}")
    print(f"đường: {path} — {why}")
    plan = steps(path, root, episode_slugs(files))
    failed = []
    for name, cmd, cwd, env in plan:
        if a.dry_run:
            print(f"bước: {name}")
            continue
        print(f"== {name} ==", flush=True)
        code = subprocess.run(cmd, cwd=cwd, env={**os.environ, **env}).returncode
        print(f"-- {name}: {'ĐẠT' if code == 0 else f'TRƯỢT (mã {code})'}", flush=True)
        if code != 0:
            failed.append(name)
    if not a.dry_run:
        print(f"kết quả ({path}): " + ("ĐẠT" if not failed else "TRƯỢT ở " + ", ".join(failed)))
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
