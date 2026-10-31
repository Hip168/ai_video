# Đề mục 2 — Giao diện công khai (hợp đồng DEV-2 ↔ TESTER-2)

Viết bởi DEV-2 trước khi code. Mọi đường dẫn tính từ `video/`. Thiết kế gốc: `2-hinh-anh.md`. Hợp đồng dữ liệu: `0-hop-dong-timeline.md`.

## Lệnh npm (`video/package.json`)
| Lệnh | Việc |
|---|---|
| `npm ci` | cài đúng `package-lock.json` |
| `npm run studio` | `remotion studio src/index.ts` |
| `npm run render` | `remotion render src/index.ts Video ../out/video.mp4` (H.264, yuv420p, CRF 18, 30 fps, AAC, concurrency 4 đặt trong `remotion.config.ts`) |
| `npm test` | `vitest run` |
| `npm run typecheck` | `tsc --noEmit` |

Test nằm ở `tests/**/*.test.ts(x)`, môi trường node. Test render dùng `@remotion/bundler` + `@remotion/renderer` (devDependency, cùng phiên bản 4.0.539), chỉ chạy khi `RENDER_TEST=1`. Entry cho bundler: `src/index.ts`.

## Composition
| id | Kích thước | Ghi chú |
|---|---|---|
| `Video` | 1920×1080, 30 fps | thời lượng/fps/kích thước do `calculateMetadata` quyết |
| `KitDemo` | 1920×1080, 30 fps, 90 frame | chỉ để test linh kiện. Nền `COLORS.bg`. Vẽ: `Node` ở `POS.phone`, `Link` từ `POS.phone` tới `POS.server`, `Packet` chạy trên Link với `start=0`, `duration=60`. Không có props. Có animation: `Link.progress` 0→1 trong 60 frame, `Node` điện thoại `progress` 0,2→1 trong 30 frame, Node máy chủ (`POS.server`, kind `server`) tĩnh |

`Video` props: `{ timeline: Timeline | null }`, `defaultProps = { timeline: null }`.
- `timeline === null`: `calculateMetadata` nạp `staticFile("timeline.json")` bằng `fetch` rồi `validateTimeline`.
- `timeline` khác null (test truyền qua `inputProps`): `validateTimeline` rồi dùng thẳng, không fetch. Dùng để test "dịch `startFrame` beat thì still đổi".
- Trả `{durationInFrames, fps, width, height, props: {timeline}}`. Timeline hỏng → lỗi từ `validateTimeline` nổi lên.
- Âm thanh: `<Audio src={staticFile(timeline.audio.src)} />` (file ở `public/audio/narration.wav`).

## `src/timeline.ts`
```ts
export type SceneId = "phone"|"dns"|"packets"|"wifi"|"hops"|"server"|"receiver";
export const SCENE_IDS: readonly SceneId[];            // đúng thứ tự trên
export interface Beat  { id: string; startFrame: number; durationFrames: number; text: string; cue?: string }
export interface Scene { id: SceneId; startFrame: number; durationFrames: number; beats: Beat[] }
export interface Timeline {
  version: 1; fps: 30; width: 1920; height: 1080; durationInFrames: number;
  audio: { src: string }; scenes: Scene[];
}
export function validateTimeline(json: unknown): Timeline;
export function activeBeat(timeline: Timeline, frame: number): Beat | null;
```
- `validateTimeline` kiểm đủ 10 luật của hợp đồng (trừ khoảng 1800–2700 của video thật, không kiểm vì mẫu 2307 vẫn trong khoảng; không ép). Lỗi: `throw new Error(msg)`, `msg` tiếng Việt, chứa đường dẫn trường dạng `scenes[1].beats[0].startFrame` (hoặc `version`, `audio.src`, `durationInFrames`...). Trả về chính đối tượng đã kiểm (cùng nội dung).
- Kiểm cả: thiếu `audio.src`, `audio.src` không phải chuỗi không rỗng, đầu vào không phải object.
- `activeBeat`: duyệt mọi cảnh; beat active khi `startFrame <= frame < startFrame + durationFrames` (frame tuyệt đối). Ngoài mọi beat (kể cả khoảng hở) → `null`. Ranh giới: tại `start` có, tại `start+dur-1` có, tại `start+dur` không (trừ khi beat khác bắt đầu ở đó).

## `src/kit.tsx`
```ts
export const COLORS: { bg: string; fg: string; accent: string; muted: string; packet: string; ok: string; warn: string };
export type Point = { x: number; y: number };
export const POS: Record<"phone"|"router"|"isp1"|"isp2"|"isp3"|"dns"|"server"|"receiver", Point>;
export function packetPosition(from: Point, to: Point, start: number, duration: number, frame: number): Point;
export function subtitleOpacity(beat: Beat, frame: number): number;
export function useBeat(scene: Scene, cue: string | number): number;
export function useBeatStart(scene: Scene, cue: string | number): number;   // frame tương đối cảnh mà beat bắt đầu
export function useSpring(frame: number, at?: number): number;            // spring 0..1, không phải hook thật (fps=30)
export const Stage: React.FC<{ children?: React.ReactNode }>;               // <svg viewBox 1920x1080> + nền
export const Label: React.FC<{ x: number; y: number; children: React.ReactNode; size?: number; color?: string; opacity?: number; bold?: boolean }>;
export const Node:   React.FC<{ id?: string; x: number; y: number; label: string; kind?: "phone"|"router"|"server"|"book"; progress?: number }>;
export const Link:   React.FC<{ from: Point; to: Point; progress?: number; dashed?: boolean }>;
export const Packet: React.FC<{ from: Point; to: Point; start: number; duration: number; label?: string }>;
export const Subtitle: React.FC<{ text: string; opacity?: number }>;
```
- `packetPosition`: tuyến tính. `frame <= start` → `from`; `frame >= start+duration` → `to`; giữa: `from + (to-from) * (frame-start)/duration`. `duration <= 0` → `to`.
- `subtitleOpacity(beat, frame)`: frame tuyệt đối. `min(clamp((frame-start)/4), clamp((start+dur-frame)/4))` trong [0,1]; ngoài beat → 0. (Tại `start` = 0, từ `start+4` trở đi = 1 nếu beat đủ dài; tại `start+dur-1` = 0.25.)
- `useBeat(scene, cue)`: gọi trong cảnh (bên trong `<Sequence>`, `useCurrentFrame()` là frame tương đối cảnh). Trả `useCurrentFrame() - (beat.startFrame - scene.startFrame)`; âm trước khi beat bắt đầu. `cue` là chuỗi: beat đầu tiên có `cue` đó; `cue` là số: beat theo chỉ số. Không tìm thấy cue chuỗi → coi như beat chỉ số 0.
- `Node`/`Link`/`Packet` là SVG (`<g>`/`<line>`/`<circle>`), dùng trong `<svg viewBox="0 0 1920 1080">`; `Packet` dùng `useCurrentFrame()` (frame của Sequence/composition chứa nó) và `packetPosition`, nên là hàm thuần của frame. `progress` 0..1 mặc định 1.
- `Subtitle`: HTML `<div data-testid="subtitle">`, đặt tuyệt đối cách đáy 90 px, rộng tối đa 1500 px, chữ 52 px đậm, `text-wrap: balance`, nền tối bán trong suốt, tối đa 2 dòng. Font family `"BeVietnamPro", sans-serif` (nạp bởi `src/font.ts`).

## `src/font.ts`
`export const FONT_FAMILY = "BeVietnamPro"`; `export function loadFonts(): void` (FontFace + `staticFile("fonts/...woff2")` + `delayRender`/`continueRender`), gọi lúc nạp `Video.tsx` và `Root.tsx`. Không dùng mạng.
Font: Be Vietnam Pro 400/700, mỗi weight 3 tập con: `public/fonts/be-vietnam-pro-{latin,latin-ext,vietnamese}-{400,700}-normal.woff2`; giấy phép `public/fonts/OFL.txt`; nguồn ở `public/fonts/README.md`. (Cập nhật bởi DEV-2 sau khi tải thật: gói fontsource chia tập con theo unicode-range.)

## `src/scenes/index.ts`
```ts
export const SCENES: Record<SceneId, React.FC<{ scene: Scene }>>;
```
Mỗi cảnh: nền `COLORS.bg`, SVG viewBox 1920×1080, không vẽ gì ở y ≥ 830 (chừa 250 px đáy cho phụ đề, decisions D10). Không đơn sắc; animation neo `useBeat` theo cue trong `kich-ban-mau.md`.

## `src/Video.tsx`, `src/Root.tsx`, `src/index.ts`
- `export const Video: React.FC<VideoProps>`: `<Audio>`, mỗi cảnh một `<Sequence from={scene.startFrame} durationInFrames={scene.durationFrames}>` chứa `SCENES[id]` bọc fade 12 frame (vào/ra), `Subtitle` ngoài các Sequence, `text` = `activeBeat(timeline, frame)?.text`, không có beat thì không render phần tử `data-testid="subtitle"`.
- `Root.tsx` đăng ký `Video` và `KitDemo`. `index.ts` gọi `registerRoot(Root)`.

## Tệp dữ liệu khi test (gitignore)
`public/timeline.json` (chép từ `.team/contract/timeline.sample.json`) và `public/audio/narration.wav` im lặng dài `durationInFrames/fps - 0,5` giây, như bước "Prepare timeline" của CI.

## Trình duyệt khi render / test
`remotion.config.ts` đọc biến môi trường `REMOTION_BROWSER_EXECUTABLE`; có thì `Config.setBrowserExecutable(...)`, không có thì dùng Headless Shell mặc định (CI Linux). Trên Mac: `export REMOTION_BROWSER_EXECUTABLE="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"`. Config chỉ áp cho CLI; test dùng API `@remotion/renderer` tự truyền `browserExecutable: process.env.REMOTION_BROWSER_EXECUTABLE`.
`remotion.config.ts` đặt `setVideoImageFormat("png")` để MP4 ra `yuv420p` với mọi trình duyệt.

`remotion.config.ts` còn đặt `setCodec("h264")`, `setPixelFormat("yuv420p")`, `setCrf(18)`, `setConcurrency(4)`, `setOverwriteOutput(true)` (render ghi đè `../out/video.mp4`).

## Toạ độ `POS` và bố cục từng cảnh
`POS` (viewBox 1920×1080): phone (240,440), router (640,440), isp1 (880,270), isp2 (900,610), isp3 (1140,440), dns (1500,440), server (1440,440), receiver (1720,440).
- Cảnh `server`: máy chủ ở `POS.server`, người nhận ở `POS.receiver`; hàng ô gói ở x=420..960, y=440; gửi lại chạy trên trục y=560 giữa x=300 và máy chủ.
- Cảnh `receiver`: máy chủ vẽ ở `POS.phone` (bên trái, cùng hàng), người nhận ở `POS.receiver`.
- Cảnh `phone`: đích "Người bạn" ở `POS.receiver`. Các cảnh khác dùng `POS` trực tiếp.
- Gửi lại (cue `resend`): gói yêu cầu "Gửi lại #3?" đi từ máy chủ về phía người gửi (8–38 frame sau mốc beat), gói #3 quay về lấp ô thiếu (38–70), sau frame 70 ô ma và nhãn "Thiếu #3" biến mất.

- `SLOTS` trong `video/src/scenes/Hops.tsx` là tọa độ riêng của ba ô đích ở cảnh các chặng (s13), không thuộc `POS` dùng chung.
