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


def test_export_parts_2_3_xuat_dung_cac_phan_do(env):
    seed(env, 4)
    ex(env, "2-3")
    names = sorted(f.name for f in tiktok(env).glob("phan-*.mp4"))
    assert names == ["phan-2.mp4", "phan-3.mp4"]


@pytest.mark.parametrize("parts", ["1-4", "2-4", "4-4"])
def test_export_tiktok_chi_phan_1_den_3_d43(env, parts):
    """D43: TikTok chỉ dùng Short phần 1–3, kể cả khi tập có đủ phần 4."""
    seed(env, 4)
    p = env.cli("export", "--parts", parts)
    assert p.returncode == 1, both(p)
    assert p.stderr.startswith("lỗi:")
    assert not tiktok(env).exists() or not list(tiktok(env).glob("phan-*"))


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


def test_export_caption_co_tieu_de_hook_hashtag_va_dong_ai(env):
    seed(env, 4)
    ex(env, "1-2")
    c = cap(env, 2)
    assert c.startswith("#conbit2 Tiêu đề\n")
    assert "Móc" in c
    assert "#tinhoc" in c
    assert "AI" in c


BIO = "Theo dõi để xem phần tiếp."
LAST = "Các phần còn lại và bản đầy đủ: link ở bio nha."
TAGS2 = "#conbit2 #conbit #tinhoc #hoccungtiktok"
QDEF = "Bạn đã biết chuyện này chưa?"


def _check_d43(c, qmark=True, no_youtube=True):
    """Các điều kiện khuôn D43 cho mọi caption TikTok (LUAT/con-bit.md §6–7)."""
    import re
    assert "(Phần" not in c
    assert "http" not in c
    if no_youtube:
        assert "youtube" not in c.lower()
    assert "#LearnOnTikTok" not in c
    # Thứ tự 6 đoạn, cách nhau đúng một dòng trống: tiêu đề, đoạn mở, dòng AI, theo dõi/bio, câu hỏi, hashtag.
    assert c.endswith("\n") and not c.endswith("\n\n")
    paras = c.rstrip("\n").split("\n\n")
    assert len(paras) == 6, paras
    assert all(p.strip() and not p.startswith("\n") for p in paras), paras
    m = re.fullmatch(r"(#conbit(\d+)) \S.*", paras[0])
    assert m, paras[0]
    assert paras[2] == "Giọng đọc trong video do AI tạo."
    assert paras[3] in (BIO, LAST)
    assert not paras[4].startswith("#")
    if qmark:
        assert paras[4].endswith("?"), paras[4]
    tags = paras[5].split()
    assert paras[5] == " ".join(tags)
    assert 3 <= len(tags) <= 4, tags
    assert tags[0] == m[1], tags
    assert tags[1] == "#conbit", tags
    assert re.fullmatch(r"#\w+", tags[2]) and not re.fullmatch(r"#\d+", tags[2]), tags
    assert tags[2].lower() not in ("#conbit", m[1], "#hoccungtiktok", "#learnontiktok"), tags
    if len(tags) == 4:
        assert tags[3] == "#hoccungtiktok", tags


def _paras(c):
    return c.rstrip("\n").split("\n\n")


@pytest.mark.parametrize("tiktok_kw", [None, {"question": "Bạn đoán sao?", "tags": "#tinhoc #laptrinh #mang"},
                                       {"tags": "#tinhoc"}, {"title": "Tựa", "intro": "Mở."}])
@pytest.mark.parametrize("last", [False, True])
def test_tiktok_caption_dung_khuon_d43(tiktok_kw, last):
    from aivideo import shorts
    e = {"part": 1, "total": 3, "title": "Tiêu đề", "hook": "Móc", **({"tiktok": tiktok_kw} if tiktok_kw else {})}
    c = shorts.tiktok_caption(e, 7, last)
    _check_d43(c)
    assert c.startswith("#conbit7 ")
    assert (LAST in c) == last and (BIO in c) == (not last)
    # Thứ tự đoạn đúng D43, từng đoạn lấy đúng nguồn.
    t = tiktok_kw or {}
    assert _paras(c) == [f"#conbit7 {t.get('title') or 'Tiêu đề'}", t.get("intro") or "Móc",
                         "Giọng đọc trong video do AI tạo.", LAST if last else BIO,
                         t.get("question") or QDEF, "#conbit7 #conbit #tinhoc #hoccungtiktok"]


@pytest.mark.parametrize("c", [
    "#conbit7 T\n\nGiọng đọc trong video do AI tạo.\n\nMở.\n\n" + BIO + "\n\nHỏi?\n\n#conbit7 #conbit #tinhoc\n",
    "#conbit7 T\n\nMở.\n\nGiọng đọc trong video do AI tạo.\n\nHỏi?\n\n" + BIO + "\n\n#conbit7 #conbit #tinhoc\n",
    "#conbit7 T\n\nMở.\n\nGiọng đọc trong video do AI tạo.\n\n" + BIO + "\n\n#conbit7 #conbit #tinhoc\n\nHỏi?\n",
    "Mở.\n\n#conbit7 T\n\nGiọng đọc trong video do AI tạo.\n\n" + BIO + "\n\nHỏi?\n\n#conbit7 #conbit #tinhoc\n",
    "#conbit7 T\n\nMở.\n\nGiọng đọc trong video do AI tạo.\n\n" + BIO + "\n\nHỏi?\n\n#conbit7 #conbit #tinhoc #laptrinh\n",
    "#conbit7 T\n\nMở.\n\nGiọng đọc trong video do AI tạo.\n\n" + BIO + "\n\nHỏi?\n\n#conbit7 #conbit #tinhoc #LearnOnTikTok\n",
])
def test_check_d43_bat_sai_thu_tu_doan_va_the(c):
    """Bộ kiểm `_check_d43` phải bắt được caption đổi chỗ đoạn hoặc thẻ thứ 4 sai (tránh xanh giả)."""
    with pytest.raises(AssertionError):
        _check_d43(c)


def test_check_d43_dat_voi_caption_dung():
    _check_d43("#conbit7 T\n\nMở.\n\nGiọng đọc trong video do AI tạo.\n\n" + BIO
               + "\n\nHỏi?\n\n#conbit7 #conbit #tinhoc #hoccungtiktok\n")
    _check_d43("#conbit7 T\n\nMở.\n\nGiọng đọc trong video do AI tạo.\n\n" + LAST
               + "\n\nHỏi?\n\n#conbit7 #conbit #tinhoc\n")


def test_export_moi_caption_dung_khuon_d43(env):
    seed(env, 4)
    ex(env, "1-3")
    for k in (1, 2, 3):
        _check_d43(cap(env, k))


def test_export_caption_khong_co_url_ke_ca_khi_so_da_co_videoid(tmp_path):
    """D35 sửa 1, 2: caption không ghi URL, không nhắc YouTube; link ở bio."""
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
        assert "youtube" not in c.lower()


def test_export_caption_dung_mau_moi_khi_chua_co_chu_rieng_tiktok(env):
    seed(env, 4)
    ex(env, "1-3")
    assert cap(env, 1) == (
        "#conbit2 Tiêu đề\n\nMóc\n\nGiọng đọc trong video do AI tạo.\n\n" + BIO + "\n\n"
        + QDEF + "\n\n" + TAGS2 + "\n")
    assert cap(env, 3) == (
        "#conbit2 Tiêu đề\n\nMóc\n\nGiọng đọc trong video do AI tạo.\n\n" + LAST + "\n\n"
        + QDEF + "\n\n" + TAGS2 + "\n")


# Bản chép nguyên văn 9 caption khuôn cũ D35 (out/tiktok-dang/, 2026-11-15 20:13): dùng làm nguồn chữ riêng,
# ghép lại theo khuôn D43 (LUAT/con-bit.md §7).
MAU = sorted((Path(__file__).parent / "data" / "tiktok-caption").glob("tap*-phan*.txt"))


def test_co_du_9_mau_caption():
    assert [f.name for f in MAU] == [f"tap{t}-phan{k}.txt" for t in (1, 2, 3) for k in (1, 2, 3)]


@pytest.mark.parametrize("f", MAU, ids=lambda f: f.stem)
def test_tiktok_caption_ghep_lai_mau_cu_theo_khuon_d43(f):
    """Lấy chữ riêng (tiêu đề, đoạn mở, câu hỏi, hashtag chủ đề) từ mẫu cũ, ghép lại đúng thứ tự D43."""
    import re
    from aivideo import shorts
    sample = f.read_text(encoding="utf-8")
    paras = sample.rstrip("\n").split("\n\n")
    m = re.fullmatch(r"#conbit(\d) (.+) \(Phần (\d)/3\)", paras[0])
    tags = re.fullmatch(r"#conbit\d #conbit (.+) #hoccungtiktok #LearnOnTikTok", paras[-1])
    assert m and tags, sample
    part = int(m[3])
    e = {"part": part, "total": 3, "title": "Tiêu đề Short", "hook": "Móc",
         "tiktok": {"title": m[2], "intro": paras[1], "question": paras[3], "tags": tags[1]}}
    n = m[1]
    want = "\n\n".join([f"#conbit{n} {m[2]}", paras[1], "Giọng đọc trong video do AI tạo.", paras[2], paras[3],
                         f"#conbit{n} #conbit {tags[1].split()[0]} #hoccungtiktok"]) + "\n"
    got = shorts.tiktok_caption(e, int(n), part == 3)
    assert got == want
    # Vài câu hỏi mẫu cũ kết bằng "…dưới bình luận."; tap3-phan1 nói về bộ đếm của YouTube (nội dung, không phải lời mời).
    _check_d43(got, qmark=paras[3].endswith("?"), no_youtube="youtube" not in sample.lower())


def test_export_canh_bao_cau_hoi_khong_ket_bang_dau_hoi(env):
    seed(env, 3)
    items = json.loads((env.ep / "shorts.json").read_text("utf-8"))
    items["shorts"][1]["tiktok"] = {"question": "Kể dưới bình luận nhé."}
    (env.ep / "shorts.json").write_text(json.dumps(items, ensure_ascii=False), "utf-8")
    p = env.cli("export")
    assert p.returncode == 0, both(p)
    assert "phần 2" in p.stderr and "?" in p.stderr


def test_export_dung_chu_rieng_tiktok_trong_shorts_json(env):
    seed(env, 4)
    items = json.loads((env.ep / "shorts.json").read_text("utf-8"))
    items["shorts"][0]["tiktok"] = {"title": "Tựa TikTok", "intro": "Đoạn mở.",
                                    "question": "Bạn đoán sao?", "tags": "#tinhoc #laptrinh"}
    (env.ep / "shorts.json").write_text(json.dumps(items, ensure_ascii=False), "utf-8")
    ex(env, "1-3")
    assert cap(env, 1) == (
        "#conbit2 Tựa TikTok\n\nĐoạn mở.\n\nGiọng đọc trong video do AI tạo.\n\n" + BIO + "\n\n"
        "Bạn đoán sao?\n\n#conbit2 #conbit #tinhoc #hoccungtiktok\n")


def test_export_so_tap_theo_thu_tu_trong_index_json(env):
    seed(env, 2)
    (env.root / "episodes" / "index.json").write_text(
        json.dumps([{"slug": SLUG}]), "utf-8")
    ex(env, "1-2")
    assert cap(env, 1).startswith("#conbit1 ")
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
        assert "(Phần" not in cap(env, k)


def test_export_parts_2_3_danh_so_lai_tu_1(env):
    seed(env, 6)
    calls = []
    ex(env, "2-3", calls)
    assert [c[:2] for c in calls] == [(1, 2), (2, 2)]
    assert [c[2] for c in calls] == [env.ids[i][0] for i in (1, 2)]
    assert (tiktok(env) / "phan-2.mp4").read_bytes() == b"render-1/2"
    assert LAST in cap(env, 3) and BIO in cap(env, 2)


def test_export_ca_tap_trung_nhan_youtube_thi_chep_khong_render(env):
    seed(env, 3)
    calls = []
    ex(env, "1-3", calls)
    assert calls == []
    for k in (1, 2, 3):
        assert (tiktok(env) / f"phan-{k}.mp4").read_bytes() == b"mp4-%d" % k


def test_export_khong_doi_short_youtube_va_don_thu_muc_tam(env):
    seed(env, 6)
    ex(env, "1-3")
    for k in range(1, 7):
        assert (env.out / f"{SLUG}-short-{k}.mp4").read_bytes() == b"mp4-%d" % k
    assert not (env.out / "shorts").exists()
    assert not (tiktok(env) / ".work").exists()


# ------------------------------------------------------------ review PR #103
@pytest.mark.parametrize("tags,want", [
    ("#laptrinh #tinhoc #mang", "#conbit7 #conbit #laptrinh #hoccungtiktok"),
    ("#hoccungtiktok #baomat", "#conbit7 #conbit #baomat #hoccungtiktok"),
    ("#conbit7 #conbit", "#conbit7 #conbit #tinhoc #hoccungtiktok"),
    ("", "#conbit7 #conbit #tinhoc #hoccungtiktok"),
])
def test_tiktok_caption_dung_mot_the_chu_de(tags, want):
    """D43: đúng MỘT thẻ chủ đề; thẻ thứ 4 chỉ được là #hoccungtiktok."""
    from aivideo import shorts
    e = {"part": 1, "total": 3, "title": "T", "hook": "M", "tiktok": {"tags": tags, "question": "Q?"}}
    c = shorts.tiktok_caption(e, 7, False)
    assert _paras(c)[-1] == want
    _check_d43(c)


def test_export_parts_1_2_tap_co_3_phan_tro_len_khong_ghi_link_bio(env):
    """Bài cuối trong phần 1–3 của TẬP mới có "link ở bio", không phải bài cuối của dải xuất."""
    seed(env, 4)
    ex(env, "1-2")
    assert BIO in cap(env, 1) and BIO in cap(env, 2)
    assert LAST not in cap(env, 1) and LAST not in cap(env, 2)
    ex(env, "3-3")
    assert LAST in cap(env, 3)


def test_export_tap_2_phan_mac_dinh_xuat_ca_2_phan_phan_2_la_bai_cuoi(env):
    seed(env, 2)
    ex(env, None)
    names = sorted(f.name for f in tiktok(env).glob("phan-*.mp4"))
    assert names == ["phan-1.mp4", "phan-2.mp4"]
    assert BIO in cap(env, 1) and LAST not in cap(env, 1)
    assert LAST in cap(env, 2) and BIO not in cap(env, 2)
    for k in (1, 2):
        _check_d43(cap(env, k))


def test_export_tap_2_phan_qua_cli_mac_dinh_ma_0(env):
    seed(env, 2)
    p = env.cli("export")
    assert p.returncode == 0, both(p)
    assert LAST in cap(env, 2)


def test_export_tap_1_phan_mac_dinh_xuat_phan_1_la_bai_cuoi(env):
    seed(env, 1)
    ex(env, None)
    assert LAST in cap(env, 1)


def test_export_tap_2_phan_parts_1_3_van_bi_tu_choi(env):
    """Chỉ mặc định mới co theo số phần; dải người dùng ghi vượt số phần vẫn lỗi."""
    seed(env, 2)
    p = env.cli("export", "--parts", "1-3")
    assert p.returncode == 1, both(p)


def test_export_canh_bao_khi_thieu_cau_hoi_tiktok(env):
    seed(env, 3)
    items = json.loads((env.ep / "shorts.json").read_text("utf-8"))
    items["shorts"][0]["tiktok"] = {"question": "Bạn đoán sao?"}
    items["shorts"][1]["tiktok"] = {"intro": "Mở."}
    (env.ep / "shorts.json").write_text(json.dumps(items, ensure_ascii=False), "utf-8")
    p = env.cli("export")
    assert p.returncode == 0, both(p)
    warn = [x for x in p.stderr.splitlines() if "tiktok.question" in x]
    assert [x.split(":")[1].strip() for x in warn] == ["phần 2", "phần 3"], p.stderr
    assert QDEF in cap(env, 2)


BAD_TEXT = [
    ("title", "Xem tại https://x.vn"),
    ("title", "Ghé chuyenconbit.vercel.app"),
    ("title", "Như trên YouTube"),
    ("title", "Top #1 thuật toán"),
    ("intro", "Đoạn mở có www.example.com."),
    ("intro", "Bản đầy đủ trên youtube nha."),
    ("intro", "Đây là #1 đó."),
    ("intro", "Học #LearnOnTikTok"),
    ("tags", "#tinhoc #LearnOnTikTok"),
    ("tags", "#1"),
    ("tags", "#youtube"),
    ("tags", "tinhoc"),
    ("tags", "#tinhoc https://x.vn"),
]


@pytest.mark.parametrize("field,value", BAD_TEXT)
def test_check_tiktok_input_bat_loi(field, value):
    from aivideo import shorts
    assert shorts.check_tiktok_input({"title": "T", "hook": "M", "tiktok": {field: value}})


@pytest.mark.parametrize("field,value", [("title", "Bug Y2K tốn 300 tỷ đô"), ("intro", "Năm 1999, 2 số cuối."),
                                         ("tags", "#tinhoc"), ("tags", "#baomat #tinhoc"), ("title", "C# có 3 kiểu")])
def test_check_tiktok_input_dat(field, value):
    from aivideo import shorts
    assert shorts.check_tiktok_input({"title": "T", "hook": "M", "tiktok": {field: value}}) == []


@pytest.mark.parametrize("key,value", [("title", "Như trên YouTube"), ("hook", "Xem #1")])
def test_check_tiktok_input_kiem_ca_title_hook_cua_muc_khi_khong_co_chu_rieng(key, value):
    from aivideo import shorts
    e = {"title": "T", "hook": "M", key: value}
    assert shorts.check_tiktok_input(e)


@pytest.mark.parametrize("field,value", BAD_TEXT[::3])
def test_export_chu_tiktok_sai_thi_loi_khong_ghi_file(env, field, value):
    seed(env, 3)
    items = json.loads((env.ep / "shorts.json").read_text("utf-8"))
    items["shorts"][1]["tiktok"] = {field: value}
    (env.ep / "shorts.json").write_text(json.dumps(items, ensure_ascii=False), "utf-8")
    p = env.cli("export")
    assert p.returncode == 1, both(p)
    assert p.stderr.startswith("lỗi:") and "phần 2" in p.stderr
    assert not tiktok(env).exists() or not list(tiktok(env).glob("phan-*"))


# D43: cảnh báo 30–45 s ở `aivideo.shorts validate` (cùng ngưỡng `video/src/shorts.ts`).
def _warns(p):
    return [x for x in p.stdout.splitlines() if x.startswith("cảnh báo:") and "30–45 s" in x]


def test_validate_bien_30_45_giay_899_900_1350_1351_frame(tmp_path):
    e = Env(tmp_path, plan=[899, 900, 1350, 1351, 600])
    p = ok_or_fail(e, e.parts([(0, 0), (1, 1), (2, 2), (3, 3)]), 0)
    assert _warns(p) == ["cảnh báo: phần 1: dài 30.0 s, ngoài khoảng 30–45 s (D43)",
                         "cảnh báo: phần 4: dài 45.0 s, ngoài khoảng 30–45 s (D43)"], p.stdout


def test_validate_nguong_theo_fps_cua_timeline(tmp_path):
    e = Env(tmp_path, plan=[1799, 1800, 2700, 2701, 600])
    e.tl["fps"] = 60
    (e.out / "timeline.json").write_text(json.dumps(e.tl, ensure_ascii=False), "utf-8")
    p = ok_or_fail(e, e.parts([(0, 0), (1, 1), (2, 2), (3, 3)]), 0)
    assert [x.split(":")[1].strip() for x in _warns(p)] == ["phần 1", "phần 4"], p.stdout


def test_validate_timeline_thieu_fps_dung_30(tmp_path):
    from aivideo import shorts
    e = Env(tmp_path, plan=[899, 900, 600])
    tl = dict(e.tl)
    tl.pop("fps", None)
    errs, warns = shorts.validate(e.parts([(0, 0), (1, 1)]), tl)
    assert errs == []
    assert [w for w in warns if "30–45 s" in w] == ["phần 1: dài 30.0 s, ngoài khoảng 30–45 s (D43)"]
