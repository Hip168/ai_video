"""[10-1] [10-2] Đầu cuối nặng: render thật -> kiểm khung -> ghép -> kiểm MP4 -> dọn.

Chỉ chạy khi RENDER_TEST=1. Tập tĩnh 2701 frame (cảnh tiêu đề chương) cho
hai đoạn main 1350 + 1351. Các bước chạy theo thứ tự trong file và dùng
chung một thư mục tạm. Giao diện: `.team/features/10-render-dai-giao-dien.md`.
"""

from __future__ import annotations

import json
import os
import re
import subprocess
from pathlib import Path

import pytest

from rd_support import (
    CHROME,
    RENDER_TEST,
    ROOT,
    Root,
    both,
    frames_in,
    lufs_tp,
    make_wav,
    run_module,
    streams,
    tree_bytes,
    video_frames,
    make_timeline,
)

pytestmark = pytest.mark.skipif(not RENDER_TEST, reason="cần RENDER_TEST=1")
N = 2701
TSX = ROOT / "video" / "node_modules" / ".bin" / "tsx"
BLIP = 700


def browser() -> str:
    if os.environ.get("REMOTION_BROWSER_EXECUTABLE"):
        return os.environ["REMOTION_BROWSER_EXECUTABLE"]
    if Path(CHROME).exists():
        return CHROME
    found = subprocess.run(
        ["find", str(ROOT / "video/node_modules/.remotion"), "-name",
         "chrome-headless-shell", "-type", "f"],
        capture_output=True, text=True).stdout.split()
    return found[0] if found else CHROME


def env() -> dict:
    e = dict(os.environ)
    e["REMOTION_BROWSER_EXECUTABLE"] = browser()
    e["PYTHONPATH"] = str(ROOT / "audio" / "src")
    e.pop("AIVIDEO_FREE_GB", None)
    return e


S: dict = {}


@pytest.fixture(scope="module")
def tree(tmp_path_factory):
    if "root" not in S:
        base = tmp_path_factory.mktemp("e2e")
        r = Root(base)
        (r.out / "timeline.json").write_text(
            json.dumps(make_timeline(N), ensure_ascii=False), "utf-8")
        make_wav(r.out / "mix.wav", N / 30)
        (r.out / "video.srt").write_text("1\n00:00:00,000 --> 00:00:01,000\nA\n")
        (r.out / "chapters.txt").write_text("00:00 Mở đầu\n")
        (r.out / "narration.wav").write_bytes(b"n" * 1000)
        S["root"] = r
    return S["root"]


def asm(tree, cmd):
    return run_module("assemble", [cmd, *tree.args()], env=env())


def test_1_render_main_hai_doan_dung_frame(tree):
    r = subprocess.run(
        [str(TSX), "scripts/render-episode.ts", "tap-thu", "--root",
         str(tree.base), "--procs", "2"],
        cwd=ROOT / "video", capture_output=True, text=True, env=env(),
        timeout=900)
    assert r.returncode == 0, r.stdout + r.stderr
    m = tree.manifest()["layouts"]["main"]
    assert [s["status"] for s in m] == ["done", "done"]
    assert [video_frames(tree.out / s["file"]) for s in m] == [1350, 1351]


def test_2_pha_cho_mot_khung_o_doan_0_thi_scan_doc_lap_thay_dung_khung(tree):
    f = tree.out / "segments" / "seg-000.mp4"
    S["good_seg0"] = f.read_bytes()
    px = subprocess.run(
        ["ffmpeg", "-nostdin", "-loglevel", "error", "-i", str(f), "-vf",
         "crop=2:2:4:4", "-frames:v", "1", "-f", "rawvideo", "-pix_fmt",
         "rgb24", "-"], capture_output=True).stdout
    assert len(px) == 12
    px = px[:3]
    color = "0x%02x%02x%02x" % tuple(px)
    bad = tree.out / "seg-000.bad.mp4"
    subprocess.run(
        ["ffmpeg", "-nostdin", "-y", "-loglevel", "error", "-i", str(f), "-vf",
         f"drawbox=x=0:y=0:w=iw:h=830:color={color}:t=fill:"
         f"enable='eq(n,{BLIP})'", "-c:v", "libx264", "-crf", "12",
         "-pix_fmt", "yuv420p", "-bf", "0", str(bad)], check=True)
    assert video_frames(bad) == 1350
    sc = run_module("framecheck", ["scan", bad], env=env())
    assert sc.returncode == 1, both(sc)
    assert frames_in(both(sc), "đột biến:") == [BLIP]
    ok = run_module("framecheck", ["scan", f], env=env())
    assert ok.returncode == 0, both(ok)
    f.write_bytes(bad.read_bytes())
    bad.unlink()
    S["bad_seg0"] = f.read_bytes()


def test_3_framecheck_verify_bat_doan_hong_render_lai_va_doi_chieu_lech_ranh_gioi(tree):
    r = run_module("framecheck", ["verify", *tree.args()], env=env(), timeout=1500)
    assert r.returncode == 0, both(r)
    assert "ĐẠT" in both(r)
    # Đầu ra phải nêu đúng khung bị phá và việc render lại đoạn chứa nó.
    assert frames_in(r.stdout, "đột biến (main):") == [BLIP], r.stdout
    lines = r.stdout.splitlines()
    assert any(re.search(r"render lại.*seg-000", ln) for ln in lines), r.stdout
    assert not any(re.search(r"render lại.*seg-001", ln)
                   for ln in lines if "main" in ln), r.stdout
    f = tree.out / "segments" / "seg-000.mp4"
    assert f.read_bytes() != S["bad_seg0"]
    assert video_frames(f) == 1350
    again = run_module("framecheck", ["scan", f], env=env())
    assert again.returncode == 0, both(again)
    m = tree.manifest()["layouts"]
    assert m["main"][0]["status"] == "done"
    assert m["main"][0]["attempts"] >= 2
    assert m["shift"] and all(s["status"] == "done" for s in m["shift"])
    assert sum(s["frames"] for s in m["shift"]) == N
    for s in m["shift"]:
        assert (tree.out / s["file"]).is_file()
    edges_main = {s["startFrame"] for s in m["main"][1:]}
    assert not edges_main & {s["startFrame"] for s in m["shift"][1:]}


def test_4_ghep_gan_tieng_va_kiem_mp4_cuoi_dung_chuan(tree):
    assert asm(tree, "concat").returncode == 0
    p = asm(tree, "mux")
    assert p.returncode == 0, both(p)
    v = asm(tree, "verify")
    assert v.returncode == 0, both(v)
    final = tree.out / "tap-thu.mp4"
    s = streams(final)
    assert (s["video"]["codec_name"], s["video"]["pix_fmt"]) == ("h264", "yuv420p")
    assert (s["video"]["width"], s["video"]["height"]) == (1920, 1080)
    assert s["video"]["r_frame_rate"] == "30/1"
    assert s["audio"]["codec_name"] == "aac"
    assert video_frames(final) == N
    lufs, tp = lufs_tp(final)
    assert abs(lufs + 16) <= 1 and tp <= -1.0
    assert abs(float(s["audio"]["duration"]) - float(s["video"]["duration"])) <= 1 / 30


def test_5_clean_chi_giu_san_pham_va_kept_khop_dung_luong_con_lai(tree):
    before = tree_bytes(tree.out)
    p = asm(tree, "clean")
    assert p.returncode == 0, both(p)
    d = json.loads(p.stdout[p.stdout.index("{"):])
    assert (tree.out / "tap-thu.mp4").is_file()
    assert not (tree.out / "segments").exists()
    assert not (tree.out / "segments-shift").exists()
    assert not (tree.out / "mix.wav").exists()
    assert not (tree.out / "video.silent.mp4").exists()
    for k in ("video.srt", "chapters.txt", "timeline.json", "manifest.json"):
        assert (tree.out / k).is_file()
    assert d["kept"] == pytest.approx(tree_bytes(tree.out), rel=0.01)
    assert d["freed"] + d["kept"] == pytest.approx(before, rel=0.01)
    assert d["freed"] > d["kept"] * 0.3
