# Đề mục 3 — Ghép video

Nhánh `3-ghep-video`. Chỉ bắt đầu sau khi đề mục 1 và 2 đã merge (decisions D2).

## Mục tiêu
Một lệnh từ kịch bản ra video hoàn chỉnh, và video mẫu thật được người dùng duyệt.

## Phạm vi / Ngoài phạm vi
Trong: script điều phối, README cách chạy, sửa lỗi ghép giữa hai đề mục.
Ngoài: tính năng mới, đổi hợp đồng, `.github/workflows/`.

## Giao diện công khai
`./make-video.sh [--engine <id>] [--voice <id>]`, chạy từ gốc repo. Sinh `out/video.mp4` và `out/video.srt`. Dừng ngay khi một bước lỗi, báo rõ bước nào.

## Dữ liệu
Không có dữ liệu mới. Dùng `content/script.json`, `content/lexicon.json`, `video/public/timeline.json`.

## Kiến trúc đã chọn
Một script zsh gọi `audio` rồi `video`, không có hệ thống build riêng. Engine và giọng mặc định là lựa chọn của người dùng ở [1-4].

## File quan trọng
`.team/features/1-am-thanh.md`, `.team/features/2-hinh-anh.md`, `.team/stack.md`.

## Task và tiêu chí nghiệm thu
- **[3-1] Lệnh một phát và README.** Từ bản clone sạch, làm theo README rồi chạy `./make-video.sh` ra đủ `out/video.mp4` + `out/video.srt`; bước thiếu công cụ hoặc lỗi trả mã thoát khác 0 và thông báo tên bước; `git status` không có media.
- **[3-2] Video mẫu thật.** ffprobe xác nhận thông số ở [2-5], dài 60–90 giây; hình, giọng, phụ đề khớp nhau khi xem hết video, lệch nhịp không quá 1 frame theo timeline; người dùng xem và duyệt.
