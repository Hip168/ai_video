# video/ — Hình ảnh (đề mục 2)

Dựng 7 cảnh sơ đồ động và phụ đề từ `public/timeline.json` + `public/audio/narration.wav` bằng Remotion.

## Dùng
```bash
cd video
npm ci
npx remotion browser ensure      # một lần, cần mạng
npm run studio                   # xem trong Remotion Studio
npm test                         # vitest; RENDER_TEST=1 để chạy cả phần render
npm run typecheck
npm run render                   # ra ../out/video.mp4
```
Khi chưa có dữ liệu thật của đề mục 1 (cả hai file đã gitignore):
```bash
cp ../.team/contract/timeline.sample.json public/timeline.json
mkdir -p public/audio
ffmpeg -f lavfi -i anullsrc=r=44100:cl=mono -t 76.4 public/audio/narration.wav   # = durationInFrames/fps - 0,5
```
Composition: `Video` (thời lượng, fps, kích thước lấy từ timeline qua `calculateMetadata`) và `KitDemo` (chỉ để test linh kiện). Giao diện chi tiết: `.team/features/2-hinh-anh-giao-dien.md`.

## Quyết định
- Mọi chuyển động là hàm thuần của frame; mốc neo vào `cue` của beat (`useBeat`, `useBeatStart`), không hardcode frame.
- Font Be Vietnam Pro (OFL-1.1) lưu cục bộ ở `public/fonts/` (nguồn, giấy phép: `public/fonts/README.md`), render không cần mạng.
- Phụ đề nằm ngoài các Sequence; hình chính chừa 200 px đáy. Fade 12 frame giữa cảnh.
- Phiên bản ghim chính xác: remotion và @remotion/* 4.0.539, react/react-dom 19.1.10, TypeScript 5.7.2, vitest 5.0.5.

## Kiểm các mục "chưa xác minh" của `stack.md` (phần Remotion), 2026-10-31
| Mục | Kết quả |
|---|---|
| `<Audio>` | Có trong 4.0.539 (`Audio` là tên cũ, `Html5Audio` là tên mới; cả hai được xuất). Dùng `Audio` với `src={staticFile(...)}`. Đã qua `tsc`. |
| `staticFile` | Có, chữ ký `staticFile(path)`; dùng đường dẫn tương đối `public/`. Đã qua `tsc`. |
| `remotion.config.ts` | `Config.setCodec/setPixelFormat/setCrf/setConcurrency/setVideoImageFormat/setOverwriteOutput` đều có trong `@remotion/cli/config`. Đã qua `tsc`. |
| `delayRender`/`continueRender` | Có, dùng cho nạp font. |
| `npx remotion browser ensure` | Chạy được, tải Headless Shell. |
| Chạy trình duyệt (`remotion compositions`, `npm run render`) | CHƯA kiểm được: trong môi trường sandbox của agent, Headless Shell bị crash (`icudtl.dat not found in bundle`, GPU process exit 6, `Target closed`). Cần chạy ở terminal thật. |
Phần Python (`korvatts`, `vieneu`) thuộc đề mục 1, không kiểm ở đây.
Không có chỗ nào tài liệu khác hợp đồng.
