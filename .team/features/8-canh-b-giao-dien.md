# Đề mục 8: giao diện công khai (cảnh nhóm B)

Đường dẫn tính từ gốc repo. Mỗi loại: `video/src/lib/scenes/<id>.tsx` (export PascalCase) và `video/src/lib/specs/<id>.ts` (`export const spec`), đã đăng ký trong `video/src/lib/registry.ts`. Mọi cảnh: hình chính trong `y < 830`; chuyển động là hàm thuần của frame; chữ qua `fitText` (qua `TextBlock` trong `lib/b-kit.tsx`); không filter, blur, URL; màu lấy từ theme (khung code và terminal dùng nền tối cố định `CODE_BG` ở `lib/code-highlight.ts`).

## Quy ước chung về beat
Cảnh "mục i hiện ở beat thứ i theo thứ tự" (`itemStart` trong `lib/b-kit.tsx`): chỉ số vượt số beat thì dùng beat cuối; cảnh không có beat thì rải đều trong 70% thời lượng. Tên cue chỉ là nhãn (`spec.cues`), cảnh neo theo thứ tự beat; riêng `algo-bars` ưu tiên beat có cue `step` (xem dưới). Dịch `startFrame` của beat làm đổi hình.

## Bảng props (mọi chuỗi tự do đều có `maxLen`; khoá lạ bị từ chối)
| id | props | minBeats | cues |
|---|---|---|---|
| `flow` | `nodes` [{`id` 1..12, `label` 1..24}] 2..8 bắt buộc; `edges` [{`from`,`to` 1..12, `label` ≤16}] 1..10 bắt buộc; `packets` [{`from`,`to`, `label` ≤8}] ≤6; `direction` "LR"\|"TB" | 1 | graph, packet |
| `layers` | `layers` [{`name` 1..24, `detail` ≤40}] 2..7 bắt buộc (tầng đầu ở trên cùng); `highlight` số nguyên 0..6 | 2 | layer, highlight |
| `scale-ladder` | `rungs` [{`label` 1..20, `value` 1..16, `power` số -12..24}] 3..7 bắt buộc (bậc 0 ở dưới cùng; độ dài thanh theo `power`) | 3 | rung |
| `tree-graph` | `nodes` [{`id` 1..12, `parent` ≤12 (bỏ trống là gốc), `label` 1..16}] 2..15 bắt buộc; `path` [id] ≤6 (đường được tô sáng) | 2 | level, path |
| `code-walk` | `lang` "javascript"\|"typescript"\|"python"\|"bash" bắt buộc; `lines` [chuỗi ≤56 ký tự] 1..18 bắt buộc (một phần tử một dòng code); `notes` [{`line` số nguyên 1..18 (dòng 1-based), `text` 1..90}] ≤6 | 2 | note |
| `terminal` | `title` ≤24; `prompt` ≤8 (mặc định "$"); `lines` [{`kind` "cmd"\|"out"\|"err", `text` 1..56}] 1..10 bắt buộc | 2 | line |
| `bits` | `value` số nguyên 0..65535 bắt buộc; `width` số nguyên 4..16 (mặc định 8) là số bit TỐI THIỂU: số bit hiển thị = max(width, độ dài bit của value), để cảnh không bao giờ hiện số khác value; `label` ≤30 | 2 | bit |
| `memory-array` | `name` ≤24; `cells` [chuỗi 1..6] 2..10 bắt buộc; `base` 0..65535 (mặc định 4096); `size` 1..8 (mặc định 4); `access` [số nguyên 0..9] ≤6 | 2 | array, access |
| `algo-bars` | `title` ≤40; `states` [{`values` [số nguyên 1..99] 2..16 bắt buộc, `active` [chỉ số] ≤16, `done` [chỉ số] ≤16, `note` ≤60}] 1..24 bắt buộc | 2 | step |

Ví dụ hợp lệ của từng loại nằm ở `spec.example`. Quy ước beat riêng:
- `flow`: beat 0 hiện đồ thị; `packets[i]` chạy ở beat i+1 (36 frame).
- `layers`: tầng i hiện ở beat i; sau tầng cuối có gói dữ liệu quét xuống và `highlight` được tô.
- `scale-ladder`: bậc i hiện ở beat i.
- `tree-graph`: mọi nút cùng độ sâu d hiện ở beat d; `path` được tô dần ở beat kế sau tầng sâu nhất (nút thứ j cách 10 frame).
- `code-walk`: code hiện từ đầu; `notes[k]` sáng dòng `line` và hiện chú thích ở beat k; dòng khác mờ.
- `terminal`: dòng i hiện ở beat i; `cmd` được gõ 1,1 ký tự mỗi frame.
- `bits`: beat 0 hiện ô (toàn 0); beat k bật bit 1 thứ k từ bit cao xuống thấp, tổng cộng dồn bên dưới.
- `memory-array`: beat 0 hiện ô, chỉ số, địa chỉ `0x....` = `base + i*size`; `access[k]` là chỉ số con trỏ ở beat k+1.

## Hàm thuần để test không phải đo ảnh
```ts
// video/src/lib/algo-bars-at.ts
export interface BeatStart { startFrame: number; cue?: string }
export interface AlgoBarsFrame { index: number; values: number[]; heights: number[]; active: number[]; done: number[]; note: string }
export const ALGO_MAX_H = 480; export const ALGO_SWAP_FRAMES = 14;
export function algoBarsAt(props: Record<string, unknown>, frame: number, beats: BeatStart[]): AlgoBarsFrame
```
`states[k]` hiện từ đầu beat `step` thứ k (nếu có ít nhất một beat mang cue `step` thì chỉ các beat đó được đếm; không beat nào có `step` thì beat thứ k theo thứ tự; k vượt số beat đếm được thì không tới được, giữ trạng thái cuối đã tới); trước beat đầu là `states[0]`. `frame` và `startFrame` cùng hệ quy chiếu (cùng tương đối cảnh hoặc cùng tuyệt đối). `heights` (px, cột cao nhất của mọi trạng thái = `ALGO_MAX_H`) nội suy giữa trạng thái trước và hiện tại trong `ALGO_SWAP_FRAMES` frame đầu của trạng thái mới; sau đó đúng `values[i]/max*ALGO_MAX_H`. Cảnh vẽ đúng theo hàm này, không chạy thuật toán.

```ts
// video/src/lib/layout-flow.ts
export interface Box { id: string; x: number; y: number; w: number; h: number }   // (x, y) góc trên trái, toạ độ màn hình
export const FLOW_AREA = { x: 40, y: 40, w: 1840, h: 750 }
export interface FlowLayout { boxes: Box[]; paths: Record<string, {x:number;y:number}[]>; edges: {from;to;label?}[]; scale: number }
export function layoutFlow(props: Record<string, unknown>): FlowLayout   // dagre; bỏ cạnh trỏ nút lạ hoặc tự trỏ

// video/src/lib/layout-tree.ts
export interface TreeBox extends Box { depth: number; label: string }
export const TREE_AREA = { x: 40, y: 40, w: 1840, h: 750 }
export interface TreeLayout { boxes: TreeBox[]; links: {from;to}[]; depth: number; scale: number }
export function layoutTree(props: Record<string, unknown>): TreeLayout    // d3-hierarchy; gốc = nút đầu tiên không có cha hợp lệ, nút mồ côi bị bỏ
```
Mọi hộp nằm trong vùng `x ∈ [40, 1880]`, `y ∈ [40, 790]`, không chồng nhau. Bố cục chừa 16 px quanh vùng nên cả viền hộp (và vòng sáng của `flow`) cũng nằm trong lề 40 px. Toạ độ hộp làm tròn 2 chữ số thập phân. `depth` của gốc `tree-graph` là 0.

## Code và tô màu
`video/src/lib/code-highlight.ts`: `tokenizeCode(code, lang)` trả `{text,color}[][]` (một mảng mỗi dòng), `normalizeCode` (NFC, tab thành 2 dấu cách). Dùng `shiki` 4.6.0 `createHighlighterCoreSync` + engine JavaScript (không WASM), ngữ pháp và chủ đề `github-dark` nằm trong gói, không tải gì lúc render, tất định. Gọi `codeToTokensBase` với `tokenizeTimeLimit: 0` (không giới hạn thời gian; mặc định 500 ms mỗi dòng của shiki làm code ra một màu khi máy tải cao). Font đơn cách `MONO_FAMILY` (`lib/fonts.ts`); chữ code ở cỡ gốc 30 px tối đa (dòng 56 ký tự vừa khung), dài hơn thì giảm cỡ tới 18 px rồi cắt "…". Chú thích tiếng Việt qua `fitText` (≤6 dòng).

## Gói thêm (ghim đúng, `video/package.json`)
`shiki` 4.6.0 (MIT), `@dagrejs/dagre` 3.1.3 (MIT), `d3-hierarchy` 3.1.3 (ISC), devDependency `@types/d3-hierarchy` 3.1.7 (MIT). Không dùng `@remotion/paths`, `@remotion/shapes`, `d3-shape`.
