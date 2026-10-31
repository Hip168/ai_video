# Đề mục 3 — Ghép video

Nhánh `3-ghep-video`. Chỉ bắt đầu sau khi đề mục 1 và 2 đã merge (decisions D2).

## Mục tiêu
Một lệnh từ kịch bản ra video hoàn chỉnh, và video mẫu thật được người dùng duyệt.

## Phạm vi / Ngoài phạm vi
Trong: script điều phối, README cách chạy, sửa lỗi ghép giữa hai đề mục.
Ngoài: tính năng mới, đổi hợp đồng, `.github/workflows/`.

## Giao diện công khai
`./make-video.sh [--engine <id>] [--voice <id>] [--speed <số>]`, chạy từ gốc repo. Mặc định `--engine korva --voice hoang_nam --speed 1.25` (decisions D12); tốc độ 1.0 ra 105,7 giây, trượt [3-2]. Sinh `out/video.mp4` và `out/video.srt`. Dừng ngay khi một bước lỗi, báo rõ bước nào.

## Dữ liệu
Không có dữ liệu mới. Dùng `content/script.json`, `content/lexicon.json`, `video/public/timeline.json`.

## Kiến trúc đã chọn
Một script zsh gọi `audio` rồi `video`, không có hệ thống build riêng. Engine và giọng mặc định là lựa chọn của người dùng ở [1-4].

Chốt của BA (D13): script chỉ chạy trên Mac, zsh. Thiếu `audio/.venv` hoặc `video/node_modules` thì báo và thoát, không tự cài; README ghi cách cài. `REMOTION_BROWSER_EXECUTABLE` chỉ truyền qua nếu người dùng đặt, README ghi cách đặt. KorvaTTS không cần khoá API, mô hình tải từ Hugging Face lần đầu nên cần mạng, README ghi rõ. Test là `audio/tests/test_make_video.py` bằng pytest, bỏ qua khi `sys.platform != "darwin"`. Hợp đồng đầu ra của script chỉ gồm: mã thoát 2 khi sai tham số, khác 0 khi lỗi; dòng có `Bước N/3` cho từng bước và khi lỗi; tên thứ bị thiếu; `XONG` khi thành công. Câu chữ còn lại không phải hợp đồng, test không ghim. Engine `vieneu` không hỗ trợ speed khác 1.0 nên phải truyền `--speed 1.0`, README ghi rõ.

## File quan trọng
`.team/features/1-am-thanh.md`, `.team/features/2-hinh-anh.md`, `.team/stack.md`.

## Task và tiêu chí nghiệm thu
- **[3-1] Lệnh một phát và README.** Từ bản clone sạch, làm theo README rồi chạy `./make-video.sh` ra đủ `out/video.mp4` + `out/video.srt`; bước thiếu công cụ hoặc lỗi trả mã thoát khác 0 và thông báo tên bước; `git status` không có media.
- **[3-2] Video mẫu thật.** ffprobe xác nhận thông số ở [2-5], dài 60–90 giây; hình, giọng, phụ đề khớp nhau khi xem hết video, lệch nhịp không quá 1 frame theo timeline; người dùng xem và duyệt.
