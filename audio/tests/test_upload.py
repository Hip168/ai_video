"""Đề mục 13 [13-1]: upload.py với client Google giả."""

from __future__ import annotations

import json

import httplib2
import pytest
from google.auth.exceptions import GoogleAuthError, RefreshError
from googleapiclient.errors import HttpError

from aivideo import upload
from aivideo.gates import GateError
from upload_support import (
    CHANNEL, CHAPTERS, SLUG, URL_PREFIX, FakeClient, make_upload_env,
    read_ledger, sha256,
)


@pytest.fixture(autouse=True)
def _nhanh(monkeypatch):
    monkeypatch.setattr(upload, "POLL_SECONDS", 0)


def _run(env, client, **kw):
    return upload.upload_episode(env["slug"], client=client, **env["kw"], **kw)


def _body(client):
    return next(c for c in client.calls if c[0] == "insert_video")[2]


# --- thứ tự và đối số ---------------------------------------------------


def test_tai_moi_goi_dung_thu_tu_kenh_insert_xu_ly_thumbnail_caption(tmp_path):
    env = make_upload_env(tmp_path)
    c = FakeClient()
    _run(env, c)
    assert c.names == [
        "channel_id", "find_uploaded", "insert_video", "processing_status",
        "set_thumbnail", "insert_caption",
    ]


def test_doi_xu_ly_lap_toi_khi_succeeded_roi_moi_dat_thumbnail(tmp_path):
    env = make_upload_env(tmp_path)
    c = FakeClient(statuses=["processing", "processing", "succeeded"])
    _run(env, c)
    assert c.names == [
        "channel_id", "find_uploaded", "insert_video", "processing_status",
        "processing_status", "processing_status", "set_thumbnail",
        "insert_caption",
    ]


def test_dung_duong_dan_file_va_video_id_cho_moi_buoc(tmp_path):
    env = make_upload_env(tmp_path)
    c = FakeClient(video_id="abcXYZ")
    _run(env, c)
    ins = next(x for x in c.calls if x[0] == "insert_video")
    assert ins[1] == env["mp4"]
    assert ("processing_status", "abcXYZ") in c.calls
    assert ("set_thumbnail", "abcXYZ", env["thumb"]) in c.calls
    assert (
        "insert_caption", "abcXYZ", env["srt"], "vi", "Tiếng Việt"
    ) in c.calls


def test_ket_qua_tra_ve_du_truong(tmp_path):
    env = make_upload_env(tmp_path)
    r = _run(env, FakeClient(video_id="v9"))
    assert r == {
        "videoId": "v9", "url": URL_PREFIX + "v9", "privacy": "private",
        "publishAt": None, "resumed": False,
    }


# --- body: privacy, publishAt, cờ, mô tả ------------------------------


def test_body_co_co_synthetic_false_va_khong_danh_cho_tre_em_false(tmp_path):
    env = make_upload_env(tmp_path)
    c = FakeClient()
    _run(env, c)
    st = _body(c)["status"]
    assert st["selfDeclaredMadeForKids"] is False
    assert st["containsSyntheticMedia"] is False


def test_body_snippet_title_tags_tu_publish_json(tmp_path):
    env = make_upload_env(tmp_path)
    c = FakeClient()
    _run(env, c)
    sn = _body(c)["snippet"]
    assert sn["title"] == "Tiêu đề thử"
    assert sn["tags"] == ["tin học", "thử", "aivideo:" + SLUG]


def test_privacy_lay_tu_publish_json_khi_khong_truyen(tmp_path):
    env = make_upload_env(tmp_path, publish={"privacy": "unlisted"})
    c = FakeClient()
    r = _run(env, c)
    assert ("set_privacy", "vid123", "unlisted") in c.calls
    assert r["privacy"] == "unlisted"


def test_tham_so_privacy_de_len_publish_json(tmp_path):
    env = make_upload_env(tmp_path, publish={"privacy": "unlisted"})
    c = FakeClient()
    r = _run(env, c, privacy="private")
    assert "set_privacy" not in c.names
    assert r["privacy"] == "private"


def test_publish_at_vao_body_va_ket_qua_khi_private(tmp_path):
    env = make_upload_env(tmp_path)
    c = FakeClient()
    r = _run(env, c, publish_at="2030-01-02T03:04:05Z")
    assert _body(c)["status"]["publishAt"] == "2030-01-02T03:04:05Z"
    assert _body(c)["status"]["privacyStatus"] == "private"
    assert r["publishAt"] == "2030-01-02T03:04:05Z"


def test_khong_co_publish_at_thi_body_khong_co_khoa_publish_at(tmp_path):
    env = make_upload_env(tmp_path)
    c = FakeClient()
    _run(env, c)
    assert "publishAt" not in _body(c)["status"]


def test_chuong_duoc_noi_vao_mo_ta_khi_chua_co(tmp_path):
    env = make_upload_env(tmp_path, publish={"description": "Mô tả ngắn.  \n"})
    c = FakeClient()
    _run(env, c)
    assert _body(c)["snippet"]["description"] == (
        "Mô tả ngắn.\n\n" + CHAPTERS
    )


def test_chuong_da_nam_trong_mo_ta_thi_giu_nguyen_mo_ta(tmp_path):
    desc = "Mở đầu.\n\n" + CHAPTERS + "\n\nCuối."
    env = make_upload_env(tmp_path, publish={"description": desc})
    c = FakeClient()
    _run(env, c)
    assert _body(c)["snippet"]["description"] == desc


# --- kênh lệch ----------------------------------------------------------


def test_channel_id_lech_thi_khong_tai_va_ne_loi(tmp_path):
    env = make_upload_env(tmp_path)
    c = FakeClient(channel="UC_kenh_khac")
    with pytest.raises(upload.UploadError):
        _run(env, c)
    assert c.names == ["channel_id"]
    assert not (env["ep"] / "ledger.json").exists()


def test_channel_id_so_sau_strip(tmp_path):
    env = make_upload_env(tmp_path, kenh={"channelId": f"  {CHANNEL}\n"})
    c = FakeClient()
    _run(env, c)
    assert "insert_video" in c.names


# --- sổ và chạy lại -----------------------------------------------------


def test_ghi_so_dang_ngay_sau_insert_voi_url_va_hash_mp4(tmp_path):
    env = make_upload_env(tmp_path)
    _run(env, FakeClient(video_id="vSo"))
    dang = [e for e in read_ledger(env["ep"])["entries"]
            if e["stage"] == "dang"]
    assert len(dang) == 1
    assert dang[0]["note"] == URL_PREFIX + "vSo"
    assert dang[0]["role"] == "publisher"
    assert dang[0]["artifactHash"] == sha256(env["mp4"])


def test_so_da_ghi_du_khi_xu_ly_that_bai_sau_insert(tmp_path):
    env = make_upload_env(tmp_path)
    c = FakeClient(video_id="vMat", statuses=["failed"])
    with pytest.raises(upload.UploadError):
        _run(env, c)
    assert upload.recorded_video_id(env["ep"]) == "vMat"


def test_chay_lai_sau_loi_thumbnail_khong_tao_video_thu_hai(tmp_path):
    env = make_upload_env(tmp_path)
    c1 = FakeClient(video_id="vMot", fail_on="set_thumbnail")
    with pytest.raises(RuntimeError):
        _run(env, c1)
    c2 = FakeClient(video_id="vHai")
    r = _run(env, c2)
    assert "insert_video" not in c2.names
    assert r["videoId"] == "vMot"
    assert r["resumed"] is True
    assert ("set_thumbnail", "vMot", env["thumb"]) in c2.calls
    dang = [e for e in read_ledger(env["ep"])["entries"]
            if e["stage"] == "dang"]
    assert len(dang) == 1


def test_chay_lai_voi_privacy_khac_van_chi_dat_quyen_o_cuoi_khong_tai_lai(
        tmp_path):
    env = make_upload_env(tmp_path)
    with pytest.raises(RuntimeError):
        _run(env, FakeClient(fail_on="set_thumbnail"))
    c2 = FakeClient()
    r = _run(env, c2, privacy="unlisted")
    assert "insert_video" not in c2.names
    assert "find_uploaded" not in c2.names
    assert r["resumed"] is True
    assert c2.names == [
        "channel_id", "processing_status", "set_thumbnail", "insert_caption",
        "set_privacy", "privacy_status",
    ]


def test_so_hong_chuoi_hash_thi_loi_va_khong_tai(tmp_path):
    env = make_upload_env(tmp_path)
    _run(env, FakeClient())
    p = env["ep"] / "ledger.json"
    doc = json.loads(p.read_text(encoding="utf-8"))
    doc["entries"][-1]["note"] = URL_PREFIX + "bi-sua"
    p.write_text(json.dumps(doc), encoding="utf-8")
    c = FakeClient()
    with pytest.raises((upload.UploadError, GateError)):
        _run(env, c)
    assert "insert_video" not in c.names


# --- trạng thái xử lý ---------------------------------------------------


@pytest.mark.parametrize("st", ["failed", "rejected", "terminated"])
def test_xu_ly_that_bai_thi_loi_va_khong_dat_thumbnail(tmp_path, st):
    env = make_upload_env(tmp_path)
    c = FakeClient(statuses=["processing", st])
    with pytest.raises(upload.UploadError):
        _run(env, c)
    assert "set_thumbnail" not in c.names
    assert "insert_caption" not in c.names


def test_qua_thoi_gian_cho_thi_loi_khong_dat_thumbnail(tmp_path, monkeypatch):
    monkeypatch.setattr(upload, "MAX_WAIT_SECONDS", 0)
    env = make_upload_env(tmp_path)
    c = FakeClient(statuses=["processing"])
    with pytest.raises(upload.UploadError):
        _run(env, c)
    assert "set_thumbnail" not in c.names


# --- kiểm trước khi tải: lỗi thì không gọi client ----------------------


def _bi_chan(tmp_path, *, publish=None, kenh=None, files=True, **kw):
    env = make_upload_env(tmp_path, publish=publish, kenh=kenh, files=files)
    c = FakeClient()
    with pytest.raises(upload.UploadError):
        _run(env, c, **kw)
    assert c.calls == []


def test_public_khi_chua_duyet_video_dau_bi_chan(tmp_path):
    _bi_chan(tmp_path, privacy="public")


def test_public_khi_first_video_approved_false_bi_chan(tmp_path):
    _bi_chan(tmp_path, kenh={"channelId": CHANNEL, "firstVideoApproved": False},
             privacy="public")


def test_public_tu_publish_json_cung_bi_chan_khi_chua_duyet(tmp_path):
    _bi_chan(tmp_path, publish={"privacy": "public"})


def test_public_duoc_khi_first_video_approved_true(tmp_path):
    env = make_upload_env(
        tmp_path, kenh={"channelId": CHANNEL, "firstVideoApproved": True})
    c = FakeClient()
    r = _run(env, c, privacy="public")
    assert r["privacy"] == "public"
    assert _body(c)["status"]["privacyStatus"] == "private"
    assert ("set_privacy", "vid123", "public") in c.calls


def test_privacy_ngoai_ba_gia_tri_bi_chan(tmp_path):
    _bi_chan(tmp_path, privacy="secret")


def test_publish_json_khong_co_privacy_va_khong_truyen_bi_chan(tmp_path):
    _bi_chan(tmp_path, publish={"privacy": ...})


def test_publish_at_voi_unlisted_bi_chan(tmp_path):
    _bi_chan(tmp_path, privacy="unlisted", publish_at="2030-01-02T03:04:05Z")


def test_publish_at_khong_phai_iso_bi_chan(tmp_path):
    _bi_chan(tmp_path, publish_at="mai 9 giờ")


def test_synthetic_true_trong_publish_json_bi_chan(tmp_path):
    _bi_chan(tmp_path, publish={"containsSyntheticMedia": True})


def test_synthetic_thieu_trong_publish_json_bi_chan(tmp_path):
    _bi_chan(tmp_path, publish={"containsSyntheticMedia": ...})


@pytest.mark.parametrize("key", ["title", "description", "chapters",
                                 "thumbnail", "tags"])
def test_publish_json_thieu_truong_bat_buoc_bi_chan(tmp_path, key):
    _bi_chan(tmp_path, publish={key: ...})


def test_tieu_de_rong_bi_chan(tmp_path):
    _bi_chan(tmp_path, publish={"title": "   "})


def test_tags_khong_phai_mang_bi_chan(tmp_path):
    _bi_chan(tmp_path, publish={"tags": "a,b"})


@pytest.mark.parametrize("which", ["mp4", "srt", "thumb"])
def test_thieu_file_bi_chan(tmp_path, which):
    env = make_upload_env(tmp_path)
    env[which].unlink()
    c = FakeClient()
    with pytest.raises(upload.UploadError):
        _run(env, c)
    assert c.calls == []


def test_kenh_json_thieu_channel_id_bi_chan(tmp_path):
    _bi_chan(tmp_path, kenh={"firstVideoApproved": True})


def test_kenh_json_khong_ton_tai_bi_chan(tmp_path):
    env = make_upload_env(tmp_path)
    env["kenh"].unlink()
    c = FakeClient()
    with pytest.raises(upload.UploadError):
        _run(env, c)
    assert c.calls == []


def test_thieu_publish_json_bi_chan(tmp_path):
    env = make_upload_env(tmp_path)
    (env["ep"] / "publish.json").unlink()
    c = FakeClient()
    with pytest.raises(upload.UploadError):
        _run(env, c)
    assert c.calls == []


# --- dòng lệnh ----------------------------------------------------------


def _cli_args(env, *extra):
    return [
        env["slug"], "--episodes-dir", str(env["eps"]),
        "--out-dir", str(env["out"]), "--kenh", str(env["kenh"]), *extra,
    ]


def test_cli_thanh_cong_ma_0_va_in_mot_json(tmp_path, monkeypatch, capsys):
    env = make_upload_env(tmp_path)
    c = FakeClient(video_id="vCli")
    monkeypatch.setattr(upload, "make_client", lambda: c)
    code = upload.main(_cli_args(env, "--publish-at", "2030-01-02T03:04:05Z"))
    out = capsys.readouterr().out
    assert code == 0
    assert json.loads(out) == {
        "videoId": "vCli", "url": URL_PREFIX + "vCli", "privacy": "private",
        "publishAt": "2030-01-02T03:04:05Z", "resumed": False,
    }


def test_cli_truyen_privacy_xuong_set_privacy(tmp_path, monkeypatch, capsys):
    env = make_upload_env(tmp_path)
    c = FakeClient()
    monkeypatch.setattr(upload, "make_client", lambda: c)
    assert upload.main(_cli_args(env, "--privacy", "unlisted")) == 0
    assert _body(c)["status"]["privacyStatus"] == "private"
    assert ("set_privacy", "vid123", "unlisted") in c.calls


def test_cli_kenh_lech_ma_1_loi_ra_stderr_khong_json_stdout(
        tmp_path, monkeypatch, capsys):
    env = make_upload_env(tmp_path)
    c = FakeClient(channel="UC_khac")
    monkeypatch.setattr(upload, "make_client", lambda: c)
    code = upload.main(_cli_args(env))
    cap = capsys.readouterr()
    assert code == 1
    assert cap.out.strip() == ""
    assert cap.err.startswith("lỗi:")
    assert c.names == ["channel_id"]


def test_cli_slug_sai_dang_ma_1(tmp_path, monkeypatch, capsys):
    env = make_upload_env(tmp_path)
    monkeypatch.setattr(upload, "make_client", lambda: FakeClient())
    args = _cli_args(env)
    args[0] = "Slug Sai!"
    assert upload.main(args) == 1
    assert capsys.readouterr().err.startswith("lỗi:")


def test_cli_privacy_ngoai_ba_gia_tri_ma_2(tmp_path, monkeypatch):
    env = make_upload_env(tmp_path)
    monkeypatch.setattr(upload, "make_client", lambda: FakeClient())
    with pytest.raises(SystemExit) as e:
        upload.main(_cli_args(env, "--privacy", "secret"))
    assert e.value.code == 2


# --- sổ từng bước và chạy lại (D25) ------------------------------------


def _stages(env):
    return [e["stage"] for e in read_ledger(env["ep"])["entries"]]


def _entry(env, stage):
    es = [e for e in read_ledger(env["ep"])["entries"] if e["stage"] == stage]
    assert len(es) == 1, es
    return es[0]


def test_tai_xong_so_co_du_ba_buoc_dung_url_va_hash(tmp_path):
    env = make_upload_env(tmp_path)
    _run(env, FakeClient(video_id="vBa"))
    assert _stages(env) == ["dang", "dang-thumbnail", "dang-caption"]
    url = URL_PREFIX + "vBa"
    for st, f in (("dang", "mp4"), ("dang-thumbnail", "thumb"),
                  ("dang-caption", "srt")):
        e = _entry(env, st)
        assert e["note"] == url
        assert e["role"] == "publisher"
        assert e["artifactHash"] == sha256(env[f])


def test_hang_so_stage_dung_ten(tmp_path):
    assert upload.STAGE == "dang"
    assert upload.STAGE_THUMBNAIL == "dang-thumbnail"
    assert upload.STAGE_CAPTION == "dang-caption"
    assert upload.STAGE_PRIVACY == "dang-privacy"


def test_loi_thumbnail_thi_so_chua_co_buoc_thumbnail_va_caption(tmp_path):
    env = make_upload_env(tmp_path)
    with pytest.raises(RuntimeError):
        _run(env, FakeClient(fail_on="set_thumbnail"))
    assert _stages(env) == ["dang"]


def test_loi_caption_thi_so_co_thumbnail_nhung_chua_co_caption(tmp_path):
    env = make_upload_env(tmp_path)
    with pytest.raises(RuntimeError):
        _run(env, FakeClient(fail_on="insert_caption"))
    assert _stages(env) == ["dang", "dang-thumbnail"]


def test_chay_lai_sau_loi_caption_chi_goi_kenh_xu_ly_caption(tmp_path):
    env = make_upload_env(tmp_path)
    with pytest.raises(RuntimeError):
        _run(env, FakeClient(video_id="vC", fail_on="insert_caption"))
    c2 = FakeClient(video_id="khac")
    r = _run(env, c2)
    assert c2.names == ["channel_id", "processing_status", "insert_caption"]
    assert r["videoId"] == "vC"
    assert r["resumed"] is True
    assert _stages(env) == ["dang", "dang-thumbnail", "dang-caption"]


def test_chay_lai_sau_loi_thumbnail_dat_thumbnail_roi_caption(tmp_path):
    env = make_upload_env(tmp_path)
    with pytest.raises(RuntimeError):
        _run(env, FakeClient(video_id="vT", fail_on="set_thumbnail"))
    c2 = FakeClient()
    _run(env, c2)
    assert c2.names == [
        "channel_id", "processing_status", "set_thumbnail", "insert_caption",
    ]
    assert _stages(env) == ["dang", "dang-thumbnail", "dang-caption"]


def test_chay_lai_khi_da_xong_ca_ba_buoc_chi_goi_channel_id(tmp_path):
    env = make_upload_env(tmp_path)
    _run(env, FakeClient(video_id="vXong"))
    c2 = FakeClient()
    r = _run(env, c2)
    assert c2.names == ["channel_id"]
    assert r == {
        "videoId": "vXong", "url": URL_PREFIX + "vXong",
        "privacy": "private", "publishAt": None, "resumed": True,
    }
    assert _stages(env) == ["dang", "dang-thumbnail", "dang-caption"]


def test_chay_lai_khi_da_xong_van_chan_neu_kenh_lech(tmp_path):
    env = make_upload_env(tmp_path)
    _run(env, FakeClient())
    c2 = FakeClient(channel="UC_khac")
    with pytest.raises(upload.UploadError):
        _run(env, c2)
    assert c2.names == ["channel_id"]


def test_buoc_cua_video_khac_khong_tinh_la_da_xong(tmp_path):
    env = make_upload_env(tmp_path)
    with pytest.raises(RuntimeError):
        _run(env, FakeClient(video_id="vMot", fail_on="set_thumbnail"))
    first = read_ledger(env["ep"])["entries"][0]
    upload.Ledger(env["ep"]).add(
        stage="dang-thumbnail", role="publisher",
        note=URL_PREFIX + "vKhac", script_hash=first["scriptHash"],
        artifact_hash=sha256(env["thumb"]),
    )
    c2 = FakeClient()
    _run(env, c2)
    assert "set_thumbnail" in c2.names


def test_caption_da_co_trong_so_thi_khong_goi_lai(tmp_path):
    env = make_upload_env(tmp_path)
    with pytest.raises(RuntimeError):
        _run(env, FakeClient(video_id="vCap", fail_on="set_thumbnail"))
    first = read_ledger(env["ep"])["entries"][0]
    upload.Ledger(env["ep"]).add(
        stage="dang-caption", role="publisher", note=URL_PREFIX + "vCap",
        script_hash=first["scriptHash"], artifact_hash=sha256(env["srt"]),
    )
    c2 = FakeClient()
    _run(env, c2)
    assert "insert_caption" not in c2.names
    assert "set_thumbnail" in c2.names


# --- insert private, đặt quyền sau cùng, video bị khoá (D25) ----------


APPROVED = {"channelId": CHANNEL, "firstVideoApproved": True}


@pytest.mark.parametrize("asked", ["unlisted", "public"])
def test_insert_luon_private_roi_set_privacy_va_doc_lai_sau_cung(
        tmp_path, asked):
    env = make_upload_env(tmp_path, kenh=APPROVED)
    c = FakeClient(video_id="vQ")
    r = _run(env, c, privacy=asked)
    assert _body(c)["status"]["privacyStatus"] == "private"
    assert c.names == [
        "channel_id", "find_uploaded", "insert_video", "processing_status",
        "set_thumbnail", "insert_caption", "set_privacy", "privacy_status",
    ]
    assert ("set_privacy", "vQ", asked) in c.calls
    assert ("privacy_status", "vQ") in c.calls
    assert r["privacy"] == asked


@pytest.mark.parametrize("asked", ["unlisted", "public"])
def test_doc_lai_van_private_thi_dung_can_nguoi_dung(tmp_path, asked):
    env = make_upload_env(tmp_path, kenh=APPROVED)
    c = FakeClient(video_id="vKhoa", privacy_now="private")
    with pytest.raises(upload.NeedUser) as e:
        _run(env, c, privacy=asked)
    r = e.value.result
    assert r["state"] == "CAN_NGUOI_DUNG"
    assert r["videoId"] == "vKhoa"
    assert r["url"] == URL_PREFIX + "vKhoa"
    assert isinstance(r["reason"], str) and r["reason"].strip()
    assert c.names[-2:] == ["set_privacy", "privacy_status"]
    assert _stages(env) == ["dang", "dang-thumbnail", "dang-caption"]
    assert upload.recorded_video_id(env["ep"]) == "vKhoa"


def test_doc_lai_het_private_thi_ghi_muc_dang_privacy_voi_note_va_hash_null(
        tmp_path):
    env = make_upload_env(tmp_path)
    _run(env, FakeClient(video_id="vOk"), privacy="unlisted")
    e = _entry(env, "dang-privacy")
    assert e["note"] == URL_PREFIX + "vOk privacy=unlisted"
    assert e["role"] == "publisher"
    assert e["artifactHash"] is None
    assert _stages(env) == [
        "dang", "dang-thumbnail", "dang-caption", "dang-privacy"]


def test_yeu_cau_private_khong_goi_set_privacy_va_privacy_status(tmp_path):
    env = make_upload_env(tmp_path)
    c = FakeClient()
    r = _run(env, c, privacy="private")
    assert r["videoId"] == "vid123"
    assert "set_privacy" not in c.names
    assert "privacy_status" not in c.names
    assert _stages(env) == ["dang", "dang-thumbnail", "dang-caption"]


def test_yeu_cau_private_kem_publish_at_van_khong_goi_set_privacy(tmp_path):
    env = make_upload_env(tmp_path)
    c = FakeClient()
    _run(env, c, publish_at="2030-01-02T03:04:05Z")
    assert "set_privacy" not in c.names
    assert "privacy_status" not in c.names


def test_chay_lai_sau_ma_3_goi_lai_set_privacy_va_doc_lai(tmp_path):
    env = make_upload_env(tmp_path)
    with pytest.raises(upload.NeedUser):
        _run(env, FakeClient(video_id="vK", privacy_now="private"),
             privacy="unlisted")
    c2 = FakeClient()
    r = _run(env, c2, privacy="unlisted")
    assert r["resumed"] is True
    assert c2.names == [
        "channel_id", "processing_status", "set_privacy", "privacy_status"]
    assert ("set_privacy", "vK", "unlisted") in c2.calls
    assert _stages(env) == [
        "dang", "dang-thumbnail", "dang-caption", "dang-privacy"]


def test_chay_lai_sau_ma_3_van_private_thi_lai_ma_3_khong_ghi_so(tmp_path):
    env = make_upload_env(tmp_path)
    with pytest.raises(upload.NeedUser):
        _run(env, FakeClient(video_id="vK", privacy_now="private"),
             privacy="unlisted")
    c2 = FakeClient(privacy_now="private")
    with pytest.raises(upload.NeedUser) as e:
        _run(env, c2, privacy="unlisted")
    assert c2.names == [
        "channel_id", "processing_status", "set_privacy", "privacy_status"]
    assert e.value.result["videoId"] == "vK"
    assert "dang-privacy" not in _stages(env)


def test_chay_lai_sau_loi_caption_voi_public_dat_quyen_o_cuoi(tmp_path):
    env = make_upload_env(tmp_path, kenh=APPROVED)
    with pytest.raises(RuntimeError):
        _run(env, FakeClient(fail_on="insert_caption"), privacy="public")
    c2 = FakeClient()
    _run(env, c2, privacy="public")
    assert c2.names == [
        "channel_id", "processing_status", "insert_caption", "set_privacy",
        "privacy_status",
    ]


def test_chay_lai_privacy_lay_tu_publish_json_cung_dat_quyen(tmp_path):
    env = make_upload_env(tmp_path, publish={"privacy": "unlisted"})
    with pytest.raises(RuntimeError):
        _run(env, FakeClient(fail_on="set_thumbnail"))
    c2 = FakeClient(privacy_now="private")
    with pytest.raises(upload.NeedUser):
        _run(env, c2)
    assert c2.names[-2:] == ["set_privacy", "privacy_status"]


def test_chay_lai_yeu_cau_private_thi_khong_hoi_privacy_status(tmp_path):
    env = make_upload_env(tmp_path)
    with pytest.raises(RuntimeError):
        _run(env, FakeClient(fail_on="set_thumbnail"))
    c2 = FakeClient(privacy_now="private")
    _run(env, c2, privacy="private")
    assert "privacy_status" not in c2.names
    assert "set_privacy" not in c2.names


def test_chay_lai_khi_da_xong_ca_bon_buoc_chi_goi_channel_id(tmp_path):
    env = make_upload_env(tmp_path, publish={"privacy": "unlisted"})
    _run(env, FakeClient())
    c2 = FakeClient(privacy_now="private")
    r = _run(env, c2)
    assert c2.names == ["channel_id"]
    assert r["resumed"] is True


def test_dang_privacy_cua_quyen_khac_khong_tinh_la_da_xong(tmp_path):
    env = make_upload_env(tmp_path, kenh=APPROVED)
    _run(env, FakeClient(), privacy="unlisted")
    c2 = FakeClient()
    _run(env, c2, privacy="public")
    assert c2.names == [
        "channel_id", "processing_status", "set_privacy", "privacy_status"]
    assert ("set_privacy", "vid123", "public") in c2.calls


def test_cli_chay_lai_van_private_ma_3_va_json_stdout(
        tmp_path, monkeypatch, capsys):
    env = make_upload_env(tmp_path)
    with pytest.raises(RuntimeError):
        _run(env, FakeClient(video_id="vR", fail_on="set_thumbnail"),
             privacy="unlisted")
    c2 = FakeClient(privacy_now="private")
    monkeypatch.setattr(upload, "make_client", lambda: c2)
    capsys.readouterr()
    code = upload.main(_cli_args(env, "--privacy", "unlisted"))
    cap = capsys.readouterr()
    assert code == 3
    assert json.loads(cap.out)["videoId"] == "vR"
    assert cap.err.startswith("CAN_NGUOI_DUNG:")


def test_cli_video_bi_khoa_ma_3_json_stdout_va_dong_stderr(
        tmp_path, monkeypatch, capsys):
    env = make_upload_env(tmp_path)
    c = FakeClient(video_id="vCliK", privacy_now="private")
    monkeypatch.setattr(upload, "make_client", lambda: c)
    code = upload.main(_cli_args(env, "--privacy", "unlisted"))
    cap = capsys.readouterr()
    assert code == 3
    d = json.loads(cap.out)
    assert d["state"] == "CAN_NGUOI_DUNG"
    assert d["videoId"] == "vCliK"
    assert d["url"] == URL_PREFIX + "vCliK"
    assert d["reason"]
    assert cap.err.splitlines()[0] == "videoId: vCliK"
    assert cap.err.splitlines()[-1].startswith("CAN_NGUOI_DUNG:")
    assert c.names[-1] == "privacy_status"


# --- mốc aivideo:<slug>, tìm video cũ, in videoId (D25) ---------------


def test_tag_cuoi_cung_la_moc_aivideo_slug(tmp_path):
    env = make_upload_env(tmp_path)
    c = FakeClient()
    _run(env, c)
    assert _body(c)["snippet"]["tags"][-1] == "aivideo:" + SLUG
    assert upload.TAG_PREFIX == "aivideo:"


def test_moc_khong_bi_nhan_doi_neu_publish_json_da_co_san_tags(tmp_path):
    env = make_upload_env(tmp_path, publish={"tags": []})
    c = FakeClient()
    _run(env, c)
    assert _body(c)["snippet"]["tags"] == ["aivideo:" + SLUG]


def test_find_uploaded_duoc_goi_dung_moc_truoc_insert(tmp_path):
    env = make_upload_env(tmp_path)
    c = FakeClient()
    _run(env, c)
    assert ("find_uploaded", "aivideo:" + SLUG) in c.calls
    assert c.names.index("find_uploaded") < c.names.index("insert_video")
    assert c.names.index("channel_id") < c.names.index("find_uploaded")


def test_tim_thay_video_cu_thi_khong_insert_va_di_tiep(tmp_path):
    env = make_upload_env(tmp_path)
    c = FakeClient(found="vCu", video_id="vMoi")
    r = _run(env, c)
    assert "insert_video" not in c.names
    assert c.names == [
        "channel_id", "find_uploaded", "processing_status", "set_thumbnail",
        "insert_caption",
    ]
    assert ("set_thumbnail", "vCu", env["thumb"]) in c.calls
    assert r == {
        "videoId": "vCu", "url": URL_PREFIX + "vCu", "privacy": "private",
        "publishAt": None, "resumed": True,
    }


def test_tim_thay_video_cu_thi_ghi_muc_dang_cho_video_do(tmp_path):
    env = make_upload_env(tmp_path)
    _run(env, FakeClient(found="vCu"))
    e = _entry(env, "dang")
    assert e["note"] == URL_PREFIX + "vCu"
    assert e["role"] == "publisher"
    assert e["artifactHash"] == sha256(env["mp4"])
    assert upload.recorded_video_id(env["ep"]) == "vCu"


def test_tim_thay_video_cu_va_privacy_unlisted_dat_quyen_sau_cung(tmp_path):
    env = make_upload_env(tmp_path)
    c = FakeClient(found="vCu")
    _run(env, c, privacy="unlisted")
    assert c.names[-2:] == ["set_privacy", "privacy_status"]
    assert ("set_privacy", "vCu", "unlisted") in c.calls


def test_so_da_co_video_id_thi_khong_goi_find_uploaded_va_insert(tmp_path):
    env = make_upload_env(tmp_path)
    with pytest.raises(RuntimeError):
        _run(env, FakeClient(video_id="vSo", fail_on="set_thumbnail"))
    c2 = FakeClient(found="vKhac")
    r = _run(env, c2)
    assert "find_uploaded" not in c2.names
    assert "insert_video" not in c2.names
    assert r["videoId"] == "vSo"


def test_kenh_lech_thi_khong_goi_find_uploaded(tmp_path):
    env = make_upload_env(tmp_path)
    c = FakeClient(channel="UC_khac", found="vCu")
    with pytest.raises(upload.UploadError):
        _run(env, c)
    assert c.names == ["channel_id"]


def test_chay_lai_sau_khi_ghi_so_hong_tim_lai_video_theo_moc(tmp_path):
    env = make_upload_env(tmp_path)
    c1 = FakeClient(video_id="vCu", fail_on="processing_status")
    with pytest.raises(RuntimeError):
        _run(env, c1)
    (env["ep"] / "ledger.json").unlink()
    c2 = FakeClient(found="vCu", video_id="vMoi")
    r = _run(env, c2)
    assert "insert_video" not in c2.names
    assert r["videoId"] == "vCu"
    assert r["resumed"] is True


def test_in_video_id_ra_stderr_sau_insert(tmp_path, capsys):
    env = make_upload_env(tmp_path)
    _run(env, FakeClient(video_id="vIn"))
    assert capsys.readouterr().err.splitlines() == ["videoId: vIn"]


def test_in_video_id_ra_stderr_ca_khi_tim_thay_video_cu(tmp_path, capsys):
    env = make_upload_env(tmp_path)
    _run(env, FakeClient(found="vCu"))
    assert capsys.readouterr().err.splitlines() == ["videoId: vCu"]


def test_chay_lai_khi_so_da_co_video_id_khong_in_lai_video_id(
        tmp_path, capsys):
    env = make_upload_env(tmp_path)
    _run(env, FakeClient(video_id="vSo"))
    capsys.readouterr()
    _run(env, FakeClient())
    assert capsys.readouterr().err == ""


def test_video_id_duoc_in_truoc_khi_ghi_so_dang(tmp_path, monkeypatch, capsys):
    env = make_upload_env(tmp_path)
    seen = {}
    real_add = upload.Ledger.add

    def spy(self, *a, **kw):
        if kw.get("stage") == "dang":
            seen["stderr"] = capsys.readouterr().err
        return real_add(self, *a, **kw)

    monkeypatch.setattr(upload.Ledger, "add", spy)
    _run(env, FakeClient(video_id="vTruoc"))
    assert seen["stderr"] == "videoId: vTruoc\n"


def _so_loi_o(monkeypatch, stage):
    real_add = upload.Ledger.add

    def boom(self, *a, **kw):
        if kw.get("stage") == stage:
            raise OSError("đĩa đầy")
        return real_add(self, *a, **kw)

    monkeypatch.setattr(upload.Ledger, "add", boom)


def test_ghi_so_dang_loi_van_in_video_id_va_bao_loi_ro(
        tmp_path, monkeypatch, capsys):
    env = make_upload_env(tmp_path)
    _so_loi_o(monkeypatch, "dang")
    c = FakeClient(video_id="vMat")
    monkeypatch.setattr(upload, "make_client", lambda: c)
    code = upload.main(_cli_args(env))
    cap = capsys.readouterr()
    assert code == 1
    assert cap.out.strip() == ""
    lines = cap.err.strip().splitlines()
    assert lines[0] == "videoId: vMat"
    assert len(lines) == 2
    assert lines[1].startswith("lỗi: ")
    assert "vMat" in lines[1]
    assert URL_PREFIX + "vMat" in lines[1]
    assert "dang" in lines[1]
    assert "aivideo:" + SLUG in lines[1]
    assert "đĩa đầy" in lines[1]
    assert "set_thumbnail" not in c.names
    assert "processing_status" not in c.names


def test_ghi_so_dang_loi_o_ham_chinh_nem_upload_error_co_video_id(
        tmp_path, monkeypatch):
    env = make_upload_env(tmp_path)
    _so_loi_o(monkeypatch, "dang")
    with pytest.raises(upload.UploadError) as e:
        _run(env, FakeClient(video_id="vMat2"))
    assert URL_PREFIX + "vMat2" in str(e.value)


@pytest.mark.parametrize("stage", ["dang-thumbnail", "dang-caption"])
def test_ghi_so_buoc_sau_loi_thi_bao_ten_khau_va_video_id(
        tmp_path, monkeypatch, stage):
    env = make_upload_env(tmp_path)
    _so_loi_o(monkeypatch, stage)
    with pytest.raises(upload.UploadError) as e:
        _run(env, FakeClient(video_id="vK2"))
    msg = str(e.value)
    assert "vK2" in msg and stage in msg


def test_ghi_so_dang_privacy_loi_thi_bao_khau_dang_privacy(
        tmp_path, monkeypatch):
    env = make_upload_env(tmp_path)
    _so_loi_o(monkeypatch, "dang-privacy")
    with pytest.raises(upload.UploadError) as e:
        _run(env, FakeClient(video_id="vP"), privacy="unlisted")
    assert "dang-privacy" in str(e.value)
    assert "vP" in str(e.value)


def test_tinh_hash_that_bai_thi_chua_goi_client(tmp_path, monkeypatch):
    env = make_upload_env(tmp_path)

    def boom(path):
        raise OSError("không đọc được")

    monkeypatch.setattr(upload, "sha256_file", boom)
    c = FakeClient()
    with pytest.raises(OSError):
        _run(env, c)
    assert c.calls == []


# --- GoogleAuthError (D25) ----------------------------------------------


def test_auth_hong_tu_make_client_ma_1_mot_dong_chi_dan_chay_auth(
        tmp_path, monkeypatch, capsys):
    env = make_upload_env(tmp_path)

    def boom():
        raise RefreshError("Token has been expired or revoked.")

    monkeypatch.setattr(upload, "make_client", boom)
    code = upload.main(_cli_args(env))
    cap = capsys.readouterr()
    assert code == 1
    assert cap.out.strip() == ""
    lines = cap.err.strip().splitlines()
    assert len(lines) == 1
    assert lines[0].startswith("lỗi: đăng nhập Google hỏng")
    assert "expired or revoked" in lines[0]
    assert "python -m aivideo.upload auth" in lines[0]
    assert "Traceback" not in cap.err


@pytest.mark.parametrize("step", ["channel_id", "find_uploaded",
                                  "insert_video", "processing_status",
                                  "set_thumbnail", "insert_caption"])
def test_auth_hong_tu_client_o_moi_buoc_ma_1_khong_traceback(
        tmp_path, monkeypatch, capsys, step):
    env = make_upload_env(tmp_path)
    c = FakeClient(fail_on=step, error=GoogleAuthError("het han"))
    monkeypatch.setattr(upload, "make_client", lambda: c)
    code = upload.main(_cli_args(env))
    cap = capsys.readouterr()
    assert code == 1
    assert cap.out.strip() == ""
    last = cap.err.strip().splitlines()[-1]
    assert last.startswith("lỗi: đăng nhập Google hỏng")
    assert "het han" in last
    assert "Traceback" not in cap.err


def test_auth_hong_khi_set_privacy_cua_lenh_set_privacy_cung_ma_1(
        tmp_path, monkeypatch, capsys):
    env = make_upload_env(tmp_path)
    _run(env, FakeClient())
    monkeypatch.setattr(
        upload, "make_client",
        lambda: FakeClient(fail_on="set_privacy",
                           error=GoogleAuthError("het han")))
    capsys.readouterr()
    code = upload.main([
        env["slug"], "--episodes-dir", str(env["eps"]),
        "--kenh", str(env["kenh"]), "--set-privacy", "unlisted"])
    cap = capsys.readouterr()
    assert code == 1
    assert cap.err.startswith("lỗi: đăng nhập Google hỏng")


# --- HttpError (D25) -----------------------------------------------------


def _http_error(status=403, msg="quotaExceeded"):
    resp = httplib2.Response({"status": status})
    body = json.dumps({"error": {"message": msg}}).encode("utf-8")
    return HttpError(resp, body)


@pytest.mark.parametrize("step", ["channel_id", "find_uploaded",
                                  "insert_video", "processing_status",
                                  "set_thumbnail", "insert_caption",
                                  "set_privacy", "privacy_status"])
def test_http_error_o_moi_buoc_thoat_1_mot_dong_khong_traceback(
        tmp_path, monkeypatch, capsys, step):
    env = make_upload_env(tmp_path)
    c = FakeClient(fail_on=step, error=_http_error(403, "quotaExceeded"))
    monkeypatch.setattr(upload, "make_client", lambda: c)
    code = upload.main(_cli_args(env, "--privacy", "unlisted"))
    cap = capsys.readouterr()
    assert code == 1
    assert cap.out.strip() == ""
    # dòng `videoId:` (nếu đã có video) là nhật ký; lỗi luôn đúng một dòng.
    lines = [x for x in cap.err.strip().splitlines()
             if not x.startswith("videoId: ")]
    assert len(lines) == 1
    assert lines[0].startswith("lỗi: Google trả HTTP 403: ")
    assert "quotaExceeded" in lines[0]
    assert "Traceback" not in cap.err


def test_http_error_ma_trang_thai_khac_in_dung_ma(
        tmp_path, monkeypatch, capsys):
    env = make_upload_env(tmp_path)
    c = FakeClient(fail_on="insert_video", error=_http_error(500, "backend"))
    monkeypatch.setattr(upload, "make_client", lambda: c)
    assert upload.main(_cli_args(env)) == 1
    assert "HTTP 500" in capsys.readouterr().err


def test_loi_http_sau_insert_van_giu_video_id_trong_so(
        tmp_path, monkeypatch, capsys):
    env = make_upload_env(tmp_path)
    c = FakeClient(video_id="vGiu", fail_on="set_thumbnail",
                   error=_http_error())
    monkeypatch.setattr(upload, "make_client", lambda: c)
    assert upload.main(_cli_args(env)) == 1
    assert upload.recorded_video_id(env["ep"]) == "vGiu"
