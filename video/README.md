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
- Phụ đề nằm ngoài các Sequence; hình chính trong `y < 830`, chừa 250 px đáy.
- Ảnh khung hình dùng PNG (`setVideoImageFormat("png")`): với JPEG, Chrome của máy cho MP4 `yuvj420p` thay vì `yuv420p`. Fade 12 frame giữa cảnh.
- Phiên bản ghim chính xác: remotion và @remotion/* 4.0.539, react/react-dom 19.1.10, TypeScript 5.7.2, vitest 5.0.5.

## Kiểm các mục "chưa xác minh" của `stack.md` (phần Remotion), 2026-10-31
| Mục | Kết quả |
|---|---|
| `<Audio>` | Có trong 4.0.539 (`Audio` là tên cũ, `Html5Audio` là tên mới; cả hai được xuất). Dùng `Audio` với `src={staticFile(...)}`. Đã qua `tsc`. |
| `staticFile` | Có, chữ ký `staticFile(path)`; dùng đường dẫn tương đối `public/`. Đã qua `tsc`. |
| `remotion.config.ts` | `Config.setCodec/setPixelFormat/setCrf/setConcurrency/setVideoImageFormat/setOverwriteOutput` đều có trong `@remotion/cli/config`. Đã qua `tsc`. |
| `delayRender`/`continueRender` | Có, dùng cho nạp font. |
| `npx remotion browser ensure` | Chạy được, tải Headless Shell. |
| Chạy trình duyệt (`remotion compositions`, `npm run render`) | Trên Mac này Headless Shell tải về crash: `icudtl.dat not found in bundle`, GPU process exit 6, `Target closed`. Nguyên nhân Headless Shell crash chưa xác định; phiên chính crash trong và ngoài sandbox, TEST-LEAD-2 chạy được. Dùng Chrome của máy thì chạy được: `Video` 2307 frame, `KitDemo` 90 frame. |

## Chạy trên Mac khi Headless Shell lỗi
Đặt biến môi trường (`remotion.config.ts` đọc và gọi `Config.setBrowserExecutable`; không đặt thì giữ mặc định, CI Linux không đổi):
```bash
export REMOTION_BROWSER_EXECUTABLE="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
npx remotion compositions src/index.ts
npm run render
RENDER_TEST=1 npx vitest run     # test dùng @remotion/renderer đọc cùng biến nếu test truyền browserExecutable
```
Hoặc truyền cho từng lệnh CLI: `--browser-executable="<đường dẫn>"`. Test trong `tests/` dùng `@remotion/renderer` cũng cần browser; `remotion.config.ts` chỉ áp cho CLI, nên API Node phải tự truyền `browserExecutable: process.env.REMOTION_BROWSER_EXECUTABLE` (việc của TESTER-2, DEV không sửa test).

Phần Python (`korvatts`, `vieneu`) thuộc đề mục 1, không kiểm ở đây.
Không có chỗ nào tài liệu khác hợp đồng.
