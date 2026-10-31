# Quyết định

## D1. Cấu trúc repo
`audio/` (Python, đề mục 1) · `content/` (kịch bản, đề mục 1) · `video/` (Remotion, đề mục 2) · `out/` (sản phẩm, không commit) · `.team/contract/` (hợp đồng chung).
Lý do: hai đề mục chạy song song không đụng file của nhau. Nguồn: người dùng chốt làm song song; BA chọn bố cục để gộp hai thiết kế độc lập.

## D2. Quan hệ giữa các đề mục
- **1 ↔ 2:** dùng chung `timeline.json`. Đã chốt: BA cố định hợp đồng trước, hai bên làm song song (lời người dùng, 2026-10-31). Hợp đồng: `.team/features/0-hop-dong-timeline.md`. File mẫu: `.team/contract/timeline.sample.json`.
- **3 phụ thuộc 1 và 2:** chỉ bắt đầu sau khi cả hai đã merge.

## D3. Đồng bộ phụ đề theo nhịp, không theo từ
Cả KorvaTTS và VieNeu không có mốc thời gian theo từ (theo tài liệu, chưa chạy thử). Mỗi nhịp tổng hợp riêng, đo độ dài bằng số mẫu, cộng dồn ra mốc thời gian. Nhờ vậy không trôi thời gian.

## D4. Phát âm tách khỏi chữ hiển thị
Bảng phát âm chỉ tác động lên chuỗi gửi vào TTS. Phụ đề luôn hiện chữ gốc.

## D5. Loudness
-16 LUFS, true peak ≤ -1,5 dBTP, dung sai ±1 LU. Chuẩn hóa sau khi ghép, `linear=true` để không đổi độ dài.

## D6. Render offline
Font cục bộ, không dùng `@remotion/google-fonts`. Trình duyệt headless tải một lần bằng `npx remotion browser ensure`.

## D7. CI thuộc bước `/ci`
Các đề mục không tự viết `.github/workflows/`. CI cần chạy `pytest -m "not real"`, Vitest và render vài khung hình với âm thanh giả.

## D8. Thứ tự cảnh
`phone → dns → packets → wifi → hops → server → receiver`. DNS đứng trước `packets` vì điện thoại cần biết địa chỉ trước khi gửi. Đây là sửa đổi của BA so với thứ tự trong prompt gửi kiến trúc sư; người dùng duyệt qua kịch bản ở Pha 4d.

## D9. Giao diện xem agent (ngoài dự án)
Vibecraft nằm ở `~/Documents/vibecraft`, đã vá bản clone (6 chỗ, chưa commit, chưa build). Người dùng chọn chỉ bật hook cho dự án này qua `.claude/settings.local.json` (không commit), tạo sau khi kiểm thử bản build đạt. Không chạy `npx vibecraft setup`, không cài tmux. Không thuộc phạm vi đề mục nào.

## D12. Giọng đọc (người dùng chốt sau khi nghe, 2026-10-31)
KorvaTTS, giọng `hoang_nam`, giữ nguyên từ tiếng Anh. Chỉ `router` và `packet` cần sửa cách đọc bằng chính giọng này; `DNS`, `Wi-Fi`, `IP` giữ nguyên. Không ghép giọng tiếng Anh. Người dùng nghe 7 mẫu mỗi từ và chọn: `router` đọc "râu tơ" (mẫu 3), `packet` giữ nguyên. `lexicon.json` chỉ còn `router`.

(Dựng bản giọng thật: speed 1.25 vì speed 1.0 ra 105.7 s, vượt 90 s.)
