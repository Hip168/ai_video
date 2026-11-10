# Đề mục 13: giao diện công khai (hợp đồng DEV-13 ↔ TESTER-13)

Mã: `audio/src/aivideo/upload.py`, `scripts/run-daily.sh`, `scripts/com.aivideo.daily.plist.example`, `episodes/queue.json`. Thiết kế: `13-tu-dong.md`, D24.

## `upload.py`
Chạy từ `audio/`: `PYTHONPATH=$PWD/src .venv/bin/python -m aivideo.upload ...`

### Lệnh
- `python -m aivideo.upload <slug> [--privacy private|unlisted|public] [--publish-at ISO] [--episodes-dir ../episodes] [--out-dir DIR] [--kenh PATH]`
- `python -m aivideo.upload auth`: mở trình duyệt một lần, ghi `~/.config/aivideo/youtube/token.json` quyền 600 (cần `client_secret.json` cùng thư mục). Không test được không có Google; không có biến thay thư mục.
- Mặc định: `--out-dir` = `<episodes-dir>/../out/episodes`, `--kenh` = `<episodes-dir>/../.team/kenh.json` (như `gates gate3`).
- Mã thoát: `0` xong (stdout một JSON); `1` lỗi hoặc bị chặn (`lỗi: ...` ra stderr, không JSON); `2` sai tham số (argparse, gồm `--privacy` ngoài 3 giá trị).
- Stdout khi xong: `{"videoId","url","privacy","publishAt","resumed"}`. `url` = `https://www.youtube.com/watch?v=<videoId>`. `resumed` = `true` khi videoId lấy từ sổ (không gọi `insert_video`).

### Thay client Google bằng client giả
- CLI lấy client bằng hàm module `make_client()`. Test CLI: `monkeypatch.setattr(upload, "make_client", lambda: fake)` rồi gọi `upload.main([...])`.
- Hàm chính (test gọi trực tiếp): `upload_episode(slug, *, client, episodes_dir="../episodes", out_dir=None, kenh_path=None, privacy=None, publish_at=None) -> dict` (trả đúng JSON stdout). Lỗi: ném `UploadError` (hoặc `GateError` khi slug sai, sổ vỡ).
- Client giả cần đủ năm phương thức (cùng tên với lớp thật `YouTubeClient`), ghi lại lời gọi để test kiểm thứ tự:
  - `channel_id() -> str` (thật: `channels.list(mine=True)`)
  - `insert_video(path: Path, body: dict) -> str` trả videoId (thật: `videos.insert`, resumable)
  - `processing_status(video_id) -> str` (thật: `videos.list(part=processingDetails)`; giá trị `processingStatus`)
  - `set_thumbnail(video_id, path: Path)` (thật: `thumbnails.set`)
  - `insert_caption(video_id, path: Path, language: str, name: str)` (thật: `captions.insert`; `language="vi"`, `name="Tiếng Việt"`)
- Thứ tự gọi khi tải mới: `channel_id`, `insert_video`, `processing_status` (lặp tới khi `succeeded`), `set_thumbnail`, `insert_caption`. Kênh lệch: chỉ có `channel_id`, rồi lỗi mã 1.
- Đợi xử lý: hằng `POLL_SECONDS = 15` (ngủ giữa hai lần hỏi), `MAX_WAIT_SECONDS = 3600`. Test đặt `monkeypatch.setattr(upload, "POLL_SECONDS", 0)`. `processing_status` trả `failed`, `rejected` hoặc `terminated` thì lỗi mã 1. Quá thời gian thì lỗi mã 1 (chạy lại sẽ nối tiếp).

### Đầu vào và kiểm trước khi tải (theo thứ tự, lỗi nào cũng mã 1, không gọi client)
1. Slug đúng dạng; `kenh.json` có `channelId`.
2. `episodes/<slug>/publish.json` là object, có `title`, `description`, `chapters`, `thumbnail` (chuỗi không rỗng), `tags` (mảng); `containsSyntheticMedia` đúng `false`.
3. `privacy` = `--privacy` nếu có, không thì `privacy` của `publish.json`; phải thuộc `private|unlisted|public`. `public` khi `kenh.json` không có `firstVideoApproved: true` thì chặn.
4. `--publish-at`: phải đọc được bằng `datetime.fromisoformat` (cho phép đuôi `Z`) và `privacy` phải là `private` (YouTube chỉ nhận `publishAt` với video private).
5. File: MP4 `<out-dir>/<slug>/<slug>.mp4`, SRT `<out-dir>/<slug>/video.srt`, thumbnail `episodes/<slug>/<publish.thumbnail>`.
6. Gọi `channel_id()`; khác `channelId` trong `kenh.json` (so sau `strip`) thì mã 1, không tải.

### `body` gửi `insert_video`
```json
{"snippet":{"title":"<title>","description":"<mô tả>","tags":[...]},
 "status":{"privacyStatus":"<privacy>","selfDeclaredMadeForKids":false,"containsSyntheticMedia":false,"publishAt":"<chỉ có khi --publish-at>"}}
```
Chương trong mô tả: nếu `publish.chapters` (đã `strip`) đã nằm nguyên văn trong `description` thì giữ nguyên `description`; không thì `description.rstrip() + "\n\n" + chapters`. Chương giữ đúng định dạng `publish.json` (`00:00 Tên chương`, mỗi chương một dòng).

### Ghi sổ và chạy lại
- Ngay sau khi `insert_video` trả videoId, ghi một mục sổ tập bằng hàm Python của `gates`, tương đương lệnh
  `python -m aivideo.gates ledger add <slug> --stage dang --role publisher --note https://www.youtube.com/watch?v=<videoId> --artifact <MP4>`
  (`Ledger(ep).add(stage="dang", role="publisher", note=<url>, script_hash=<hash lời hiện tại>, artifact_hash=<sha256 MP4>)`). `videoId` đọc lại từ `note`.
- Trước khi tải: tìm mục `stage:"dang"` mới nhất có `note` đúng dạng URL trên (hàm `recorded_video_id(ep)`). Có thì bỏ `insert_video`, đi tiếp `processing_status`, `set_thumbnail`, `insert_caption` với videoId đó, `resumed: true`. Khi nối tiếp, `--privacy`/`--publish-at` không áp lại lên video đã tải.
- Sổ vỡ chuỗi hash thì lỗi mã 1.

### Bí mật
`~/.config/aivideo/youtube/client_secret.json`, `token.json`, quyền 600. `.gitignore` có `client_secret*.json` và `token*.json`.

## `scripts/run-daily.sh`
Chạy: `scripts/run-daily.sh` (không tham số), zsh. Mã thoát: `0` đã đăng; `1` dừng (mọi trường hợp dưới), kể cả chạy chồng.

### Biến môi trường (để test)
| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `AIVIDEO_CLAUDE` | `claude` | lệnh claude (tách theo khoảng trắng); nhận thêm `-p <prompt> --permission-mode dontAsk --permission-prompts none --output-format json`, chạy trong gốc repo |
| `AIVIDEO_GATES` | `<repo>/audio/.venv/bin/python -m aivideo.gates` | lệnh cổng; được gọi `gate3 <slug> --video <repo>/out/episodes/<slug>/<slug>.mp4`, chạy trong `audio/` |
| `AIVIDEO_UPLOAD` | `<repo>/audio/.venv/bin/python -m aivideo.upload` | lệnh đăng; được gọi `<slug>`, chạy trong `audio/` |
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
6. Lệnh `AIVIDEO_GATES gate3 ...` thoát mã khác 0 ("cổng không đạt": script tự chạy Cổng 3, không tin lời claude).
7. Lệnh upload thoát mã khác 0.
Đạt hết: log `XONG: đã đăng <slug>`, mã 0, không thông báo.

### Prompt gửi claude
Một câu cố định trong script: làm video theo `episodes/PLAYBOOK.md` từ khâu 1 tới hết khâu 12; đề tài từ `episodes/queue.json`; không làm khâu 13; điểm dừng thì in `CAN_NGUOI_DUNG: <lý do>`; Cổng 3 đạt thì dòng cuối in `SLUG: <slug>`.

## `scripts/com.aivideo.daily.plist.example`
Mẫu LaunchAgent, `Label` = `com.aivideo.daily`, `ProgramArguments` gọi `scripts/run-daily.sh` (đường dẫn tuyệt đối để người dùng thay), `StartCalendarInterval` (`Hour`, `Minute`). Không có token thật.

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
- PLAYBOOK: dòng bảng vai của `publisher` vẫn có `ops` (test khoá `test_roles_files.py`); khâu [13] chạy `python -m aivideo.upload`; mẫu 4.13 bỏ trình duyệt; lượt theo lịch thì `run-daily.sh` chạy khâu 13.

## Test
TESTER: `audio/tests/test_upload*.py` (client giả) và `audio/tests/test_run_daily.py` (pytest + subprocess, các lệnh thay bằng script giả qua biến môi trường trên). Không gọi Google thật.
