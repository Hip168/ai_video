# Tranh luận 2026-11-24 `mcp-mien-phi`

## Đề xuất
Dùng các MCP/công cụ miễn phí (yt-dlp-mcp, transcript-mcp, youtube-mcp-server, edge-tts-mcp, kokoro, pexels, comfyui, ffmpeg-skill, yutu) để research đề tài, dựng giọng, lấy hình và đăng cho hai kênh, kèm các đổi cách làm rút từ nghiên cứu thị trường. Chủ kênh dặn: "nghiên cứu xong phải đưa vào 2 flow chuẩn chỉ cho 2 kênh, mỗi phiên làm video thì phải đọc từ đó mà ra".

## ỦNG HỘ
- **Con Bit:** research đề tài bằng dữ liệu YouTube thật (outlier, câu móc, bình luận) thay vì đoán; tiêu đề và câu móc Short nên dựa vào mẫu đã thắng ("GPS 2038"). Sau phản biện: rút ffmpeg-skill và Kokoro (không có giọng Việt), chọn yt-dlp CLI chỉ đọc thay cho MCP.
- **Buck:** đối thủ thắng ở video dài 13–16 phút và khung "suy thoái"; Kokoro-82M nhanh hơn Chatterbox nhiều. Sau phản biện: rút ffmpeg-skill, không dùng MCP cho TTS; giữ đề xuất độ dài và khung tiêu đề.

## PHẢN ĐỐI
- **Con Bit:** MCP mới là bề mặt tấn công và tốn token; tải video/phụ đề kênh khác dễ vướng chính sách; edge-tts/pexels/comfyui trái luật kênh (TTS miễn phí đã có, cấm ảnh bản quyền/ảnh AI). Đồng ý yt-dlp CLI chỉ đọc nếu không cookie, không tải video.
- **Buck:** đổi giọng giữa chừng làm kênh lệch nhận diện, outro đang dùng chung `outro.wav`. Sau phản biện: đảo lại, cho THỬ Kokoro với điều kiện ngoài lịch đã hẹn, có bản Chatterbox song song, làm lại outro cùng giọng, có thước đo và đường lui.

## Nghiên cứu thị trường (số chính)
- **Con Bit:** "Lỗi font" 539 view, giữ chân 31%; "GPS 2038" (Short) 4.355 view; nguồn video dài: Duyệt 701 / Đề xuất 258 / Tìm kiếm 24; lượt xem video dài đến từ Short 3 / 14.043 view Short.
- **Buck:** 78–82% view từ Việt Nam (khoảng 20% từ nước nói tiếng Anh); trung vị độ dài video dài của đối thủ 13–16 phút; outlier khung suy thoái ("How X Got So Bad", "The Collapse of X") 2,6–2,8× trung vị kênh.

## Phán quyết TRỌNG TÀI
### Công cụ (cả hai kênh)
| Công cụ | Con Bit | Buck |
|---|---|---|
| yt-dlp CLI chỉ đọc | NÊN LÀM | NÊN LÀM |
| yt-dlp-mcp, transcript-mcp, youtube-mcp-server | KHÔNG | KHÔNG |
| edge-tts-mcp, pexels, comfyui, ffmpeg-skill, yutu | KHÔNG | KHÔNG |
| kokoro | KHÔNG (không có giọng tiếng Việt) | THỬ (thư viện trực tiếp, không MCP) |

### Con Bit
| Mục | Phán quyết |
|---|---|
| Chọn đề tài bằng bảng outlier ≥3× | NÊN LÀM (§1) |
| Tiêu đề ≤60 là cổng cứng | NÊN LÀM (§2) |
| Ảnh bìa chấm theo Duyệt, Test & Compare mọi tập | NÊN LÀM (§4) |
| Câu móc Short "thứ ai cũng biết + một con số" | THỬ đến 2026-12-31 (§5) |
| Cầu nối Short→dài + Video liên quan trong 24 giờ | THỬ đến 2026-12-31 (§5) |

### Buck
| Mục | Phán quyết |
|---|---|
| Video dài 10–15 phút (2 tập kế 12–15) | THỬ đến 2026-12-31 (§1) |
| Khung tiêu đề suy thoái, tối đa 1/2 tập | THỬ đến 2026-12-31 (§2) |
| Đề tài bằng outlier ≥3×; ảnh bìa 1 vật + mũi tên giá, không chữ số | NÊN LÀM (§2, §4) |
| Đo Short bằng Đã xem/Lướt qua + % US/CA/GB/AU; câu móc giá USD thật | THỬ đến 2026-12-31 (§12) |
| Kokoro-82M trên 1 tập ngoài lịch | THỬ đến 2026-12-31 (§9) |

## Luật đã ghi / đã thay
- `chung.md` §8 (mới) "Công cụ research": dòng yt-dlp CLI chỉ đọc; dòng danh sách KHÔNG; dòng đọc Studio hằng tuần [owner 2026-11-24].
- `chung.md` §5: thêm dòng owner cho phép sửa tiêu đề/ảnh bìa video đã hẹn/đã đăng qua API, ghi `out/doi-tieu-de-2026-11-24.md`.
- `con-bit.md` §1: thêm dòng outlier; thêm dòng cấm đề tài nhạy cảm chính trị/quan hệ Việt–Trung (owner).
- `con-bit.md` §2: thay "≤60 ký tự (trần cứng 100)" bằng cổng cứng ≤60; "Lỗi font" (75) giữ.
- `con-bit.md` §4: thay "2–3 ảnh bìa khi có" bằng "mọi tập, chấm theo Duyệt".
- `con-bit.md` §5: thêm 2 dòng THỬ; dòng câu móc cũ trỏ về khuôn THỬ; dòng "Video liên quan" thêm hạn 24 giờ; bỏ dòng CHỜ 9 tiêu đề Short 23–30/11 (owner cho sửa).
- `con-bit.md` §7: cập nhật dòng caption TikTok theo PR #103 (đã merge), PR #104 (chờ duyệt).
- `buck.md` §1: thay dòng "16:9, 8–12 phút" bằng dòng THỬ 10–15 phút.
- `buck.md` §2: dòng "kết bằng ?" đổi thành "câu hỏi kết bằng ?, hoặc khung suy thoái theo luật THỬ"; thêm dòng THỬ khung suy thoái và dòng NÊN LÀM outlier.
- `buck.md` §4: thêm dòng ảnh bìa 1 vật + mũi tên giá, không chữ số.
- `buck.md` §5: bỏ dòng CHỜ 9 tiêu đề Short (owner cho sửa).
- `buck.md` §9: thêm dòng THỬ Kokoro, dòng CHỜ giữ Kokoro. §11 không đổi.
- `buck.md` §12: thêm dòng THỬ đo Short.
- `flow.md` thay bằng `flow-chung.md`, `flow-con-bit.md`, `flow-buck.md` (thêm khâu outlier, cổng tiêu đề, cầu nối Short, khâu đo lường 48 giờ/7 ngày ở `out/do-luong/<kênh>-<slug>.md`, nợ DEV chặn).

## Chủ kênh quyết (24/11, sau phán quyết)
- Đổi tiêu đề/ảnh bìa video đã hẹn và vừa đăng cho khớp luật mới: ĐỒNG Ý. Sửa qua API, ghi `out/doi-tieu-de-2026-11-24.md` (agent khác làm).
- Đề tài "Tết 1985 lệch ngày VN–TQ": BÁC. Thêm vào danh sách tránh: đề tài nhạy cảm chính trị/quan hệ Việt–Trung.
- Agent Brave đọc Đã xem/Lướt qua trong YouTube Studio mỗi tuần: ĐỒNG Ý, chỉ đọc, không sửa, không gõ đăng nhập.

## CHỜ CHỦ KÊNH
- Giữ Kokoro cho Buck sau đợt THỬ (xét 2026-12-31).
