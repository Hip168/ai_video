# Đề mục 13: Tự tạo và tự đăng theo lịch

Nhánh `13-tu-dong`. Phụ thuộc: 10, 11. Gặp 12 ở bước đăng tập đầu. Quyết định: D24 (thay phần cách đăng của D21).

## Kiến trúc đã chọn
- `audio/src/aivideo/upload.py`, lệnh `python -m aivideo.upload <slug> [--privacy private|unlisted|public] [--publish-at ISO]`:
  - Đọc `episodes/<slug>/publish.json`, MP4, SRT, thumbnail và `.team/kenh.json`.
  - Kiểm kênh của token đúng `channelId` trong `kenh.json`. Lệch thì thoát 1, không tải.
  - Gọi `videos.insert` (tải lên theo kiểu resumable), đặt `selfDeclaredMadeForKids=false` và `containsSyntheticMedia=false`.
  - Đợi `processingStatus=succeeded`, rồi gọi `thumbnails.set`, rồi `captions.insert` (vi).
  - Ghi `videoId` và URL vào sổ tập qua `gates ledger`, khâu `dang`.
  - Tải lỗi giữa chừng thì chạy lại được, không tạo video thứ hai: kiểm `videoId` đã có trong sổ trước khi tải.
- Thông tin đăng nhập nằm ở `~/.config/aivideo/youtube/` (`client_secret.json`, `token.json`, quyền 600), không bao giờ vào repo. Lệnh `python -m aivideo.upload auth` mở trình duyệt một lần để người dùng đồng ý.
- `scripts/run-daily.sh`: chạy dưới `caffeinate -i -s`, gọi `claude -p "<lệnh của PLAYBOOK>" --permission-mode dontAsk --permission-prompts none --output-format json`. Log ghi vào `~/Library/Logs/aivideo/<ngày>.log`. Có khoá chống chạy chồng. Mã thoát khác 0, `CAN_NGUOI_DUNG` hoặc cổng không đạt thì dừng, không đăng, và gửi thông báo macOS bằng `osascript`.
- `scripts/com.aivideo.daily.plist.example`: mẫu LaunchAgent dùng `StartCalendarInterval`. Người dùng tự cài bằng `launchctl bootstrap`.
- Hàng đợi đề tài: `episodes/queue.json` (danh sách đề tài người dùng thêm). Nếu hàng đợi trống thì `researcher` tự chọn đề tài chưa làm, đối chiếu với các slug đã có.
- Vai `publisher` đổi sang chạy `python -m aivideo.upload`, không dùng trình duyệt nữa. Sửa `episodes/roles/publisher.md` và bước đăng trong `episodes/PLAYBOOK.md`.
- `docs/tu-dong.md`: hướng dẫn những việc người dùng làm một lần (xem mục cuối).

## Task
- [13-1] `upload.py` và lệnh `auth`. Test dùng client giả, không gọi Google thật.
- [13-2] `run-daily.sh`, mẫu plist, log, khoá chạy chồng, thông báo khi dừng.
- [13-3] Hàng đợi đề tài, sửa `publisher.md` và PLAYBOOK theo D24.
- [13-4] `docs/tu-dong.md`. OPS chạy thử một lượt thật cùng người dùng, video để private.

## Xong khi
- `upload.py` với client giả: gọi đúng thứ tự `insert`, `processing`, `thumbnail`, `caption`; đúng `privacyStatus`, `publishAt`, cờ synthetic, chương trong mô tả.
- `channelId` lệch thì không tải. Chạy lại sau khi lỗi thì không tạo video thứ hai.
- Không có file bí mật nào trong repo. CI kiểm `.gitignore` và các mẫu tên file.
- `run-daily.sh` với `claude` giả: mã thoát khác 0 thì không gọi upload, có log và có thông báo; chạy chồng thì lượt sau thoát ngay.
- Lượt thật đầu tiên: video lên đúng kênh ở chế độ private, không bị khoá, có thumbnail, phụ đề, chương.
- Test khoá xanh.

## Người dùng làm một lần (OPS hướng dẫn từng bước)
1. Tạo Google Cloud project, bật YouTube Data API v3. OAuth consent screen chọn External, bấm Publish app. Tạo OAuth client kiểu Desktop, tải `client_secret.json` về `~/.config/aivideo/youtube/`.
2. Chạy `python -m aivideo.upload auth`, đăng nhập bằng tài khoản kênh, bấm qua màn hình "unverified app".
3. Xác minh số điện thoại của kênh (cần để đặt thumbnail).
4. `claude setup-token`, lưu token cho LaunchAgent. Gia hạn mỗi năm.
5. Thêm allowlist hẹp vào cài đặt Claude Code (OPS đưa nội dung). Đội không tự sửa cài đặt.
6. `sudo pmset repeat wakeorpoweron ...`, rồi `launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.aivideo.daily.plist`.
7. Để máy cắm sạc, mở nắp vào giờ chạy.
