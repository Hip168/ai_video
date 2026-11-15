"""[14-3] `python -m aivideo.shorts validate|export <slug>`.

Giao diện: `.team/features/14-shorts-giao-dien.md` mục 5 và 7 (D33). Cây
giả: `<gốc>/episodes/<slug>/shorts.json`, `<gốc>/out/episodes/<slug>/`
(`timeline.json`, `<slug>-short-<k>.mp4`). Nhận `--root` giống `assemble` và
`framecheck` (giả định: tài liệu chưa ghi tên tuỳ chọn).
Luật kiểm (D33): 1 <= N <= 8; part = i, total = N; from là beat đầu của
cảnh, to là beat cuối của cảnh; các phần theo thứ tự, không chồng; mỗi phần
<= 5400 frame; hook 1..40 ký tự; `title + " (Phần k/N) #Shorts"` <= 100.
Các phần KHÔNG cần phủ kín tập.
"""

from __future__ import annotations

import copy
import json
from pathlib import Path

import pytest

from rd_support import SAMPLE2, both, run_module

SLUG = "tap-thu"


def beat(i, start, dur):
    return {"id": f"b{i:03d}", "startFrame": start, "durationFrames": dur,
            "text": f"Lời {i}."}


def make_tl(plan):
    """plan: danh sách số frame mỗi cảnh; cảnh có 2 beat chia đôi, 0 beat nếu
    frame âm (cảnh tiêu đề chương, dùng |frame|). Trả (timeline, beats_theo_cảnh)."""
    t = json.loads(SAMPLE2.read_text("utf-8"))
    base, chap = t["scenes"][0], t["scenes"][1]
    scenes, ids, pos, n = [], [], 0, 0
    for k, fr in enumerate(plan):
        sc = copy.deepcopy(chap if fr < 0 else base)
        fr = abs(fr)
        sc.update(id=f"sc{k:02d}", chapter="mo-dau", startFrame=pos,
                  durationFrames=fr)
        if chap is not None and sc["type"] != "chapter-title":
            h = fr // 2
            n += 2
            sc["beats"] = [beat(n - 1, pos, h - 1), beat(n, pos + h, fr - h - 1)]
            ids.append((f"b{n - 1:03d}", f"b{n:03d}"))
        else:
            sc["beats"] = []
            ids.append(None)
        scenes.append(sc)
        pos += fr
    t["scenes"] = scenes
    t["chapters"] = [{"id": "mo-dau", "title": "Mở đầu", "startFrame": 0}]
    t["durationInFrames"] = pos
    t["sfx"] = []
    return t, ids


def entry(part, total, frm, to, title="Tiêu đề", hook="Móc"):
    return {"part": part, "total": total, "from": frm, "to": to,
            "title": title, "hook": hook}


class Env:
    def __init__(self, tmp_path, plan=(600, 600, 600, 600, 600, 600)):
        self.root = tmp_path / "repo"
        self.ep = self.root / "episodes" / SLUG
        self.out = self.root / "out" / "episodes" / SLUG
        self.ep.mkdir(parents=True, exist_ok=True)
        self.out.mkdir(parents=True, exist_ok=True)
        self.tl, self.ids = make_tl(plan)
        (self.out / "timeline.json").write_text(
            json.dumps(self.tl, ensure_ascii=False), "utf-8")
        # Số tập = thứ tự trong episodes/index.json (D35): tập thử là tập 2.
        (self.root / "episodes" / "index.json").write_text(
            json.dumps([{"slug": "tap-khac"}, {"slug": SLUG}]), "utf-8")

    def shorts(self, items):
        (self.ep / "shorts.json").write_text(
            json.dumps({"version": 1, "shorts": items}, ensure_ascii=False),
            "utf-8")

    def cli(self, cmd, *extra):
        return run_module("shorts", [cmd, SLUG, "--root", self.root, *extra])

    def parts(self, spans, **kw):
        """spans: [(cảnh đầu, cảnh cuối)] theo chỉ số cảnh -> mục shorts.json."""
        n = len(spans)
        return [entry(i, n, self.ids[a][0], self.ids[b][1], **kw)
                for i, (a, b) in enumerate(spans, 1)]


@pytest.fixture
def env(tmp_path):
    return Env(tmp_path)


def baseline(env):
    """Một phần hợp lệ: cảnh có beat ngắn nhất."""
    cands = [(sc["durationFrames"], k) for k, sc in enumerate(env.tl["scenes"])
             if env.ids[k]]
    k = min(cands)[1]
    return env.parts([(k, k)])


def ok_or_fail(env, items, code):
    if code:  # điều kiện cần: bản hợp lệ của cùng cây thì đạt (tránh đỏ giả)
        env.shorts(baseline(env))
        b = env.cli("validate")
        assert b.returncode == 0, both(b)
    env.shorts(items)
    p = env.cli("validate")
    assert p.returncode == code, both(p)
    if code:
        assert p.stderr.strip()
    return p


# ------------------------------------------------------------ validate: đạt
def test_validate_dat_ba_phan_chi_phu_nua_dau_tap(env):
    p = ok_or_fail(env, env.parts([(0, 1), (2, 2), (3, 3)]), 0)
    assert p.stderr.strip() == "" or "lỗi" not in p.stderr


def test_validate_dat_mot_phan(env):
    ok_or_fail(env, env.parts([(0, 5)]), 0)


def test_validate_dat_tam_phan(tmp_path):
    e = Env(tmp_path, plan=[300] * 8)
    ok_or_fail(e, e.parts([(i, i) for i in range(8)]), 0)


def test_validate_dat_khi_giua_hai_phan_co_canh_tieu_de_khong_beat(tmp_path):
    e = Env(tmp_path, plan=[600, 600, -90, 600, 600])
    ok_or_fail(e, e.parts([(0, 1), (3, 4)]), 0)


def test_validate_dat_phan_dung_5400_frame(tmp_path):
    e = Env(tmp_path, plan=[5400, 600])
    ok_or_fail(e, e.parts([(0, 0)]), 0)


# ------------------------------------------------------------ validate: lỗi
def test_validate_khong_co_muc_nao_bi_tu_choi(env):
    ok_or_fail(env, [], 1)


def test_validate_chin_phan_bi_tu_choi(tmp_path):
    e = Env(tmp_path, plan=[300] * 9)
    items = e.parts([(i, i) for i in range(9)])
    # điều kiện cần: 8 phần thì đạt
    ok_or_fail(e, e.parts([(i, i) for i in range(8)]), 0)
    ok_or_fail(e, items, 1)


def test_validate_thieu_shorts_json_ma_1(env):
    ok_or_fail(env, env.parts([(0, 0)]), 0)
    (env.ep / "shorts.json").unlink()
    p = env.cli("validate")
    assert p.returncode == 1, both(p)
    assert "shorts.json" in p.stderr


def test_validate_part_khong_dung_thu_tu(env):
    ok_or_fail(env, env.parts([(0, 0), (1, 1)]), 0)
    items = env.parts([(0, 0), (1, 1)])
    items[1]["part"] = 3
    ok_or_fail(env, items, 1)


def test_validate_total_khac_so_muc(env):
    items = env.parts([(0, 0), (1, 1)])
    items[0]["total"] = items[1]["total"] = 3
    ok_or_fail(env, items, 1)


def test_validate_from_khong_phai_beat_dau_cua_canh(env):
    items = env.parts([(0, 0)])
    items[0]["from"] = env.ids[0][1]
    ok_or_fail(env, items, 1)


def test_validate_to_khong_phai_beat_cuoi_cua_canh(env):
    items = env.parts([(0, 0)])
    items[0]["to"] = env.ids[0][0]
    ok_or_fail(env, items, 1)


def test_validate_beat_khong_co_trong_timeline(env):
    items = env.parts([(0, 0)])
    items[0]["to"] = "b999"
    ok_or_fail(env, items, 1)


def test_validate_to_dung_truoc_from(env):
    items = env.parts([(2, 2)])
    items[0]["to"] = env.ids[0][1]
    ok_or_fail(env, items, 1)


def test_validate_hai_phan_chong_nhau(env):
    ok_or_fail(env, env.parts([(0, 1), (2, 3)]), 0)
    ok_or_fail(env, env.parts([(0, 2), (2, 3)]), 1)


def test_validate_cac_phan_sai_thu_tu(env):
    ok_or_fail(env, env.parts([(0, 1), (2, 3)]), 0)
    ok_or_fail(env, env.parts([(2, 3), (0, 1)]), 1)


def test_validate_phan_dai_hon_180_giay_bi_tu_choi(tmp_path):
    e = Env(tmp_path, plan=[5402, 600])
    ok_or_fail(e, e.parts([(0, 0)]), 1)


def test_validate_phan_tren_150_giay_chi_canh_bao_van_ma_0(tmp_path):
    e = Env(tmp_path, plan=[4600, 600])
    p = ok_or_fail(e, e.parts([(0, 0)]), 0)
    assert "cảnh báo" in both(p).lower()


def test_validate_do_dai_tinh_ca_canh_tieu_de_dung_ngay_truoc_from(tmp_path):
    """`clipRange` lùi qua cảnh không beat: 5000 + 500 > 5400."""
    e = Env(tmp_path, plan=[-500, 5000, 600])
    ok_or_fail(e, e.parts([(1, 1)], ), 1)


@pytest.mark.parametrize("hook,code", [("", 1), ("x" * 40, 0), ("x" * 41, 1)])
def test_validate_hook_1_den_40_ky_tu(env, hook, code):
    ok_or_fail(env, env.parts([(0, 0)], hook=hook), code)


def test_validate_hook_dem_ky_tu_khong_dem_byte(env):
    ok_or_fail(env, env.parts([(0, 0)], hook="Ư" * 40), 0)


def test_validate_title_rong_bi_tu_choi(env):
    ok_or_fail(env, env.parts([(0, 0)], title=""), 1)


@pytest.mark.parametrize("extra,code", [(0, 0), (1, 1)])
def test_validate_title_cong_phan_k_n_hashtag_toi_da_100(env, extra, code):
    suffix = " (Phần 1/1) #Shorts"
    title = "a" * (100 - len(suffix) + extra)
    ok_or_fail(env, env.parts([(0, 0)], title=title), code)


# ------------------------------------------------------------ export (D33)
def seed(env, n_parts=4, have=None):
    spans = [(i, i) for i in range(n_parts)]
    env.shorts(env.parts(spans, title="Tiêu đề"))
    for k in (have if have is not None else range(1, n_parts + 1)):
        (env.out / f"{SLUG}-short-{k}.mp4").write_bytes(b"mp4-%d" % k)


def tiktok(env) -> Path:
    return env.out / "tiktok"


def ex(env, parts="1-3", calls=None):
    """Xuất trong tiến trình, thay bước render lại (Remotion) bằng bản giả ghi nhãn mới vào nội dung MP4."""
    from aivideo import shorts

    def render(slug, root, items, n, work):
        e = items[n - 1]
        if calls is not None:
            calls.append((e["part"], e["total"], e["from"]))
        f = Path(work) / f"r{n}.mp4"
        f.parent.mkdir(parents=True, exist_ok=True)
        f.write_bytes(b"render-%d/%d" % (e["part"], e["total"]))
        return f

    return shorts.export(SLUG, env.root, parts, render=render)


def test_export_mac_dinh_phan_1_den_3_khong_xuat_phan_4(env):
    seed(env, 4)
    ex(env)
    names = sorted(f.name for f in tiktok(env).iterdir())
    assert names == ["manifest.json", "phan-1.mp4", "phan-1.txt",
                     "phan-2.mp4", "phan-2.txt", "phan-3.mp4", "phan-3.txt"]


def test_export_mp4_la_ban_sao_dung_cua_phan_k(env):
    seed(env, 3)
    assert env.cli("export").returncode == 0
    for k in (1, 2, 3):
        assert (tiktok(env) / f"phan-{k}.mp4").read_bytes() == b"mp4-%d" % k


def test_export_parts_2_4_xuat_dung_cac_phan_do(env):
    seed(env, 4)
    ex(env, "2-4")
    names = sorted(f.name for f in tiktok(env).glob("phan-*.mp4"))
    assert names == ["phan-2.mp4", "phan-3.mp4", "phan-4.mp4"]


def test_export_parts_chi_xuat_phan_co_mp4_khong_doi_phan_khac(env):
    seed(env, 4, have=[2])
    ex(env, "2-2")
    assert [f.name for f in tiktok(env).glob("phan-*.mp4")] == ["phan-2.mp4"]


def test_export_thieu_mp4_cua_phan_can_xuat_ma_1(env):
    seed(env, 4)
    ex(env)
    (env.out / f"{SLUG}-short-2.mp4").unlink()
    p = env.cli("export")  # mặc định 1-3, thiếu phần 2
    assert p.returncode == 1, both(p)
    assert p.stderr.startswith("lỗi:")


def test_export_parts_ngoai_so_phan_bi_tu_choi(env):
    seed(env, 4)
    ex(env, "1-3")
    p = env.cli("export", "--parts", "3-5")
    assert p.returncode != 0, both(p)


def test_export_manifest_json_dung_dang(env):
    seed(env, 4)
    ex(env, "1-2")
    m = json.loads((tiktok(env) / "manifest.json").read_text("utf-8"))
    assert m == {"slug": SLUG, "parts": [
        {"part": 1, "mp4": "phan-1.mp4", "caption": "phan-1.txt"},
        {"part": 2, "mp4": "phan-2.mp4", "caption": "phan-2.txt"},
    ]}


def cap(env, k):
    return (tiktok(env) / f"phan-{k}.txt").read_text("utf-8")


def test_export_caption_co_tieu_de_phan_k_n_hook_hashtag_va_dong_ai(env):
    seed(env, 4)
    ex(env, "1-2")
    c = cap(env, 2)
    assert "Tiêu đề (Phần 2/2)" in c
    assert "/4" not in c
    assert "Móc" in c
    assert "#tinhoc #khoahocmaytinh" in c
    assert "AI" in c


def test_export_caption_khong_co_url_ke_ca_khi_so_da_co_videoid(tmp_path):
    """D35: caption không ghi URL. Mẫu 2026-11-15: chỉ phần cuối nhắc YouTube (không link)."""
    from aivideo import upload
    from upload_support import FakeClient, make_upload_env
    up = make_upload_env(tmp_path)
    upload.upload_episode(up["slug"], client=FakeClient(video_id="vLong"),
                          **up["kw"])
    env = Env(tmp_path)
    seed(env, 2)
    assert env.cli("export", "--parts", "1-2").returncode == 0
    for k in (1, 2):
        c = cap(env, k)
        assert "http" not in c and "vLong" not in c
    assert "youtube" not in cap(env, 1).lower()


BIO = "Theo dõi để xem phần tiếp."
LAST = ('Bản đầy đủ trên YouTube: link ở trang cá nhân '
        '(hoặc tìm "Chuyện Của Những Con Bit" trên YouTube).')
TAGS2 = "#conbit2 #conbit #tinhoc #khoahocmaytinh #hoccungtiktok #LearnOnTikTok"


def test_export_caption_dung_mau_moi_khi_chua_co_chu_rieng_tiktok(env):
    seed(env, 4)
    ex(env, "1-3")
    assert cap(env, 1) == (
        "Tiêu đề (Phần 1/3)\n\nMóc\n\n" + BIO + "\n\n"
        "Giọng đọc trong video do AI tạo.\n\n" + TAGS2 + "\n")
    assert cap(env, 3) == (
        "Tiêu đề (Phần 3/3)\n\nMóc\n\n" + LAST + "\n\n"
        "Giọng đọc trong video do AI tạo.\n\n" + TAGS2 + "\n")


# Nguyên văn out/tiktok-dang/tap1-phan1.txt và tap3-phan3.txt (mẫu người dùng đã đăng, 2026-11-15).
TAP1_PHAN1 = """Vì sao máy tính chỉ dùng số 0 và 1? Bit là gì (Phần 1/3)

Ảnh bạn chụp, bài hát bạn nghe, cả video này: bên trong máy tính chỉ là 0 và 1. Vậy mà ENIAC từng tính bằng hệ mười, còn ở Moskva có cả máy dùng hệ ba. Hệ hai thắng nhờ đâu?

Theo dõi để xem phần tiếp.

Đoán thử: 3 công tắc cho được bao nhiêu kiểu bật tắt? Ghi đáp án dưới bình luận nhé.

Giọng đọc trong video do AI tạo.

#conbit1 #conbit #tinhoc #khoahocmaytinh #hoccungtiktok #LearnOnTikTok
"""
TAP3_PHAN3 = """Ariane 5 tự hủy chỉ vì một con số không vừa ô 16 bit (Phần 3/3)

Ngày 4 tháng 6 năm 1996, phần mềm của Ariane 5 nhét một số 64 bit vào ô 16 bit có dấu, chỉ chứa được tới 32.767. Khoảng giây thứ 37, tên lửa mất dẫn đường. Bộ dự phòng cũng hỏng y như vậy.

Bản đầy đủ trên YouTube: link ở trang cá nhân (hoặc tìm "Chuyện Của Những Con Bit" trên YouTube).

Theo bạn, có hai bộ dẫn đường chạy song song rồi sao vẫn hỏng cả hai? Đoán trước khi xem nhé.

Giọng đọc trong video do AI tạo.

#conbit3 #conbit #tinhoc #laptrinh #hoccungtiktok #LearnOnTikTok
"""


@pytest.mark.parametrize("sample,ep_no,part,tags", [
    (TAP1_PHAN1, 1, 1, None),
    (TAP3_PHAN3, 3, 3, "#tinhoc #laptrinh"),
])
def test_tiktok_caption_trung_tung_byte_voi_mau_da_dang(sample, ep_no, part, tags):
    from aivideo import shorts
    paras = sample.rstrip("\n").split("\n\n")
    tk = {"title": paras[0].rsplit(" (Phần", 1)[0], "intro": paras[1], "question": paras[3]}
    if tags:
        tk["tags"] = tags
    e = {"part": part, "total": 3, "title": "Tiêu đề Short", "hook": "Móc", "tiktok": tk}
    assert shorts.tiktok_caption(e, ep_no, part == 3) == sample


def test_export_dung_chu_rieng_tiktok_trong_shorts_json(env):
    seed(env, 4)
    items = json.loads((env.ep / "shorts.json").read_text("utf-8"))
    items["shorts"][0]["tiktok"] = {"title": "Tựa TikTok", "intro": "Đoạn mở.",
                                    "question": "Bạn đoán sao?", "tags": "#tinhoc #laptrinh"}
    (env.ep / "shorts.json").write_text(json.dumps(items, ensure_ascii=False), "utf-8")
    ex(env, "1-3")
    assert cap(env, 1) == (
        "Tựa TikTok (Phần 1/3)\n\nĐoạn mở.\n\n" + BIO + "\n\nBạn đoán sao?\n\n"
        "Giọng đọc trong video do AI tạo.\n\n"
        "#conbit2 #conbit #tinhoc #laptrinh #hoccungtiktok #LearnOnTikTok\n")


def test_export_so_tap_theo_thu_tu_trong_index_json(env):
    seed(env, 2)
    (env.root / "episodes" / "index.json").write_text(
        json.dumps([{"slug": SLUG}]), "utf-8")
    ex(env, "1-2")
    assert "\n#conbit1 #conbit #tinhoc" in cap(env, 1)
    assert "\n#conbit1 #conbit #tinhoc" in cap(env, 2)


def test_export_tap_khong_co_trong_index_json_ma_1(env):
    seed(env, 2)
    (env.root / "episodes" / "index.json").write_text(
        json.dumps([{"slug": "tap-khac"}]), "utf-8")
    p = env.cli("export", "--parts", "1-2")
    assert p.returncode == 1, both(p)
    assert p.stderr.startswith("lỗi:")


def test_export_caption_phan_cuoi_da_xuat_moi_xem_cac_phan_con_lai(env):
    seed(env, 4)
    ex(env, "1-3")
    assert LAST in cap(env, 3)
    assert LAST not in cap(env, 1)
    assert BIO in cap(env, 1)


def test_export_phan_cuoi_la_phan_cuoi_cua_danh_sach_chon_khong_phai_cua_tap(
        env):
    seed(env, 4)
    ex(env, "2-3")
    assert LAST in cap(env, 3)
    assert LAST not in cap(env, 2)


def test_export_nhan_phan_theo_dai_xuat_render_lai_phan_i_tren_m(env):
    seed(env, 6)
    calls = []
    ex(env, "1-3", calls)
    assert [c[:2] for c in calls] == [(1, 3), (2, 3), (3, 3)]
    for k in (1, 2, 3):
        assert (tiktok(env) / f"phan-{k}.mp4").read_bytes() == b"render-%d/3" % k
        assert f"(Phần {k}/3)" in cap(env, k)
        assert "/6" not in cap(env, k)


def test_export_parts_2_4_danh_so_lai_tu_1(env):
    seed(env, 6)
    calls = []
    ex(env, "2-4", calls)
    assert [c[:2] for c in calls] == [(1, 3), (2, 3), (3, 3)]
    assert [c[2] for c in calls] == [env.ids[i][0] for i in (1, 2, 3)]
    assert (tiktok(env) / "phan-2.mp4").read_bytes() == b"render-1/3"
    assert "(Phần 1/3)" in cap(env, 2)
    assert "(Phần 3/3)" in cap(env, 4)


def test_export_ca_tap_trung_nhan_youtube_thi_chep_khong_render(env):
    seed(env, 4)
    calls = []
    ex(env, "1-4", calls)
    assert calls == []
    for k in (1, 2, 3, 4):
        assert (tiktok(env) / f"phan-{k}.mp4").read_bytes() == b"mp4-%d" % k
        assert f"(Phần {k}/4)" in cap(env, k)


def test_export_khong_doi_short_youtube_va_don_thu_muc_tam(env):
    seed(env, 6)
    ex(env, "1-3")
    for k in range(1, 7):
        assert (env.out / f"{SLUG}-short-{k}.mp4").read_bytes() == b"mp4-%d" % k
    assert not (env.out / "shorts").exists()
    assert not (tiktok(env) / ".work").exists()
