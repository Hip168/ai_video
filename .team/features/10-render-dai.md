# Đề mục 10: Render dài, ghép, kiểm

Nhánh `10-render-dai`. Phụ thuộc đề mục 6, gặp đề mục 9 ở tích hợp. Quyết định: D14, D18.

## Kiến trúc đã chọn
- Mới: `video/scripts/render-episode.ts`, `audio/src/aivideo/{assemble,framecheck}.py`, `make-episode.sh`.
- Bundle một lần. Chia đoạn khoảng 1800 frame ở biên cảnh, trừ cảnh dài quá 2700 frame.
- Mỗi đoạn một `renderMedia` với `frameRange`, `concurrency: 1`, `muted: true`, `crf: 18`. API Node không đọc `remotion.config.ts`, phải truyền tường minh. Số tiến trình song song và định dạng ảnh: xem `.team/stack.md`, mục Đo tập dài.
- Ghép `ffmpeg -f concat -c copy`, gắn `mix.wav` thành AAC 192k, `+faststart`.
- `manifest.json`: mỗi đoạn có hash (timeline, mã nguồn `video/src`, tham số) và trạng thái. Chạy lại bỏ qua đoạn đã xong và đếm đúng frame bằng `ffprobe`.
- Cờ `--from <bước>`, `--frames a-b`.
- Dọn sau khi kiểm đạt: xoá `segments/`, `mix.wav`; giữ MP4, SRT, `chapters.txt`, cache TTS. Lệnh `clean`.
- Chặn chạy nếu đĩa trống dưới 6 GB.
- Trình duyệt theo D23: `make-episode.sh` báo lỗi rõ nếu `~/.cache/aivideo/chrome-headless-shell/chrome-headless-shell` không có, trừ khi đã đặt `REMOTION_BROWSER_EXECUTABLE`. `renderMedia` truyền `browserExecutable` tường minh.
- `framecheck.py`: (1) quét từng khung trong vùng `y < 830`, báo khung mà số điểm khác nền tụt rồi hồi lại trong tối đa 2 khung, bỏ qua vùng quanh đầu cảnh và cue; (2) render thêm một lượt với ranh giới đoạn lệch nửa đoạn, so từng khung, chỉ tính lệch khi một vùng liền đủ lớn, không tính lệch nửa điểm ảnh ở chữ. Lệch thì render lại đoạn đó, tối đa 3 lần, vẫn lệch thì báo lỗi nêu frame. Lấy ý từ `ai_video_spike/scripts/detect_blip.py`, `cmp_frames.py`.
- `make-episode.sh <slug>`: dựng tập, lint, trộn, render đoạn, ghép, kiểm. Mỗi bước in tên, lỗi dừng và nêu bước, không tin mã thoát mà kiểm file thật như `make-video.sh`.

## Task
- [10-1] Chia đoạn, chạy song song, resume.
- [10-2] Ghép, trộn tiếng, kiểm MP4: h264, yuv420p, 1920x1080, 30 fps, AAC, số frame, loudness, mất hình.
- [10-3] Chặn đĩa, `clean`, nhật ký, `make-episode.sh`.
- [10-4] Đo thật 2 phút bằng các cảnh nặng nhất, ghi vào `.team/tests/10.md`.

## Xong khi
- Timeline của `_template` do Python sinh ra qua được validator TypeScript.
- Validator Python (`validate_timeline2`) kiểm tên SFX trong `timeline.json` như validator TypeScript; có bộ mẫu sai chung chạy qua cả hai và cho cùng kết quả hợp lệ hoặc không.
- Mọi trình duyệt mở trong `render-episode.ts` được đóng trong `finally`, kể cả khi lỗi hoặc Ctrl-C; sau khi chạy không còn tiến trình `chrome-headless-shell` mồ côi.
- `_template` với TTS fake: ngắt giữa chừng rồi chạy lại chỉ render đoạn thiếu.
- `_template` là dữ liệu test, không qua lint và không có nhạc thật: lượt đầu cuối của đề mục 10 chạy từ bước render (5) tới kiểm MP4 (7). `make-episode.sh` KHÔNG có cờ bỏ qua lint hay trộn âm. Lượt đủ 7 bước làm ở đề mục 12 với tập thật (BA chốt 2026-11-03).
- Một đoạn bị phá cố ý thì bước kiểm báo đúng khung. Có ca hai bản giống hệt nhau cùng mất phần tử (lỗi D14 cũ không bắt được), lấy mẫu từ frame 1315.
- Lệch nửa điểm ảnh ở chữ không gây báo sai.
- Trống dưới 6 GB thì không chạy, giả lập bằng biến môi trường dành cho test.
- Dung lượng tăng sau `clean` đúng bằng các file giữ lại ±1%.
- Test khoá xanh.
