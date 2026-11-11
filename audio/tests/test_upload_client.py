"""Đề mục 13 [13-1]: lớp thật `YouTubeClient` với service Google giả.

Service giả ghi lại từng lời gọi (tên + đối số) để kiểm đúng API và đối số mà
giao diện nêu. Không gọi mạng.
"""

from __future__ import annotations

import importlib
import json
import stat

import pytest

from aivideo import upload


class _Req:
    def __init__(self, svc, name, kw, result):
        self.svc, self.name, self.kw, self.result = svc, name, kw, result

    def execute(self, **_):
        self.svc.log.append((self.name, self.kw))
        return self.result

    def next_chunk(self, **kw):
        """Tải resumable: lần đầu chưa xong, lần hai trả tài nguyên."""
        self.svc.chunks_log.append(kw)
        self.svc.chunks += 1
        if self.svc.chunks < 2:
            return object(), None
        return None, self.result


class _Res:
    def __init__(self, svc, prefix):
        self.svc, self.prefix = svc, prefix

    def _call(self, verb, kw):
        name = f"{self.prefix}.{verb}"
        self.svc.created.append((name, kw))
        return _Req(self.svc, name, kw, self.svc.results.get(name, {}))

    def list(self, **kw):
        return self._call("list", kw)

    def insert(self, **kw):
        return self._call("insert", kw)

    def set(self, **kw):
        return self._call("set", kw)

    def update(self, **kw):
        return self._call("update", kw)


class _Service:
    def __init__(self, **results):
        self.log = []
        self.created = []
        self.chunks = 0
        self.chunks_log = []
        self.results = results

    def channels(self):
        return _Res(self, "channels")

    def playlistItems(self):  # noqa: N802 - tên của googleapiclient
        return _Res(self, "playlistItems")

    def videos(self):
        return _Res(self, "videos")

    def thumbnails(self):
        return _Res(self, "thumbnails")

    def captions(self):
        return _Res(self, "captions")

    def calls(self, name):
        """Đối số mỗi lần dựng yêu cầu `name` (kể cả khi chưa `execute`)."""
        return [kw for n, kw in self.created if n == name]


# --- channel_id ----------------------------------------------------------


def test_channel_id_goi_channels_list_part_id_mine_va_tra_id():
    svc = _Service(**{"channels.list": {"items": [{"id": "UC_abc"}]}})
    assert upload.YouTubeClient(svc).channel_id() == "UC_abc"
    assert svc.log == [("channels.list", {"part": "id", "mine": True})]


# --- find_uploaded -------------------------------------------------------


def _svc_uploads(videos):
    return _Service(**{
        "channels.list": {"items": [{"contentDetails": {
            "relatedPlaylists": {"uploads": "UU_list"}}}]},
        "playlistItems.list": {"items": [
            {"contentDetails": {"videoId": v["id"]}} for v in videos]},
        "videos.list": {"items": videos},
    })


def test_find_uploaded_di_qua_channels_playlist_items_roi_videos():
    svc = _svc_uploads([
        {"id": "v1", "snippet": {"tags": ["a"]}},
        {"id": "v2", "snippet": {"tags": ["x", "aivideo:tap-thu"]}},
    ])
    got = upload.YouTubeClient(svc).find_uploaded("aivideo:tap-thu")
    assert got == "v2"
    assert [n for n, _ in svc.log] == [
        "channels.list", "playlistItems.list", "videos.list"]
    assert svc.log[0][1] == {"part": "contentDetails", "mine": True}
    pl = svc.log[1][1]
    assert pl["playlistId"] == "UU_list"
    assert pl["maxResults"] == upload.SCAN_UPLOADS == 50
    vi = svc.log[2][1]
    assert vi["part"] == "snippet"
    assert set(vi["id"].split(",")) == {"v1", "v2"}


def test_find_uploaded_khong_co_the_thi_tra_none():
    svc = _svc_uploads([
        {"id": "v1", "snippet": {"tags": ["a"]}},
        {"id": "v2", "snippet": {}},
    ])
    assert upload.YouTubeClient(svc).find_uploaded("aivideo:tap-thu") is None


def test_find_uploaded_khop_nguyen_the_khong_khop_mot_phan():
    svc = _svc_uploads([
        {"id": "v1", "snippet": {"tags": ["aivideo:tap-thu-hai"]}},
        {"id": "v2", "snippet": {"tags": ["aivideo:tap"]}},
    ])
    assert upload.YouTubeClient(svc).find_uploaded("aivideo:tap-thu") is None


def test_find_uploaded_playlist_trong_thi_tra_none():
    svc = _svc_uploads([])
    assert upload.YouTubeClient(svc).find_uploaded("aivideo:x") is None


# --- insert_video --------------------------------------------------------


def test_insert_video_dung_part_body_va_resumable(tmp_path):
    mp4 = tmp_path / "v.mp4"
    mp4.write_bytes(b"mp4-gia")
    body = {"snippet": {"title": "t"}, "status": {"privacyStatus": "private"}}
    svc = _Service(**{"videos.insert": {"id": "vNew"}})
    got = upload.YouTubeClient(svc).insert_video(mp4, body)
    assert got == {"id": "vNew"}
    (kw,) = svc.calls("videos.insert")
    assert set(kw["part"].split(",")) == {"snippet", "status"}
    assert kw["body"] == body
    media = kw["media_body"]
    assert media.resumable() is True
    assert media.getbytes(0, media.size()) == b"mp4-gia"
    assert media.mimetype() == "video/mp4"


def test_insert_video_lap_next_chunk_toi_khi_co_tai_nguyen(tmp_path):
    mp4 = tmp_path / "v.mp4"
    mp4.write_bytes(b"mp4-gia")
    svc = _Service(**{"videos.insert": {"id": "vNew"}})
    upload.YouTubeClient(svc).insert_video(mp4, {"snippet": {}, "status": {}})
    assert len(svc.chunks_log) == 2


# --- processing_status ---------------------------------------------------


def test_processing_status_doc_processing_details():
    svc = _Service(**{"videos.list": {"items": [
        {"processingDetails": {"processingStatus": "succeeded"}}]}})
    got = upload.YouTubeClient(svc).processing_status("vP")
    assert got == "succeeded"
    assert svc.log == [("videos.list",
                        {"part": "processingDetails", "id": "vP"})]


# --- thumbnails.set ------------------------------------------------------


def test_set_thumbnail_goi_thumbnails_set_voi_video_id_va_file(tmp_path):
    png = tmp_path / "thumb.png"
    png.write_bytes(b"png-gia")
    svc = _Service()
    upload.YouTubeClient(svc).set_thumbnail("vT", png)
    (kw,) = svc.calls("thumbnails.set")
    assert kw["videoId"] == "vT"
    media = kw["media_body"]
    assert media.getbytes(0, media.size()) == b"png-gia"


# --- captions.insert -----------------------------------------------------


def test_insert_caption_goi_captions_insert_part_snippet(tmp_path):
    srt = tmp_path / "video.srt"
    srt.write_text("1\n00:00:00,000 --> 00:00:01,000\nxin chào\n",
                   encoding="utf-8")
    svc = _Service()
    upload.YouTubeClient(svc).insert_caption("vC", srt, "vi", "Tiếng Việt")
    (kw,) = svc.calls("captions.insert")
    assert kw["part"] == "snippet"
    sn = kw["body"]["snippet"]
    assert sn["videoId"] == "vC"
    assert sn["language"] == "vi"
    assert sn["name"] == "Tiếng Việt"
    media = kw["media_body"]
    assert media.getbytes(0, media.size()) == srt.read_bytes()


# --- lệnh auth: prompt=consent ------------------------------------------


@pytest.fixture
def home_tam(tmp_path, monkeypatch):
    """Đặt HOME tạm rồi nạp lại module để CRED_DIR trỏ vào thư mục tạm."""
    monkeypatch.setenv("HOME", str(tmp_path))
    importlib.reload(upload)
    yield upload
    monkeypatch.undo()
    importlib.reload(upload)


def test_lenh_auth_goi_run_local_server_port_0_prompt_consent(
        home_tam, tmp_path, monkeypatch, capsys):
    cred = tmp_path / ".config" / "aivideo" / "youtube"
    cred.mkdir(parents=True)
    (cred / "client_secret.json").write_text("{}", encoding="utf-8")
    seen = {}

    class _Creds:
        def to_json(self):
            return json.dumps({"token": "gia"})

    class _Flow:
        def run_local_server(self, **kw):
            seen["kw"] = kw
            return _Creds()

    from google_auth_oauthlib.flow import InstalledAppFlow

    def fake_from(path, scopes):
        seen["secret"] = path
        return _Flow()

    monkeypatch.setattr(InstalledAppFlow, "from_client_secrets_file",
                        staticmethod(fake_from))
    assert home_tam.main(["auth"]) == 0
    assert seen["kw"] == {"port": 0, "prompt": "consent"}
    assert seen["secret"] == str(cred / "client_secret.json")
    token = cred / "token.json"
    assert json.loads(token.read_text(encoding="utf-8")) == {"token": "gia"}
    assert stat.S_IMODE(token.stat().st_mode) == 0o600
