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
Đã dùng Vibecraft để xem đội, rồi gỡ hẳn theo yêu cầu người dùng (2026-10-31). Không còn thuộc dự án.

## D10. Vùng an toàn và khe hở hợp đồng (BA chốt, 2026-10-31, từ duyệt của TEST-LEAD)
- Hình chính vẽ trong `y < 830`, tức chừa 250 px đáy, vì phụ đề 2 dòng cao tới y=836. Thay cho mốc 200 px cũ.
- `durationFrames` ≥ 1; `text` chỉ có khoảng trắng bị coi là rỗng (`0-hop-dong-timeline.md`).
- Bên đề mục 1: `compare` có `lexicon_path`, tên file bỏ dấu, `number_to_words` chỉ cam kết 0–99, `pause_ms` là số nguyên ≥ 0, `validate_timeline` kiểm luật 1-8, luật 9 kiểm ở bước build.
- `build` validate trước khi ghi `timeline.json`; timeline hỏng thì không ghi file.
- Luật 10 là mô tả, không có kiểm tra riêng trong `validate_timeline`. `startFrame` của cảnh bằng beat đầu (trừ cảnh đầu) được kiểm ở test build.
- Luật 2 và 7 đổi trước khi hợp đồng được phát hành nên `version` giữ 1.

## D11. Cơ cấu Lead (người dùng chốt, 2026-10-31)
Có `dev-lead` và một TEST-LEAD (CONVENTIONS §0c). `deploy-lead`, `ops-lead` đã bỏ sau khi chạy thử. Áp dụng từ các việc mới; đề mục 1 và 2 đang chạy dở vẫn đi nốt, `dev-lead` kiểm trước khi sang DEPLOY.

## D12. Giọng đọc (người dùng chốt sau khi nghe, 2026-10-31)
KorvaTTS, giọng `hoang_nam`, giữ nguyên từ tiếng Anh. Chỉ `router` và `packet` cần sửa cách đọc bằng chính giọng này; `DNS`, `Wi-Fi`, `IP` giữ nguyên. Không ghép giọng tiếng Anh. Người dùng nghe 7 mẫu mỗi từ và chọn: `router` đọc "râu tơ" (mẫu 3), `packet` giữ nguyên. `lexicon.json` chỉ còn `router`. Tốc độ `--speed 1.25` (2631 frame, 87,7 giây): người dùng xem bản có giọng và nhắn "ok" ngày 2026-10-31. `lexicon.json` là dữ liệu sửa được: test chỉ kiểm dạng, không ghim từ nào.

## D13. Đề mục 3 (BA chốt, 2026-10-31)
`make-video.sh` chỉ chạy trên Mac, không tự cài, chỉ truyền qua `REMOTION_BROWSER_EXECUTABLE`. Hợp đồng đầu ra tối thiểu ghi ở `features/3-ghep-video.md`.
