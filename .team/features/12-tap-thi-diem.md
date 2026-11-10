# Đề mục 12: Kênh và tập thí điểm

Nhánh `12-tap-thi-diem`. Phụ thuộc 5–11. Thiết kế: `.team/doi-san-xuat.md`, D20, D21. Đây là lần chạy thật đầu tiên của đội, đi đúng quy trình, không làm tắt.

## Task
- [12-1] `packager` đề xuất tên kênh, mô tả, banner, avatar; không dính G3/Ript. Sếp tổng ghi vào `.team/kenh.json` sau khi người dùng chọn tên.
- [12-2] Người dùng đăng nhập Google cá nhân, tạo kênh, xác minh số điện thoại. OPS hướng dẫn từng bước và ghi `.team/kenh.json`: `channelId`, `handle`, `verifiedPhone`. Không lưu mật khẩu, mã xác minh.
- [12-3] Tập đầu: người dùng nói "làm video về <đề tài>", sếp tổng đi theo `episodes/PLAYBOOK.md`, chạy `make-episode.sh` đủ 7 bước lần đầu. Đăng bằng `python -m aivideo.upload` của đề mục 13 (D24), ở chế độ private trước để kiểm không bị khoá, sau đó chuyển Không công khai. Người dùng xem và duyệt.
- [12-4] Nạp nhạc Audio Library sau khi có kênh, OPS ghi manifest.
- [12-5] Chặn cảnh `flow` có chữ quá nhỏ (issue (f) trong `.team/tests/8.md`). Lint báo lỗi, không chỉ cảnh báo, khi cỡ chữ nút tính ra nhỏ hơn 28 px ở khung 1080p, hoặc khi nhãn cạnh đè nhau. DEV đo trên ảnh still (8 nút `TB` nối chuỗi; 1 gốc, 7 con có nhãn cạnh) rồi báo số đo trước khi chốt ngưỡng. Làm trong lint của tập (`scripts/lint-episode.ts`), không đổi giới hạn trong spec đã khoá test.

## Xong khi
- MP4 dài 9:30–12:00. Lint, loudness, mất hình đều đạt.
- Cả ba cổng đạt bằng script, sổ tập đủ từng khâu.
- Mỗi số, năm, tên riêng trong lời đọc có claim `DAT`.
- Video lên đúng kênh ở chế độ Không công khai, có tiêu đề, mô tả, chương, phụ đề, thumbnail.
- Người dùng nhắn ok, BA ghi vào `decisions.md`. Từ đó D21 cho phép đăng Công khai.
- Dùng đo thật thời gian từ lệnh đến khi lên kênh, ghi vào `.team/stack.md`.
