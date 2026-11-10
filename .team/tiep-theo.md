# Trạng thái hiện tại (cập nhật 2026-11-11), đọc file này trước khi chạy tiếp

MỤC TIÊU HIỆN TẠI (người dùng chốt 2026-11-11): làm tới khi 1 video lên kênh thì DỪNG. Tiết kiệm token: không mở đề mục mới, đề mục 14 tạm dừng. Đội tự đẩy lên GitHub. Chỉ hỏi người dùng ở các điểm dừng trong `autonomy.md`.

## Đã vào main
Các đề mục 5, 6, 7, 8, 9, 11 và task [12-5] (PR #67). Kênh và quyền đều đã xong:
- `.team/kenh.json`: kênh Dao Le, `UC1aPohYcigcmBGPl7OlQaEw`, `@DaoLe-e4g`, đã xác minh số điện thoại.
- OAuth: project `aivideo-upload-514316`, trạng thái In production. File `~/.config/aivideo/youtube/{client_secret,token}.json`, quyền 600. Đã gọi thử, trả về đúng kênh.
- Trang chính sách: https://hip168.github.io/aivideo-policy/ (repo `Hip168/aivideo-policy`, toan-quyen).
- GitHub: `toan-quyen`. Các lệnh `gh`/push đã cho phép trong `.claude/settings.local.json`.
- MCP `mac-control` đã đăng ký cho dự án. Bộ phân quyền chặn thao tác trên trang đồng ý OAuth.

## Đang làm (TẠM DỪNG 2026-11-11 theo lệnh người dùng "tạm hold")
- **10 Render dài:** PR #68, HEAD `f1e897e` (đã gộp main; có bản sửa ghi manifest khi nhận tín hiệu `74b6e97`). CI đang chạy trên GitHub, chưa merge. Chạy tiếp: kiểm CI #68, xanh thì merge.
- **13 Tự đăng:** `.worktrees/13-tu-dong` HEAD `be46f17`, test đã khoá. Chưa push, chưa có PR. Thân PR có sẵn ở `ai_video_spike/pr13.md`. Chạy tiếp: gộp main, push, PR, CI, merge.
- **Tập đầu `vi-sao-may-tinh-dung-nhi-phan`:** đã qua Cổng 1, Cổng 2, phần cảnh, lint và giọng thật (721,4 giây; D29). Sổ tập đã commit (`22a75e2`). File ra nằm ở `out/episodes/<slug>/`: narration, timeline, srt, chapters. Nhạc `reverence-endless` (CC0).
  - Bước tiếp, sau khi 10 merge: `make-episode.sh <slug>`, `ledger run --stage ky-thuat`, qc, packager, gate3.
  - Đăng: `upload.py` (cần 13 merge, hoặc chạy từ worktree 13), để `unlisted`, gửi link cho người dùng.
  - Người dùng không nghe trước tên riêng, sẽ xem ở video đầu.
- **14 Shorts:** tạm dừng.
- Lưu ý: không đẩy file của tập lên main trong lúc nhánh 10 còn mở nếu chạm `video/src/episodes/registry.ts` (đã gây xung đột một lần).

## Luật đã chốt cần nhớ
- Không còn DEV-LEAD. Chỉ có một TEST-LEAD: gọi một lần rồi dùng SendMessage.
- Review có phát hiện thì sửa luôn.
- Không dùng claude.ai hay Claude in Chrome.
- Dùng mac-control xong thì quay về terminal.
- Hook `team guard` xét theo thư mục hiện tại: lệnh có chữ push phải chạy trong repo đúng.
- Checkout chính có 2 file chưa commit của phiên khác: `video/tests/helpers/render.ts`, `.team/locks/2.sha256`. Không đụng.
- Khởi động lại phiên thì agent đang chạy bị huỷ, không resume được. Kiểm worktree và commit thật rồi giao agent mới.
