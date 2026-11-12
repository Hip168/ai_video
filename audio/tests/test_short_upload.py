"""[14-4] `upload.py --short <n>`: đăng Short với client Google giả.

Giao diện: `.team/features/14-shorts-giao-dien.md` mục 7 (D32, D33: chuỗi
1..8 phần, tiêu đề `title (Phần k/N) #Shorts`). Không gọi
mạng. Mp4 của Short: `out/episodes/<slug>/<slug>-short-<n>.mp4`; phụ đề:
`out/episodes/<slug>/shorts/<n>/video.srt` (mục 6).
"""

from __future__ import annotations

import pytest

from aivideo import upload
from gates_support import write_json
from upload_support import (
    CHANNEL, SLUG, URL_PREFIX, FakeClient, make_upload_env, read_ledger,
    sha256,
)

LONG_ID = "vLong"
TITLE = "Vì sao máy tính chỉ dùng 0 và 1?"


@pytest.fixture(autouse=True)
def _nhanh(monkeypatch):
    monkeypatch.setattr(upload, "POLL_SECONDS", 0)


def _short_env(tmp_path, *, long_done=True, publish=None, kenh=None,
               titles=(TITLE, "Tiêu đề hai")):
    env = make_upload_env(tmp_path, publish=publish, kenh=kenh)
    total = len(titles)
    write_json(env["ep"] / "shorts.json", {"version": 1, "shorts": [
        {"part": i, "total": total, "from": f"b{i:03d}", "to": f"b{i:03d}",
         "title": t, "hook": f"Móc {i}"}
        for i, t in enumerate(titles, 1)
    ]})
    sdir = env["out"] / env["slug"]
    for n in range(1, total + 1):
        (sdir / f"{env['slug']}-short-{n}.mp4").write_bytes(b"short-%d" % n)
        srt = sdir / "shorts" / str(n) / "video.srt"
        srt.parent.mkdir(parents=True, exist_ok=True)
        srt.write_text(f"1\n00:00:00,000 --> 00:00:01,000\nshort {n}\n",
                       encoding="utf-8")
    env["short_mp4"] = lambda n: sdir / f"{env['slug']}-short-{n}.mp4"
    env["short_srt"] = lambda n: sdir / "shorts" / str(n) / "video.srt"
    if long_done:
        upload.upload_episode(env["slug"], client=FakeClient(video_id=LONG_ID),
                              **env["kw"])
    return env


def _cli(env, *extra):
    return [
        env["slug"], "--episodes-dir", str(env["eps"]),
        "--out-dir", str(env["out"]), "--kenh", str(env["kenh"]), *extra,
    ]


def _go(monkeypatch, env, client, *extra):
    monkeypatch.setattr(upload, "make_client", lambda: client)
    return upload.main(_cli(env, "--short", "1", *extra))


def _body(c):
    return next(x for x in c.calls if x[0] == "insert_video")[2]


def _stages(env):
    return [e["stage"] for e in read_ledger(env["ep"])["entries"]]


def _entry(env, stage):
    es = [e for e in read_ledger(env["ep"])["entries"] if e["stage"] == stage]
    assert len(es) == 1, es
    return es[0]


# --- nội dung gửi lên -----------------------------------------------------


def test_short_1_goi_dung_thu_tu_va_khong_dat_thumbnail(
        tmp_path, monkeypatch, capsys):
    env = _short_env(tmp_path)
    c = FakeClient(video_id="vS1")
    assert _go(monkeypatch, env, c) == 0, capsys.readouterr().err
    assert c.names == [
        "channel_id", "find_uploaded", "insert_video", "processing_status",
        "insert_caption",
    ]
    assert "set_thumbnail" not in c.names


def test_short_tai_dung_file_mp4_va_phu_de_cua_short_1(
        tmp_path, monkeypatch):
    env = _short_env(tmp_path)
    c = FakeClient(video_id="vS1")
    assert _go(monkeypatch, env, c) == 0
    ins = next(x for x in c.calls if x[0] == "insert_video")
    assert ins[1] == env["short_mp4"](1)
    assert ("insert_caption", "vS1", env["short_srt"](1), "vi",
            "Tiếng Việt") in c.calls


def test_short_2_tai_file_cua_short_2(tmp_path, monkeypatch):
    env = _short_env(tmp_path)
    c = FakeClient(video_id="vS2")
    monkeypatch.setattr(upload, "make_client", lambda: c)
    assert upload.main(_cli(env, "--short", "2")) == 0
    ins = next(x for x in c.calls if x[0] == "insert_video")
    assert ins[1] == env["short_mp4"](2)
    assert _body(c)["snippet"]["title"] == "Tiêu đề hai (Phần 2/2) #Shorts"
    assert ("find_uploaded", f"aivideo:{SLUG}:short-2") in c.calls


def test_tieu_de_la_title_phan_k_tren_n_roi_hashtag_shorts(
        tmp_path, monkeypatch):
    env = _short_env(tmp_path)
    c = FakeClient()
    assert _go(monkeypatch, env, c) == 0
    assert _body(c)["snippet"]["title"] == f"{TITLE} (Phần 1/2) #Shorts"


def test_chuoi_ba_phan_phan_3_tren_3_dang_duoc(tmp_path, monkeypatch):
    env = _short_env(tmp_path, titles=("Một", "Hai", "Ba"))
    c = FakeClient(video_id="vS3")
    monkeypatch.setattr(upload, "make_client", lambda: c)
    assert upload.main(_cli(env, "--short", "3")) == 0
    assert _body(c)["snippet"]["title"] == "Ba (Phần 3/3) #Shorts"
    assert next(x for x in c.calls if x[0] == "insert_video")[1] == (
        env["short_mp4"](3))
    assert ("find_uploaded", f"aivideo:{SLUG}:short-3") in c.calls
    assert "dang-short-3" in _stages(env)


def test_chuoi_mot_phan_phan_1_tren_1(tmp_path, monkeypatch):
    env = _short_env(tmp_path, titles=("Một",))
    c = FakeClient()
    assert _go(monkeypatch, env, c) == 0
    assert _body(c)["snippet"]["title"] == "Một (Phần 1/1) #Shorts"


def test_chuoi_tam_phan_phan_8_dang_duoc(tmp_path, monkeypatch):
    env = _short_env(tmp_path, titles=tuple(f"T{i}" for i in range(1, 9)))
    c = FakeClient(video_id="vS8")
    monkeypatch.setattr(upload, "make_client", lambda: c)
    assert upload.main(_cli(env, "--short", "8")) == 0
    assert _body(c)["snippet"]["title"] == "T8 (Phần 8/8) #Shorts"


def test_phan_vuot_so_muc_trong_shorts_json_bi_tu_choi(tmp_path, monkeypatch):
    env = _short_env(tmp_path, titles=("Một", "Hai", "Ba"))
    ok = FakeClient(video_id="vS3")
    monkeypatch.setattr(upload, "make_client", lambda: ok)
    assert upload.main(_cli(env, "--short", "3")) == 0
    c = FakeClient()
    monkeypatch.setattr(upload, "make_client", lambda: c)
    try:
        code = upload.main(_cli(env, "--short", "4"))
    except SystemExit as e:
        code = e.code
    assert code not in (0, None)
    assert "insert_video" not in c.names


def test_mo_ta_phan_thuong_hook_link_hashtag_giong_doc_ai_theo_thu_tu(
        tmp_path, monkeypatch):
    env = _short_env(tmp_path)
    c = FakeClient(video_id="vS1")
    assert _go(monkeypatch, env, c) == 0
    d = _body(c)["snippet"]["description"]
    link = f"Xem bản đầy đủ: {URL_PREFIX}{LONG_ID}"
    ai = "Giọng đọc trong video do AI tạo."
    assert d.startswith("Móc 1")
    for part in (link, "#Shorts", ai):
        assert part in d
    assert d.index("Móc 1") < d.index(link) < d.index("#Shorts") < d.index(ai)
    assert URL_PREFIX + "vS1" not in d  # link về video dài, không phải chính Short
    assert "Cảm ơn bạn đã xem hết" not in d  # chỉ phần cuối mới có


def test_mo_ta_phan_cuoi_co_loi_moi_xem_ban_day_du_dung_cho(
        tmp_path, monkeypatch):
    env = _short_env(tmp_path, titles=("Một", "Hai", "Ba"))
    c = FakeClient(video_id="vS3")
    monkeypatch.setattr(upload, "make_client", lambda: c)
    assert upload.main(_cli(env, "--short", "3")) == 0
    d = _body(c)["snippet"]["description"]
    link = f"Xem bản đầy đủ: {URL_PREFIX}{LONG_ID}"
    thanks = ("Cảm ơn bạn đã xem hết 3 phần. "
              "Bản đầy đủ liền mạch ở link trên.")
    assert thanks in d
    assert d.index(link) < d.index(thanks) < d.index("#Shorts")


def test_mo_ta_phan_giua_khong_co_loi_moi_cua_phan_cuoi(
        tmp_path, monkeypatch):
    env = _short_env(tmp_path, titles=("Một", "Hai", "Ba"))
    c = FakeClient()
    monkeypatch.setattr(upload, "make_client", lambda: c)
    assert upload.main(_cli(env, "--short", "2")) == 0
    d = _body(c)["snippet"]["description"]
    assert "Cảm ơn bạn đã xem hết" not in d
    assert d.startswith("Móc 2")


def test_the_aivideo_slug_short_n_va_tim_lai_bang_chinh_the_do(
        tmp_path, monkeypatch):
    env = _short_env(tmp_path)
    c = FakeClient()
    assert _go(monkeypatch, env, c) == 0
    assert f"aivideo:{SLUG}:short-1" in _body(c)["snippet"]["tags"]
    assert ("find_uploaded", f"aivideo:{SLUG}:short-1") in c.calls


def test_body_giu_co_synthetic_false_khong_danh_cho_tre_em_va_luon_private(
        tmp_path, monkeypatch):
    env = _short_env(tmp_path)
    c = FakeClient()
    assert _go(monkeypatch, env, c) == 0
    st = _body(c)["status"]
    assert st["privacyStatus"] == "private"
    assert st["selfDeclaredMadeForKids"] is False
    assert st["containsSyntheticMedia"] is False


# --- sổ ---------------------------------------------------------------------


def test_so_ghi_dang_short_1_va_caption_dung_url_va_hash(
        tmp_path, monkeypatch):
    env = _short_env(tmp_path)
    assert _go(monkeypatch, env, FakeClient(video_id="vS1")) == 0
    assert _stages(env) == [
        "dang", "dang-thumbnail", "dang-caption",
        "dang-short-1", "dang-short-1-caption",
    ]
    url = URL_PREFIX + "vS1"
    e = _entry(env, "dang-short-1")
    assert e["note"] == url
    assert e["role"] == "publisher"
    assert e["artifactHash"] == sha256(env["short_mp4"](1))
    e = _entry(env, "dang-short-1-caption")
    assert e["note"] == url
    assert e["artifactHash"] == sha256(env["short_srt"](1))


def test_so_tap_dai_khong_bi_doi_videoid_dai_van_la_cua_video_dai(
        tmp_path, monkeypatch):
    env = _short_env(tmp_path)
    assert _go(monkeypatch, env, FakeClient(video_id="vS1")) == 0
    assert upload.recorded_video_id(env["ep"]) == LONG_ID
    assert _entry(env, "dang")["note"] == URL_PREFIX + LONG_ID


def test_quyen_rieng_tu_unlisted_ghi_dang_short_1_privacy(
        tmp_path, monkeypatch):
    env = _short_env(tmp_path, publish={"privacy": "unlisted"})
    c = FakeClient(video_id="vS1")
    assert _go(monkeypatch, env, c) == 0
    assert ("set_privacy", "vS1", "unlisted") in c.calls
    assert _stages(env)[-3:] == [
        "dang-short-1", "dang-short-1-caption", "dang-short-1-privacy"]


def test_mac_dinh_private_khong_goi_set_privacy_khong_co_khau_privacy(
        tmp_path, monkeypatch):
    env = _short_env(tmp_path)
    c = FakeClient()
    assert _go(monkeypatch, env, c) == 0
    assert "set_privacy" not in c.names
    assert "dang-short-1-privacy" not in _stages(env)


# --- chạy lại ---------------------------------------------------------------


def test_chay_lai_khi_da_ghi_so_khong_tai_trung(tmp_path, monkeypatch):
    env = _short_env(tmp_path)
    assert _go(monkeypatch, env, FakeClient(video_id="vS1")) == 0
    n = len(read_ledger(env["ep"])["entries"])
    c = FakeClient(video_id="vKhac")
    assert _go(monkeypatch, env, c) == 0
    assert "insert_video" not in c.names
    assert len(read_ledger(env["ep"])["entries"]) == n


def test_so_chua_co_nhung_thay_the_tren_kenh_thi_khong_tai_lai(
        tmp_path, monkeypatch):
    env = _short_env(tmp_path)
    c = FakeClient(found="vDaCo")
    assert _go(monkeypatch, env, c) == 0
    assert "insert_video" not in c.names
    assert _entry(env, "dang-short-1")["note"] == URL_PREFIX + "vDaCo"


def test_short_1_da_dang_khong_chan_short_2(tmp_path, monkeypatch):
    env = _short_env(tmp_path)
    assert _go(monkeypatch, env, FakeClient(video_id="vS1")) == 0
    c = FakeClient(video_id="vS2")
    monkeypatch.setattr(upload, "make_client", lambda: c)
    assert upload.main(_cli(env, "--short", "2")) == 0
    assert "insert_video" in c.names
    assert _entry(env, "dang-short-2")["note"] == URL_PREFIX + "vS2"


# --- lỗi ----------------------------------------------------------------------


def test_chua_co_videoid_video_dai_thi_loi_ma_1_va_khong_tai(
        tmp_path, monkeypatch, capsys):
    env = _short_env(tmp_path, long_done=False)
    c = FakeClient()
    assert _go(monkeypatch, env, c) == 1
    cap = capsys.readouterr()
    assert cap.err.startswith("lỗi:")
    assert cap.out.strip() == ""
    assert "insert_video" not in c.names
    assert not (env["ep"] / "ledger.json").exists() or not any(
        s.startswith("dang-short") for s in _stages(env))


def test_cong_chua_duyet_khong_dat_public(tmp_path, monkeypatch, capsys):
    env = _short_env(
        tmp_path, kenh={"channelId": CHANNEL, "firstVideoApproved": False})
    c = FakeClient()
    assert _go(monkeypatch, env, c, "--privacy", "public") == 1
    assert capsys.readouterr().err.startswith("lỗi:")
    assert "insert_video" not in c.names


def test_kenh_cua_token_lech_thi_dung_truoc_khi_tai(
        tmp_path, monkeypatch, capsys):
    env = _short_env(tmp_path)
    c = FakeClient(channel="UC_khac")
    assert _go(monkeypatch, env, c) == 1
    assert capsys.readouterr().err.startswith("lỗi:")
    assert c.names == ["channel_id"]


def test_thieu_shorts_json_loi_ma_1_khong_tai(tmp_path, monkeypatch, capsys):
    env = _short_env(tmp_path)
    (env["ep"] / "shorts.json").unlink()
    c = FakeClient()
    assert _go(monkeypatch, env, c) == 1
    assert capsys.readouterr().err.startswith("lỗi:")
    assert "insert_video" not in c.names


def test_thieu_mp4_cua_short_loi_ma_1_khong_tai(tmp_path, monkeypatch, capsys):
    env = _short_env(tmp_path)
    env["short_mp4"](1).unlink()
    c = FakeClient()
    assert _go(monkeypatch, env, c) == 1
    assert capsys.readouterr().err.startswith("lỗi:")
    assert "insert_video" not in c.names


@pytest.mark.parametrize("n", ["0", "9", "-1", "x"])
def test_so_short_ngoai_1_8_bi_tu_choi_va_khong_tai(
        tmp_path, monkeypatch, n):
    env = _short_env(tmp_path)
    # điều kiện cần: cờ --short có thật (n hợp lệ thì đăng được)
    ok = FakeClient(video_id="vS2")
    monkeypatch.setattr(upload, "make_client", lambda: ok)
    assert upload.main(_cli(env, "--short", "2")) == 0
    c = FakeClient()
    monkeypatch.setattr(upload, "make_client", lambda: c)
    try:
        code = upload.main(_cli(env, "--short", n))
    except SystemExit as e:
        code = e.code
    assert code not in (0, None)
    assert "insert_video" not in c.names
