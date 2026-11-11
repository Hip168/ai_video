# Trạng thái hiện tại (cập nhật 2026-11-11), đọc file này trước khi chạy tiếp

MỤC TIÊU HIỆN TẠI (người dùng chốt 2026-11-11): làm tới khi 1 video lên kênh thì DỪNG. Tiết kiệm token: không mở đề mục mới, đề mục 14 tạm dừng. Đội tự đẩy lên GitHub. Chỉ hỏi người dùng ở các điểm dừng trong `autonomy.md`.

## Đã vào main
Các đề mục 5, 6, 7, 8, 9, 11 và task [12-5] (PR #67). Kênh và quyền đều đã xong:
- `.team/kenh.json`: kênh Dao Le, `UC1aPohYcigcmBGPl7OlQaEw`, `@DaoLe-e4g`, đã xác minh số điện thoại.
- OAuth: project `aivideo-upload-514316`, trạng thái In production. File `~/.config/aivideo/youtube/{client_secret,token}.json`, quyền 600. Đã gọi thử, trả về đúng kênh.
- Trang chính sách: https://hip168.github.io/aivideo-policy/ (repo `Hip168/aivideo-policy`, toan-quyen).
- GitHub: `toan-quyen`. Các lệnh `gh`/push đã cho phép trong `.claude/settings.local.json`.
- MCP `mac-control` đã đăng ký cho dự án. Bộ phân quyền chặn thao tác trên trang đồng ý OAuth.

## Đang làm (2026-11-11)
- **TẠM GIỮ (người dùng, 2026-11-11):** chưa chuyển video sang Công khai. Trước khi chuyển phải làm hai việc: (1) đổi tên kênh, (2) đổi ảnh đại diện.
  - Hai việc này người dùng tự làm trong Studio, vì YouTube API không cho đổi tên kênh hay ảnh đại diện.
  - Tên kênh: người dùng sẽ chốt sau. Các gợi ý đã đưa: Nhị Phân, Vì Sao Máy Tính, Bit Ơi, Gốc Tin Học.
  - Ảnh đại diện: hold. Khi làm thì xuất PNG 800x800 cùng tông màu với video; gợi ý là chữ 0/1 màu vàng trên nền tối.
  - Sau khi người dùng đổi xong và nói ok: đặt firstVideoApproved = true, rồi chạy --set-privacy public.
- **VIDEO ĐẦU ĐÃ LÊN:** https://youtu.be/Dcb-Cy-V2HM (Không công khai). Chờ người dùng xem. Khi người dùng OK: đặt `firstVideoApproved: true` trong `.team/kenh.json`, chạy `python -m aivideo.upload vi-sao-may-tinh-dung-nhi-phan --set-privacy public`.
- Đã vào main: PR #68 (đề mục 10). Nhánh `fix-manifest-nhac`, PR #70, gồm manifest 7 trường, D30 bộ dò mất hình và sổ tập: chờ CI, merge. Sau đó PR #69 (đề mục 13): cập nhật theo main, CI, merge. Main trên máy có commit tập (Cổng 3, đăng) đi trước origin, cần đẩy qua PR.
- Lỗi nhỏ để tập sau: sc42 (`bon-muoi-bit`) chữ chồng nhau khi crossfade, khoảng 0,5 s, ở 7:23. Khung biểu đồ "flow": nhãn nằm lệch lên trên.
- **14 Shorts:** tạm dừng. [13-4] chạy theo lịch: chưa làm.

## Luật đã chốt cần nhớ
- Không còn DEV-LEAD. Chỉ có một TEST-LEAD: gọi một lần rồi dùng SendMessage.
- Review có phát hiện thì sửa luôn.
- Không dùng claude.ai hay Claude in Chrome.
- Dùng mac-control xong thì quay về terminal.
- Hook `team guard` xét theo thư mục hiện tại: lệnh có chữ push phải chạy trong repo đúng.
- Checkout chính có 2 file chưa commit của phiên khác: `video/tests/helpers/render.ts`, `.team/locks/2.sha256`. Không đụng.
- Khởi động lại phiên thì agent đang chạy bị huỷ, không resume được. Kiểm worktree và commit thật rồi giao agent mới.
