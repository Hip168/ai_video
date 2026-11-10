"""[10-2] `python -m aivideo.framecheck scan|compare` trên video tổng hợp.

Giao diện: `.team/features/10-render-dai-giao-dien.md` mục 4. Video là khung
xám 1920x1080 30 fps: nền, 20 khối "phần tử" trong y < 830 (mỗi khối 1800
điểm ở nửa độ phân giải, tổng 36.000) và thanh phụ đề ở y >= 900.
"""

from __future__ import annotations

import json
import os
import shutil
import stat

import pytest

from rd_support import (
    RECTS,
    both,
    dip_video,
    draw_frame,
    frames_in,
    Root,
    make_timeline,
    run_module,
    video_frames,
    write_video,
)

N = 40
SPIKE = "đột biến:"
DIFF = "lệch:"


def scan(video, *extra):
    return run_module("framecheck", ["scan", video, *extra])


def compare(a, b, *extra):
    return run_module("framecheck", ["compare", a, b, *extra])


@pytest.fixture(scope="module")
def vids(tmp_path_factory):
    d = tmp_path_factory.mktemp("fc")
    v = {"dir": d}
    v["sach"] = dip_video(d / "sach.mp4", N, {})
    v["mat_1_khoi_o_20"] = dip_video(d / "mat1.mp4", N, {20: dict(missing=(7,))})
    v["mat_3_khoi_o_20"] = dip_video(
        d / "mat3.mp4", N, {20: dict(missing=(1, 2, 3))})
    v["mat_toan_bo_o_20_21"] = dip_video(
        d / "mat2f.mp4", N, {20: dict(missing=tuple(range(20))),
                             21: dict(missing=tuple(range(20)))})
    v["mat_keo_dai_8_khung"] = dip_video(
        d / "mat8.mp4", N, {i: dict(missing=(1, 2, 3, 4)) for i in range(15, 23)})
    v["phu_de_mat_o_20"] = dip_video(
        d / "pd.mp4", N, {20: dict(subtitle_missing=True)})
    v["mat_o_khung_1"] = dip_video(d / "k1.mp4", N, {1: dict(missing=(1, 2, 3))})
    return v


def test_video_tong_hop_dung_nhu_mo_ta(vids):
    for k in ("sach", "mat_1_khoi_o_20", "phu_de_mat_o_20"):
        assert video_frames(vids[k]) == N
    a, b = draw_frame(), draw_frame(missing=(1, 2, 3))
    assert float((abs(a - b) > 40)[:830].sum()) == 3 * 120 * 60
    assert float((abs(a - draw_frame(subtitle_missing=True)) > 40)[:830].sum()) == 0
    assert all(y + h < 830 for _, y, _, h in RECTS)


# -------------------------------------------------------------------- scan
def test_scan_video_sach_ma_0_khong_bao_dot_bien(vids):
    r = scan(vids["sach"])
    assert r.returncode == 0, both(r)
    assert SPIKE not in both(r)


@pytest.mark.parametrize("key", ["mat_1_khoi_o_20", "mat_3_khoi_o_20"])
def test_scan_bao_dung_khung_mat_phan_tu_mot_khung(vids, key):
    r = scan(vids[key])
    assert r.returncode == 1, both(r)
    assert frames_in(both(r), SPIKE) == [20]


def test_scan_mat_toan_bo_hai_khung_roi_hoi_van_bi_bat(vids):
    r = scan(vids["mat_toan_bo_o_20_21"])
    assert r.returncode == 1, both(r)
    got = frames_in(both(r), SPIKE)
    assert got and set(got) <= {20, 21} and 20 in got


def test_scan_start_cong_vao_so_khung_in_ra_mau_tu_frame_1315(vids):
    """Lỗi D14: mất phần tử ở frame 1315. Đoạn bắt đầu 1310, lỗi ở khung 5 của đoạn."""
    vid = dip_video(vids["dir"] / "d14.mp4", N, {5: dict(missing=(1, 2, 3))})
    r = scan(vid, "--start", 1310)
    assert r.returncode == 1, both(r)
    assert frames_in(both(r), SPIKE) == [1315]


def test_hai_ban_giong_het_cung_mat_phan_tu_compare_khong_thay_scan_thay(vids):
    """Ca D14 cũ: so hai lần render không bắt được vì cả hai cùng mất."""
    a = dip_video(vids["dir"] / "a1.mp4", N, {5: dict(missing=(1, 2, 3))})
    b = vids["dir"] / "a2.mp4"
    shutil.copyfile(a, b)
    assert a.read_bytes() == b.read_bytes()
    c = compare(a, b)
    assert c.returncode == 0, both(c)
    assert DIFF not in both(c)
    for v in (a, b):
        s = scan(v, "--start", 1310)
        assert s.returncode == 1, both(s)
        assert frames_in(both(s), SPIKE) == [1315]


def test_scan_mat_keo_dai_8_khung_khong_phai_nhay_hinh_nen_khong_bao(vids):
    """Tụt kéo dài không hồi trong 2 khung là đổi nội dung, không phải mất hình."""
    r = scan(vids["mat_keo_dai_8_khung"])
    assert SPIKE not in both(r), both(r)
    assert r.returncode == 0, both(r)


def test_scan_chi_xet_vung_y_duoi_830_mat_phu_de_khong_bao(vids):
    r = scan(vids["phu_de_mat_o_20"])
    assert r.returncode == 0, both(r)
    assert SPIKE not in both(r)


def test_scan_tut_duoi_nguong_4_phan_tram_khong_bao(vids):
    """Bỏ một khối 60x20 (300 điểm, 0,8% của 36.000): dưới ngưỡng."""
    a = draw_frame(extra=())
    small = a.copy()
    small[80:100, 60:120] = 24  # một góc 60x20 của khối đầu tiên
    vid = write_video(
        vids["dir"] / "nho2.mp4",
        [small if i == 20 else a for i in range(N)])
    r = scan(vid)
    assert r.returncode == 0, both(r)
    assert SPIKE not in both(r)


def test_scan_loi_o_khung_so_1_van_bi_bat(vids):
    r = scan(vids["mat_o_khung_1"])
    assert r.returncode == 1, both(r)
    assert frames_in(both(r), SPIKE) == [1]


def _timeline(d, starts, total):
    t = make_timeline(total)
    base = t["scenes"][0]
    t["scenes"] = []
    for i, st in enumerate(starts):
        end = starts[i + 1] if i + 1 < len(starts) else total
        t["scenes"].append({**base, "id": f"sc{i}", "startFrame": st,
                            "durationFrames": end - st})
    p = d / "tl.json"
    p.write_text(json.dumps(t), "utf-8")
    return p


def test_scan_bo_qua_khung_sat_dau_canh_khi_co_timeline(tmp_path):
    """Cảnh mới bắt đầu ở khung 30; nháy ở khung 33 nằm trong vùng bỏ qua."""
    near = dip_video(tmp_path / "gan.mp4", 100, {33: dict(missing=(1, 2, 3))})
    far = dip_video(tmp_path / "xa.mp4", 100, {70: dict(missing=(1, 2, 3))})
    tl = _timeline(tmp_path, [0, 30], 100)
    r = scan(near, "--timeline", tl)
    assert r.returncode == 0, both(r)
    assert SPIKE not in both(r)
    r = scan(near)  # không timeline: vẫn là lỗi
    assert r.returncode == 1 and frames_in(both(r), SPIKE) == [33]
    r = scan(far, "--timeline", tl)  # xa đầu và cuối cảnh: vẫn báo
    assert r.returncode == 1, both(r)
    assert frames_in(both(r), SPIKE) == [70]


def _timeline_tuyet_doi(d, starts, total):
    """Timeline không beat, cảnh bắt đầu ở các khung tuyệt đối `starts`."""
    t = make_timeline(total)
    base = {**t["scenes"][0], "beats": []}
    t["scenes"] = [
        {**base, "id": f"sc{i}", "startFrame": st,
         "durationFrames": (starts[i + 1] if i + 1 < len(starts) else total) - st}
        for i, st in enumerate(starts)]
    p = d / "tl-abs.json"
    p.write_text(json.dumps(t), "utf-8")
    return p


def test_scan_start_voi_timeline_bo_qua_theo_khung_tuyet_doi_bao_so_tuyet_doi(
        tmp_path):
    """`--start 1310` + `--timeline`: đoạn 100 khung là khung tuyệt đối 1310..1409.

    Cảnh mới bắt đầu ở 1340 (cục bộ 30). Nháy ở cục bộ 31 (tuyệt đối 1341)
    nằm sát đầu cảnh: bị bỏ qua. Nháy ở cục bộ 70 (tuyệt đối 1380) xa đầu và
    cuối cảnh: báo đúng 1380, không phải 70. Không có timeline thì cả hai đều
    là lỗi, kèm số tuyệt đối.
    """
    near = dip_video(tmp_path / "gan.mp4", 100, {31: dict(missing=(1, 2, 3))})
    far = dip_video(tmp_path / "xa.mp4", 100, {70: dict(missing=(1, 2, 3))})
    tl = _timeline_tuyet_doi(tmp_path, [0, 1340], 1410)
    r = scan(near, "--start", 1310, "--timeline", tl)
    assert r.returncode == 0, both(r)
    assert SPIKE not in both(r)
    r = scan(near, "--start", 1310)
    assert r.returncode == 1, both(r)
    assert frames_in(both(r), SPIKE) == [1341]
    r = scan(far, "--start", 1310, "--timeline", tl)
    assert r.returncode == 1, both(r)
    assert frames_in(both(r), SPIKE) == [1380]


def test_scan_start_khung_cuc_bo_trung_vung_bo_qua_tuyet_doi_van_bi_bat(tmp_path):
    """Cục bộ 31 chỉ trùng vùng bỏ qua nếu hiểu nhầm là tuyệt đối (cảnh ở 30).

    Timeline: cảnh bắt đầu ở tuyệt đối 30 (vùng bỏ qua 28..41). Đoạn bắt
    đầu ở 1310: nháy ở cục bộ 31 là tuyệt đối 1341, KHÔNG nằm trong vùng bỏ
    qua nào, nên phải báo 1341.
    """
    v = dip_video(tmp_path / "v.mp4", 100, {31: dict(missing=(1, 2, 3))})
    tl = _timeline_tuyet_doi(tmp_path, [0, 30], 1410)
    r = scan(v, "--start", 1310, "--timeline", tl)
    assert r.returncode == 1, both(r)
    assert frames_in(both(r), SPIKE) == [1341]


# ----------------------------------------------------------------- compare
def test_compare_hai_video_giong_nhau_ma_0_khong_bao_lech(vids):
    r = compare(vids["sach"], vids["sach"])
    assert r.returncode == 0, both(r)
    assert DIFF not in both(r)


def test_compare_bao_dung_khung_khi_mot_ben_thieu_vung_lien_khoi(vids):
    r = compare(vids["sach"], vids["mat_3_khoi_o_20"])
    assert r.returncode == 1, both(r)
    assert frames_in(both(r), DIFF) == [20]


def test_compare_lech_nua_diem_anh_o_chu_khong_bao_sai(tmp_path):
    a = write_video(tmp_path / "a.mp4", N, fn=lambda i: draw_frame(strokes_dx=0.0))
    b = write_video(tmp_path / "b.mp4", N, fn=lambda i: draw_frame(strokes_dx=0.5))
    x = draw_frame(strokes_dx=0.0)
    y = draw_frame(strokes_dx=0.5)
    # nét mảnh thật sự khác nhau ở độ phân giải đầy đủ (chứng minh ca có ý nghĩa)
    assert float((abs(x - y) > 40)[:830].sum()) > 300
    r = compare(a, b)
    assert r.returncode == 0, both(r)
    assert DIFF not in both(r)


def test_compare_vet_nho_5x5_nua_do_phan_giai_khong_bao_vet_lon_thi_bao(tmp_path):
    base = draw_frame()
    speck = base.copy()
    speck[300:310, 1000:1010] = 220  # 10x10 đầy đủ = 5x5 nửa độ phân giải
    blob = base.copy()
    blob[300:324, 1000:1024] = 220  # 24x24 đầy đủ = 12x12 nửa độ phân giải
    a = write_video(tmp_path / "a.mp4", [base] * 10)
    s = write_video(tmp_path / "s.mp4", [speck if i == 4 else base for i in range(10)])
    b = write_video(tmp_path / "b.mp4", [blob if i == 4 else base for i in range(10)])
    r = compare(a, s)
    assert r.returncode == 0 and DIFF not in both(r), both(r)
    r = compare(a, b)
    assert r.returncode == 1, both(r)
    assert frames_in(both(r), DIFF) == [4]


def test_compare_bo_qua_chenh_lech_o_vung_phu_de(tmp_path, vids):
    r = compare(vids["sach"], vids["phu_de_mat_o_20"])
    assert r.returncode == 0, both(r)
    assert DIFF not in both(r)


def test_compare_start_a_start_b_count_so_lech_pha(tmp_path):
    f = [draw_frame(missing=(i % 4,)) for i in range(12)]
    a = write_video(tmp_path / "a.mp4", f)
    b = write_video(tmp_path / "b.mp4", f[5:])
    ok = compare(a, b, "--start-a", 5, "--start-b", 0, "--count", 7)
    assert ok.returncode == 0, both(ok)
    bad = compare(a, b, "--start-a", 0, "--start-b", 0, "--count", 7)
    assert bad.returncode == 1, both(bad)
    assert frames_in(both(bad), DIFF)


def test_compare_count_gioi_han_so_khung_duoc_so(tmp_path, vids):
    r = compare(vids["sach"], vids["mat_3_khoi_o_20"], "--count", 10)
    assert r.returncode == 0, both(r)
    r = compare(vids["sach"], vids["mat_3_khoi_o_20"], "--count", 21)
    assert r.returncode == 1 and frames_in(both(r), DIFF) == [20], both(r)


def test_scan_file_khong_co_la_loi_du_lieu_ma_1_khong_phai_sach(tmp_path):
    r = scan(tmp_path / "khong-co.mp4")
    assert r.returncode == 1, both(r)
    assert r.stderr.strip()


def test_scan_file_khong_phai_video_la_loi_du_lieu_ma_1(tmp_path):
    f = tmp_path / "hong.mp4"
    f.write_bytes(b"khong phai video")
    r = scan(f)
    assert r.returncode == 1, both(r)


def test_compare_file_khong_co_la_loi_du_lieu_ma_1(tmp_path, vids):
    r = compare(vids["sach"], tmp_path / "khong-co.mp4")
    assert r.returncode == 1, both(r)
    assert r.stderr.strip()


def test_framecheck_thieu_tham_so_ma_2():
    assert run_module("framecheck", ["scan"]).returncode == 2
    assert run_module("framecheck", ["compare", "a.mp4"]).returncode == 2


# ----------------------------------------------------------------- verify
def _fake_npx(bin_dir, calls):
    """`npx` giả: ghi tham số vào `calls`, không render gì, thoát 0."""
    bin_dir.mkdir()
    f = bin_dir / "npx"
    f.write_text(f"#!/bin/sh\necho \"$@\" >> '{calls}'\nexit 0\n")
    f.chmod(f.stat().st_mode | stat.S_IEXEC)


def test_verify_doan_hong_mai_sau_3_lan_render_lai_in_loi_khung_va_ma_1(tmp_path):
    """Render lại không sửa được: đúng 3 lần `--redo seg-000`, rồi `LỖI: khung 20`, mã 1."""
    r = Root(tmp_path / "root")
    clip = dip_video(r.out / "segments" / "seg-000.mp4", N,
                     {20: dict(missing=(1, 2, 3))})
    assert video_frames(clip) == N
    r.frames = N
    r.segs = [{"id": "seg-000", "startFrame": 0, "endFrame": N - 1,
               "frames": N, "file": "segments/seg-000.mp4", "hash": "h",
               "status": "done", "attempts": 1, "bytes": 1}]
    r.write_meta(mix=False)
    calls = tmp_path / "calls.txt"
    calls.write_text("")
    _fake_npx(tmp_path / "bin", calls)
    env = {"PATH": f"{tmp_path / 'bin'}{os.pathsep}{os.environ['PATH']}"}
    p = run_module("framecheck", ["verify", *r.args()], env=env)
    assert p.returncode == 1, both(p)
    assert "ĐẠT" not in both(p)
    assert any(ln.startswith("LỖI: khung 20") for ln in p.stderr.splitlines()), (
        p.stderr)
    runs = calls.read_text().splitlines()
    assert len(runs) == 3, runs
    for ln in runs:
        assert "scripts/render-episode.ts" in ln
        assert "--redo seg-000" in ln
        assert "--layout main" in ln
    # 1 lần quét đầu + 1 lần sau mỗi lần render lại
    assert frames_in(p.stdout, "đột biến (main):") == [20] * 4
    assert p.stdout.count("render lại") == 3
