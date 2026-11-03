# Đề mục 6: giao diện công khai

Đường dẫn tính từ gốc repo. Hợp đồng dữ liệu: `0b-hop-dong-timeline-v2.md`. Mọi import trong `video/src` dùng đường dẫn tương đối, không đuôi file.

## 1. Validator: `video/src/timeline2.ts`
```ts
export const CATALOG_TYPES: readonly CatalogType[]   // đúng 18 id, thứ tự dưới đây
export type CatalogType; export type SceneType = CatalogType | `custom:${string}`
export const isCustomType(type: string): boolean
export interface Beat2 { id; startFrame; durationFrames; text; cue? }
export interface Scene2 { id; chapter; type: string; props: Record<string, unknown>; startFrame; durationFrames; beats: Beat2[] }
export interface Chapter { id; title; startFrame }
export interface SfxEvent { frame; name; gainDb }
export interface Timeline2 { version: 2; fps: 30; width: 1920; height: 1080; durationInFrames; theme; audio: {src}; chapters; sfx; scenes }
export function validateTimeline2(json: unknown): Timeline2   // ném Error("timeline.json: <đường dẫn>: <lý do>") ở lỗi đầu tiên
export function activeBeat2(t: Timeline2, frame: number): Beat2 | null
```
18 id: `cold-open chapter-title recap-outro big-number compare myth-fact history-timeline term-card chart flow layers scale-ladder tree-graph code-walk terminal bits memory-array algo-bars`.

Luật 1-10 và 12 của hợp đồng được kiểm. Luật 11 (độ dài wav) validator không kiểm được. `audio.src` bị loại nếu bắt đầu bằng `/` hoặc chứa `://`. `custom:<tên>` cần `<tên>` không rỗng. `sfx` bắt buộc là mảng (được rỗng).

## 2. Composition
- `Episode` trong `video/src/Root.tsx`: 1920x1080, 30 fps. `defaultProps = { timeline: null, muted: true, audioSrc: undefined }`.
- `calculateMetadata` lấy `inputProps.timeline`, qua `validateTimeline2`, đặt `durationInFrames/fps/width/height`. Không có `timeline` (null) thì dùng 30 khung, nền trống, KHÔNG ném lỗi (để `remotion compositions` chạy được). Không fetch.
- Component: `video/src/Episode.tsx` xuất `Episode` và `EpisodeProps { timeline: Timeline2 | null; muted?: boolean; audioSrc?: string }`. `muted` mặc định true (D17): không phát tiếng. Chỉ khi `muted=false` và có `audioSrc` (URL tuyệt đối do render truyền vào) mới có `<Audio>`. `sfx` không phát trong Episode, trộn bằng FFmpeg.
- Render thử: `npx remotion still src/index.ts Episode out.png --frame=N --props=<file.json>` với file `{ "timeline": {...} }`.

## 3. Cảnh
```ts
// video/src/lib/types.ts
export interface SceneProps { scene: Scene2 }            // props riêng nằm ở scene.props
export type PropSpec =
  | { kind: "string"; required?: boolean; minLen?: number; maxLen?: number; oneOf?: string[] }
  | { kind: "number"; required?: boolean; min?: number; max?: number; integer?: boolean }
  | { kind: "boolean"; required?: boolean }
  | { kind: "array"; of: PropSpec; required?: boolean; minItems?: number; maxItems?: number }
  | { kind: "object"; shape: PropsSpec; required?: boolean }
export type PropsSpec = Record<string, PropSpec>        // khoá lạ trong props bị từ chối; mặc định required = false
export interface SceneSpec { type: CatalogType; propsSpec: PropsSpec; example: Record<string, unknown>; minBeats: number; cues: string[] }
```
- `video/src/lib/propsSpec.ts`: `validateProps(spec: PropsSpec, props: unknown): string[]` (danh sách lỗi, rỗng là hợp lệ; mỗi lỗi bắt đầu bằng đường dẫn, vd `points[2]: ...`).
- `video/src/lib/registry.ts`:
  - `CATALOG: Record<CatalogType, { Component: React.FC<SceneProps>; spec: SceneSpec }>` có đủ 18 khoá, mỗi loại một dòng; loại chưa làm là `placeholder("<id>")`.
  - `resolveScene(type: string): React.FC<SceneProps>`: catalog hoặc `CUSTOM_SCENES[tên]`; không có thì ném lỗi.
  - `specOf(type: string): SceneSpec | null` (null cho `custom:`).
- Đề mục 7, 8: đổi đúng dòng của loại mình trong `CATALOG` và thêm import vào khối của mình (mỗi loại có khối import riêng, cách nhau dòng trống). File cảnh `lib/scenes/<id>.tsx` xuất `export const <PascalCase>: React.FC<SceneProps>`; file spec `lib/specs/<id>.ts` xuất `export const spec: SceneSpec`.
- Cảnh riêng của tập: `video/src/episodes/<slug>/<tên>.tsx`, đăng ký trong `video/src/episodes/registry.ts`: `export const CUSTOM_SCENES: Record<string, React.FC<SceneProps>>`, khoá là `<tên>` (không tiền tố `custom:`). Mẫu: `mo-phong` trong `video/src/episodes/_demo/`.
- Ba cảnh cấu trúc:
  | id | props (propsSpec) | minBeats | cues |
  |---|---|---|---|
  | `cold-open` | `hook` string 1..80 bắt buộc; `kicker` string ≤ 40 | 1 | `hook` |
  | `chapter-title` | `title` string 1..80 bắt buộc; `number` integer 1..99; `subtitle` string ≤ 80 | 0 | |
  | `recap-outro` | `points` array 1..5 của string 1..70, bắt buộc; `next` string ≤ 80 | 1 | |
  `recap-outro`: điểm thứ i hiện tại beat thứ i (không có beat thứ i thì ở beat cuối, hoặc cách đều theo thời gian nếu cảnh không có beat).

## 4. Hook và tiện ích cho cảnh: `video/src/lib/hooks.ts`
```ts
useBeat(scene: Scene2, cue: string | number): number     // frame tương đối so với đầu beat (âm nếu chưa tới). Không thấy cue/chỉ số: dùng beat đầu; cảnh không beat: frame tương đối cảnh
useBeatStart(scene: Scene2, cue: string | number): number // frame (tương đối cảnh) beat bắt đầu
useSpring(frame: number, at?: number): number             // 0..1, hàm thuần của frame
useTheme(): Theme
```
`clamp01`, `ease` hàm thuần cũng xuất từ đây.

## 5. Theme: `video/src/lib/theme.tsx`
```ts
export interface Theme { id; bg; panel; fg; accent; accent2; muted; ok; warn; pattern: "grid" | "dots" | "diagonal" | "rings" }
export const THEMES: Record<string, Theme>   // "mau-a", "mau-b", "mau-c", "mau-d"
export const THEME_IDS: string[]
export function getTheme(id: string): Theme  // id lạ thì ném lỗi
export const ThemeProvider; export function useTheme(): Theme
export const Stage: React.FC<{children}>     // <svg viewBox 1920x1080>, nền theme, hoạ tiết CHỈ trong y < 830
export const Icon: React.FC<{name: IconName; x; y; size?; color?}>  // IconName: chip wifi lock cloud bolt gear book star
```
Dải y 830..1079 luôn là màu nền phẳng (chỗ cho phụ đề).

## 6. Phụ đề: `video/src/lib/subtitle.tsx`
`Subtitle({text, opacity})` và `subtitleOpacity(beat, frame)`; cùng bố cục với v1 (đáy 90 px, tối đa 2 dòng, 52 px), màu theo theme.

## 7. Font: `video/src/lib/fonts.ts`
`loadMonoFonts(): void` nạp JetBrains Mono 400/700 (subset `latin`, `vietnamese`, `latin-ext`) từ `video/public/fonts/jetbrains-mono-<subset>-<weight>-normal.woff2`; `MONO_FAMILY = "JetBrainsMono"`. Giấy phép: `video/public/fonts/OFL-JetBrainsMono.txt`, nguồn ghi ở `video/public/fonts/README.md`. `Root.tsx` gọi `loadMonoFonts()`; cảnh dùng `fontFamily: \`${MONO_FAMILY}, monospace\``.

## 8. Lint: `npm run lint:episode -- <slug> [--script <file>] [--timeline <file>] [--index <file>] [--json]`
Chạy trong `video/` (BA chốt 2026-11-03). Cấu trúc (loại cảnh, props, theme, cue) đọc từ `episodes/<slug>/script.json` (`meta.theme`, `scenes[].type/props/beats[].cue`). Thời lượng cảnh đọc từ `out/episodes/<slug>/timeline.json` NẾU file có (ghép theo `scenes[].id`); không có thì bỏ luật `min-duration` và `max-scene-duration` và in dòng "bỏ qua: chưa có timeline". Đường dẫn tính từ gốc repo; `--script`, `--timeline`, `--index` (hoặc biến môi trường `LINT_SCRIPT`, `LINT_TIMELINE`, `LINT_INDEX`) ghi đè. `--index` mặc định `episodes/index.json`. Việc khớp với validator Python thuộc đề mục 10.
- Mã thoát 0 nếu không có `error`, 1 nếu có, 2 nếu lỗi dùng (thiếu file, JSON hỏng). Mỗi phát hiện in `[LỖI|CẢNH BÁO] <rule>: <thông điệp>`; `--json` in mảng `Finding`.
- Hàm thuần để test: `video/scripts/lint-core.ts`
  ```ts
  export interface Finding { rule: string; level: "error" | "warn"; message: string }
  export interface IndexEntry { slug: string; title?: string; theme?: string; sceneTypes?: string[] }
  export interface LintInput { slug: string; scenes: {id; type; props; durationFrames?: number; beats?: {cue?: string}[]}[]; theme?: string; index: IndexEntry[]; hasDurations: boolean  // hasDurations=false: bỏ hai luật thời lượng; test dùng timeline giả bằng cách truyền durationFrames }
  export function lintEpisode(input: LintInput): Finding[]
  export function levenshtein(a: string[], b: string[]): number
  export function similarity(a: string[], b: string[]): number   // 1 - levenshtein / max(độ dài), hai chuỗi rỗng = 1
  ```
- Rule (đều là `error` trừ ghi chú): `min-types` (< 10 loại khác nhau) · `max-same-type` (một loại vượt `max(1, floor(số cảnh × 9/48))`) · `no-three-in-row` · `min-custom` (< 3 cảnh `custom:`) · `first-cold-open` · `last-recap-outro` · `theme-differs` (trùng theme tập liền trước trong `index`; tập liền trước là mục đứng trước `slug` trong `index`, hoặc mục cuối nếu `slug` chưa có) · `sequence-similarity` (≥ 0,6 với bất kỳ tập khác trong `index`, so chuỗi loại, mọi `custom:*` gộp thành `custom`) · `min-duration` (tổng < 9×60×30 = 16200 frame) · `max-scene-duration` (cảnh > 600 frame) · `props` (sai propsSpec, loại lạ, `custom:` chưa đăng ký) · `min-chapter-duration` (tổng cảnh của một chương < 300 frame; cần `LintScene.chapter`, chỉ kiểm khi có thời lượng) · `theme-known` (theme không có trong `THEMES`) · `min-beats` (**warn**) · `unknown-cue` (**warn**, cue không có trong `spec.cues`, bỏ qua `custom:`).
- `index.json` chỉ là mảng (BA chốt). Không có file thì coi như chưa có tập nào.

## 9. Quy tắc cho mọi cảnh
Hình chính trong `y < 830`; chuyển động là hàm thuần của frame; cấm `filter: blur`, `feGaussianBlur`, `backdrop-filter`; không chuỗi URL (kể cả `xmlns`).

## 10. Bổ sung khi code xong
- `SceneSpec.anyProps?: boolean`: true ở spec giữ chỗ (lint không kiểm khoá props, không cảnh báo cue). Đề mục 7, 8 bỏ cờ khi thay dòng.
- `video/src/lib/text.ts`: `wrapLines(text, maxChars): string[]`. `video/src/lib/theme-data.ts` giữ dữ liệu theme (không phụ thuộc React); `lib/theme.tsx` xuất lại.
- `recap-outro`: điểm vượt số beat hiện sau beat cuối, mỗi điểm cách 10 frame.
- Lint: `max-same-type` và `min-types` gộp mọi `custom:*` thành `custom`.
- Ảnh still đã soi: cold-open, chapter-title (có số), recap-outro (5 điểm). Cần `REMOTION_BROWSER_EXECUTABLE` trên máy này.

- BA chốt giữ nguyên: `audio.src` tương đối, `sfx` bắt buộc, `chapters` không rỗng, `Episode` mặc định `muted`, `min-beats` và `unknown-cue` chỉ cảnh báo, biến `LINT_*`, gộp `custom:*`.
- `chapter-title` chạy theo frame, không neo beat: cảnh này câm (`beats` rỗng). Nếu sau này có beat thì vẫn hiển thị đúng (không phụ thuộc beat).
- Luật 8: `cue` nếu có phải là chuỗi không rỗng (chuỗi rỗng, số bị từ chối).
- Chuỗi bắt buộc không được chỉ gồm khoảng trắng; `audio.src` cũng không chứa `..`; `sfx[].name` chỉ nhận `pop, tick, whoosh, ding, buzz` (`SFX_NAMES` xuất từ `timeline2.ts`).
- Ngắt dòng: `lib/text.ts` xuất `CHAR_EM = 0.62` và `maxCharsPerLine(widthPx, fontSize)` (= max(1, floor(widthPx / (fontSize × CHAR_EM)))). Cold-open dùng bề rộng 1520 (`COLD_OPEN_TEXT_WIDTH`), chapter-title 1050 (có số, `CHAPTER_WIDTH_WITH_NUMBER`) hoặc 1600 (`CHAPTER_WIDTH_CENTERED`) cho cả title và subtitle, recap-outro điểm 1470 (`RECAP_POINT_WIDTH`) và `next` 1700 (`RECAP_NEXT_WIDTH`, cỡ 36). Điểm recap dài ngắt tối đa 2 dòng, mọi dòng trong y < 830.
