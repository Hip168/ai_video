"""[10-2] [10-3] `python -m aivideo.assemble`: concat, mux, verify, clean.

Giao diện: `.team/features/10-render-dai-giao-dien.md` mục 3. Đoạn mp4 và
mp4 tổng là clip ffmpeg thật (1920x1080, 30 fps); mọi số đo trong test lấy
từ ffprobe / ebur128 độc lập, không qua `assemble`.
"""

from __future__ import annotations

import json
import shutil
import subprocess

import pytest

from rd_support import (
    Root,
    atom_order,
    both,
    lufs_tp,
    make_clip,
    make_final,
    make_wav,
    run_module,
    streams,
    tree_bytes,
    video_frames,
)

N = 150  # 5 giây


def asm(cmd, root, *extra, env=None):
    return run_module("assemble", [cmd, *root.args(*extra)], env=env)


def out_json(r) -> dict:
    s = r.stdout
    return json.loads(s[s.index("{"):])


@pytest.fixture
def two_seg(tmp_path):
    r = Root(tmp_path)
    r.add_segment(60)
    r.add_segment(90)
    r.write_meta()
    return r


def md5_video(path) -> str:
    r = subprocess.run(
        ["ffmpeg", "-nostdin", "-loglevel", "error", "-i", str(path), "-map",
         "0:v:0", "-c", "copy", "-f", "md5", "-"],
        capture_output=True, text=True)
    assert r.returncode == 0, r.stderr
    return r.stdout.strip()


# ------------------------------------------------------------------ concat
def test_concat_ghep_hai_doan_thanh_video_silent_du_frame_khong_tieng(two_seg):
    r = asm("concat", two_seg)
    assert r.returncode == 0, both(r)
    f = two_seg.out / "video.silent.mp4"
    s = streams(f)
    assert video_frames(f) == 150
    assert (s["video"]["codec_name"], s["video"]["pix_fmt"]) == ("h264", "yuv420p")
    assert (s["video"]["width"], s["video"]["height"]) == (1920, 1080)
    assert "audio" not in s


def test_concat_giu_nguyen_du_lieu_doan_khong_ma_hoa_lai(two_seg):
    """`-c copy`: gói video của file ghép là gói của hai đoạn nối nhau."""
    assert asm("concat", two_seg).returncode == 0
    parts = [md5_video(two_seg.out / sg["file"]) for sg in two_seg.segs]
    joined = md5_video(two_seg.out / "video.silent.mp4")
    cat = two_seg.base / "cat.mp4"
    lst = two_seg.base / "l.txt"
    lst.write_text("".join(f"file '{two_seg.out / sg['file']}'\n"
                           for sg in two_seg.segs))
    subprocess.run(["ffmpeg", "-nostdin", "-loglevel", "error", "-y", "-f",
                    "concat", "-safe", "0", "-i", str(lst), "-c", "copy",
                    str(cat)], check=True)
    assert joined == md5_video(cat)
    assert len(set(parts)) == 2


def test_concat_tong_frame_khac_duration_in_frames_bi_tu_choi(tmp_path):
    r = Root(tmp_path)
    r.add_segment(60)
    r.add_segment(90)
    r.write_meta(duration=151)
    p = asm("concat", r)
    assert p.returncode == 1, both(p)
    assert "lỗi" in p.stderr
    assert not (r.out / "video.silent.mp4").exists()


def test_concat_doan_chua_done_bi_tu_choi(two_seg):
    two_seg.segs[1]["status"] = "pending"
    two_seg.write_manifest()
    p = asm("concat", two_seg)
    assert p.returncode == 1, both(p)
    assert "lỗi" in p.stderr
    assert not (two_seg.out / "video.silent.mp4").exists()


def test_concat_doan_mat_file_bi_tu_choi(two_seg):
    (two_seg.out / "segments" / "seg-000.mp4").unlink()
    p = asm("concat", two_seg)
    assert p.returncode == 1, both(p)
    assert "lỗi" in p.stderr
    assert not (two_seg.out / "video.silent.mp4").exists()


def test_concat_doan_thieu_frame_that_su_bi_tu_choi(two_seg):
    """Manifest nói 90 frame nhưng file chỉ có 80: phải dựa vào ffprobe."""
    make_clip(two_seg.out / "segments" / "seg-001.mp4", 80)
    p = asm("concat", two_seg)
    assert p.returncode == 1, both(p)
    assert "lỗi" in p.stderr
    assert not (two_seg.out / "video.silent.mp4").exists()


def test_concat_thieu_manifest_hoac_slug_la_bi_loi_ro(tmp_path):
    r = Root(tmp_path)
    r.add_segment(30)
    p = asm("concat", r)
    assert p.returncode == 1 and "lỗi" in p.stderr, both(p)
    p = run_module("assemble", ["concat", "khong-co", "--root", tmp_path])
    assert p.returncode == 1 and "lỗi" in p.stderr, both(p)


# --------------------------------------------------------------------- mux
def test_mux_ra_mp4_cuoi_h264_aac_faststart_video_khong_ma_hoa_lai(two_seg):
    assert asm("concat", two_seg).returncode == 0
    p = asm("mux", two_seg)
    assert p.returncode == 0, both(p)
    final = two_seg.out / "tap-thu.mp4"
    s = streams(final)
    assert video_frames(final) == N
    assert (s["video"]["codec_name"], s["video"]["pix_fmt"]) == ("h264", "yuv420p")
    assert s["audio"]["codec_name"] == "aac"
    assert md5_video(final) == md5_video(two_seg.out / "video.silent.mp4")
    names = atom_order(final)
    assert names.index("moov") < names.index("mdat")
    assert abs(float(s["audio"]["duration"]) - float(s["video"]["duration"])) <= 1 / 30


def test_mux_ghi_assembled_vao_manifest_giu_nguyen_phan_con_lai(two_seg):
    before = two_seg.manifest()
    assert asm("concat", two_seg).returncode == 0
    assert asm("mux", two_seg).returncode == 0
    m = two_seg.manifest()
    assert m["assembled"] == {"silent": "video.silent.mp4", "final": "tap-thu.mp4"}
    assert m["layouts"] == before["layouts"]
    assert m["durationInFrames"] == N


def test_mux_thieu_mix_wav_hoac_thieu_video_silent_bi_tu_choi(two_seg):
    assert asm("concat", two_seg).returncode == 0
    (two_seg.out / "mix.wav").unlink()
    p = asm("mux", two_seg)
    assert p.returncode == 1 and "lỗi" in p.stderr, both(p)
    assert not (two_seg.out / "tap-thu.mp4").exists()
    make_wav(two_seg.out / "mix.wav", 5)
    (two_seg.out / "video.silent.mp4").unlink()
    p = asm("mux", two_seg)
    assert p.returncode == 1 and "lỗi" in p.stderr, both(p)
    assert not (two_seg.out / "tap-thu.mp4").exists()


# -------------------------------------------------------------------- đĩa
@pytest.mark.parametrize("cmd", ["concat", "mux"])
def test_dia_duoi_6gb_khong_chay_concat_va_mux_ma_thoat_3(two_seg, cmd):
    if cmd == "mux":
        assert asm("concat", two_seg).returncode == 0
    target = two_seg.out / ("video.silent.mp4" if cmd == "concat" else "tap-thu.mp4")
    target.unlink(missing_ok=True)
    p = asm(cmd, two_seg, env={"AIVIDEO_FREE_GB": "5.9"})
    assert p.returncode == 3, both(p)
    assert "đĩa" in p.stderr
    assert not target.exists()


def test_dia_dung_6gb_van_chay_vi_chi_chan_khi_duoi_nguong(two_seg):
    p = asm("concat", two_seg, env={"AIVIDEO_FREE_GB": "6"})
    assert p.returncode == 0, both(p)
    assert (two_seg.out / "video.silent.mp4").exists()


def test_nguong_dia_doi_duoc_bang_aivideo_min_free_gb(two_seg):
    env = {"AIVIDEO_MIN_FREE_GB": "50"}
    p = asm("concat", two_seg, env={**env, "AIVIDEO_FREE_GB": "49.9"})
    assert p.returncode == 3, both(p)
    p = asm("concat", two_seg, env={**env, "AIVIDEO_FREE_GB": "50"})
    assert p.returncode == 0, both(p)


# ------------------------------------------------------------------ verify
def build_final(root: Root, *, video=None, wav=None, frames=N, acodec="aac",
                declared=N, wav_seconds=None, **clip_kw):
    """Dựng `<slug>.mp4` độc lập với assemble; timeline và manifest khai `declared`."""
    root.frames = declared
    root.segs = [{"id": "seg-000", "startFrame": 0, "endFrame": declared - 1,
                  "frames": declared, "file": "segments/seg-000.mp4",
                  "hash": "h", "status": "done", "attempts": 1, "bytes": 1}]
    root.write_meta(mix=False)
    v = video or make_clip(root.base / "v.mp4", frames, **clip_kw)
    w = wav
    if w is None and acodec is not None:
        w = make_wav(root.base / "w.wav",
                     wav_seconds if wav_seconds is not None else frames / 30)
    return make_final(root.out / "tap-thu.mp4", v, w, acodec=acodec or "aac")


@pytest.fixture
def good(tmp_path):
    r = Root(tmp_path)
    build_final(r)
    return r


def test_ban_mau_dung_that_su_dat_cac_so_do_cua_hop_dong(good):
    f = good.out / "tap-thu.mp4"
    s = streams(f)
    lufs, tp = lufs_tp(f)
    assert video_frames(f) == N
    assert (s["video"]["codec_name"], s["video"]["pix_fmt"]) == ("h264", "yuv420p")
    assert abs(lufs + 16) <= 1 and tp <= -1.0
    assert s["audio"]["codec_name"] == "aac"


def test_verify_mp4_dung_dat_ma_0_in_json_ok_true(good):
    p = asm("verify", good)
    assert p.returncode == 0, both(p)
    d = out_json(p)
    assert d["ok"] is True
    assert isinstance(d["checks"], dict) and len(d["checks"]) >= 5


def _wav(lufs=None, spike=False, secs=None):
    return lambda root: make_wav(root.base / "w.wav", secs or 5,
                                 lufs=-16 if lufs is None else lufs, spike=spike)


BAD = {
    "sai_do_phan_giai_720p": dict(size="1280x720"),
    "sai_fps_24": dict(fps=24, wav_seconds=150 / 24),
    "sai_pix_fmt_yuv444p": dict(pix_fmt="yuv444p"),
    "sai_codec_mpeg4": dict(vcodec="mpeg4"),
    "thua_1_frame": dict(frames=N + 1),
    "thieu_1_frame": dict(frames=N - 1),
    "khong_co_am_thanh": dict(acodec=None),
    "am_thanh_mp3_khong_phai_aac": dict(acodec="libmp3lame"),
    "to_qua_minus_14_5_lufs": dict(wav=_wav(lufs=-14.5)),
    "nho_qua_minus_17_5_lufs": dict(wav=_wav(lufs=-17.5)),
    "true_peak_vuot_ma_lufs_van_dat": dict(wav=_wav(spike=True)),
    "am_thanh_dai_hon_hinh_3_frame": dict(wav=_wav(secs=5.1)),
    "am_thanh_ngan_hon_hinh_3_frame": dict(wav=_wav(secs=4.9)),
    "doan_den_0_67_giay": dict(black=(60, 80)),
}


def _defect_real(name, f) -> bool:
    """Chứng minh bằng số đo độc lập rằng ca sai thật sự có lỗi nó nhắm tới."""
    s = streams(f)
    v = s["video"]
    if name == "sai_do_phan_giai_720p":
        return v["width"] == 1280
    if name == "sai_fps_24":
        return v["r_frame_rate"] == "24/1"
    if name == "sai_pix_fmt_yuv444p":
        return v["pix_fmt"] == "yuv444p"
    if name == "sai_codec_mpeg4":
        return v["codec_name"] == "mpeg4"
    if name in ("thua_1_frame", "thieu_1_frame"):
        return video_frames(f) != N
    if name == "khong_co_am_thanh":
        return "audio" not in s
    if name == "am_thanh_mp3_khong_phai_aac":
        return s["audio"]["codec_name"] == "mp3"
    if name.startswith("to_qua"):
        return lufs_tp(f)[0] > -15.2
    if name.startswith("nho_qua"):
        return lufs_tp(f)[0] < -16.8
    if name.startswith("true_peak"):
        lufs, tp = lufs_tp(f)
        return abs(lufs + 16) <= 1 and tp > -1.0
    if name.startswith("am_thanh_"):
        gap = abs(float(s["audio"]["duration"]) - float(v["duration"]))
        return gap >= 0.09
    if name.startswith("doan_den"):
        return True  # đen do drawbox phủ kín khung, dựng ở make_clip
    raise AssertionError(name)


@pytest.mark.parametrize("name", list(BAD))
def test_verify_bat_dung_mot_loi_moi_lan_va_ma_thoat_1(tmp_path, name):
    kw = dict(BAD[name])
    r = Root(tmp_path)
    if "wav" in kw:
        kw["wav"] = kw["wav"](r)
    build_final(r, **kw)
    assert _defect_real(name, r.out / "tap-thu.mp4")
    p = asm("verify", r)
    assert p.returncode == 1, both(p)
    d = out_json(p)
    assert d["ok"] is False


GOOD_EDGE = {
    "lufs_minus_16_6_trong_dung_sai": dict(wav=_wav(lufs=-16.6)),
    "lufs_minus_15_4_trong_dung_sai": dict(wav=_wav(lufs=-15.4)),
    "den_0_33_giay_duoi_nguong": dict(black=(60, 70)),
}


@pytest.mark.parametrize("name", list(GOOD_EDGE))
def test_verify_ca_bien_van_dat_khong_bao_gia(tmp_path, name):
    kw = dict(GOOD_EDGE[name])
    r = Root(tmp_path)
    if "wav" in kw:
        kw["wav"] = kw["wav"](r)
    build_final(r, **kw)
    p = asm("verify", r)
    assert p.returncode == 0, both(p)
    assert out_json(p)["ok"] is True


def test_verify_timeline_khai_so_frame_khac_file_thi_bi_bat(tmp_path):
    """Video đúng 150 nhưng timeline/manifest khai 151: đối chiếu với `durationInFrames`."""
    r = Root(tmp_path)
    build_final(r, declared=N + 1)
    p = asm("verify", r)
    assert p.returncode == 1, both(p)
    assert out_json(p)["ok"] is False


def test_verify_thieu_mp4_cuoi_bao_loi_ro_ma_1(tmp_path):
    r = Root(tmp_path)
    build_final(r)
    (r.out / "tap-thu.mp4").unlink()
    p = asm("verify", r)
    assert p.returncode == 1, both(p)


# ------------------------------------------------------------------- clean
REMOVED = ["segments", "segments-shift", "mix.wav", "mix.voice.wav",
           "mix.music.wav", "video.silent.mp4", "du.part.mp4"]
KEPT = ["tap-thu.mp4", "video.srt", "chapters.txt", "cache", "timeline.json",
        "narration.wav", "manifest.json", "render.log"]


def full_tree(tmp_path) -> Root:
    r = Root(tmp_path)
    build_final(r)
    (r.out / "segments" / "seg-000.mp4").write_bytes(b"x" * 300_000)
    (r.out / "segments-shift").mkdir()
    (r.out / "segments-shift" / "seg-000.mp4").write_bytes(b"y" * 200_000)
    for name, size in [("mix.wav", 400_000), ("mix.voice.wav", 100_000),
                       ("mix.music.wav", 100_000), ("video.silent.mp4", 250_000),
                       ("du.part.mp4", 50_000)]:
        (r.out / name).write_bytes(b"z" * size)
    (r.out / "video.srt").write_text("1\n00:00:00,000 --> 00:00:01,000\nA\n")
    (r.out / "chapters.txt").write_text("00:00 Mở đầu\n")
    (r.out / "narration.wav").write_bytes(b"n" * 80_000)
    (r.out / "render.log").write_text("2026-11-03 10:00:00 xong\n")
    (r.out / "cache").mkdir()
    (r.out / "cache" / "a.wav").write_bytes(b"c" * 60_000)
    return r


def snapshot(d):
    return {str(p.relative_to(d)): p.stat().st_size
            for p in sorted(d.rglob("*")) if p.is_file()}


def test_clean_xoa_dung_nhom_file_tam_va_giu_nhom_san_pham(tmp_path):
    r = full_tree(tmp_path)
    before = snapshot(r.out)
    p = asm("clean", r)
    assert p.returncode == 0, both(p)
    after = snapshot(r.out)
    for name in REMOVED:
        assert not (r.out / name).exists(), name
    for name in KEPT:
        assert (r.out / name).exists(), name
    assert set(after) <= set(before)
    assert not [k for k in after if k.startswith(("segments", "mix."))]
    assert "cache/a.wav" in after


def test_clean_freed_va_kept_dung_byte_trong_1_phan_tram(tmp_path):
    r = full_tree(tmp_path)
    before = tree_bytes(r.out)
    removed = sum(s for k, s in snapshot(r.out).items()
                  if k.startswith(("segments", "mix.", "video.silent")) or
                  k.endswith(".part.mp4"))
    p = asm("clean", r)
    assert p.returncode == 0, both(p)
    d = out_json(p)
    kept_real = tree_bytes(r.out)
    assert d["freed"] == pytest.approx(removed, rel=0.01)
    assert d["kept"] == pytest.approx(kept_real, rel=0.01)
    assert d["freed"] + d["kept"] == pytest.approx(before, rel=0.01)
    assert d["freed"] > 800_000


def test_clean_lan_hai_khong_con_gi_de_xoa(tmp_path):
    r = full_tree(tmp_path)
    assert asm("clean", r).returncode == 0
    kept = snapshot(r.out)
    p = asm("clean", r)
    assert p.returncode == 0, both(p)
    assert out_json(p)["freed"] == 0
    assert snapshot(r.out) == kept


def test_clean_khong_co_mp4_cuoi_thi_ma_1_va_khong_xoa_gi(tmp_path):
    r = full_tree(tmp_path)
    (r.out / "tap-thu.mp4").unlink()
    before = snapshot(r.out)
    p = asm("clean", r)
    assert p.returncode == 1, both(p)
    assert snapshot(r.out) == before


def test_clean_mp4_cuoi_khong_dat_verify_thi_ma_1_va_khong_xoa_gi(tmp_path):
    r = full_tree(tmp_path)
    build_final(r, wav=make_wav(r.base / "w2.wav", 5, lufs=-25))
    for name, size in [("mix.wav", 10), ("video.silent.mp4", 10)]:
        (r.out / name).write_bytes(b"z" * size)
    (r.out / "segments").mkdir(exist_ok=True)
    (r.out / "segments" / "seg-000.mp4").write_bytes(b"x")
    before = snapshot(r.out)
    p = asm("clean", r)
    assert p.returncode == 1, both(p)
    assert snapshot(r.out) == before


def test_clean_khong_dung_den_thu_muc_ngoai_out_cua_tap(tmp_path):
    r = full_tree(tmp_path)
    other = r.base / "out" / "episodes" / "tap-khac"
    other.mkdir(parents=True)
    (other / "mix.wav").write_bytes(b"keep")
    assert asm("clean", r).returncode == 0
    assert (other / "mix.wav").read_bytes() == b"keep"
    shutil.rmtree(other)
