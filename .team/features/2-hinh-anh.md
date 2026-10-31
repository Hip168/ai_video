# Đề mục 2 — Hình ảnh

Nhánh `2-hinh-anh`. Sở hữu `video/`. Dùng `.team/contract/timeline.sample.json` nên không chờ đề mục 1.

## Mục tiêu
Đọc `timeline.json` và file âm thanh, dựng 7 cảnh sơ đồ động kèm phụ đề, xuất MP4 bằng một lệnh.

## Phạm vi / Ngoài phạm vi
Trong: dự án Remotion, kiểm timeline, font Việt, phụ đề, bộ linh kiện SVG, 7 cảnh, ghép âm thanh, lệnh render.
Ngoài: ảnh, footage, AI sinh hình, nhạc nền, SFX, khung dọc, Revideo, zod, `.github/workflows/`.

## Giao diện công khai
- `npm run render` ghi `../out/video.mp4`. `npm run studio`, `npm test`.
- Composition `Video`.
- `validateTimeline(json: unknown): Timeline` trong `src/timeline.ts`, ném lỗi tiếng Việt nêu rõ vị trí.
- `activeBeat(timeline, frame): Beat | null`.
- `packetPosition(from, to, start, duration, frame): {x, y}`.

## Dữ liệu
Hợp đồng ở `.team/features/0-hop-dong-timeline.md`. `calculateMetadata` nạp `public/timeline.json` qua `staticFile` + `fetch`, gọi `validateTimeline`, trả `durationInFrames`, `fps`, `width`, `height`, `props`.

Khi chạy test và lúc chưa có file thật: chép mẫu `.team/contract/timeline.sample.json` thành `public/timeline.json` và tạo `public/audio/narration.wav` im lặng bằng `ffmpeg -f lavfi -i anullsrc`, đúng thời lượng. Cả hai đã gitignore.

## Kiến trúc đã chọn: tối thiểu, mỗi cảnh một file
```
video/package.json, tsconfig.json, remotion.config.ts, vitest.config.ts
video/src/index.ts, Root.tsx        registerRoot, <Composition id="Video">
video/src/Video.tsx                 <Audio>, map cảnh sang <Sequence>, Subtitle, fade 12 frame
video/src/timeline.ts               kiểu, validateTimeline, activeBeat
video/src/kit.tsx                   Node, Link, Packet, Subtitle, useBeat, màu, POS
video/src/scenes/index.ts           SCENES: Record<id, Component>
video/src/scenes/{Phone,Dns,Packets,Wifi,Hops,Server,Receiver}.tsx
video/public/fonts/*.woff2          font Việt OFL, có commit
video/tests/
```
Không tạo theme riêng, lớp animation, hay registry động.

- **Đồng bộ:** `useBeat(beats, cue)` trả frame tương đối của beat có cue đó; không có thì theo thứ tự beat. Animation = `spring({frame: frame - beatFrame, fps})` hoặc `interpolate`, không hardcode mốc frame. Mọi chuyển động là hàm thuần của frame, không `setTimeout`, không CSS animation.
- **Phụ đề:** đặt ngoài các `Sequence`, hiện beat đang active, cách đáy 90 px, rộng tối đa 1500 px, chữ 52 px đậm, tối đa 2 dòng, `text-wrap: balance`, nền tối bán trong suốt, fade 4 frame. Hình chính chừa 200 px đáy.
- **SVG:** viewBox 1920×1080. Tọa độ dùng chung trong `POS` để sơ đồ nhất quán giữa các cảnh. Không dùng filter blur nặng.
- **Font:** `new FontFace` + `staticFile` + `delayRender`/`continueRender`.
- **Render:** H.264, `yuv420p`, CRF 18, 30 fps, âm thanh AAC, concurrency 4, kiểm lại trên máy 16 GB.

## File quan trọng
`.team/features/0-hop-dong-timeline.md`, `.team/contract/timeline.sample.json`, `.team/features/kich-ban-mau.md` (ý nghĩa từng cue), `.team/decisions.md`.

## Task và tiêu chí nghiệm thu
- **[2-1] Khung Remotion và timeline.** `tsc --noEmit` sạch; `npx remotion compositions` liệt kê `Video`; file mẫu hợp lệ; 7 loại timeline hỏng bị từ chối; composition có thời lượng đúng bằng `durationInFrames` của mẫu; đã kiểm các mục "chưa xác minh" trong `stack.md` phần Remotion.
- **[2-2] Font Việt và phụ đề.** Still tại một beat hiện đúng chữ có đủ dấu `ă â ê ô ơ ư đ` và các thanh; render được khi ngắt mạng; frame ở khoảng nghỉ không có phụ đề; `activeBeat` đúng tại ba ranh giới `start`, `start+dur-1`, `start+dur`.
- **[2-3] Bộ linh kiện SVG.** `packetPosition` đúng tại đầu, giữa, cuối; still của Node, Link, Packet khác nhau ở ba mốc frame, không tràn khung.
- **[2-4] Bảy cảnh.** Mỗi `id` có component; still giữa mỗi cảnh không đơn sắc và khác nhau; animation neo cue: dịch `startFrame` của beat trong timeline thử làm thay đổi still tại cùng một frame.
- **[2-5] Âm thanh và lệnh render.** `npm run render` ra MP4; ffprobe xác nhận h264, yuv420p, 1920×1080, 30 fps, có audio AAC, thời lượng khớp timeline ±1 frame. Người dùng xem bản dựng với giọng giả lập và cho ý kiến về hình.
