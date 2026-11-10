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

## [12-5] Ngưỡng đã chốt (BA, 2026-11-10, theo số đo DEV-12)
Người dùng giao đội tự quyết phần kỹ thuật ("tự làm mọi thứ", 2026-11-10). Số đo nằm trong báo cáo DEV-12: chuỗi TB 8 nút chữ 11,4 px; fan TB 7 con chữ 23,7 px, nhãn đè 16–27 px.
- Chữ nút: báo lỗi khi nhỏ hơn 24 px (`scale < 0,909`). 28 px quá chặt: chuỗi dọc chỉ còn tối đa 3 nút, trong khi `scale` lớn nhất chỉ cho 30,4 px.
- Chữ nhãn cạnh: báo lỗi khi nhỏ hơn 20 px. Cỡ chữ nhãn cạnh hiện tối đa 23,8 px.
- Nhãn đè nhãn: báo lỗi khi hai khung nhãn cạnh giao nhau quá 4 px. Khung tính bằng `lblW`/`lblH`, đặt tại `pointAlong(…, 0,5)`, đúng như cảnh vẽ.
- Nhãn che cạnh khác: chỉ cảnh báo, không chặn.
- Lint tính từ bố cục (`layoutFlow`) và công thức của `flow.tsx`, không render. Hằng số dùng chung lấy từ code cảnh, không chép số.
- Lỗi lint phải nêu cảnh, cỡ chữ đo được và gợi ý "tách thành hai cảnh `flow`".
