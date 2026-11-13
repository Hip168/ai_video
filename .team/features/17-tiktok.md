# Đề mục 17: đăng TikTok tự động bằng cookie

Nhánh `17-tiktok`. Phụ thuộc: 14 (`python -m aivideo.shorts export` ghi `out/episodes/<slug>/tiktok/`). Người dùng chốt 2026-11-14: người dùng tạo tài khoản TikTok của kênh và gửi file cookie (Netscape `cookies.txt` xuất bằng tiện ích trình duyệt); đội tự đăng các phần TikTok và đặt ảnh đại diện, tên hiển thị giống kênh YouTube.

## Cách làm
- `audio/src/aivideo/tiktok.py`, Playwright điều khiển TikTok Studio bằng Chrome của máy (`channel="chrome"`, không tải trình duyệt). Phần thao tác trang chuyển thể từ `live-battle/tu-dang/tiktok_dang.py` của người dùng.
- Cookie: `~/.config/aivideo/tiktok/cookies.txt`, quyền phải là 600 (khác thì dừng, báo `chmod 600 <file>`). Chỉ nạp cookie miền `tiktok.com` / `*.tiktok.com`; phải có `sessionid`. Không in giá trị cookie: lỗi đọc file không kèm nội dung, mọi thông báo lỗi được thay giá trị cookie bằng `***`.
- Đầu vào: `manifest.json` (`{"slug", "parts":[{"part","mp4","caption"}]}`), `phan-<k>.mp4`, `phan-<k>.txt`.
- Sổ tập: mỗi phần đăng xong ghi một mục `tiktok-<k>`, vai `publisher`, `note` = `visibility=<quyền>`, `artifactHash` = sha256 MP4. Chạy lại bỏ qua phần đã có mục cùng quyền xem. Lỗi thì dừng ngay ở phần đó, các phần trước đã ghi sổ.
- Ảnh chụp gỡ lỗi ở `/tmp/aivideo-tiktok-*`: xoá khi thành công, giữ lại khi lỗi (đường dẫn in trong thông báo).

## Lệnh (chạy trong `audio/`)
```bash
.venv/bin/python -m aivideo.tiktok check        # in "đăng nhập: @<tên>" (mã 0) hoặc "cookie hết hạn" (mã 1)
.venv/bin/python -m aivideo.tiktok post <slug> [--parts 1-3] [--visibility everyone|only_you] [--dry-run]
.venv/bin/python -m aivideo.tiktok profile --name "Chuyện Của Những Con Bit" --avatar ../assets/brand/avatar-chip.png [--dry-run]
```
`--dry-run` không đọc cookie, không mở trình duyệt, không ghi sổ: chỉ in kế hoạch. TikTok chỉ cho đổi tên hiển thị 7 ngày một lần.

## Test
`audio/tests/test_tiktok.py`: Playwright thay bằng đồ giả, không mạng. Kiểm đọc manifest, dải phần, chạy lại theo sổ, quyền file cookie, không lộ giá trị cookie.
