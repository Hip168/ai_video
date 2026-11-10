# Đề mục 14: Shorts dọc từ tập dài

Nhánh `14-shorts`. Phụ thuộc: 10 (render), 13 (đăng). Làm song song với 10 và 13. Quyết định: D28. Dùng lại phần có thể dùng của nhánh `4-khung-doc`.

## Kiến trúc (BA sẽ chốt chi tiết sau khi code-explorer đọc nhánh 4 và khung v2)
- Composition `Short` 1080×1920. Ba vùng: tiêu đề ở trên, vùng cảnh vuông 1080×1080 ở giữa, phụ đề ở dưới. Vị trí vùng an toàn theo hướng dẫn chính thức của YouTube Shorts, nguồn ghi trong `stack.md`.
- Mỗi loại cảnh có biến thể `square`. Lint chặn khi chữ nhỏ hơn ngưỡng ở khung dọc. Ngưỡng do đội đo rồi BA chốt.
- `shorts.json` của tập: danh sách 2 đoạn, mỗi đoạn gồm dải beat, tiêu đề, móc mở đầu. Vai `scene-director` hoặc `packager` đề xuất, `script-editor` kiểm.
- Render và kiểm dùng chung pipeline của đề mục 10 (`--layout short`). Đăng dùng `upload.py` (đề mục 13), có thêm `#Shorts` và link về video dài.
- Lịch chạy: Short đăng trong cùng lượt, sau video dài. Short đầu tiên để Không công khai, chờ người dùng duyệt.

## Task (tạo issue khi bắt đầu)
- [14-1] Composition `Short` và vùng an toàn
- [14-2] Biến thể vuông cho 18 loại cảnh
- [14-3] Chọn đoạn, `shorts.json`, render, kiểm
- [14-4] Đăng và lịch

## Xong khi
- 2 Shorts của tập đầu lên kênh. Chữ đọc rõ trên điện thoại. Lint, loudness và kiểm mất hình đều đạt. Mô tả có link về video dài.
