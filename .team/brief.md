# Brief

## Giai đoạn 2: kênh YouTube fact tin học (2026-11-03)
Người dùng muốn một kênh YouTube giải thích fact tin học dễ hiểu, mỗi video từ khoảng 10 phút, do một đội đầy đủ người làm, người check, người kịch bản đảm nhận. Ra lệnh là có video lên kênh, "từ lần sau là chỉ làm thôi". Dùng công cụ gì phải báo. Được tự tìm repo GitHub, clone về học, chỉ cần báo.

Nguyên văn yêu cầu về đội: "thứ tôi cần là 1 team chuẩn chỉ nhá, chứ đừng tự làm sau tự thấy kh hay tự sửa".

| Câu hỏi | Người dùng chốt |
|---|---|
| Dạng video | Một chủ đề, đào sâu |
| Đăng | Video đầu để Không công khai cho người dùng duyệt; người dùng ok thì từ video 2 đăng Công khai ngay sau khi QC duyệt |
| Kênh | Chưa có. Đội đề xuất tên và nhận diện, hướng dẫn tạo. Người dùng tự đăng nhập và xác minh số điện thoại. Tài khoản cá nhân, không dính G3/Ript |
| Chi phí | 0 đồng. Thêm nhạc nền nhẹ và SFX miễn bản quyền (thay "không nhạc" của bản 90 giây) |

Phần dưới là giai đoạn 1, giữ để tra cứu. Mục "Ngoài phạm vi" ở dưới không còn áp dụng cho nhạc nền, SFX và nhiều video.

## Yêu cầu gốc
Người dùng nhận từ một người bạn bảng công nghệ (Remotion 4.0.539, React 19.1, TypeScript 5.7.2, Revideo 0.11.0, Python, KorvaTTS, VieNeu-TTS, edge-tts, FFmpeg, NumPy, SoundFile, librosa, JSON/TXT/SRT, Node.js, Python .venv, PowerShell) kèm lời giới thiệu là "sẽ tạo ra được video", và nhờ xem giúp.

Nhận định của BA: bảng này là danh sách công cụ, không phải prompt. Nó không có chủ đề, kịch bản, code dựng cảnh. Các thành phần đều có thật trên npm/PyPI.

## Lựa chọn người dùng đã chốt (2026-10-31)
| Câu hỏi | Lựa chọn |
|---|---|
| Làm đến đâu | Pipeline gọn, làm 1 video mẫu: Remotion + 1 giọng đọc + FFmpeg. Bỏ Revideo và PowerShell |
| Loại video | Video giải thích có sơ đồ động, toàn bộ hình do code vẽ |
| Mục đích | Cá nhân / nhóm ≤ 3 người (Remotion miễn phí) |
| GitHub | Repo mới `Hip168/ai_video`, private |
| Chủ đề | Đội viết chủ đề kỹ thuật mẫu; người dùng duyệt kịch bản trước khi dựng |
| Định dạng | Ngang 16:9, 1080p, 60–90 giây |
| Giọng đọc | Thử cả KorvaTTS và VieNeu, người dùng nghe rồi chọn một |
| Thành phần | Phụ đề khớp giọng + file SRT; chuẩn hóa âm lượng. **Không** nhạc nền, **không** SFX |
| Phối hợp đề mục | Chốt định dạng `timeline.json` trước, làm song song |
| Test | pytest + Vitest; CI giả lập TTS, bản thật chạy trên Mac |
| Kiến trúc đề mục 1 | Tối thiểu |
| Kiến trúc đề mục 2 | Tối thiểu, mỗi cảnh một file |

## Kết quả mong đợi
Một lệnh trên Mac tạo ra `out/video.mp4` (1920×1080, 30 fps, 60–90 giây) kèm `out/video.srt`, từ kịch bản trong repo.

## Ngoài phạm vi
AI sinh cảnh quay, nhạc nền, SFX, khung dọc 9:16, nhiều video hàng loạt, nhân bản giọng, chạy trên Windows.
