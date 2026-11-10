# Kế hoạch

| X | Tên | Nhánh | Task | Issue | Trạng thái |
|---|---|---|---|---|---|
| 1 | Âm thanh | `1-am-thanh` | [1-1] Khung dự án và kiểm timeline | #1 | Đã merge |
| 1 | Âm thanh | `1-am-thanh` | [1-2] Engine giả lập và bọc hai engine thật | #2 | Đã merge |
| 1 | Âm thanh | `1-am-thanh` | [1-3] Chuẩn hóa văn bản và bảng phát âm | #3 | Đã merge |
| 1 | Âm thanh | `1-am-thanh` | [1-4] Lệnh so sánh giọng | #4 | Đã merge |
| 1 | Âm thanh | `1-am-thanh` | [1-5] Tổng hợp, cắt lặng, ghép, loudnorm, cache | #5 | Đã merge |
| 1 | Âm thanh | `1-am-thanh` | [1-6] Xuất SRT và timeline, build đầu cuối | #6 | Đã merge |
| 1 | Âm thanh | `1-am-thanh` | [1-7] Bản giọng thật | #7 | Đã merge |
| 2 | Hình ảnh | `2-hinh-anh` | [2-1] Khung Remotion và timeline | #8 | Đã merge |
| 2 | Hình ảnh | `2-hinh-anh` | [2-2] Font Việt và phụ đề | #9 | Đã merge |
| 2 | Hình ảnh | `2-hinh-anh` | [2-3] Bộ linh kiện SVG | #10 | Đã merge |
| 2 | Hình ảnh | `2-hinh-anh` | [2-4] Bảy cảnh | #11 | Đã merge |
| 2 | Hình ảnh | `2-hinh-anh` | [2-5] Âm thanh và lệnh render | #12 | Đã merge |
| 3 | Ghép video | `3-ghep-video` | [3-1] Lệnh một phát và README | #13 | Đã merge |
| 3 | Ghép video | `3-ghep-video` | [3-2] Video mẫu thật | #14 | Đã merge |
| 4 | Khung dọc | `4-khung-doc` | [4-1] Composition và phụ đề dọc | #19 | Tạm dừng (D19) |
| 4 | Khung dọc | `4-khung-doc` | [4-2] Bảy cảnh dọc | #20 | Tạm dừng (D19) |
| 4 | Khung dọc | `4-khung-doc` | [4-3] Lệnh và video mẫu dọc | #21 | Tạm dừng (D19) |

Đề mục 1 và 2 chạy song song. Đề mục 3 bắt đầu sau khi cả hai đã merge.

## Giai đoạn 2: kênh YouTube

| X | Tên | Nhánh | Phụ thuộc | Đợt | Trạng thái |
|---|---|---|---|---|---|
| 5 | Dựng tập (Python) | `5-dung-tap` | hợp đồng v2 | 1 | Đã merge (PR #33, issue #22–#24) |
| 6 | Khung Remotion v2 | `6-khung-v2` | hợp đồng v2 | 1 | Đã merge (PR #34, issue #25–#28) |
| 9 | Âm thanh tập | `9-am-thanh-tap` | hợp đồng v2 | 1 | Đã merge (PR #32, issue #29–#31) |
| 7 | Cảnh nhóm A | `7-canh-a` | 6 | 2 | Đã merge (PR #59, issue #35–#40) |
| 8 | Cảnh nhóm B | `8-canh-b` | 6 | 2 | Đã merge (PR #61, issue #41–#49) |
| 10 | Render dài | `10-render-dai` | 6, gặp 9 ở tích hợp | 2 | Đang làm (issue #50–#53) |
| 11 | Đội sản xuất | `11-doi-san-xuat` | 5 | 2 | Đã merge (PR #60, issue #54–#58) |
| 12 | Tập thí điểm | `12-tap-thi-diem` | 5–11, kênh đã tạo | 3 | Chưa làm. [12-5] đã merge (PR #67, issue #62): lint chặn cảnh `flow` chữ nhỏ, xử lý issue (f) của `.team/tests/8.md`. Các task còn lại của đề mục chưa làm |
| 13 | Tự tạo và tự đăng | `13-tu-dong` | 10, 11 | 3 | Chưa làm (D24). Issue #63–#66 ([13-1..4]) |
| 14 | Shorts dọc | `14-shorts` | 10, 13 | 3 | Đang thiết kế (D28), làm song song |

Task và tiêu chí xong nằm trong `features/X-*.md`. Số issue ghi ở đó sau khi tạo. Merge tuần tự: 5, 6, 9, 7, 8, 10, 11, 13, 12. Đề mục 12 đăng tập đầu bằng `upload.py` của đề mục 13.
