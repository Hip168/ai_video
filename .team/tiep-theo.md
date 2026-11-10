# Tạm dừng 2026-11-04: chạy tiếp từ đây

Người dùng bảo dừng, hôm sau chạy tiếp. Tất cả agent đã dừng, không còn tiến trình render nào chạy.

## Đã vào main
Các đề mục 5 (#33), 6 (#34), 7 (#59), 8 (#61), 9 (#32) và 11 (#60). Main ở `f9592b5`, CI xanh cả 3 job.

## Đang dở: đề mục 10 (render dài, ghép, kiểm)
- Worktree: `.worktrees/10-render-dai`, nhánh `10-render-dai`, HEAD `f00924c`, cây sạch. Code ở `1406f0e`, test ở `f00924c` (`CHỜ DUYỆT`, chưa khoá).
- DEV-LEAD đang KIỂM thì bị dừng, chưa có kết luận. Ngày mai gọi một DEV-LEAD MỚI kiểm từ đầu, đừng tin kết quả của lượt cũ.
- Nhánh chưa có các đề mục 7, 8, 11 từ main. Phải merge `origin/main` vào nhánh, chạy lại test. Đề mục 11 có `KY_THUAT_CMD = aivideo.assemble verify`, nên phải kiểm xem đề mục 10 có đúng lệnh này không.
- Luồng còn lại: DEV-LEAD KIỂM → TEST-LEAD DUYỆT, CHẠY & ĐỐI CHIẾU → TESTER KHOÁ → code review (có phát hiện thì sửa luôn) → README → DEPLOY (push, PR, CI) → người dùng merge.

## Sau đề mục 10: đề mục 12 (kênh và tập thí điểm)
Xem `.team/features/12-tap-thi-diem.md`. Trước tập đầu phải xử lý:
- Issue (f) trong `.team/tests/8.md`: ở `flow`, 8 nút dọc thì chữ khoảng 11 px, và nhãn cạnh dạng fan đè lên nhau. Cần lint chặn khi chữ nút nhỏ hơn 28 px, và giới hạn số nút. BA đo ngưỡng rồi chốt.
- Cân nhắc issue 1 và 7 trong `.team/tests/11.md` ("tin sếp tổng": `apply-factcheck` chưa gắn với phát hiện đã ghi sổ).
- Chạy bộ cài lỗi `qualify` để đo người kiểm, ghi vào `.team/qualification.md`.
- Việc của người dùng: chọn tên kênh, tạo kênh, xác minh số điện thoại, duyệt video đầu.

## Lưu ý
- Checkout chính có thay đổi chưa commit ở `video/tests/helpers/render.ts` và `.team/locks/2.sha256`. Đó là việc của phiên Claude khác, không đụng, không commit.
- Đội tự push được. Lần push và tạo PR của đề mục 11 bị chặn quyền, nhưng của đề mục 8 thì qua. Người dùng tự merge.
- Không đẩy commit tài liệu lên main khi CI của commit merge chưa chạy xong, vì CI có `cancel-in-progress`.
- Thân PR ghi vào `/Users/leminhdao168/Documents/ai_video_spike/`, không ghi vào `/tmp`, vì `/tmp` của agent khác `/tmp` của người dùng.
- Worktree `4-khung-doc` đang tạm dừng (D19).
