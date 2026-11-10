"""Đề mục 13 [13-1]: upload.py với client Google giả."""

from __future__ import annotations

import json

import httplib2
import pytest
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
        "channel_id", "insert_video", "processing_status", "set_thumbnail",
        "insert_caption",
    ]


def test_doi_xu_ly_lap_toi_khi_succeeded_roi_moi_dat_thumbnail(tmp_path):
    env = make_upload_env(tmp_path)
    c = FakeClient(statuses=["processing", "processing", "succeeded"])
    _run(env, c)
    assert c.names == [
        "channel_id", "insert_video", "processing_status",
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
    assert sn["tags"] == ["tin học", "thử"]


def test_privacy_lay_tu_publish_json_khi_khong_truyen(tmp_path):
    env = make_upload_env(tmp_path, publish={"privacy": "unlisted"})
    c = FakeClient()
    r = _run(env, c)
    assert _body(c)["status"]["privacyStatus"] == "unlisted"
    assert r["privacy"] == "unlisted"


def test_tham_so_privacy_de_len_publish_json(tmp_path):
    env = make_upload_env(tmp_path, publish={"privacy": "unlisted"})
    c = FakeClient()
    r = _run(env, c, privacy="private")
    assert _body(c)["status"]["privacyStatus"] == "private"
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


def test_chay_lai_khong_ap_lai_privacy_len_video_da_tai(tmp_path):
    env = make_upload_env(tmp_path)
    with pytest.raises(RuntimeError):
        _run(env, FakeClient(fail_on="set_thumbnail"))
    c2 = FakeClient()
    r = _run(env, c2, privacy="unlisted")
    assert "insert_video" not in c2.names
    assert r["resumed"] is True


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
    assert _body(c)["status"]["privacyStatus"] == "public"


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


def test_cli_truyen_privacy_xuong_body(tmp_path, monkeypatch, capsys):
    env = make_upload_env(tmp_path)
    c = FakeClient()
    monkeypatch.setattr(upload, "make_client", lambda: c)
    assert upload.main(_cli_args(env, "--privacy", "unlisted")) == 0
    assert _body(c)["status"]["privacyStatus"] == "unlisted"


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


# --- video bị khoá: CAN_NGUOI_DUNG (D25) -------------------------------


@pytest.mark.parametrize("asked", ["unlisted", "public"])
def test_yeu_cau_cong_khai_ma_tra_private_thi_dung_can_nguoi_dung(
        tmp_path, asked):
    env = make_upload_env(
        tmp_path, kenh={"channelId": CHANNEL, "firstVideoApproved": True})
    c = FakeClient(video_id="vKhoa", returned_privacy="private")
    with pytest.raises(upload.NeedUser) as e:
        _run(env, c, privacy=asked)
    r = e.value.result
    assert r["state"] == "CAN_NGUOI_DUNG"
    assert r["videoId"] == "vKhoa"
    assert r["url"] == URL_PREFIX + "vKhoa"
    assert isinstance(r["reason"], str) and r["reason"].strip()
    assert c.names == ["channel_id", "insert_video"]
    assert _stages(env) == ["dang"]
    assert upload.recorded_video_id(env["ep"]) == "vKhoa"


def test_yeu_cau_private_tra_private_la_binh_thuong(tmp_path):
    env = make_upload_env(tmp_path)
    c = FakeClient(returned_privacy="private")
    r = _run(env, c, privacy="private")
    assert r["videoId"] == "vid123"
    assert "set_thumbnail" in c.names


def test_yeu_cau_unlisted_tra_unlisted_la_binh_thuong(tmp_path):
    env = make_upload_env(tmp_path)
    c = FakeClient(returned_privacy="unlisted")
    _run(env, c, privacy="unlisted")
    assert "insert_caption" in c.names


def test_thieu_status_privacy_trong_phan_hoi_thi_khong_chan(tmp_path):
    env = make_upload_env(tmp_path)
    c = FakeClient(returned_privacy="")
    _run(env, c, privacy="unlisted")
    assert "insert_caption" in c.names


def test_chay_lai_sau_can_nguoi_dung_khong_xet_lai_va_di_tiep(tmp_path):
    env = make_upload_env(tmp_path)
    with pytest.raises(upload.NeedUser):
        _run(env, FakeClient(video_id="vK", returned_privacy="private"),
             privacy="unlisted")
    c2 = FakeClient(returned_privacy="private")
    r = _run(env, c2, privacy="unlisted")
    assert r["resumed"] is True
    assert c2.names == [
        "channel_id", "processing_status", "set_thumbnail", "insert_caption",
    ]


def test_cli_video_bi_khoa_ma_3_json_stdout_va_dong_stderr(
        tmp_path, monkeypatch, capsys):
    env = make_upload_env(tmp_path)
    c = FakeClient(video_id="vCliK", returned_privacy="private")
    monkeypatch.setattr(upload, "make_client", lambda: c)
    code = upload.main(_cli_args(env, "--privacy", "unlisted"))
    cap = capsys.readouterr()
    assert code == 3
    d = json.loads(cap.out)
    assert d["state"] == "CAN_NGUOI_DUNG"
    assert d["videoId"] == "vCliK"
    assert d["url"] == URL_PREFIX + "vCliK"
    assert d["reason"]
    assert cap.err.startswith("CAN_NGUOI_DUNG:")
    assert "set_thumbnail" not in c.names


# --- HttpError (D25) -----------------------------------------------------


def _http_error(status=403, msg="quotaExceeded"):
    resp = httplib2.Response({"status": status})
    body = json.dumps({"error": {"message": msg}}).encode("utf-8")
    return HttpError(resp, body)


@pytest.mark.parametrize("step", ["channel_id", "insert_video",
                                  "processing_status", "set_thumbnail",
                                  "insert_caption"])
def test_http_error_o_moi_buoc_thoat_1_mot_dong_khong_traceback(
        tmp_path, monkeypatch, capsys, step):
    env = make_upload_env(tmp_path)
    c = FakeClient(fail_on=step, error=_http_error(403, "quotaExceeded"))
    monkeypatch.setattr(upload, "make_client", lambda: c)
    code = upload.main(_cli_args(env))
    cap = capsys.readouterr()
    assert code == 1
    assert cap.out.strip() == ""
    lines = cap.err.strip().splitlines()
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
