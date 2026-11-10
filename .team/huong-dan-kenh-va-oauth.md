# Hướng dẫn một lần: kênh YouTube và khoá API

Người làm: bạn, trên Chrome của bạn. Đội không mở trình duyệt, không đăng nhập thay bạn. Không dùng Claude in Chrome hay claude.ai cho các bước này.
Thứ tự: Phần 1, rồi Phần 2. Phần 3 để biết trước, chưa làm ngay.

Chữ trên giao diện Google hay đổi và có thể hiện bằng tiếng Việt. Chỗ nào ghi "(theo ý nghĩa)" là tôi không chắc tên nút đúng từng chữ, bạn tìm nút có nghĩa tương ứng.

## 1. Tạo kênh YouTube (tài khoản Google cá nhân, không dùng tài khoản công ty)

Tên kênh chưa cố định. Đội sẽ đề xuất tên ở bước 12-1. Nếu muốn, bạn đặt tạm một tên rồi đổi sau. Đổi tên và handle sau này được, nhưng `channelId` thì không đổi.

1. Mở Chrome, đăng nhập đúng tài khoản Google cá nhân định dùng. Kiểm tra ảnh đại diện góc phải.
2. Vào youtube.com, bấm ảnh đại diện, chọn "Tạo kênh" (Create a channel).
3. Điền tên kênh (tạm cũng được) và handle (dạng `@tenkenh`), bấm Tạo kênh.
4. Xác minh số điện thoại: vào youtube.com/verify, chọn quốc gia, nhập số điện thoại, nhận mã qua tin nhắn hoặc cuộc gọi, nhập mã. Cần bước này để đặt thumbnail riêng.
5. Lấy `channelId`: vào studio.youtube.com, Cài đặt (Settings) > Kênh (Channel) > Cài đặt nâng cao (Advanced settings) (theo ý nghĩa). Chuỗi bắt đầu bằng `UC` là channelId.
   Nếu không thấy: mở trang kênh của bạn, bấm ảnh đại diện > "Chia sẻ" > "Sao chép ID kênh" (theo ý nghĩa), hoặc vào youtube.com/account_advanced.
6. Lấy `handle`: trang kênh hiện dạng `@...` dưới tên kênh.
7. Ghi `channelId` và `handle` lại để gửi cho đội (xem Phần 4).

## 2. Google Cloud: khoá để đội đăng video bằng script

Đăng nhập Google Cloud bằng chính tài khoản chủ kênh (ở Phần 1).

1. Vào console.cloud.google.com. Bấm bộ chọn project ở thanh trên cùng > "Project mới" (New project). Tên gợi ý `aivideo-upload`. Không cần tổ chức. Bấm Tạo (Create), rồi chọn project đó.
2. Bật API: Menu (☰) > APIs & Services > Library. Gõ `YouTube Data API v3`, mở kết quả, bấm Enable.
3. Màn hình đồng ý OAuth: Menu > Google Auth platform. Nếu thấy "Google Auth platform not configured yet", bấm Get Started, rồi:
   1. App information: App name đặt `aivideo`; User support email chọn email của bạn. Bấm Next.
   2. Audience: chọn **External**. Bấm Next.
   3. Contact information: nhập email của bạn. Bấm Next.
   4. Finish: tích đồng ý Google API Services User Data Policy, bấm Continue, rồi Create.
4. Thêm test user: Google Auth platform > Audience > mục Test users > Add users > nhập email tài khoản kênh > Save.
5. Chuyển sang production: vẫn ở trang Audience, mục Publishing status đang là "Testing". Bấm nút "Publish app" (theo ý nghĩa), xác nhận. Trạng thái phải thành "In production". Lý do: ở chế độ Testing, token hết hạn sau 7 ngày, máy tự chạy sẽ hỏng.
   Phần "Data Access / scopes": chưa cần điền, script sẽ tự xin quyền khi bạn bấm Cho phép ở Phần 3.
6. Tạo OAuth client: Google Auth platform > Clients > Create Client > Application type chọn **Desktop app**. Name tuỳ ý (ví dụ `aivideo-desktop`). Bấm Create.
7. Tải JSON: ở hộp thoại vừa hiện (hoặc bấm biểu tượng tải xuống ở hàng client trong danh sách), bấm Download JSON (theo ý nghĩa). File về `~/Downloads`, tên dạng `client_secret_....json`.
8. Lưu vào chỗ cố định, chạy trong Terminal (sửa tên file cho đúng với file bạn vừa tải):
   ```
   mkdir -p ~/.config/aivideo/youtube
   mv ~/Downloads/client_secret_*.json ~/.config/aivideo/youtube/client_secret.json
   chmod 700 ~/.config/aivideo ~/.config/aivideo/youtube
   chmod 600 ~/.config/aivideo/youtube/client_secret.json
   ls -l ~/.config/aivideo/youtube/client_secret.json
   ```
   Dòng cuối phải hiện `-rw-------`. Nếu `~/Downloads` có nhiều file `client_secret_*`, gõ đúng tên file thay cho dấu `*`.
9. Không đưa file này vào repo, không dán vào chat.

Ghi chú: ứng dụng dưới 100 người dùng không cần Google verification. Nhưng khi bấm Cho phép ở Phần 3, bạn sẽ thấy màn hình cảnh báo "Google hasn't verified this app". Bình thường. Bấm Advanced, rồi "Go to <tên app> (unsafe)" để tiếp tục.

## 3. Việc chưa làm ngay (ghi để biết trước)

- Lệnh `python -m aivideo.upload auth` chỉ có sau khi đề mục 13 được merge. Lệnh mở trình duyệt mặc định để bạn bấm "Cho phép" một lần, đăng nhập bằng tài khoản kênh, và đi qua màn hình "unverified app" ở trên. Đội sẽ báo khi có.
- `claude setup-token`: tạo token để Claude chạy được khi không có người ngồi trước máy. Hết hạn sau khoảng một năm, phải làm lại. Đội sẽ đưa hướng dẫn riêng. Làm ở Terminal, không phải trình duyệt.
- Bật lịch chạy hàng ngày (LaunchAgent, đặt giờ máy tự thức, allowlist quyền cho Claude Code): đội sẽ đưa từng lệnh sau. Máy cần cắm sạc và mở nắp vào giờ chạy.

## 4. Gửi lại cho đội

- `channelId` (chuỗi bắt đầu bằng `UC`)
- `handle` (dạng `@...`)
- Xác nhận bằng một câu: "đã có `client_secret.json`, `ls -l` hiện `-rw-------`", và "đã xác minh số điện thoại".

Tuyệt đối KHÔNG dán vào chat: nội dung `client_secret.json`, mật khẩu, mã xác minh, mã token.

## Nguồn
- https://developers.google.com/workspace/guides/configure-oauth-consent (cập nhật 2026-09-03; các bước Get Started, Audience, Test users)
- https://developers.google.com/workspace/guides/create-credentials (Google Auth platform > Clients > Create Client > Application type)
- .team/decisions.md D24; .team/features/13-tu-dong.md; .team/features/12-tap-thi-diem.md
