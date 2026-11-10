"""[10-3] `make-episode.sh <slug> --from render` đầu cuối: bước 5, 6, 7.

Chỉ chạy khi RENDER_TEST=1 (bọc `lockf` khi chạy, xem sổ test). Chạy trên BẢN
CHÉP cây mã trong thư mục tạm (`repo_copy(video=True)`), nên `out/` và
`episodes/` của repo thật không bị ghi. Timeline nhỏ (150 khung, cảnh tiêu
đề chương) có sẵn `mix.wav`; bước 1 (công cụ) luôn chạy, bước 2-4 bị bỏ.
Giao diện: `.team/features/10-render-dai-giao-dien.md` mục 1.
"""

from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
from pathlib import Path

import pytest

from rd_support import (
    RENDER_TEST,
    ROOT,
    both,
    ff,
    lufs_tp,
    make_timeline,
    make_wav,
    repo_copy,
    run_module,
    streams,
    video_frames,
)
from test_render_dai_dau_cuoi import browser

pytestmark = pytest.mark.skipif(not RENDER_TEST, reason="cần RENDER_TEST=1")
SLUG = "zz-e2e"
N = 150
STAMP = re.compile(r"^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d ")
S: dict = {}


def mk(repo: Path, *args, slug=SLUG, timeout=900):
    e = dict(os.environ)
    for k in ("AIVIDEO_FREE_GB", "AIVIDEO_MIN_FREE_GB"):
        e.pop(k, None)
    e["REMOTION_BROWSER_EXECUTABLE"] = browser()
    return subprocess.run(
        [str(repo / "make-episode.sh"), slug, "--engine", "fake", "--procs",
         "1", *args], capture_output=True, text=True, env=e, cwd=repo,
        timeout=timeout)


@pytest.fixture(scope="module")
def repo(tmp_path_factory):
    if "repo" not in S:
        r = repo_copy(tmp_path_factory.mktemp("e2e-make") / "repo", video=True)
        seed(r, SLUG)
        S["repo"] = r
    return S["repo"]


def out_of(repo, slug=SLUG) -> Path:
    return repo / "out" / "episodes" / slug


def seed(repo: Path, slug: str) -> Path:
    """Tập nhỏ N khung (cảnh tiêu đề chương) với đủ file đầu vào của bước 5."""
    ep = repo / "episodes" / slug
    ep.mkdir()
    (ep / "script.json").write_text("{}", "utf-8")
    out = out_of(repo, slug)
    out.mkdir(parents=True)
    (out / "timeline.json").write_text(
        json.dumps(make_timeline(N), ensure_ascii=False), "utf-8")
    (out / "video.srt").write_text("1\n00:00:00,000 --> 00:00:01,000\nA\n")
    (out / "chapters.txt").write_text("00:00 Mở đầu\n")
    (out / "narration.wav").write_bytes(b"n" * 1000)
    return out


def region(mp4: Path, n: int, box: str) -> bytes:
    """Điểm xám của vùng `box` (w:h:x:y) ở khung n, đo bằng ffmpeg độc lập."""
    return subprocess.run(
        ["ffmpeg", "-nostdin", "-loglevel", "error", "-i", str(mp4), "-vf",
         f"select='eq(n,{n})',crop={box},format=gray", "-frames:v", "1",
         "-f", "rawvideo", "-"], capture_output=True, check=True).stdout


def test_1_thieu_mix_wav_dung_o_buoc_6_giu_doan_da_render(repo):
    r = mk(repo, "--from", "render")
    out = out_of(repo)
    assert r.returncode == 1, r.stdout + r.stderr
    assert "== Bước 5/7:" in r.stdout and "== Bước 6/7:" in r.stdout
    assert "Bước 7/7" not in r.stdout
    assert re.search(r"LỖI ở Bước 6/7", r.stderr), r.stderr
    m = json.loads((out / "manifest.json").read_text("utf-8"))
    assert [s["status"] for s in m["layouts"]["main"]] == ["done"]
    assert video_frames(out / "segments" / "seg-000.mp4") == N
    assert not (out / f"{SLUG}.mp4").exists()


def test_2_co_mix_wav_chay_lai_bo_qua_doan_ra_mp4_cuoi_va_don_xong(repo):
    out = out_of(repo)
    seg = out / "segments" / "seg-000.mp4"
    seg0 = json.loads((out / "manifest.json").read_text("utf-8"))[
        "layouts"]["main"][0]
    assert seg.stat().st_mtime_ns > 0
    make_wav(out / "mix.wav", N / 30)
    r = mk(repo, "--from", "render")
    assert r.returncode == 0, r.stdout + r.stderr
    for i in (1, 5, 6, 7):
        assert f"== Bước {i}/7:" in r.stdout
    for i in (2, 3, 4):
        assert f"== Bước {i}/7:" not in r.stdout
    assert "bỏ qua seg-000" in r.stdout  # resume: không render lại ở bước 5
    seg1 = json.loads((out / "manifest.json").read_text("utf-8"))[
        "layouts"]["main"][0]
    # đoạn không bị render lại: hash, số lần thử, kích thước không đổi
    assert (seg1["hash"], seg1["attempts"], seg1["bytes"]) == (
        seg0["hash"], seg0["attempts"], seg0["bytes"])
    assert "XONG" in r.stdout
    final = out / f"{SLUG}.mp4"
    s = streams(final)
    assert (s["video"]["codec_name"], s["video"]["pix_fmt"]) == ("h264", "yuv420p")
    assert (s["video"]["width"], s["video"]["height"]) == (1920, 1080)
    assert s["video"]["r_frame_rate"] == "30/1"
    assert s["audio"]["codec_name"] == "aac"
    assert video_frames(final) == N
    lufs, tp = lufs_tp(final)
    assert abs(lufs + 16) <= 1 and tp <= -1.0
    # Dọn: bỏ file tạm, giữ sản phẩm.
    for gone in ("segments", "segments-shift", "mix.wav", "video.silent.mp4"):
        assert not (out / gone).exists(), gone
    for kept in ("video.srt", "chapters.txt", "timeline.json", "manifest.json",
                 "render.log", "narration.wav"):
        assert (out / kept).is_file(), kept
    # MP4 cuối đứng độc lập và vẫn đạt `assemble verify` sau khi dọn.
    p = run_module("assemble", ["verify", SLUG, "--root", repo])
    assert p.returncode == 0, both(p)


def test_3_nhat_ky_co_gio_moi_dong_va_du_cac_buoc_va_repo_that_khong_bi_ghi(repo):
    lines = (out_of(repo) / "render.log").read_text("utf-8").splitlines()
    assert lines
    assert all(STAMP.match(ln) for ln in lines), lines
    joined = "\n".join(lines)
    for i in (5, 6, 7):
        assert f"Bước {i}/7" in joined
    assert "XONG" in joined and "LỖI ở Bước 6/7" in joined
    assert not (ROOT / "out" / "episodes" / SLUG).exists()
    assert not (ROOT / "episodes" / SLUG).exists()


BOX = "400:200:50:50"  # w:h:x:y, nằm trong vùng y < 830


def test_4_check_render_lai_doan_thi_ghep_lai_mp4_cuoi_khong_giu_doan_cu(repo):
    """Bước 7 render lại đoạn lệch ranh giới rồi GHÉP LẠI (giao diện bước 7, D26).

    Lượt 1 dừng ở bước 6 (chưa có mix.wav), còn đoạn đã render. Thay đoạn
    bằng bản chép có thêm khối trắng tĩnh ở góc: đúng số khung nên bước 5 bỏ
    qua (hash khớp), không có "mất hình" (khối không nhấp nháy) nên
    `assemble verify` ở bước 6 vẫn đạt, nhưng lượt hai (shift) khác ở khối
    đó. Bước 7 phải render lại đoạn, ghép lại, và MP4 cuối không còn khối.
    """
    slug = "zz-e2e2"
    out = seed(repo, slug)
    r = mk(repo, "--from", "render", slug=slug)
    assert r.returncode == 1 and "LỖI ở Bước 6/7" in r.stderr, r.stdout + r.stderr
    seg = out / "segments" / "seg-000.mp4"
    good = out / "good.mp4"
    shutil.copyfile(seg, good)
    ff("-i", good, "-vf", "drawbox=x=50:y=50:w=400:h=200:color=white:t=fill",
       "-c:v", "libx264", "-crf", 18, "-pix_fmt", "yuv420p", seg)
    assert video_frames(seg) == N
    # đo độc lập: khối có trong bản thay, không có trong bản thật
    assert min(region(seg, 40, BOX)) > 200
    assert max(region(good, 40, BOX)) < 150

    make_wav(out / "mix.wav", N / 30)
    r = mk(repo, "--from", "render", slug=slug)
    assert r.returncode == 0, r.stdout + r.stderr
    so = r.stdout
    assert "bỏ qua seg-000" in so  # bước 5 không render lại
    i6, i7 = so.index("== Bước 6/7:"), so.index("== Bước 7/7:")
    after7 = so[i7:]
    assert i6 < i7
    # bước 7 thấy lệch và render lại đoạn, rồi ghép lại
    assert re.search(r"lệch: khung \d+", after7), after7
    assert re.search(r"render lại.*seg-000", after7), after7
    assert "XONG" in so
    final = out / f"{slug}.mp4"
    assert final.is_file()
    assert video_frames(final) == N
    # MP4 cuối là bản ghép lại: không còn khối trắng của đoạn cũ
    assert max(region(final, 40, BOX)) < 150
    p = run_module("assemble", ["verify", slug, "--root", repo])
    assert p.returncode == 0, both(p)
    # dọn xong sau lượt kiểm cuối
    assert not (out / "segments").exists() and not (out / "mix.wav").exists()
