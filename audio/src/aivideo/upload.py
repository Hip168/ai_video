"""Đăng một tập lên YouTube qua YouTube Data API (D24).

Giao diện: `.team/features/13-tu-dong-giao-dien.md`. Mọi lời gọi Google đi qua `YouTubeClient`;
test thay bằng client giả qua `make_client`. Thông tin đăng nhập nằm ngoài repo, ở `CRED_DIR`.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
from datetime import datetime
from pathlib import Path

from googleapiclient.errors import HttpError

from aivideo.gates import GateError, Ledger, _ep_dir, _read_json, _script_hash_of, sha256_file

CRED_DIR = Path.home() / ".config" / "aivideo" / "youtube"
SCOPES = ["https://www.googleapis.com/auth/youtube.force-ssl"]
PRIVACY = ("private", "unlisted", "public")
STAGE = "dang"
STAGE_THUMBNAIL = "dang-thumbnail"
STAGE_CAPTION = "dang-caption"
CAPTION_LANGUAGE = "vi"
CAPTION_NAME = "Tiếng Việt"
POLL_SECONDS = 15
MAX_WAIT_SECONDS = 3600
URL_PREFIX = "https://www.youtube.com/watch?v="
_URL_RE = re.compile(r"^" + re.escape(URL_PREFIX) + r"([A-Za-z0-9_-]+)$")


class UploadError(Exception):
    pass


class YouTubeClient:
    """Lớp mỏng quanh `googleapiclient`. Client giả trong test có đúng năm phương thức này."""

    def __init__(self, service):
        self.service = service

    def channel_id(self) -> str:
        items = self.service.channels().list(part="id", mine=True).execute().get("items") or []
        if len(items) != 1:
            raise UploadError(f"token thấy {len(items)} kênh, cần đúng 1")
        return items[0]["id"]

    def insert_video(self, path: Path, body: dict) -> str:
        from googleapiclient.http import MediaFileUpload

        media = MediaFileUpload(str(path), mimetype="video/mp4", chunksize=8 * 1024 * 1024,
                                resumable=True)
        req = self.service.videos().insert(part="snippet,status", body=body, media_body=media)
        resp = None
        while resp is None:
            _, resp = req.next_chunk(num_retries=3)
        return resp["id"]

    def processing_status(self, video_id: str) -> str:
        items = self.service.videos().list(part="processingDetails", id=video_id).execute()
        items = items.get("items") or []
        if not items:
            raise UploadError(f"không thấy video {video_id}")
        return items[0].get("processingDetails", {}).get("processingStatus", "")

    def set_thumbnail(self, video_id: str, path: Path) -> None:
        from googleapiclient.http import MediaFileUpload

        self.service.thumbnails().set(videoId=video_id,
                                      media_body=MediaFileUpload(str(path))).execute()

    def insert_caption(self, video_id: str, path: Path, language: str, name: str) -> None:
        from googleapiclient.http import MediaFileUpload

        body = {"snippet": {"videoId": video_id, "language": language, "name": name,
                            "isDraft": False}}
        self.service.captions().insert(
            part="snippet", body=body,
            media_body=MediaFileUpload(str(path), mimetype="application/octet-stream"),
        ).execute()


def _write_private(path: Path, text: str) -> None:
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, "w", encoding="utf-8") as f:
        f.write(text)
    os.chmod(path, 0o600)


def auth(cred_dir: Path = CRED_DIR) -> Path:
    """Mở trình duyệt một lần để người dùng đồng ý; ghi `token.json` quyền 600."""
    from google_auth_oauthlib.flow import InstalledAppFlow

    secret = cred_dir / "client_secret.json"
    if not secret.is_file():
        raise UploadError(f"thiếu {secret} (tải OAuth client kiểu Desktop về đây)")
    os.chmod(secret, 0o600)
    creds = InstalledAppFlow.from_client_secrets_file(str(secret), SCOPES).run_local_server(port=0)
    token = cred_dir / "token.json"
    _write_private(token, creds.to_json())
    return token


def make_client(cred_dir: Path = CRED_DIR) -> YouTubeClient:
    from google.auth.transport.requests import Request
    from google.oauth2.credentials import Credentials
    from googleapiclient.discovery import build

    token = cred_dir / "token.json"
    if not token.is_file():
        raise UploadError(f"thiếu {token}: chạy `python -m aivideo.upload auth` trước")
    creds = Credentials.from_authorized_user_file(str(token), SCOPES)
    if not creds.valid:
        if not creds.refresh_token:
            raise UploadError("token hết hạn và không có refresh token: chạy lại auth")
        creds.refresh(Request())
        _write_private(token, creds.to_json())
    return YouTubeClient(build("youtube", "v3", credentials=creds, cache_discovery=False))


def video_url(video_id: str) -> str:
    return URL_PREFIX + video_id


def recorded_video_id(ep: Path) -> str | None:
    """videoId của mục `dang` mới nhất trong sổ tập (note = URL), hoặc None."""
    for e in reversed(Ledger(ep).entries()):
        if e["stage"] == STAGE:
            m = _URL_RE.match(e.get("note") or "")
            if m:
                return m.group(1)
    return None


def _step_done(ep: Path, stage: str, url: str) -> bool:
    return any(e["stage"] == stage and e.get("note") == url for e in Ledger(ep).entries())


def _record(ep: Path, stage: str, url: str, artifact: Path) -> None:
    Ledger(ep).add(stage=stage, role="publisher", note=url, script_hash=_script_hash_of(ep),
                   artifact_hash=sha256_file(artifact))


def _kenh(path: Path) -> dict:
    if not path.is_file():
        raise UploadError(f"thiếu {path}")
    d = _read_json(path)
    if not isinstance(d, dict) or not isinstance(d.get("channelId"), str) or not d["channelId"].strip():
        raise UploadError(f"{path} không có channelId")
    return d


def build_body(pub: dict, privacy: str, publish_at: str | None) -> dict:
    description = pub["description"]
    chapters = pub["chapters"].strip()
    if chapters not in description:
        description = description.rstrip() + "\n\n" + chapters
    status = {"privacyStatus": privacy, "selfDeclaredMadeForKids": False,
              "containsSyntheticMedia": False}
    if publish_at:
        status["publishAt"] = publish_at
    return {"snippet": {"title": pub["title"], "description": description, "tags": pub["tags"]},
            "status": status}


def upload_episode(slug: str, *, client, episodes_dir="../episodes", out_dir=None, kenh_path=None,
                   privacy: str | None = None, publish_at: str | None = None) -> dict:
    ep = _ep_dir(slug, episodes_dir)
    out = Path(out_dir) if out_dir else ep.parent.parent / "out" / "episodes"
    kenh = _kenh(Path(kenh_path) if kenh_path else ep.parent.parent / ".team" / "kenh.json")
    pub_path = ep / "publish.json"
    if not pub_path.is_file():
        raise UploadError(f"thiếu {pub_path}")
    pub = _read_json(pub_path)
    if not isinstance(pub, dict):
        raise UploadError("publish.json phải là object")
    for k in ("title", "description", "chapters", "thumbnail"):
        if not isinstance(pub.get(k), str) or not pub[k].strip():
            raise UploadError(f"publish.json thiếu {k}")
    if not isinstance(pub.get("tags"), list):
        raise UploadError("publish.json: tags phải là mảng")
    if pub.get("containsSyntheticMedia") is not False:
        raise UploadError("publish.json: containsSyntheticMedia phải là false (D21)")
    privacy = privacy or pub.get("privacy")
    if privacy not in PRIVACY:
        raise UploadError(f"privacy phải thuộc {PRIVACY}")
    if privacy == "public" and kenh.get("firstVideoApproved") is not True:
        raise UploadError("video đầu chưa được duyệt: không đặt public")
    if publish_at:
        try:
            datetime.fromisoformat(publish_at.replace("Z", "+00:00"))
        except ValueError as e:
            raise UploadError(f"--publish-at không phải ISO 8601: {publish_at}") from e
        if privacy != "private":
            raise UploadError("--publish-at cần privacy private")
    mp4 = out / slug / f"{slug}.mp4"
    srt = out / slug / "video.srt"
    thumb = ep / pub["thumbnail"]
    for f in (mp4, srt, thumb):
        if not f.is_file():
            raise UploadError(f"thiếu {f}")

    token_channel = client.channel_id()
    if token_channel != kenh["channelId"].strip():
        raise UploadError(f"kênh của token {token_channel!r} khác kênh trong kenh.json "
                          f"{kenh['channelId']!r}: không tải")

    video_id = recorded_video_id(ep)
    resumed = video_id is not None
    if not resumed:
        video_id = client.insert_video(mp4, build_body(pub, privacy, publish_at))
        _record(ep, STAGE, video_url(video_id), mp4)
    url = video_url(video_id)
    if _step_done(ep, STAGE_THUMBNAIL, url) and _step_done(ep, STAGE_CAPTION, url):
        return {"videoId": video_id, "url": url, "privacy": privacy, "publishAt": publish_at,
                "resumed": resumed}

    waited = 0
    while True:
        st = client.processing_status(video_id)
        if st == "succeeded":
            break
        if st in ("failed", "rejected", "terminated"):
            raise UploadError(f"YouTube xử lý video {video_id} không thành: {st}")
        if waited >= MAX_WAIT_SECONDS:
            raise UploadError(f"quá {MAX_WAIT_SECONDS} giây chưa xử lý xong; chạy lại sau")
        time.sleep(POLL_SECONDS)
        waited += POLL_SECONDS

    if not _step_done(ep, STAGE_THUMBNAIL, url):
        client.set_thumbnail(video_id, thumb)
        _record(ep, STAGE_THUMBNAIL, url, thumb)
    if not _step_done(ep, STAGE_CAPTION, url):
        client.insert_caption(video_id, srt, CAPTION_LANGUAGE, CAPTION_NAME)
        _record(ep, STAGE_CAPTION, url, srt)
    return {"videoId": video_id, "url": url, "privacy": privacy,
            "publishAt": publish_at, "resumed": resumed}


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(prog="aivideo.upload")
    ap.add_argument("slug", help="slug của tập, hoặc `auth` để đăng nhập một lần")
    ap.add_argument("--privacy", choices=PRIVACY)
    ap.add_argument("--publish-at")
    ap.add_argument("--episodes-dir", default="../episodes")
    ap.add_argument("--out-dir")
    ap.add_argument("--kenh")
    a = ap.parse_args(argv)
    try:
        if a.slug == "auth":
            print(json.dumps({"token": str(auth())}, ensure_ascii=False, indent=2))
            return 0
        r = upload_episode(a.slug, client=make_client(), episodes_dir=a.episodes_dir,
                           out_dir=a.out_dir, kenh_path=a.kenh, privacy=a.privacy,
                           publish_at=a.publish_at)
    except HttpError as e:
        print(f"lỗi: Google trả HTTP {e.resp.status}: {getattr(e, 'reason', '') or e}",
              file=sys.stderr)
        return 1
    except (UploadError, GateError, ValueError, OSError, KeyError) as e:
        print(f"lỗi: {e}", file=sys.stderr)
        return 1
    print(json.dumps(r, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
