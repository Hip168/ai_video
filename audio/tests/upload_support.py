"""Hạ tầng test đề mục 13: tập thử, client Google giả.

Giao diện: `.team/features/13-tu-dong-giao-dien.md`. Không gọi mạng.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from gates_support import make_episode, write_json

SLUG = "tap-thu"
CHANNEL = "UC_kenh_that"
CHAPTERS = "00:00 Mở đầu\n01:30 Ý chính\n05:00 Kết"
URL_PREFIX = "https://www.youtube.com/watch?v="


class FakeClient:
    """Có đủ năm phương thức của `YouTubeClient`, ghi lại lời gọi theo thứ tự."""

    def __init__(self, channel=CHANNEL, video_id="vid123", statuses=None,
                 fail_on=None, returned_privacy=None, error=None):
        """`returned_privacy`: privacyStatus mà insert_video trả về (mặc định
        đúng như body yêu cầu; "" = không có khoá `status`).
        `error`: ngoại lệ ném ở bước `fail_on` thay cho RuntimeError."""
        self.returned_privacy = returned_privacy
        self.error = error
        self.channel = channel
        self.video_id = video_id
        self.statuses = list(statuses or ["succeeded"])
        self.fail_on = fail_on
        self.calls = []

    def _rec(self, name, *args):
        self.calls.append((name, *args))
        if self.fail_on == name:
            if self.error is not None:
                raise self.error
            raise RuntimeError(f"giả lập lỗi ở {name}")

    @property
    def names(self):
        return [c[0] for c in self.calls]

    def channel_id(self):
        self._rec("channel_id")
        return self.channel

    def insert_video(self, path, body):
        self._rec("insert_video", Path(path), body)
        got = self.returned_privacy
        if got is None:
            got = body["status"]["privacyStatus"]
        res = {"id": self.video_id}
        if got != "":
            res["status"] = {"privacyStatus": got}
        return res

    def processing_status(self, video_id):
        self._rec("processing_status", video_id)
        if self.names.count("processing_status") > 200:
            raise AssertionError("hỏi trạng thái xử lý vô hạn")
        if len(self.statuses) > 1:
            return self.statuses.pop(0)
        return self.statuses[0]

    def set_thumbnail(self, video_id, path):
        self._rec("set_thumbnail", video_id, Path(path))

    def insert_caption(self, video_id, path, language, name):
        self._rec("insert_caption", video_id, Path(path), language, name)


def make_upload_env(tmp_path, *, publish=None, kenh=None, slug=SLUG,
                    files=True):
    """Trả dict: eps, ep, out, kenh, mp4, srt, thumb, kwargs cho upload_episode."""
    eps, ep = make_episode(tmp_path, slug=slug, fact=False)
    out = tmp_path / "repo" / "out" / "episodes"
    kenh_path = tmp_path / "repo" / ".team" / "kenh.json"
    pub = {
        "title": "Tiêu đề thử",
        "description": "Mô tả ngắn.",
        "chapters": CHAPTERS,
        "thumbnail": "thumb.png",
        "tags": ["tin học", "thử"],
        "privacy": "private",
        "containsSyntheticMedia": False,
    }
    if publish:
        pub.update(publish)
    pub = {k: v for k, v in pub.items() if v is not ...}
    write_json(ep / "publish.json", pub)
    write_json(kenh_path, kenh if kenh is not None else {"channelId": CHANNEL})
    mp4 = out / slug / f"{slug}.mp4"
    srt = out / slug / "video.srt"
    thumb = ep / "thumb.png"
    if files:
        mp4.parent.mkdir(parents=True, exist_ok=True)
        mp4.write_bytes(b"mp4-gia")
        srt.write_text("1\n00:00:00,000 --> 00:00:01,000\nxin chào\n",
                       encoding="utf-8")
        thumb.write_bytes(b"png-gia")
    return {
        "eps": eps, "ep": ep, "out": out, "kenh": kenh_path,
        "mp4": mp4, "srt": srt, "thumb": thumb, "slug": slug,
        "kw": {"episodes_dir": eps, "out_dir": out, "kenh_path": kenh_path},
    }


def sha256(path: Path) -> str:
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def read_ledger(ep: Path):
    return json.loads((ep / "ledger.json").read_text(encoding="utf-8"))
