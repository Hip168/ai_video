"""Test `make-video.sh` ([3-1]) bằng công cụ giả, không chạy mô hình, không render.

Script cứng đường dẫn theo vị trí của chính nó (`${0:A:h}`), nên mỗi test chạy
một BẢN SAO trong thư mục tạm có `audio/.venv/bin/python`, `video/node_modules`
và `PATH` chỉ gồm `node`, `npm`, `ffmpeg`, `ffprobe` giả (script bash) cộng vài
lệnh hệ thống tối thiểu. Python giả và npm giả ghi lại cách chúng bị gọi vào
`calls/`, hành vi chỉnh bằng biến môi trường `FAKE_*`.
"""

from __future__ import annotations

import os
import shutil
import subprocess
from dataclasses import dataclass
from pathlib import Path

import pytest

pytestmark = pytest.mark.skipif(
    shutil.which("zsh") is None, reason="make-video.sh chỉ chạy với zsh (Mac)"
)

SCRIPT = Path(__file__).resolve().parents[2] / "make-video.sh"
SYSTEM_TOOLS = ("mkdir", "rm", "cat", "touch", "sleep", "env")

FAKE_PYTHON = """#!/bin/bash
echo "$*" >> "$FAKE_CALLS/python.args"
if [ "$1" = "-c" ]; then
  [ -n "$FAKE_NO_KORVA" ] && exit 1
  exit 0
fi
pwd > "$FAKE_CALLS/python.cwd"
echo "$PYTHONPATH" > "$FAKE_CALLS/python.pythonpath"
if [ -n "$FAKE_AUDIO_FAIL" ]; then
  echo "giả lập: build lỗi" >&2
  exit 3
fi
sleep 0.05
[ -z "$FAKE_NO_SRT" ] && echo "1" > ../out/video.srt
exit 0
"""

FAKE_NPM = """#!/bin/bash
echo "$*" >> "$FAKE_CALLS/npm.args"
pwd > "$FAKE_CALLS/npm.cwd"
if [ -n "${REMOTION_BROWSER_EXECUTABLE+x}" ]; then
  echo "set:$REMOTION_BROWSER_EXECUTABLE" > "$FAKE_CALLS/npm.browser"
else
  echo "unset" > "$FAKE_CALLS/npm.browser"
fi
sleep 0.05
case "$FAKE_RENDER" in
  none) ;;
  empty) : > ../out/video.mp4 ;;
  *) echo "mp4-gia" > ../out/video.mp4 ;;
esac
exit 0
"""


@dataclass
class Project:
    root: Path
    bin: Path
    calls: Path

    def run(self, *args: str, **extra_env: str):
        env = {
            "PATH": str(self.bin),
            "FAKE_CALLS": str(self.calls),
            "HOME": str(self.root),
        }
        env.update(extra_env)
        return subprocess.run(
            [str(self.root / "make-video.sh"), *args],
            cwd=self.root,
            env=env,
            capture_output=True,
            text=True,
            timeout=60,
        )

    def lines(self, name: str) -> list[str]:
        path = self.calls / name
        return path.read_text().splitlines() if path.exists() else []


def _script(path: Path, body: str) -> None:
    path.write_text(body)
    path.chmod(0o755)


@pytest.fixture
def proj(tmp_path: Path) -> Project:
    root = tmp_path / "repo"
    (root / "audio" / ".venv" / "bin").mkdir(parents=True)
    (root / "audio" / "src").mkdir()
    (root / "video" / "node_modules").mkdir(parents=True)
    (root / "content").mkdir()
    (root / "calls").mkdir()
    shutil.copy(SCRIPT, root / "make-video.sh")
    (root / "make-video.sh").chmod(0o755)
    _script(root / "audio" / ".venv" / "bin" / "python", FAKE_PYTHON)
    bin_dir = tmp_path / "bin"
    bin_dir.mkdir()
    for name in SYSTEM_TOOLS:
        found = shutil.which(name)
        assert found, f"máy thiếu lệnh hệ thống {name}"
        (bin_dir / name).symlink_to(found)
    _script(bin_dir / "npm", FAKE_NPM)
    for name in ("node", "ffmpeg", "ffprobe"):
        _script(bin_dir / name, "#!/bin/bash\nexit 0\n")
    return Project(root=root, bin=bin_dir, calls=root / "calls")


DEFAULT_ARGS = "build --engine korva --voice hoang_nam --speed 1.25"


def _build_call(p: Project) -> str:
    calls = [x for x in p.lines("python.args") if x.startswith("-m ")]
    assert len(calls) == 1, calls
    return calls[0]


# --- tham số ---


@pytest.mark.parametrize(
    "args, bad",
    [
        (["--lạ"], "--lạ"),
        (["--engine", "korva", "--bogus", "1"], "--bogus"),
        (["tham-so-tran"], "tham-so-tran"),
    ],
)
def test_tham_so_la_thoat_2_va_in_loi(proj, args, bad):
    r = proj.run(*args)
    assert r.returncode == 2
    assert f"Tham số lạ: {bad}" in r.stderr
    assert "Dùng: ./make-video.sh" in r.stderr
    assert proj.lines("python.args") == []
    assert proj.lines("npm.args") == []


@pytest.mark.parametrize("flag", ["--engine", "--voice", "--speed"])
def test_thieu_gia_tri_thoat_2_va_in_loi(proj, flag):
    r = proj.run(flag)
    assert r.returncode == 2
    assert f"Thiếu giá trị cho {flag}" in r.stderr
    assert proj.lines("python.args") == []


def test_thieu_gia_tri_o_cuoi_sau_tham_so_hop_le(proj):
    r = proj.run("--engine", "korva", "--speed")
    assert r.returncode == 2
    assert "Thiếu giá trị cho --speed" in r.stderr
    assert proj.lines("npm.args") == []


# --- thiếu công cụ ---


@pytest.mark.parametrize("tool", ["node", "npm", "ffmpeg", "ffprobe"])
def test_thieu_cong_cu_thoat_khac_0_neu_ten_buoc_va_cong_cu(proj, tool):
    (proj.bin / tool).unlink()
    r = proj.run()
    assert r.returncode != 0
    assert f"LỖI ở Bước 1/3: kiểm công cụ: thiếu {tool}" in r.stderr
    assert proj.lines("python.args") == ["-c import korvatts"]
    assert proj.lines("npm.args") == []
    assert not (proj.root / "out" / "video.mp4").exists()


def test_thieu_audio_venv_thoat_khac_0_neu_ten_buoc_va_venv(proj):
    shutil.rmtree(proj.root / "audio" / ".venv")
    r = proj.run()
    assert r.returncode != 0
    assert "LỖI ở Bước 1/3: kiểm công cụ" in r.stderr
    assert "thiếu audio/.venv" in r.stderr
    assert proj.lines("npm.args") == []


def test_thieu_video_node_modules_thoat_khac_0_neu_ten_buoc(proj):
    shutil.rmtree(proj.root / "video" / "node_modules")
    r = proj.run()
    assert r.returncode != 0
    assert "LỖI ở Bước 1/3: kiểm công cụ" in r.stderr
    assert "thiếu video/node_modules" in r.stderr
    assert proj.lines("npm.args") == []


def test_thieu_goi_korvatts_thoat_khac_0_neu_ten_buoc(proj):
    r = proj.run(FAKE_NO_KORVA="1")
    assert r.returncode != 0
    assert "LỖI ở Bước 1/3: kiểm công cụ" in r.stderr
    assert "thiếu gói korvatts" in r.stderr
    assert proj.lines("python.args") == ["-c import korvatts"]


def test_engine_khac_korva_khong_doi_goi_korvatts(proj):
    r = proj.run("--engine", "vieneu", FAKE_NO_KORVA="1")
    assert r.returncode == 0, r.stderr
    assert "-c import korvatts" not in proj.lines("python.args")


# --- mặc định và ghi đè ---


def test_mac_dinh_goi_korva_hoang_nam_toc_do_1_25(proj):
    r = proj.run()
    assert r.returncode == 0, r.stderr
    assert _build_call(proj) == f"-m aivideo.audio {DEFAULT_ARGS}"


def test_tham_so_ghi_de_ca_ba(proj):
    r = proj.run("--engine", "vieneu", "--voice", "giong_x", "--speed", "1.0")
    assert r.returncode == 0, r.stderr
    assert _build_call(proj) == (
        "-m aivideo.audio build --engine vieneu --voice giong_x --speed 1.0"
    )


def test_ghi_de_mot_tham_so_giu_mac_dinh_hai_tham_so_kia(proj):
    r = proj.run("--speed", "1.1")
    assert r.returncode == 0, r.stderr
    assert _build_call(proj) == (
        "-m aivideo.audio build --engine korva --voice hoang_nam --speed 1.1"
    )


def test_audio_chay_trong_thu_muc_audio_voi_pythonpath_src(proj):
    r = proj.run()
    assert r.returncode == 0, r.stderr
    audio = (proj.root / "audio").resolve()
    assert Path(proj.lines("python.cwd")[0]).resolve() == audio
    assert Path(proj.lines("python.pythonpath")[0]).resolve() == audio / "src"


# --- bước giọng lỗi ---


def test_buoc_giong_loi_thoat_khac_0_neu_ten_buoc_va_khong_render(proj):
    r = proj.run(FAKE_AUDIO_FAIL="1")
    assert r.returncode != 0
    assert "LỖI ở Bước 2/3: giọng đọc" in r.stderr
    assert "engine korva, giọng hoang_nam, tốc độ 1.25" in r.stderr
    assert "lệnh audio build lỗi" in r.stderr
    assert proj.lines("npm.args") == []
    assert not (proj.root / "out" / "video.mp4").exists()


def test_giong_thoat_0_nhung_khong_co_srt_la_loi(proj):
    r = proj.run(FAKE_NO_SRT="1")
    assert r.returncode != 0
    assert "LỖI ở Bước 2/3" in r.stderr
    assert "không có out/video.srt" in r.stderr
    assert proj.lines("npm.args") == []


# --- bước render không đáng tin ---


def test_render_gia_thoat_0_nhung_khong_tao_mp4_thi_script_loi(proj):
    r = proj.run(FAKE_RENDER="none")
    assert r.returncode != 0
    assert "LỖI ở Bước 3/3: dựng hình (Remotion)" in r.stderr
    assert "không có out/video.mp4" in r.stderr
    assert "XONG" not in r.stdout
    assert not (proj.root / "out" / "video.mp4").exists()


def test_mp4_cu_co_san_render_khong_ghi_moi_thi_script_loi(proj):
    out = proj.root / "out"
    out.mkdir()
    (out / "video.mp4").write_text("mp4-cu")
    (out / "video.srt").write_text("srt-cu")
    r = proj.run(FAKE_RENDER="none")
    assert r.returncode != 0
    assert "LỖI ở Bước 3/3" in r.stderr
    assert "XONG" not in r.stdout
    # File cũ bị xoá từ đầu nên không thể bị nhầm là kết quả mới.
    assert not (out / "video.mp4").exists()


def test_render_ra_mp4_rong_thi_script_loi(proj):
    r = proj.run(FAKE_RENDER="empty")
    assert r.returncode != 0
    assert "LỖI ở Bước 3/3" in r.stderr
    assert "out/video.mp4 rỗng" in r.stderr
    assert "XONG" not in r.stdout


# --- biến môi trường trình duyệt ---


def test_remotion_browser_executable_duoc_chuyen_toi_buoc_render(proj):
    chrome = "/Applications/Fake Chrome.app/chrome"
    r = proj.run(REMOTION_BROWSER_EXECUTABLE=chrome)
    assert r.returncode == 0, r.stderr
    assert proj.lines("npm.browser") == [f"set:{chrome}"]


def test_khong_dat_remotion_browser_executable_thi_khong_truyen(proj):
    r = proj.run()
    assert r.returncode == 0, r.stderr
    assert proj.lines("npm.browser") == ["unset"]


# --- thành công ---


def test_thanh_cong_thoat_0_co_mp4_srt_va_don_dep(proj):
    r = proj.run()
    assert r.returncode == 0, r.stderr
    out = proj.root / "out"
    assert (out / "video.mp4").read_text() == "mp4-gia\n"
    assert (out / "video.srt").read_text() == "1\n"
    assert not (out / ".started").exists()
    assert r.stderr == ""
    assert "XONG:" in r.stdout
    assert "video.mp4" in r.stdout and "video.srt" in r.stdout


def test_thanh_cong_chay_du_ba_buoc_theo_thu_tu(proj):
    r = proj.run()
    assert r.returncode == 0, r.stderr
    i1 = r.stdout.index("== Bước 1/3: kiểm công cụ ==")
    i2 = r.stdout.index("== Bước 2/3: giọng đọc (engine korva")
    i3 = r.stdout.index("== Bước 3/3: dựng hình (Remotion) ==")
    assert i1 < i2 < i3


def test_thanh_cong_render_bang_npm_run_render_trong_thu_muc_video(proj):
    r = proj.run()
    assert r.returncode == 0, r.stderr
    assert proj.lines("npm.args") == ["run render"]
    video = (proj.root / "video").resolve()
    assert Path(proj.lines("npm.cwd")[0]).resolve() == video


def test_chay_lai_xoa_ket_qua_cu_va_van_thanh_cong(proj):
    out = proj.root / "out"
    out.mkdir()
    (out / "video.mp4").write_text("mp4-cu")
    (out / "video.srt").write_text("srt-cu")
    r = proj.run()
    assert r.returncode == 0, r.stderr
    assert (out / "video.mp4").read_text() == "mp4-gia\n"
    assert (out / "video.srt").read_text() == "1\n"
