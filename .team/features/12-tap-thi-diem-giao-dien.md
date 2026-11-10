# Đề mục 12: giao diện công khai

Đường dẫn tính từ gốc repo. Ngưỡng: `12-tap-thi-diem.md`, mục "[12-5] Ngưỡng đã chốt".

## [12-5] Lint cảnh `flow`

### Hằng số và hàm
```ts
// video/scripts/lint-core.ts
export const FLOW_MIN_NODE_FONT = 24;     // px
export const FLOW_MIN_LABEL_FONT = 20;    // px
export const FLOW_MAX_LABEL_OVERLAP = 4;  // px

// video/src/lib/layout-flow.ts (cảnh flow.tsx và lint cùng dùng)
export function flowSizes(scale: number): { nodeLines: number; nodeFont: number; lblW: number; lblH: number; lblFont: number }
```
`scale` lấy từ `layoutFlow(props).scale`. Khung nhãn cạnh: rộng `lblW`, cao `lblH`, tâm tại `pointAlong(lay.paths["từ>tới"], 0.5)` (`video/src/lib/b-kit.tsx`).

### Khi nào chạy
Trong `lintEpisode` (gọi từ `npm run lint:episode`), với mỗi cảnh `type: "flow"` có props qua `validateProps`. Cảnh có lỗi `props` thì không kiểm `flow`. Lint không render.

### Mã luật và thông báo
`<chỗ>` là `cảnh <id> (flow, <số nút> nút, hướng <TB|LR>)`. Số px in một chữ số lẻ, dấu chấm (vd `11.4`).

| rule | level | Điều kiện | message |
|---|---|---|---|
| `flow-node-font` | error | `nodeFont < 24` | (1) |
| `flow-edge-label-font` | error | có ít nhất một cạnh có `label` khác rỗng và `lblFont < 20` | (2) |
| `flow-label-overlap` | error | hai khung nhãn cạnh giao nhau, độ giao `min(giao ngang, giao dọc) > 4` | (3), mỗi cặp một lỗi |
| `flow-label-covers-edge` | warn | một đoạn của cạnh khác (không phải cạnh của chính nhãn) đi qua phần trong khung nhãn | (4), mỗi nhãn một cảnh báo |

Mẫu message (`<a>`, `<b>` dạng `từ>tới`, cặp theo thứ tự trong `edges`; dấu backtick quanh `flow` là ký tự thật trong message):
```
(1) <chỗ>: chữ nút <x> px, cần ít nhất 24 px; tách thành hai cảnh `flow`
(2) <chỗ>: chữ nhãn cạnh <x> px, cần ít nhất 20 px; tách thành hai cảnh `flow`
(3) <chỗ>: nhãn cạnh "<a>" và "<b>" đè nhau <d> px, tối đa 4 px; tách thành hai cảnh `flow`
(4) <chỗ>: nhãn cạnh "<a>" che cạnh "<b>", "<c>"
```

### Số đo tham khảo (DEV-12)
| Props | Kết quả |
|---|---|
| `TB`, chuỗi 3 nút | sạch |
| `TB`, chuỗi 4 nút | `flow-node-font` 22.0 px |
| `TB`, chuỗi 8 nút `n1>…>n8` | `flow-node-font` 11.4 px |
| `TB`, 1 gốc 6 con có nhãn | sạch (nhãn giao 3,3 px, dưới ngưỡng) |
| `TB`, 1 gốc 7 con có nhãn | `flow-node-font` 23.7 px, 4 lỗi `flow-label-overlap` (16.4 và 26.8 px), 2 cảnh báo |
| `LR`, 1 gốc 5 con có nhãn | chỉ 2 cảnh báo `flow-label-covers-edge` |
| `LR`, 1 gốc 6 con có nhãn | `flow-node-font` 23.5 px, 2 cảnh báo |

Nhãn dùng khi đo: nút `Bước k` / `Máy k`, gốc `Máy chủ`, cạnh `gửi gói k`.
