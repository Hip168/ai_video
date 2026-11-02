# Đề mục 7 và 8: Thư viện cảnh

Nhánh `7-canh-a`, `8-canh-b`. Phụ thuộc đề mục 6. Luật cảnh: `6-khung-v2.md`, D16.

## Kiến trúc đã chọn
- Mỗi loại một file `video/src/lib/scenes/<type>.tsx` và `lib/specs/<type>.ts`, đăng ký bằng cách đổi đúng dòng của mình trong `registry.ts`.
- Sơ đồ thuật toán: props là danh sách trạng thái tính sẵn, cảnh chỉ vẽ theo frame. Không chạy thuật toán lúc render.
- Được thêm, ghim đúng phiên bản: `@remotion/paths`, `@remotion/shapes`, `@remotion/noise` bản 4.0.539; `d3-hierarchy`, `d3-shape`, `@dagrejs/dagre` để tính bố cục; `shiki` để tô màu code. Không dùng `@remotion/transitions` nếu không cần (giấy phép riêng), không dùng `@remotion/sfx`.
- Thêm phụ thuộc thì báo trong báo cáo DEV, kèm giấy phép và phiên bản.

## Đề mục 7, nhóm A (6 loại)
`big-number` (đếm lên), `compare` (A với B, tick/cross), `myth-fact` (lật thẻ), `history-timeline`, `term-card`, `chart` (cột, đường).

## Đề mục 8, nhóm B (9 loại)
- Kỹ thuật cơ bản: `flow` (nút, cạnh, gói tin), `layers`, `scale-ladder`, `tree-graph`.
- Code và dữ liệu: `code-walk`, `terminal`, `bits`, `memory-array`, `algo-bars`.

Mỗi loại là một task. BA tạo issue theo từng loại.

## Xong khi (mỗi loại)
- Ví dụ trong spec qua validator props.
- Still giữa cảnh không đơn sắc. Dịch `startFrame` của beat làm đổi hình (cảnh thật sự neo beat).
- Không vẽ ngoài `y < 830`. Không tràn chữ với chuỗi dài nhất trong ví dụ.
- Still dưới 5 giây trên CI. Grep filter và URL trả 0.
- Đề mục 8: `code-walk` đúng dấu tiếng Việt trong chú thích; `algo-bars` chạy đúng danh sách bước mẫu.
