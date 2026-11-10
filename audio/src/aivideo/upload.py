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

from google.auth.exceptions import GoogleAuthError
from googleapiclient.errors import HttpError

from aivideo.gates import GateError, Ledger, _ep_dir, _read_json, _script_hash_of, sha256_file

CRED_DIR = Path.home() / ".config" / "aivideo" / "youtube"
SCOPES = ["https://www.googleapis.com/auth/youtube.force-ssl"]
PRIVACY = ("private", "unlisted", "public")
STAGE = "dang"
STAGE_THUMBNAIL = "dang-thumbnail"
STAGE_CAPTION = "dang-caption"
STAGE_PRIVACY = "dang-privacy"
SET_PRIVACY = ("unlisted", "public")
CAPTION_LANGUAGE = "vi"
CAPTION_NAME = "Tiếng Việt"
POLL_SECONDS = 15
MAX_WAIT_SECONDS = 3600
TAG_PREFIX = "aivideo:"
SCAN_UPLOADS = 50
URL_PREFIX = "https://www.youtube.com/watch?v="
_URL_RE = re.compile(r"^" + re.escape(URL_PREFIX) + r"([A-Za-z0-9_-]+)$")


class UploadError(Exception):
    pass


class NeedUser(Exception):
    """Dừng, cần người dùng xem (CAN_NGUOI_DUNG, mã 3)."""

    def __init__(self, reason: str, result: dict):
        super().__init__(reason)
        self.result = {"state": "CAN_NGUOI_DUNG", "reason": reason, **result}


class YouTubeClient:
    """Lớp mỏng quanh `googleapiclient`. Client giả trong test có đúng tám phương thức này."""

    def __init__(self, service):
        self.service = service

    def channel_id(self) -> str:
        items = self.service.channels().list(part="id", mine=True).execute().get("items") or []
        if len(items) != 1:
            raise UploadError(f"token thấy {len(items)} kênh, cần đúng 1")
        return items[0]["id"]

    def find_uploaded(self, tag: str) -> str | None:
        """videoId của video gần nhất trong playlist uploads của kênh có thẻ `tag`, hoặc None."""
        ch = self.service.channels().list(part="contentDetails", mine=True).execute()
        uploads = ch["items"][0]["contentDetails"]["relatedPlaylists"]["uploads"]
        pl = self.service.playlistItems().list(part="contentDetails", playlistId=uploads,
                                               maxResults=SCAN_UPLOADS).execute()
        ids = [it["contentDetails"]["videoId"] for it in pl.get("items") or []]
        if not ids:
            return None
        vids = self.service.videos().list(part="snippet", id=",".join(ids)).execute()
        for v in vids.get("items") or []:
            if tag in (v.get("snippet", {}).get("tags") or []):
                return v["id"]
        return None

    def insert_video(self, path: Path, body: dict) -> dict:
        from googleapiclient.http import MediaFileUpload

        media = MediaFileUpload(str(path), mimetype="video/mp4", chunksize=8 * 1024 * 1024,
                                resumable=True)
        req = self.service.videos().insert(part="snippet,status", body=body, media_body=media)
        resp = None
        while resp is None:
            _, resp = req.next_chunk(num_retries=3)
        return resp

    def processing_status(self, video_id: str) -> str:
        items = self.service.videos().list(part="processingDetails", id=video_id).execute()
        items = items.get("items") or []
        if not items:
            raise UploadError(f"không thấy video {video_id}")
        return items[0].get("processingDetails", {}).get("processingStatus", "")

    def privacy_status(self, video_id: str) -> str:
        return self._status(video_id).get("privacyStatus", "")

    def set_privacy(self, video_id: str, privacy: str) -> None:
        # update part=status xoá trường không gửi lại: gửi lại status hiện có, chỉ đổi privacy.
        status = {k: v for k, v in self._status(video_id).items()
                  if k not in ("uploadStatus", "failureReason", "rejectionReason", "madeForKids",
                               "publishAt")}
        status["privacyStatus"] = privacy
        status.setdefault("selfDeclaredMadeForKids", False)
        status.setdefault("containsSyntheticMedia", False)
        self.service.videos().update(part="status",
                                     body={"id": video_id, "status": status}).execute()

    def _status(self, video_id: str) -> dict:
        items = self.service.videos().list(part="status", id=video_id).execute().get("items") or []
        if not items:
            raise UploadError(f"không thấy video {video_id}")
        return items[0].get("status", {})

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
    creds = InstalledAppFlow.from_client_secrets_file(str(secret), SCOPES).run_local_server(
        port=0, prompt="consent")
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


def _record(ep: Path, stage: str, note: str, artifact_hash: str | None, script_hash) -> None:
    Ledger(ep).add(stage=stage, role="publisher", note=note, script_hash=script_hash,
                   artifact_hash=artifact_hash)


def _kenh(path: Path) -> dict:
    if not path.is_file():
        raise UploadError(f"thiếu {path}")
    d = _read_json(path)
    if not isinstance(d, dict) or not isinstance(d.get("channelId"), str) or not d["channelId"].strip():
        raise UploadError(f"{path} không có channelId")
    return d


def build_body(pub: dict, slug: str, publish_at: str | None) -> dict:
    """Body của `insert_video`: luôn `private` (D25); quyền mong muốn đặt sau thumbnail, phụ đề."""
    description = pub["description"]
    chapters = pub["chapters"].strip()
    if chapters not in description:
        description = description.rstrip() + "\n\n" + chapters
    status = {"privacyStatus": "private", "selfDeclaredMadeForKids": False,
              "containsSyntheticMedia": False}
    if publish_at:
        status["publishAt"] = publish_at
    tags = list(pub["tags"]) + [TAG_PREFIX + slug]
    return {"snippet": {"title": pub["title"], "description": description, "tags": tags},
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

    # Mọi bước có thể lỗi làm trước insert (D25).
    hashes = {STAGE: sha256_file(mp4), STAGE_THUMBNAIL: sha256_file(thumb),
              STAGE_CAPTION: sha256_file(srt), STAGE_PRIVACY: None}
    script_hash = _script_hash_of(ep)
    body = build_body(pub, slug, publish_at)
    video_id = recorded_video_id(ep)

    token_channel = client.channel_id()
    if token_channel != kenh["channelId"].strip():
        raise UploadError(f"kênh của token {token_channel!r} khác kênh trong kenh.json "
                          f"{kenh['channelId']!r}: không tải")

    def record(stage, note):
        try:
            _record(ep, stage, note, hashes[stage], script_hash)
        except (GateError, OSError, ValueError) as e:
            raise UploadError(f"video {video_id} ({video_url(video_id)}) đã có trên YouTube nhưng "
                              f"ghi sổ khâu {stage} lỗi: {e}. Không tải lại; chạy lại lệnh sẽ "
                              f"tìm lại video theo thẻ {TAG_PREFIX}{slug}") from e

    resumed = video_id is not None
    if not resumed:
        video_id = client.find_uploaded(TAG_PREFIX + slug)
        resumed = video_id is not None
        if not resumed:
            video_id = client.insert_video(mp4, body)["id"]
        print(f"videoId: {video_id}", file=sys.stderr, flush=True)
        record(STAGE, video_url(video_id))
    url = video_url(video_id)
    priv_note = f"{url} privacy={privacy}"
    want_set = privacy != "private"
    done = {st: _step_done(ep, st, note) for st, note in
            ((STAGE_THUMBNAIL, url), (STAGE_CAPTION, url), (STAGE_PRIVACY, priv_note))}
    if done[STAGE_THUMBNAIL] and done[STAGE_CAPTION] and (done[STAGE_PRIVACY] or not want_set):
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

    if not done[STAGE_THUMBNAIL]:
        client.set_thumbnail(video_id, thumb)
        record(STAGE_THUMBNAIL, url)
    if not done[STAGE_CAPTION]:
        client.insert_caption(video_id, srt, CAPTION_LANGUAGE, CAPTION_NAME)
        record(STAGE_CAPTION, url)
    if want_set:
        # Đặt quyền mong muốn sau cùng rồi đọc lại; vẫn private là video bị khoá (D25).
        client.set_privacy(video_id, privacy)
        if client.privacy_status(video_id) == "private":
            raise NeedUser(f"đã đặt {privacy} nhưng video vẫn private: có thể bị khoá",
                           {"videoId": video_id, "url": url})
        record(STAGE_PRIVACY, priv_note)
    return {"videoId": video_id, "url": url, "privacy": privacy,
            "publishAt": publish_at, "resumed": resumed}


def set_video_privacy(slug: str, *, client, privacy: str, episodes_dir="../episodes",
                      kenh_path=None) -> dict:
    """Đổi quyền riêng tư của video đã đăng (videoId lấy từ sổ), rồi ghi mục `dang-privacy`."""
    ep = _ep_dir(slug, episodes_dir)
    kenh = _kenh(Path(kenh_path) if kenh_path else ep.parent.parent / ".team" / "kenh.json")
    if privacy not in SET_PRIVACY:
        raise UploadError(f"--set-privacy phải thuộc {SET_PRIVACY}")
    if privacy == "public" and kenh.get("firstVideoApproved") is not True:
        raise UploadError("video đầu chưa được duyệt: không đặt public")
    video_id = recorded_video_id(ep)
    if video_id is None:
        raise UploadError(f"sổ của {slug} chưa có videoId (mục dang)")
    token_channel = client.channel_id()
    if token_channel != kenh["channelId"].strip():
        raise UploadError(f"kênh của token {token_channel!r} khác kênh trong kenh.json "
                          f"{kenh['channelId']!r}: không đổi")
    client.set_privacy(video_id, privacy)
    url = video_url(video_id)
    Ledger(ep).add(stage=STAGE_PRIVACY, role="sep-tong", note=f"{url} privacy={privacy}",
                   script_hash=_script_hash_of(ep))
    return {"videoId": video_id, "url": url, "privacy": privacy}


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(prog="aivideo.upload")
    ap.add_argument("slug", help="slug của tập, hoặc `auth` để đăng nhập một lần")
    mode = ap.add_mutually_exclusive_group()
    mode.add_argument("--privacy", choices=PRIVACY)
    mode.add_argument("--set-privacy", choices=SET_PRIVACY)
    ap.add_argument("--publish-at")
    ap.add_argument("--episodes-dir", default="../episodes")
    ap.add_argument("--out-dir")
    ap.add_argument("--kenh")
    a = ap.parse_args(argv)
    try:
        if a.slug == "auth":
            print(json.dumps({"token": str(auth())}, ensure_ascii=False, indent=2))
            return 0
        if a.set_privacy:
            if a.publish_at or a.out_dir:
                ap.error("--set-privacy không đi cùng --publish-at, --out-dir")
            r = set_video_privacy(a.slug, client=make_client(), privacy=a.set_privacy,
                                  episodes_dir=a.episodes_dir, kenh_path=a.kenh)
            print(json.dumps(r, ensure_ascii=False, indent=2))
            return 0
        r = upload_episode(a.slug, client=make_client(), episodes_dir=a.episodes_dir,
                           out_dir=a.out_dir, kenh_path=a.kenh, privacy=a.privacy,
                           publish_at=a.publish_at)
    except NeedUser as e:
        print(json.dumps(e.result, ensure_ascii=False, indent=2))
        print(f"CAN_NGUOI_DUNG: {e}", file=sys.stderr)
        return 3
    except GoogleAuthError as e:
        print(f"lỗi: đăng nhập Google hỏng ({e}): chạy lại `python -m aivideo.upload auth`",
              file=sys.stderr)
        return 1
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
