"""[14-3] `assemble` và `framecheck verify` với `--short <n>`.

Giao diện: `.team/features/14-shorts-giao-dien.md` mục 6 (D32). `<out>` =
`out/episodes/<slug>`, `<sout>` = `<out>/shorts/<n>`. Short ra
`<out>/<slug>-short-<n>.mp4`; manifest, `segments/`, `segments-shift/` nằm
trong `<sout>`. Định dạng manifest giống đề mục 10. Clip và wav là ffmpeg
thật; mọi số đo lấy độc lập (ffprobe), không qua `assemble`.
"""

from __future__ import annotations

import json
import os
import shutil
import stat
import subprocess

import numpy as np
import pytest

from rd_support import (
    BG, FG, FPS, RECTS, both, make_clip, make_final, make_timeline, make_wav,
    run_module, streams, video_frames,
)

pytestmark = pytest.mark.skipif(
    not shutil.which("ffmpeg"), reason="cần ffmpeg")

SLUG = "tap-thu"
SIZE = "1080x1920"
N = 150  # 5 giây


class ShortRoot:
    """Cây `out/episodes/<slug>` giả cho Short số `n`."""

    def __init__(self, base, n=1, slug=SLUG):
        self.base, self.n, self.slug = base, n, slug
        self.out = base / "out" / "episodes" / slug
        self.sout = self.out / "shorts" / str(n)
        (self.sout / "segments").mkdir(parents=True)
        self.segs: list[dict] = []
        self.frames = 0

    def add_segment(self, frames, **kw):
        i = len(self.segs)
        rel = f"segments/seg-{i:03d}.mp4"
        make_clip(self.sout / rel, frames, size=SIZE, **kw)
        self.segs.append({
            "id": f"seg-{i:03d}", "startFrame": self.frames,
            "endFrame": self.frames + frames - 1, "frames": frames,
            "file": rel, "hash": f"h{i}", "status": "done", "attempts": 1,
            "bytes": (self.sout / rel).stat().st_size})
        self.frames += frames

    def write_meta(self, *, wav_seconds=None, lufs=-16.0):
        m = {"version": 1, "slug": self.slug, "fps": FPS,
             "durationInFrames": self.frames, "srcHash": "s" * 64,
             "layouts": {"main": self.segs}}
        (self.sout / "manifest.json").write_text(json.dumps(m), "utf-8")
        make_wav(self.sout / "mix.wav",
                 wav_seconds if wav_seconds is not None else self.frames / FPS,
                 lufs=lufs)

    @property
    def final(self):
        return self.out / f"{self.slug}-short-{self.n}.mp4"

    def args(self, *extra):
        return [self.slug, "--root", self.base, "--short", self.n, *extra]


def asm(cmd, root, *extra):
    return run_module("assemble", [cmd, *root.args(*extra)])


def ready(tmp_path, frames=N, *, lufs=-16.0, size=SIZE, black=None):
    """Short đã có mp4 cuối đạt chuẩn (1080x1920, có tiếng)."""
    r = ShortRoot(tmp_path)
    r.add_segment(frames)
    r.write_meta(lufs=lufs)
    clip = make_clip(tmp_path / "v.mp4", frames, size=size, black=black)
    make_final(r.final, clip, r.sout / "mix.wav")
    return r


# ------------------------------------------------------------------ concat
def test_concat_short_ghep_vao_sout_dung_frame_1080x1920_khong_tieng(tmp_path):
    r = ShortRoot(tmp_path)
    r.add_segment(60)
    r.add_segment(90)
    r.write_meta()
    p = asm("concat", r)
    assert p.returncode == 0, both(p)
    f = r.sout / "video.silent.mp4"
    s = streams(f)
    assert video_frames(f) == 150
    assert (s["video"]["width"], s["video"]["height"]) == (1080, 1920)
    assert "audio" not in s
    assert not (r.out / "video.silent.mp4").exists()


def test_concat_short_doan_thieu_frame_ma_1(tmp_path):
    r = ShortRoot(tmp_path)
    r.add_segment(60)
    r.segs[0]["frames"] = 61
    r.write_meta()
    p = asm("concat", r)
    assert p.returncode == 1, both(p)
    assert p.stderr.startswith("lỗi:")


# ------------------------------------------------------------------ mux
def test_mux_short_ra_slug_short_n_mp4_co_hinh_dung_kich_thuoc_va_tieng_aac(
        tmp_path):
    r = ShortRoot(tmp_path)
    r.add_segment(N)
    r.write_meta()
    assert asm("concat", r).returncode == 0
    p = asm("mux", r)
    assert p.returncode == 0, both(p)
    s = streams(r.final)
    assert (s["video"]["width"], s["video"]["height"]) == (1080, 1920)
    assert s["audio"]["codec_name"] == "aac"
    assert video_frames(r.final) == N
    assert not (r.out / f"{SLUG}.mp4").exists()


# ------------------------------------------------------------------ verify
def test_verify_short_dat_voi_1080x1920_duoi_60s_dung_loudness(tmp_path):
    r = ready(tmp_path)
    s = streams(r.final)
    assert (s["video"]["width"], s["video"]["height"]) == (1080, 1920)
    p = asm("verify", r)
    assert p.returncode == 0, both(p)
    out = json.loads(p.stdout[p.stdout.index("{"):])
    assert out["ok"] is True


def test_verify_short_doi_1080x1920_khung_ngang_1920x1080_bi_tu_choi(tmp_path):
    r = ready(tmp_path, size="1920x1080")
    s = streams(r.final)
    assert (s["video"]["width"], s["video"]["height"]) == (1920, 1080)
    p = asm("verify", r)
    assert p.returncode == 1, both(p)
    assert "1080x1920" in p.stderr


def test_verify_short_61_giay_van_dat_vi_gioi_han_la_180_giay(tmp_path):
    r = ready(tmp_path, frames=61 * FPS)
    s = streams(r.final)
    assert (s["video"]["width"], s["video"]["height"]) == (1080, 1920)
    assert float(s["format"]["duration"]) > 60
    p = asm("verify", r)
    assert p.returncode == 0, both(p)


def test_verify_short_tren_180_giay_bi_tu_choi_con_lai_deu_dat(tmp_path):
    r = ready(tmp_path, frames=181 * FPS)
    s = streams(r.final)
    assert (s["video"]["width"], s["video"]["height"]) == (1080, 1920)
    assert float(s["format"]["duration"]) > 180
    p = asm("verify", r)
    assert p.returncode == 1, both(p)
    assert "180" in p.stderr


def test_verify_short_loudness_lech_nguong_nhu_video_dai_bi_tu_choi(tmp_path):
    r = ready(tmp_path, lufs=-25.0)
    p = asm("verify", r)
    assert p.returncode == 1, both(p)
    assert "LUFS" in p.stderr


def test_verify_short_doan_den_lien_bi_bao_mat_hinh(tmp_path):
    r = ready(tmp_path, black=(30, 90))
    p = asm("verify", r)
    assert p.returncode == 1, both(p)
    assert "đen" in p.stderr


def test_verify_short_khong_co_mp4_cua_short_ma_1_du_co_mp4_cua_tap_dai(
        tmp_path):
    r = ShortRoot(tmp_path)
    r.add_segment(N)
    r.write_meta()
    clip = make_clip(tmp_path / "v.mp4", N, size=SIZE)
    make_final(r.out / f"{SLUG}.mp4", clip, r.sout / "mix.wav")
    p = asm("verify", r)
    assert p.returncode == 1, both(p)
    assert p.stderr.startswith("lỗi:")


# ------------------------------------------------------------------ clean
def test_clean_short_khong_co_mp4_cua_short_ma_1_va_khong_xoa_gi(tmp_path):
    r = ShortRoot(tmp_path)
    r.add_segment(N)
    r.write_meta()
    before = sorted(str(q) for q in r.out.rglob("*"))
    p = asm("clean", r)
    assert p.returncode == 1, both(p)
    assert sorted(str(q) for q in r.out.rglob("*")) == before


def test_clean_short_giu_mp4_cua_short_va_khong_dung_vao_file_cua_tap_dai(
        tmp_path):
    r = ready(tmp_path)
    (r.out / "segments").mkdir()
    (r.out / "segments" / "seg-000.mp4").write_bytes(b"dai")
    (r.out / "mix.wav").write_bytes(b"dai")
    (r.out / f"{SLUG}.mp4").write_bytes(b"dai")
    p = asm("clean", r)
    assert p.returncode == 0, both(p)
    assert r.final.is_file()
    assert (r.out / "segments" / "seg-000.mp4").read_bytes() == b"dai"
    assert (r.out / "mix.wav").read_bytes() == b"dai"
    assert (r.out / f"{SLUG}.mp4").read_bytes() == b"dai"


def test_assemble_short_chi_nhan_so_tu_1_den_8(tmp_path):
    r = ready(tmp_path)
    ok = run_module("assemble", ["verify", SLUG, "--root", tmp_path,
                                 "--short", "1"])
    assert ok.returncode == 0, both(ok)
    for n in ("0", "9", "x"):
        p = run_module("assemble", ["verify", SLUG, "--root", tmp_path,
                                    "--short", n])
        assert p.returncode != 0, both(p)


# ------------------------------------------------------------------ framecheck
BOX_X0, BOX_Y0 = 48, 468  # hộp cảnh 984x984, toàn màn hình (chế độ xem sạch)


def short_frame(missing=()) -> np.ndarray:
    """Khung xám 1080x1920: 20 khối 120x60 (như RECTS) nằm trong hộp cảnh."""
    f = np.full((1920, 1080), BG, dtype=np.float32)
    for i, (_, _, w, h) in enumerate(RECTS):
        if i in missing:
            continue
        x = BOX_X0 + 22 + (i % 5) * 160
        y = BOX_Y0 + 30 + (i // 5) * 180
        f[y:y + h, x:x + w] = FG
    f[1500:1570, 100:800] = FG  # thanh phụ đề trong y 1472..1602
    return f


def write_short_video(path, n, dips):
    cache = {}
    p = subprocess.Popen(
        ["ffmpeg", "-hide_banner", "-nostdin", "-y", "-loglevel", "error",
         "-f", "rawvideo", "-pix_fmt", "gray", "-s", SIZE, "-r", str(FPS),
         "-i", "-", "-c:v", "libx264", "-crf", "10", "-preset", "veryfast",
         "-pix_fmt", "yuv420p", str(path)],
        stdin=subprocess.PIPE, stderr=subprocess.PIPE)
    for i in range(n):
        key = tuple(dips.get(i, ()))
        if key not in cache:
            cache[key] = np.clip(np.rint(short_frame(key)), 0, 255).astype(
                np.uint8).tobytes()
        p.stdin.write(cache[key])
    p.stdin.close()
    err = p.stderr.read().decode()
    assert p.wait() == 0, err


def fake_npx(bin_dir, calls):
    bin_dir.mkdir()
    f = bin_dir / "npx"
    f.write_text(f"#!/bin/sh\necho \"$@\" >> '{calls}'\nexit 0\n")
    f.chmod(f.stat().st_mode | stat.S_IEXEC)


def fc_root(tmp_path, dips):
    """Short có main và shift là hai bản chép của cùng một video."""
    r = ShortRoot(tmp_path / "root")
    (r.sout / "segments-shift").mkdir()
    n = 40
    write_short_video(r.sout / "segments" / "seg-000.mp4", n, dips)
    shutil.copyfile(r.sout / "segments" / "seg-000.mp4",
                    r.sout / "segments-shift" / "seg-000.mp4")
    seg = {"id": "seg-000", "startFrame": 0, "endFrame": n - 1, "frames": n,
           "file": "segments/seg-000.mp4", "hash": "h", "status": "done",
           "attempts": 1, "bytes": 1}
    shift = {**seg, "file": "segments-shift/seg-000.mp4"}
    m = {"version": 1, "slug": SLUG, "fps": FPS, "durationInFrames": n,
         "srcHash": "s" * 64, "layouts": {"main": [seg], "shift": [shift]}}
    (r.sout / "manifest.json").write_text(json.dumps(m), "utf-8")
    tl = json.dumps(make_timeline(n), ensure_ascii=False)
    (r.sout / "timeline.json").write_text(tl, "utf-8")
    (r.out / "timeline.json").write_text(tl, "utf-8")
    return r


def fc_env(tmp_path):
    calls = tmp_path / "calls.txt"
    calls.write_text("")
    fake_npx(tmp_path / "bin", calls)
    return calls, {"PATH": f"{tmp_path / 'bin'}{os.pathsep}{os.environ['PATH']}"}


def test_framecheck_verify_short_video_sach_ma_0_va_moi_lan_render_co_short_n(
        tmp_path):
    r = fc_root(tmp_path, {})
    calls, env = fc_env(tmp_path)
    p = run_module("framecheck", ["verify", SLUG, "--root", r.base,
                                  "--short", "1"], env=env)
    assert p.returncode == 0, both(p)
    runs = calls.read_text().splitlines()
    assert runs, "phải render lượt shift"
    for ln in runs:
        assert "scripts/render-episode.ts" in ln
        assert "--short 1" in ln
    assert any("--layout shift" in ln for ln in runs)


def test_framecheck_verify_short_mat_hinh_trong_hop_canh_ma_1_render_lai_3_lan(
        tmp_path):
    r = fc_root(tmp_path, {20: (1, 2, 3)})
    calls, env = fc_env(tmp_path)
    p = run_module("framecheck", ["verify", SLUG, "--root", r.base,
                                  "--short", "1"], env=env)
    assert p.returncode == 1, both(p)
    assert any(ln.startswith("LỖI: khung 20")
               for ln in p.stderr.splitlines()), p.stderr
    runs = calls.read_text().splitlines()
    assert len(runs) == 3, runs
    for ln in runs:
        assert "--short 1" in ln
        assert "--redo seg-000" in ln
        assert "--layout main" in ln


def test_framecheck_verify_khong_co_short_van_nhu_cu_khong_doc_sout(tmp_path):
    """Không cờ `--short`: đọc manifest của tập dài, không phải của Short."""
    r = fc_root(tmp_path, {})
    calls, env = fc_env(tmp_path)
    p = run_module("framecheck", ["verify", SLUG, "--root", r.base], env=env)
    assert p.returncode == 1, both(p)
    assert "--short" not in calls.read_text()
