# Trạng thái hiện tại (cập nhật 2026-11-11), đọc file này trước khi chạy tiếp

MỤC TIÊU HIỆN TẠI (người dùng chốt 2026-11-11): làm tới khi 1 video lên kênh thì DỪNG. Tiết kiệm token: không mở đề mục mới, đề mục 14 tạm dừng. Đội tự đẩy lên GitHub. Chỉ hỏi người dùng ở các điểm dừng trong `autonomy.md`.

## Đã vào main
Các đề mục 5, 6, 7, 8, 9, 11 và task [12-5] (PR #67). Kênh và quyền đều đã xong:
- `.team/kenh.json`: kênh Dao Le, `UC1aPohYcigcmBGPl7OlQaEw`, `@DaoLe-e4g`, đã xác minh số điện thoại.
- OAuth: project `aivideo-upload-514316`, trạng thái In production. File `~/.config/aivideo/youtube/{client_secret,token}.json`, quyền 600. Đã gọi thử, trả về đúng kênh.
- Trang chính sách: https://hip168.github.io/aivideo-policy/ (repo `Hip168/aivideo-policy`, toan-quyen).
- GitHub: `toan-quyen`. Các lệnh `gh`/push đã cho phép trong `.claude/settings.local.json`.
- MCP `mac-control` đã đăng ký cho dự án. Bộ phân quyền chặn thao tác trên trang đồng ý OAuth.

## Đang chờ (cập nhật 2026-11-14 ~03:00)
- YouTube chặn tải lên với lỗi HTTP 400 "exceeded the number of videos they may upload". Đây là hạn mức tải lên theo ngày, thường mở lại sau khoảng 24 giờ.
  - Short tập 2: đã đăng phần 1–3: N31vhiVd6f0, a7dVn7Vn29c, N7vt5qheGQ8. Phần 4–6 CHƯA đăng. File ở worktree `.worktrees/19-shorts-tap2/out/...`, không xoá worktree này trước khi đăng xong.
    - Lệnh: `cd .worktrees/19-shorts-tap2/audio && PYTHONPATH=$PWD/src .venv/bin/python -m aivideo.upload vi-sao-0-1-cong-0-2-khong-bang-0-3 --short <4|5|6> --privacy public`
  - Tập 3 `khi-may-tinh-dem-qua-gioi-han`: kịch bản đã chốt Cổng 2, lint đạt. Đang sửa cách đọc PSY ở b005 (phatam). Sau đó: render, qc, đóng gói, gate3, đăng. Việc đăng phải chờ hạn mức YouTube mở lại.
- Điều kiện dừng phiên đêm: 06:00, hoặc hạn mức tuần chạm khoảng 80% (đo bằng `~/.claude/studio/usage7d.py`).

## MỞ LẠI (người dùng, 2026-11-13)
Kênh có 55 lượt xem và 3 người đăng ký. Người dùng dặn: "tiếp tục tạo video đăng lên đi, công khai luôn cx được, cả short cả thật".
- Đăng công khai cả video dài lẫn Shorts. Dự án truyện (Studio) tạm giữ nguyên ở `~/.claude/studio/TIEP-THEO.md`.
- Đang chạy:
  - Tập 2: khâu `canh` (scene-director vòng 1).
  - Đề mục 14 Shorts: DEV làm tiếp trên nhánh `14-shorts`, gồm Shorts cả tập 1 và xuất TikTok phần 1–3.
  - Deployer: PR cho `15-sua-ton` và PR #72.

## TẠM GIỮ CẢ DỰ ÁN (người dùng, 2026-11-12)
Người dùng chuyển trọng tâm sang kênh truyện, dự án `/Users/leminhdao168/Documents/AI_VIDEO_FLOW_STORY`. Dự án đó dùng đội Studio ở `~/.claude/studio`. Dự án này đứng ở các điểm sau:
- Tập 2 `vi-sao-0-1-cong-0-2-khong-bang-0-3`: đã qua Cổng 2 (commit 733e21d). Bước tiếp là khâu `canh`.
- Đề mục 14 Shorts: code dở, commit WIP trên nhánh `14-shorts`, chưa có PR.
- PR #72 (docs D31–D32): đang mở, CI job video treo khi rerun, chưa merge. Nhánh 15-sua-ton chưa có PR.

## Đang làm (2026-11-12)
- Đã vào main: PR #68 (10), #69 (13), #70, #71. CI main xanh. Runner GitHub đôi khi thiếu đĩa: rerun `--failed` 1 lần. [13-4] chạy theo lịch: chưa làm.
- **VIDEO ĐẦU CÔNG KHAI** (2026-11-12): https://youtu.be/Dcb-Cy-V2HM. Kênh đã đổi tên thành "Chuyện Của Những Con Bit" và dùng ảnh đại diện con chip (D31). `firstVideoApproved=true`: từ tập 2 đăng Công khai luôn.
- Đang chạy: đề mục 15 sửa lỗi tồn (worktree `15-sua-ton`), tập 2 ở khâu researcher, đề mục 14 Shorts (DEV đang viết giao diện để BA duyệt).
- Trang chính sách `aivideo-policy` vẫn ghi tên cũ "Dao Le", cần sửa.
- Lỗi nhỏ (đề mục 15 đang sửa): sc42 (`bon-muoi-bit`) chữ chồng nhau khi crossfade, khoảng 0,5 s, ở 7:23. Khung biểu đồ "flow": nhãn nằm lệch lên trên.

## Luật đã chốt cần nhớ
- Không còn DEV-LEAD. Chỉ có một TEST-LEAD: gọi một lần rồi dùng SendMessage.
- Review có phát hiện thì sửa luôn.
- Không dùng claude.ai hay Claude in Chrome.
- Dùng mac-control xong thì quay về terminal.
- Hook `team guard` xét theo thư mục hiện tại: lệnh có chữ push phải chạy trong repo đúng.
- Checkout chính có 2 file chưa commit của phiên khác: `video/tests/helpers/render.ts`, `.team/locks/2.sha256`. Không đụng.
- Khởi động lại phiên thì agent đang chạy bị huỷ, không resume được. Kiểm worktree và commit thật rồi giao agent mới.
