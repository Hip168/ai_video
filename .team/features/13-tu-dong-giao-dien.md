# Đề mục 13: giao diện công khai (hợp đồng DEV-13 ↔ TESTER-13)

Mã: `audio/src/aivideo/upload.py`, `scripts/run-daily.sh`, `scripts/com.aivideo.daily.plist.example`, `episodes/queue.json`. Thiết kế: `13-tu-dong.md`, D24.

## `upload.py`
Chạy từ `audio/`: `PYTHONPATH=$PWD/src .venv/bin/python -m aivideo.upload ...`

### Lệnh
- `python -m aivideo.upload <slug> [--privacy private|unlisted|public] [--publish-at ISO] [--episodes-dir ../episodes] [--out-dir DIR] [--kenh PATH]`
- `python -m aivideo.upload <slug> --set-privacy public|unlisted [--episodes-dir ../episodes] [--kenh PATH]`: đổi quyền riêng tư của video đã đăng (mục "Đổi quyền riêng tư" bên dưới). `--set-privacy` không đi cùng `--privacy` (argparse, mã 2), `--publish-at` hay `--out-dir` (mã 2).
- `python -m aivideo.upload auth`: mở trình duyệt một lần, ghi `~/.config/aivideo/youtube/token.json` quyền 600 (cần `client_secret.json` cùng thư mục). Không test được không có Google; không có biến thay thư mục.
- Mặc định: `--out-dir` = `<episodes-dir>/../out/episodes`, `--kenh` = `<episodes-dir>/../.team/kenh.json` (như `gates gate3`).
- Mã thoát: `0` xong (stdout một JSON); `1` lỗi hoặc bị chặn (`lỗi: ...` ra stderr, không JSON); `2` sai tham số (argparse, gồm `--privacy` ngoài 3 giá trị); `3` `CAN_NGUOI_DUNG` (video bị khoá, xem dưới).
- Mã `3` (D25): privacy mong muốn là `unlisted`/`public`, đã `set_privacy` mà `privacy_status` đọc lại vẫn là `private`. Stdout `{"state":"CAN_NGUOI_DUNG","reason","videoId","url"}`, stderr dòng `CAN_NGUOI_DUNG: ...`. Hàm `upload_episode` ném `NeedUser` (thuộc tính `result` = JSON trên). Không ghi mục `dang-privacy`, nên chạy lại sẽ đặt và đọc lại lần nữa.
- `googleapiclient.errors.HttpError` ném ra từ client (thật hay giả) được `main` bắt riêng: stderr một dòng `lỗi: Google trả HTTP <status>: <reason>`, mã 1, không traceback.
- `google.auth.exceptions.GoogleAuthError` (vd `RefreshError`, từ `make_client` hay client) được `main` bắt: stderr `lỗi: đăng nhập Google hỏng (...): chạy lại `python -m aivideo.upload auth``, mã 1.
- Lệnh `auth` gọi `run_local_server(port=0, prompt="consent")`.
- Stdout khi xong: `{"videoId","url","privacy","publishAt","resumed"}`. `url` = `https://www.youtube.com/watch?v=<videoId>`. `privacy` = quyền mong muốn. `resumed` = `true` khi không gọi `insert_video` (videoId lấy từ sổ hoặc tìm thấy bằng `find_uploaded`).
- Có videoId (sau `insert_video` hoặc `find_uploaded`) là in ngay ra stderr dòng `videoId: <id>`, trước khi ghi sổ.

### Thay client Google bằng client giả
- CLI lấy client bằng hàm module `make_client()`. Test CLI: `monkeypatch.setattr(upload, "make_client", lambda: fake)` rồi gọi `upload.main([...])`.
- Hàm chính (test gọi trực tiếp): `upload_episode(slug, *, client, episodes_dir="../episodes", out_dir=None, kenh_path=None, privacy=None, publish_at=None) -> dict` (trả đúng JSON stdout). Lỗi: ném `UploadError` (hoặc `GateError` khi slug sai, sổ vỡ), `NeedUser` khi mã 3.
- Client giả cần đủ tám phương thức (cùng tên với lớp thật `YouTubeClient`), ghi lại lời gọi để test kiểm thứ tự:
  - `channel_id() -> str` (thật: `channels.list(part=id, mine=True)`)
  - `find_uploaded(tag: str) -> str | None`: videoId có thẻ `tag` trong playlist uploads của kênh, không có thì `None` (thật: `channels.list(part=contentDetails, mine=True)` lấy `contentDetails.relatedPlaylists.uploads`, rồi `playlistItems.list` lấy tối đa `SCAN_UPLOADS = 50` video gần nhất, rồi `videos.list(part=snippet)` đọc `snippet.tags`, vì `playlistItems` không trả thẻ). Được gọi với `tag = "aivideo:<slug>"`.
  - `insert_video(path: Path, body: dict) -> dict` trả tài nguyên video, ít nhất `{"id": <videoId>}` (thật: `videos.insert`, resumable)
  - `processing_status(video_id) -> str` (thật: `videos.list(part=processingDetails)`; giá trị `processingStatus`)
  - `set_thumbnail(video_id, path: Path)` (thật: `thumbnails.set`)
  - `insert_caption(video_id, path: Path, language: str, name: str)` (thật: `captions.insert`; `language="vi"`, `name="Tiếng Việt"`)
  - `set_privacy(video_id, privacy: str)` (thật: `videos.list(part=status)` rồi `videos.update(part=status)`, gửi lại status hiện có, chỉ đổi `privacyStatus`, `setdefault` `selfDeclaredMadeForKids=false` và `containsSyntheticMedia=false`)
  - `privacy_status(video_id) -> str` (thật: `videos.list(part=status)`; giá trị `status.privacyStatus`). Chỉ gọi ngay sau `set_privacy`.
- Đợi xử lý: hằng `POLL_SECONDS = 15` (ngủ giữa hai lần hỏi), `MAX_WAIT_SECONDS = 3600`. Test đặt `monkeypatch.setattr(upload, "POLL_SECONDS", 0)`. `processing_status` trả `failed`, `rejected` hoặc `terminated` thì lỗi mã 1. Quá thời gian thì lỗi mã 1 (chạy lại sẽ nối tiếp).

### Đầu vào và kiểm trước khi gọi client (theo thứ tự, lỗi nào cũng mã 1, không gọi client)
1. Slug đúng dạng; `kenh.json` có `channelId`.
2. `episodes/<slug>/publish.json` là object, có `title`, `description`, `chapters`, `thumbnail` (chuỗi không rỗng), `tags` (mảng); `containsSyntheticMedia` đúng `false`.
3. `privacy` = `--privacy` nếu có, không thì `privacy` của `publish.json`; phải thuộc `private|unlisted|public`. `public` khi `kenh.json` không có `firstVideoApproved: true` thì chặn.
4. `--publish-at`: phải đọc được bằng `datetime.fromisoformat` (cho phép đuôi `Z`) và `privacy` phải là `private` (YouTube chỉ nhận `publishAt` với video private).
5. File: MP4 `<out-dir>/<slug>/<slug>.mp4`, SRT `<out-dir>/<slug>/video.srt`, thumbnail `episodes/<slug>/<publish.thumbnail>`.
6. Mọi phép tính có thể lỗi làm trước insert (D25): sha256 của MP4, ảnh bìa, SRT; hash lời; `body`; đọc sổ (sổ vỡ chuỗi hash thì lỗi ở đây, chưa gọi client).
Sau đó mới gọi `channel_id()`; khác `channelId` trong `kenh.json` (so sau `strip`) thì mã 1, không gọi gì thêm.

### `body` gửi `insert_video`
```json
{"snippet":{"title":"<title>","description":"<mô tả>","tags":["<tags của publish.json>...","aivideo:<slug>"]},
 "status":{"privacyStatus":"private","selfDeclaredMadeForKids":false,"containsSyntheticMedia":false,"publishAt":"<chỉ có khi --publish-at>"}}
```
- `privacyStatus` luôn `private` (D25), dù privacy mong muốn là gì. Quyền mong muốn đặt sau cùng bằng `set_privacy`.
- `tags` = `tags` của `publish.json` theo thứ tự, thêm mốc `aivideo:<slug>` (hằng `TAG_PREFIX = "aivideo:"`) ở cuối.
- Chương trong mô tả: nếu `publish.chapters` (đã `strip`) đã nằm nguyên văn trong `description` thì giữ nguyên `description`; không thì `description.rstrip() + "\n\n" + chapters`. Chương giữ đúng định dạng `publish.json` (`00:00 Tên chương`, mỗi chương một dòng).

### Thứ tự gọi (D25 bổ sung)
Tải mới, privacy mong muốn `unlisted`/`public`:
`channel_id`, `find_uploaded("aivideo:<slug>")` (trả `None`), `insert_video`, `processing_status` (lặp tới `succeeded`), `set_thumbnail`, `insert_caption`, `set_privacy(video_id, <privacy>)`, `privacy_status`.
- privacy mong muốn `private` (kể cả có `--publish-at`): không gọi `set_privacy`, `privacy_status`.
- `find_uploaded` thấy videoId: không gọi `insert_video`, ghi mục `dang` cho videoId đó, đi tiếp như trên, `resumed: true`.
- Sổ đã có videoId: không gọi `find_uploaded`, `insert_video`.
- Kênh lệch: chỉ có `channel_id`, rồi lỗi mã 1.

### Ghi sổ và chạy lại (sổ ghi đủ từng bước)
Mỗi bước xong ghi một mục sổ tập bằng hàm Python của `gates` (`Ledger(ep).add(stage=..., role="publisher", note=..., script_hash=<hash lời, tính trước insert>, artifact_hash=...)`). `<url>` = `https://www.youtube.com/watch?v=<videoId>`.

| Bước | `stage` (hằng) | Ghi khi | `note` | `artifactHash` |
|---|---|---|---|---|
| insert / tìm thấy | `dang` (`STAGE`) | ngay sau khi có videoId (sau dòng stderr `videoId:`) | `<url>` | sha256 MP4 |
| thumbnail | `dang-thumbnail` (`STAGE_THUMBNAIL`) | sau khi `set_thumbnail` xong | `<url>` | sha256 ảnh bìa |
| caption | `dang-caption` (`STAGE_CAPTION`) | sau khi `insert_caption` xong | `<url>` | sha256 SRT |
| quyền | `dang-privacy` (`STAGE_PRIVACY`) | sau khi `privacy_status` đọc lại khác `private` | `<url> privacy=<privacy>` | null |

- Ghi sổ lỗi (sổ không ghi được, đĩa đầy...): lỗi mã 1, `lỗi: video <id> (<url>) đã có trên YouTube nhưng ghi sổ khâu <stage> lỗi: ... Không tải lại; chạy lại lệnh sẽ tìm lại video theo thẻ aivideo:<slug>`. Dòng `videoId:` đã in trước đó.
- videoId: từ mục `stage:"dang"` mới nhất có `note` đúng dạng URL (hàm `recorded_video_id(ep)`).
- Một bước tính là đã xong khi sổ có mục cùng `stage` và đúng `note` như bảng. Bước đã xong không gọi lại.
- Chạy lại: `channel_id` luôn gọi. Nếu thumbnail, caption đã xong và (privacy mong muốn là `private` hoặc đã có mục `dang-privacy` đúng `note`) thì dừng ở đó, mã 0. Ngược lại `processing_status`, rồi các bước chưa xong theo thứ tự thumbnail, caption, rồi `set_privacy` + `privacy_status` (khi privacy mong muốn khác `private`).
- Vd: lỗi ở caption, chạy lại gọi `channel_id`, `processing_status`, `insert_caption`, `set_privacy`, `privacy_status`. Mã 3 rồi chạy lại: `channel_id`, `processing_status`, `set_privacy`, `privacy_status`. Đã xong hết: chỉ `channel_id`.
- `--publish-at` chỉ có tác dụng khi insert; nối tiếp không áp lại.

### Đổi quyền riêng tư (`--set-privacy`)
- Hàm: `set_video_privacy(slug, *, client, privacy, episodes_dir="../episodes", kenh_path=None) -> dict`, lỗi ném `UploadError`.
- Kiểm theo thứ tự (lỗi nào cũng mã 1, `lỗi: ...`): `kenh.json` có `channelId`; `public` khi `firstVideoApproved` khác `true` thì chặn (không gọi client); sổ phải có videoId (mục `dang`, như `recorded_video_id`), không có thì chặn (không gọi client); `channel_id()` khác kênh thì chặn, không gọi `set_privacy`.
- Thứ tự gọi: `channel_id`, `set_privacy(video_id, privacy)`. Rồi ghi mục sổ `stage:"dang-privacy"` (`STAGE_PRIVACY`), `role:"sep-tong"`, `note` = `<url> privacy=<privacy>`, `artifactHash` null.
- Stdout `{"videoId","url","privacy"}`, mã 0. `HttpError` như trên (mã 1).
- Ai, khi nào: sếp tổng chạy `--set-privacy public` sau khi người dùng nhắn ok video đầu, rồi commit `ledger.json` (PLAYBOOK mục 8).

### Bí mật
`~/.config/aivideo/youtube/client_secret.json`, `token.json`, quyền 600. `.gitignore` có `client_secret*.json` và `token*.json`.

## `scripts/run-daily.sh`
Chạy: `scripts/run-daily.sh` (không tham số), zsh. Mã thoát: `0` đã đăng; `1` dừng (mọi trường hợp dưới), kể cả chạy chồng.

### Biến môi trường (để test)
| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `AIVIDEO_CLAUDE` | `claude` | lệnh claude (giá trị ghi đè được tách theo khoảng trắng bằng `(z)`; mặc định gán mảng trực tiếp nên đường dẫn repo có khoảng trắng vẫn đúng); nhận thêm `-p <prompt> --permission-mode dontAsk --permission-prompts none --output-format json`, chạy trong gốc repo |
| `AIVIDEO_GATES` | `<repo>/audio/.venv/bin/python -m aivideo.gates` | lệnh cổng; được gọi `gate3 <slug> --video <repo>/out/episodes/<slug>/<slug>.mp4`, chạy trong `audio/` |
| `AIVIDEO_UPLOAD` | `<repo>/audio/.venv/bin/python -m aivideo.upload` | lệnh đăng; được gọi `<slug>`, chạy trong `audio/` |
| `AIVIDEO_GIT` | `git` | lệnh git dùng cho `status --porcelain`, `add`, `commit` (chạy trong gốc repo) |
| `AIVIDEO_PUSH` | `git push origin main` | lệnh push sau khi đăng (chạy trong gốc repo, không thêm tham số) |
| `AIVIDEO_NOTIFY` | `osascript` (display notification) | lệnh thông báo; nhận đúng một tham số là câu báo |
| `AIVIDEO_LOG_DIR` | `~/Library/Logs/aivideo` | thư mục log; khoá nằm trong đây |
| `AIVIDEO_CAFFEINATED` | rỗng | khác rỗng thì không tự chạy lại dưới `caffeinate -i -s` (script tự đặt khi `exec caffeinate`) |

- Log: `<AIVIDEO_LOG_DIR>/<YYYY-MM-DD>.log` (dòng có mốc giờ; stderr của claude, stdout/stderr của gate3 và upload ghi vào đây). JSON stdout của claude: `<AIVIDEO_LOG_DIR>/<YYYY-MM-DD-HHMMSS>-claude.json`.
- Khoá: `<AIVIDEO_LOG_DIR>/run-daily.lock`, giữ bằng `zsystem flock` (tự nhả khi tiến trình chết). Đang có lượt khác giữ khoá: ghi log `lượt khác đang chạy, thoát`, mã 1, không gọi claude, không thông báo.
- Script đọc JSON stdout của claude bằng `audio/.venv/bin/python` (cần venv kể cả khi thay các lệnh khác).

### Dừng, không đăng (ghi log `DỪNG, không đăng: ...`, gọi thông báo, mã 1)
Xét theo thứ tự:
1. claude thoát mã khác 0 (không gọi gate3, upload).
2. stdout của claude không phải JSON.
3. JSON có `is_error: true`.
4. `result` có chuỗi `CAN_NGUOI_DUNG` ở bất kỳ đâu.
5. Dòng cuối của `result` không khớp `^SLUG: <slug>$` (slug dạng `^[a-z0-9]+(-[a-z0-9]+)*$`).
6. Commit trong máy các file của tập lỗi (xem dưới).
7. Lệnh `AIVIDEO_GATES gate3 ...` thoát mã khác 0 ("cổng không đạt": script tự chạy Cổng 3, không tin lời claude).
8. Lệnh upload thoát mã khác 0 (vẫn commit sổ trước khi dừng, để giữ videoId đã ghi). Mã 3: lời dừng có `CAN_NGUOI_DUNG` (video có thể bị khoá).
Đạt hết: log `XONG: đã đăng <slug>`, rồi push; mã 0, không thông báo.

### Commit và push (D25)
- Đường dẫn của tập (D25 bổ sung), theo thứ tự: `episodes/<slug>`, `video/src/episodes/<slug>`, `episodes/index.json`.
- Trước `gate3`: với từng đường dẫn, `AIVIDEO_GIT status --porcelain -- <đường dẫn>`; giữ những đường dẫn có thay đổi (stdout không rỗng). Có ít nhất một thì `AIVIDEO_GIT add -- <các đường dẫn đã giữ>` rồi `AIVIDEO_GIT commit -q -m "[tap] <slug>: nội dung tập trước Cổng 3" -- <các đường dẫn đã giữ>`. Không có thì bỏ qua. Lệnh `status` lỗi, hoặc `add`/`commit` lỗi thì dừng (mục 6 ở trên). Không commit file nào khác; file khác đang sửa dở không bị đụng.
- Sau upload (đạt hay lỗi): commit lại như trên với lời `[tap] <slug>: sổ tập sau khi đăng`; commit này lỗi chỉ ghi log.
- Sau khi đăng xong: chạy `AIVIDEO_PUSH`. Lỗi thì ghi log `push lỗi (video đã đăng): ...`, mã thoát vẫn 0, không thông báo. Upload lỗi thì không push.

### Prompt gửi claude
Một câu cố định trong script: làm video theo `episodes/PLAYBOOK.md` từ khâu 1 tới hết khâu 12; đề tài từ `episodes/queue.json`; không làm khâu 13; điểm dừng thì in `CAN_NGUOI_DUNG: <lý do>`; Cổng 3 đạt thì dòng cuối in `SLUG: <slug>`.

## `scripts/com.aivideo.daily.plist.example`
Mẫu LaunchAgent, `Label` = `com.aivideo.daily`, `ProgramArguments` gọi `scripts/run-daily.sh` (đường dẫn tuyệt đối để người dùng thay), `StartCalendarInterval` (`Hour`, `Minute`), `EnvironmentVariables.PATH` gồm thư mục chứa `claude` (`~/.local/bin`, viết tuyệt đối), `uv` và `node` (`/opt/homebrew/bin`) (D25), `CLAUDE_CODE_OAUTH_TOKEN` là chữ giữ chỗ. Không có token thật. `StandardOutPath`/`StandardErrorPath` = `/Users/TEN_MAY/Library/Logs/aivideo/launchd.out.log` / `launchd.err.log`. Ghi chú trong file: không dán giá trị token vào log; cần Claude Code từ v2.1.259 trở lên (cờ `--permission-prompts`); tạo sẵn `~/Library/Logs/aivideo`.

## `episodes/queue.json`
Mảng, mặc định `[]`. Mỗi phần tử:
```json
{"slug":"tai-sao-may-tinh-dung-nhi-phan","topic":"Tại sao máy tính dùng hệ nhị phân"}
```
- `slug` (bắt buộc, `^[a-z0-9]+(-[a-z0-9]+)*$`, không trùng trong mảng), `topic` (bắt buộc, chuỗi không rỗng). Không có trường khác.
- Người dùng thêm phần tử vào cuối. Đội không xoá phần tử.
- Phần tử đã làm = đã có thư mục `episodes/<slug>/`. Lượt chạy lấy phần tử đầu tiên chưa làm. Không còn phần tử chưa làm thì `researcher` tự chọn đề tài không trùng `episodes/index.json` và các thư mục tập đã có.

## Nội dung bắt buộc của `publisher.md` và PLAYBOOK (D24)
- `publisher.md` giữ sáu mục bắt buộc của đề mục 11; nêu lệnh `python -m aivideo.upload <slug>`; không còn Claude in Chrome / YouTube Studio làm cách đăng.
- Phần "Không được làm" giữ ý: kênh lệch thì không đăng (`upload.py` tự chặn khi `channelId` lệch); video đầu không đặt `public`; không đăng khi hash lệch hoặc Cổng 3 chưa đạt.
- PLAYBOOK: dòng bảng vai của `publisher` vẫn có `ops` (test khoá `test_roles_files.py`); khâu [13] chạy `python -m aivideo.upload`; mẫu 4.13 bỏ trình duyệt; lượt theo lịch thì `run-daily.sh` chạy khâu 13; mục 8: video đầu giữ "Không công khai" (`unlisted`, D21, D25 sửa 2026-11-10); danh sách `CẦN NGƯỜI DÙNG` có trường hợp upload thoát mã 3.

## Test
TESTER: `audio/tests/test_upload*.py` (client giả) và `audio/tests/test_run_daily.py` (pytest + subprocess, các lệnh thay bằng script giả qua biến môi trường trên). Không gọi Google thật.
