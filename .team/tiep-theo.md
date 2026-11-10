# Trạng thái hiện tại (cập nhật 2026-11-11), đọc file này trước khi chạy tiếp

MỤC TIÊU HIỆN TẠI (người dùng chốt 2026-11-11): làm tới khi 1 video lên kênh thì DỪNG. Tiết kiệm token: không mở đề mục mới, đề mục 14 tạm dừng. Đội tự đẩy lên GitHub. Chỉ hỏi người dùng ở các điểm dừng trong `autonomy.md`.

## Đã vào main
Các đề mục 5, 6, 7, 8, 9, 11 và task [12-5] (PR #67). Kênh và quyền đều đã xong:
- `.team/kenh.json`: kênh Dao Le, `UC1aPohYcigcmBGPl7OlQaEw`, `@DaoLe-e4g`, đã xác minh số điện thoại.
- OAuth: project `aivideo-upload-514316`, trạng thái In production. File `~/.config/aivideo/youtube/{client_secret,token}.json`, quyền 600. Đã gọi thử, trả về đúng kênh.
- Trang chính sách: https://hip168.github.io/aivideo-policy/ (repo `Hip168/aivideo-policy`, toan-quyen).
- GitHub: `toan-quyen`. Các lệnh `gh`/push đã cho phép trong `.claude/settings.local.json`.
- MCP `mac-control` đã đăng ký cho dự án. Bộ phân quyền chặn thao tác trên trang đồng ý OAuth.

## Đang làm
- **10 Render dài** (`.worktrees/10-render-dai`):
  - Code xong, mới nhất `7d15e1c`.
  - TESTER-10 đang viết nốt test. Thay đổi chưa commit trong worktree là của TESTER.
  - Sau đó: TEST-LEAD duyệt, khoá, DEPLOY.
- **13 Tự đăng** (`.worktrees/13-tu-dong`):
  - Code xong theo D24, D25 và phần bổ sung, mới nhất `a41c307`.
  - TESTER-13 đang viết test.
  - Sau đó: TEST-LEAD duyệt lại từ đầu, review lần 2 nếu cần, khoá, DEPLOY.
- **14 Shorts dọc** (D28, `.team/features/14-shorts.md`):
  - code-architect đang thiết kế.
  - Làm song song. Mỗi tập ra 1 bản dài và 2 Short, đăng cùng lượt.
  - Short đầu tiên để Không công khai.
- **12 Tập đầu:** làm sau khi 10 và 13 merge. Chạy theo `episodes/PLAYBOOK.md`, đăng `unlisted`, rồi gửi link cho người dùng duyệt.

## Luật đã chốt cần nhớ
- Không còn DEV-LEAD. Chỉ có một TEST-LEAD: gọi một lần rồi dùng SendMessage.
- Review có phát hiện thì sửa luôn.
- Không dùng claude.ai hay Claude in Chrome.
- Dùng mac-control xong thì quay về terminal.
- Hook `team guard` xét theo thư mục hiện tại: lệnh có chữ push phải chạy trong repo đúng.
- Checkout chính có 2 file chưa commit của phiên khác: `video/tests/helpers/render.ts`, `.team/locks/2.sha256`. Không đụng.
- Khởi động lại phiên thì agent đang chạy bị huỷ, không resume được. Kiểm worktree và commit thật rồi giao agent mới.
