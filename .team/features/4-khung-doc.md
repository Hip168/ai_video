# Đề mục 4 — Khung dọc

Nhánh `4-khung-doc`. Chạy sau khi đề mục 1, 2, 3 đã merge. Người dùng chọn vẽ lại 7 cảnh, giữ cả bản ngang (2026-11-01).

## Mục tiêu
Từ cùng kịch bản, giọng và timeline, xuất thêm video dọc 1080×1920 cho TikTok, Reels, Shorts.

## Phạm vi / Ngoài phạm vi
Trong: composition `VideoDoc`, 7 cảnh dọc, phụ đề và tiêu đề khổ dọc, `--format doc`, test mới, README.
Ngoài: đổi lời, đổi giọng, đổi tốc độ, đổi hợp đồng `timeline.json`, sửa cảnh ngang, `.github/workflows/`, nhạc nền, mọi file test đã khoá.

## Giao diện công khai
- `./make-video.sh --format doc` ghi `out/video-doc.mp4`. Không có `--format`, hoặc `--format ngang`: như cũ, ghi `out/video.mp4`. Giá trị lạ: thoát 2.
- `npm run render:doc` trong `video/`.
- Composition `VideoDoc`, 1080×1920, 30 fps, thời lượng lấy từ `timeline.json`. `Video` và `KitDemo` không đổi.

## Dữ liệu
Dùng nguyên `timeline.json` đã có. `validateTimeline` không đổi: `width`, `height` trong timeline vẫn là 1920×1080 theo hợp đồng, `VideoDoc` đặt kích thước đầu ra của riêng nó trong `calculateMetadata`.

## Kiến trúc đã chọn
```
video/src/VideoDoc.tsx            như Video.tsx: <Audio>, map cảnh, SubtitleDoc, fade 12 frame
video/src/kit-doc.tsx             POS_DOC, SubtitleDoc, tiêu đề; dùng lại Node, Link, Packet từ kit.tsx
video/src/scenes-doc/{Phone,Dns,Packets,Wifi,Hops,Server,Receiver}.tsx
video/src/scenes-doc/index.ts     SCENES_DOC
video/tests/doc.test.ts           test mới, không sửa test đã khoá
```
- Sơ đồ chạy từ trên xuống, canvas SVG 1080×1920. Cùng cue, cùng ý nghĩa nội dung như cảnh ngang, kể cả s13 đến sai thứ tự #2, #1, #3 và s15 gói gửi lại lấp ô thiếu.
- Vùng an toàn: hình chính trong `x` 60–1020, `y` 200–1250. Phụ đề trong `y` 1270–1500 để tránh nút và chữ của TikTok ở đáy. Tiêu đề tuỳ cảnh ở đầu vùng an toàn. Các số này là ước lượng, DEV ghi vào giao diện.
- Phụ đề: tối thiểu 60 px, đậm, rộng tối đa 960 px, tối đa 3 dòng, nền tối bán trong suốt, có fade như bản ngang, ngoài các `Sequence`.
- Nhãn sơ đồ tối thiểu 40 px.
- Mọi chuyển động là hàm thuần của frame, neo theo `useBeat`, `useBeatStart`.

## File quan trọng
`.team/features/2-hinh-anh-giao-dien.md`, `.team/features/0-hop-dong-timeline.md`, `.team/features/kich-ban-mau.md`, `video/src/kit.tsx`, `video/src/scenes/*`, `make-video.sh`, decisions D12, D13.

## Task và tiêu chí nghiệm thu
- **[4-1] Composition và phụ đề dọc.** `npx remotion compositions` liệt kê `VideoDoc` 1080×1920 với thời lượng đúng timeline; `tsc` sạch; phụ đề đủ dấu, tối thiểu 60 px, tối đa 3 dòng; không phụ đề ở khoảng nghỉ.
- **[4-2] Bảy cảnh dọc.** Mỗi `id` có component; still giữa mỗi cảnh không đơn sắc và khác nhau; không vẽ ngoài vùng an toàn; dịch `startFrame` của beat làm đổi hình; nội dung từng nhịp khớp `kich-ban-mau.md`.
- **[4-3] Lệnh và video mẫu dọc.** `--format doc` ra `out/video-doc.mp4`: h264, yuv420p, 1080×1920, 30 fps, AAC, thời lượng khớp timeline ±1 frame; `--format` lạ thoát 2; lệnh mặc định không đổi; test đã khoá vẫn xanh; README ghi cách dùng; người dùng xem và duyệt.
