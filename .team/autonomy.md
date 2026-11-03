# Chế độ tự động

Chế độ: TỰ ĐỘNG
Song song tối đa: 4 đề mục

Người dùng chọn Duyệt ở Pha 4d ngày 2026-10-31. Luật đầy đủ: `~/.claude/team/CONVENTIONS.md` §8.

## Luôn dừng và hỏi người dùng
- Test đỏ do code sai tiêu chí, CI đỏ, main đỏ, `BỊ CHẶN`.
- Review có phát hiện: KHÔNG hỏi nữa (người dùng chốt 2026-11-03). Lỗi rõ ràng thì giao DEV sửa, DEV-LEAD và TEST-LEAD kiểm lại. Chỉ hỏi khi sửa làm đổi hành vi đã chốt hoặc rất tốn.
- `CẦN BA` mà `.team/` không trả lời được.
- Cài hoặc chạy trên server, tài khoản thật.
- Mở khoá file khoá, force push, xoá nhánh, sửa `.github/workflows`.
- Đổi hành vi đã chốt, thêm tính năng ngoài issue đã duyệt.
- Xung đột merge không chắc.
- Hệ thống phân quyền từ chối lệnh.

## Quyền đã cấp
- Merge PR (người dùng chốt 2026-11-03): người dùng tự merge. DEPLOY push, mở PR, chờ CI xanh rồi báo link PR và dừng, không gọi `gh pr merge`. Sau khi người dùng báo đã merge, DEPLOY theo dõi CI main.

## Điểm dừng riêng của dự án này
- [1-4]: người dùng nghe và chọn engine + giọng.
- [1-7]: người dùng nghe và duyệt thuật ngữ.
- [2-5]: người dùng xem bản dựng với giọng giả lập.
- [3-2]: người dùng xem và duyệt video mẫu.
- [12-2]: người dùng tự đăng nhập, tạo kênh, xác minh số điện thoại.
- [12-3]: người dùng xem video đầu ở chế độ Không công khai. Sau khi người dùng ok, video từ thứ 2 đăng Công khai không hỏi (D21).
