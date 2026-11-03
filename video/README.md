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

## Tập dài (Episode)
Dùng cho video tập dài, chạy song song với `Video` (v1), không sửa v1. Hợp đồng: `.team/features/0b-hop-dong-timeline-v2.md`. Chữ ký công khai: `.team/features/6-khung-v2-giao-dien.md`.

### Composition `Episode`
`npx remotion compositions src/index.ts` liệt kê `Video`, `Episode`, `KitDemo`. `Episode` nhận timeline v2 qua `inputProps`, không fetch file. Không có `timeline` thì ra nền trống 1 giây.
```bash
# props.json: { "timeline": { ...timeline v2... } }   ("muted" mặc định true: render hình, tiếng trộn sau bằng FFmpeg)
npx remotion still src/index.ts Episode out.png --frame=100 --props=props.json
```
`validateTimeline2` (`src/timeline2.ts`) kiểm luật 1-13 của hợp đồng, lỗi có đường dẫn trường (vd `scenes[1].startFrame: ...`). Tên SFX chỉ `pop, tick, whoosh, ding, buzz`.

### Catalog 18 loại cảnh
`cold-open`, `chapter-title`, `recap-outro` (có sẵn) và 15 loại giữ chỗ cho đề mục 7, 8: `big-number`, `compare`, `myth-fact`, `history-timeline`, `term-card`, `chart`, `flow`, `layers`, `scale-ladder`, `tree-graph`, `code-walk`, `terminal`, `bits`, `memory-array`, `algo-bars`.

Thêm một loại: viết `src/lib/scenes/<id>.tsx` và `src/lib/specs/<id>.ts` (`propsSpec`, ví dụ, số beat tối thiểu, danh sách cue), rồi chỉ đổi đúng dòng của loại đó trong `CATALOG` ở `src/lib/registry.ts` (và import vào khối của mình). Bỏ `anyProps` khỏi spec. Mọi cảnh: hình chính trong `y < 830`, chuyển động là hàm thuần của frame, cấm `filter: blur`, `feGaussianBlur`, `backdrop-filter`, không chuỗi URL.

### Cảnh riêng `custom:<tên>`
Viết `src/episodes/<slug>/<tên>.tsx` rồi đăng ký trong `src/episodes/registry.ts` (`CUSTOM_SCENES`, khoá là `<tên>` không có tiền tố). Mẫu: `mo-phong` trong `src/episodes/_demo/`.

### Theme
4 theme: `mau-a`, `mau-b`, `mau-c`, `mau-d` (`src/lib/theme-data.ts`): bảng màu, hoạ tiết nền (chỉ trong `y < 830`), bộ 8 biểu tượng (`Icon`). Theme lạ thì `getTheme` ném lỗi.

### Chữ không tràn
`fitText` (`src/lib/text.ts`) đo bề rộng thật bằng `@remotion/layout-utils`, ngắt dòng tối đa số dòng của khối, không vừa thì giảm cỡ từng bước 5% tới 70% cỡ gốc, vẫn không vừa thì cắt bằng "…" và `console.warn` một lần. Lề tối thiểu 40px. `recap-outro` dùng một cỡ chung cho mọi điểm (`src/lib/recap-layout.ts`). Font đơn cách JetBrains Mono (OFL) nạp bằng `loadMonoFonts()` (`src/lib/fonts.ts`).

### Lint chống lặp
```bash
npm run lint:episode -- <slug> [--script f] [--timeline f] [--index f] [--json]
```
Cấu trúc đọc từ `episodes/<slug>/script.json`, thời lượng từ `out/episodes/<slug>/timeline.json` nếu có (không có thì bỏ hai luật thời lượng). `episodes/index.json` là mảng. Mã thoát 0 đạt, 1 có lỗi, 2 lỗi dùng. Luật: ít nhất 10 loại khác nhau; một loại không quá `floor(số cảnh × 9/48)` (tối thiểu 1); không 3 cảnh liền cùng loại; ít nhất 3 cảnh `custom`; đầu `cold-open`, cuối `recap-outro`; theme khác tập liền trước; chuỗi loại cảnh giống mọi tập cũ dưới 60% (Levenshtein chuẩn hoá, `custom:*` gộp); tổng ít nhất 9 phút, cảnh dài nhất 20 giây, mỗi chương ít nhất 10 giây; `props` qua `propsSpec`; theme có trong danh sách. `min-beats` và `unknown-cue` chỉ cảnh báo.

### Trình duyệt khi render (D23)
Trỏ `REMOTION_BROWSER_EXECUTABLE` tới Headless Shell đã cài, không đặt cứng trong mã:
```bash
export REMOTION_BROWSER_EXECUTABLE="$HOME/.cache/aivideo/chrome-headless-shell/chrome-headless-shell"
RENDER_TEST=1 npx vitest run
```
