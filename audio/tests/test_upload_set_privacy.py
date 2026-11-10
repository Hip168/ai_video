"""Đề mục 13 [13-1]: `--set-privacy` (đổi quyền riêng tư video đã đăng)."""

from __future__ import annotations

import json

import httplib2
import pytest
from googleapiclient.errors import HttpError

from aivideo import upload
from upload_support import (
    CHANNEL, URL_PREFIX, FakeClient, make_upload_env, read_ledger,
)

APPROVED = {"channelId": CHANNEL, "firstVideoApproved": True}


def _da_dang(tmp_path, kenh=None, video_id="vDang"):
    """Tập đã đăng một lần (sổ có videoId)."""
    env = make_upload_env(tmp_path, kenh=kenh)
    upload.upload_episode(
        env["slug"], client=FakeClient(video_id=video_id), **env["kw"])
    return env


def _set(env, client, privacy):
    return upload.set_video_privacy(
        env["slug"], client=client, privacy=privacy,
        episodes_dir=env["eps"], kenh_path=env["kenh"])


def _entries(env, stage):
    return [e for e in read_ledger(env["ep"])["entries"]
            if e["stage"] == stage]


def _cli(env, *extra):
    return [env["slug"], "--episodes-dir", str(env["eps"]),
            "--kenh", str(env["kenh"]), *extra]


# --- hàm chính ---------------------------------------------------------


def test_doi_unlisted_goi_channel_id_roi_set_privacy_dung_doi_so(tmp_path):
    env = _da_dang(tmp_path)
    c = FakeClient()
    r = _set(env, c, "unlisted")
    assert c.calls == [("channel_id",), ("set_privacy", "vDang", "unlisted")]
    assert r == {"videoId": "vDang", "url": URL_PREFIX + "vDang",
                 "privacy": "unlisted"}


def test_doi_public_khi_da_duyet_video_dau(tmp_path):
    env = _da_dang(tmp_path, kenh=APPROVED)
    c = FakeClient()
    r = _set(env, c, "public")
    assert ("set_privacy", "vDang", "public") in c.calls
    assert r["privacy"] == "public"


def test_ghi_so_dang_privacy_dung_role_note_va_hash_null(tmp_path):
    env = _da_dang(tmp_path, kenh=APPROVED)
    _set(env, FakeClient(), "public")
    es = _entries(env, "dang-privacy")
    assert len(es) == 1
    assert es[0]["role"] == "sep-tong"
    assert es[0]["note"] == f"{URL_PREFIX}vDang privacy=public"
    assert es[0].get("artifactHash") is None
    assert upload.STAGE_PRIVACY == "dang-privacy"


def test_set_privacy_ghi_so_sau_khi_goi_set_privacy_va_chuoi_hash_van_hop_le(
        tmp_path):
    env = _da_dang(tmp_path)
    _set(env, FakeClient(), "unlisted")
    assert upload.Ledger(env["ep"]).valid()
    assert upload.recorded_video_id(env["ep"]) == "vDang"


def test_doi_hai_lan_ghi_hai_muc_so(tmp_path):
    env = _da_dang(tmp_path, kenh=APPROVED)
    _set(env, FakeClient(), "unlisted")
    _set(env, FakeClient(), "public")
    notes = [e["note"] for e in _entries(env, "dang-privacy")]
    assert notes == [f"{URL_PREFIX}vDang privacy=unlisted",
                     f"{URL_PREFIX}vDang privacy=public"]


def test_public_khi_chua_duyet_bi_chan_khong_goi_client_khong_ghi_so(tmp_path):
    env = _da_dang(tmp_path)
    c = FakeClient()
    with pytest.raises(upload.UploadError):
        _set(env, c, "public")
    assert c.calls == []
    assert _entries(env, "dang-privacy") == []


def test_public_voi_first_video_approved_false_bi_chan(tmp_path):
    env = _da_dang(tmp_path, kenh={"channelId": CHANNEL,
                                   "firstVideoApproved": False})
    c = FakeClient()
    with pytest.raises(upload.UploadError):
        _set(env, c, "public")
    assert c.calls == []


def test_chua_co_video_id_trong_so_bi_chan_khong_goi_client(tmp_path):
    env = make_upload_env(tmp_path, kenh=APPROVED)
    c = FakeClient()
    with pytest.raises(upload.UploadError):
        _set(env, c, "unlisted")
    assert c.calls == []
    assert not (env["ep"] / "ledger.json").exists()


def test_kenh_lech_chi_goi_channel_id_khong_set_privacy_khong_ghi_so(tmp_path):
    env = _da_dang(tmp_path)
    c = FakeClient(channel="UC_khac")
    with pytest.raises(upload.UploadError):
        _set(env, c, "unlisted")
    assert c.calls == [("channel_id",)]
    assert _entries(env, "dang-privacy") == []


def test_kenh_json_thieu_channel_id_bi_chan_khong_goi_client(tmp_path):
    env = _da_dang(tmp_path)
    env["kenh"].write_text(json.dumps({"firstVideoApproved": True}))
    c = FakeClient()
    with pytest.raises(upload.UploadError):
        _set(env, c, "unlisted")
    assert c.calls == []


@pytest.mark.parametrize("bad", ["private", "secret", ""])
def test_gia_tri_privacy_ngoai_public_unlisted_bi_chan(tmp_path, bad):
    env = _da_dang(tmp_path, kenh=APPROVED)
    c = FakeClient()
    with pytest.raises(upload.UploadError):
        _set(env, c, bad)
    assert c.calls == []


def test_loi_set_privacy_cua_client_thi_khong_ghi_so(tmp_path):
    env = _da_dang(tmp_path)
    c = FakeClient(fail_on="set_privacy")
    with pytest.raises(RuntimeError):
        _set(env, c, "unlisted")
    assert _entries(env, "dang-privacy") == []


def test_dang_privacy_khong_lam_hong_chay_lai_upload(tmp_path):
    env = _da_dang(tmp_path)
    _set(env, FakeClient(), "unlisted")
    c = FakeClient()
    r = upload.upload_episode(env["slug"], client=c, **env["kw"])
    assert r["resumed"] is True
    assert c.names == ["channel_id"]


# --- dòng lệnh ------------------------------------------------------------


def test_cli_set_privacy_thanh_cong_ma_0_va_json(tmp_path, monkeypatch,
                                                capsys):
    env = _da_dang(tmp_path)
    c = FakeClient()
    monkeypatch.setattr(upload, "make_client", lambda: c)
    code = upload.main(_cli(env, "--set-privacy", "unlisted"))
    assert code == 0
    assert json.loads(capsys.readouterr().out) == {
        "videoId": "vDang", "url": URL_PREFIX + "vDang",
        "privacy": "unlisted"}
    assert "insert_video" not in c.names


def test_cli_set_privacy_khong_can_file_mp4_hay_thumbnail(tmp_path,
                                                         monkeypatch):
    env = _da_dang(tmp_path)
    env["mp4"].unlink()
    env["srt"].unlink()
    env["thumb"].unlink()
    monkeypatch.setattr(upload, "make_client", lambda: FakeClient())
    assert upload.main(_cli(env, "--set-privacy", "unlisted")) == 0


@pytest.mark.parametrize("extra", [
    ["--privacy", "unlisted"],
    ["--publish-at", "2030-01-02T03:04:05Z"],
    ["--out-dir", "/tmp/x"],
])
def test_cli_set_privacy_di_cung_co_khac_thi_ma_2(tmp_path, monkeypatch,
                                                 extra):
    env = _da_dang(tmp_path)
    c = FakeClient()
    monkeypatch.setattr(upload, "make_client", lambda: c)
    with pytest.raises(SystemExit) as e:
        upload.main(_cli(env, "--set-privacy", "unlisted", *extra))
    assert e.value.code == 2
    assert "set_privacy" not in c.names
    assert _entries(env, "dang-privacy") == []


@pytest.mark.parametrize("bad", ["private", "secret"])
def test_cli_set_privacy_gia_tri_sai_ma_2(tmp_path, monkeypatch, bad):
    env = _da_dang(tmp_path)
    monkeypatch.setattr(upload, "make_client", lambda: FakeClient())
    with pytest.raises(SystemExit) as e:
        upload.main(_cli(env, "--set-privacy", bad))
    assert e.value.code == 2


def test_cli_set_privacy_public_chua_duyet_ma_1_loi_stderr(
        tmp_path, monkeypatch, capsys):
    env = _da_dang(tmp_path)
    monkeypatch.setattr(upload, "make_client", lambda: FakeClient())
    capsys.readouterr()  # bỏ dòng `videoId:` của lần đăng dựng sẵn
    code = upload.main(_cli(env, "--set-privacy", "public"))
    cap = capsys.readouterr()
    assert code == 1
    assert cap.out.strip() == ""
    assert cap.err.startswith("lỗi:")


def test_cli_set_privacy_http_error_ma_1_mot_dong_khong_traceback(
        tmp_path, monkeypatch, capsys):
    env = _da_dang(tmp_path)
    err = HttpError(httplib2.Response({"status": 403}),
                    json.dumps({"error": {"message": "forbidden"}}).encode())
    monkeypatch.setattr(upload, "make_client",
                        lambda: FakeClient(fail_on="set_privacy", error=err))
    capsys.readouterr()  # bỏ dòng `videoId:` của lần đăng dựng sẵn
    code = upload.main(_cli(env, "--set-privacy", "unlisted"))
    cap = capsys.readouterr()
    assert code == 1
    assert len(cap.err.strip().splitlines()) == 1
    assert cap.err.startswith("lỗi: Google trả HTTP 403: ")
    assert "Traceback" not in cap.err


def test_cli_slug_chua_dang_ma_1(tmp_path, monkeypatch, capsys):
    env = make_upload_env(tmp_path)
    monkeypatch.setattr(upload, "make_client", lambda: FakeClient())
    assert upload.main(_cli(env, "--set-privacy", "unlisted")) == 1
    assert capsys.readouterr().err.startswith("lỗi:")


# --- lớp thật qua service giả: list rồi update ---------------------------


class _Req:
    def __init__(self, log, name, kw, result):
        self.log, self.name, self.kw, self.result = log, name, kw, result

    def execute(self):
        self.log.append((self.name, self.kw))
        return self.result


class _Videos:
    def __init__(self, log, status):
        self.log, self.status = log, status

    def list(self, **kw):
        return _Req(self.log, "list", kw, {"items": [{"status": self.status}]})

    def update(self, **kw):
        return _Req(self.log, "update", kw, {})


class _Service:
    def __init__(self, status):
        self.log = []
        self._v = _Videos(self.log, status)

    def videos(self):
        return self._v


def test_lop_that_set_privacy_goi_list_roi_update_part_status():
    svc = _Service({"privacyStatus": "private", "embeddable": True,
                    "license": "youtube"})
    upload.YouTubeClient(svc).set_privacy("vX", "unlisted")
    assert [n for n, _ in svc.log] == ["list", "update"]
    assert svc.log[0][1] == {"part": "status", "id": "vX"}
    kw = svc.log[1][1]
    assert kw["part"] == "status"
    assert kw["body"]["id"] == "vX"
    st = kw["body"]["status"]
    assert st["privacyStatus"] == "unlisted"
    assert st["embeddable"] is True
    assert st["license"] == "youtube"


def test_lop_that_privacy_status_doc_tu_videos_list_part_status():
    svc = _Service({"privacyStatus": "private"})
    got = upload.YouTubeClient(svc).privacy_status("vY")
    assert got == "private"
    assert svc.log == [("list", {"part": "status", "id": "vY"})]


def test_lop_that_set_privacy_setdefault_hai_co_khi_status_khong_co():
    svc = _Service({"privacyStatus": "private"})
    upload.YouTubeClient(svc).set_privacy("vD", "public")
    st = svc.log[1][1]["body"]["status"]
    assert st["selfDeclaredMadeForKids"] is False
    assert st["containsSyntheticMedia"] is False
    assert st["privacyStatus"] == "public"


def test_lop_that_set_privacy_khong_de_len_co_da_co_trong_status():
    svc = _Service({"privacyStatus": "private",
                    "selfDeclaredMadeForKids": True,
                    "containsSyntheticMedia": True})
    upload.YouTubeClient(svc).set_privacy("vD", "unlisted")
    st = svc.log[1][1]["body"]["status"]
    assert st["selfDeclaredMadeForKids"] is True
    assert st["containsSyntheticMedia"] is True
    assert st["privacyStatus"] == "unlisted"


def test_lop_that_set_privacy_giu_co_false_da_co_va_chi_doi_privacy():
    svc = _Service({"privacyStatus": "unlisted",
                    "selfDeclaredMadeForKids": False,
                    "containsSyntheticMedia": False})
    upload.YouTubeClient(svc).set_privacy("vD", "public")
    st = svc.log[1][1]["body"]["status"]
    assert st == {"privacyStatus": "public",
                  "selfDeclaredMadeForKids": False,
                  "containsSyntheticMedia": False}
