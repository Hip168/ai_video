# Quy trình chung hai kênh (24/11/2026, tách từ flow.md theo tranh luận mcp-mien-phi)

Phiên làm video: đọc `chung.md` + `<kênh>.md` + file này + `flow-<kênh>.md` (`flow-con-bit.md` hoặc `flow-buck.md`). Không đọc flow của kênh kia [owner 2026-11-24].

## 1. Nguyên tắc
- Trước khi bắt đầu: đọc `ai_video/.team/tiep-theo.md`; kiểm worktree và commit thật nếu phiên trước bị huỷ [chung §7].
- Luồng chính chỉ điều phối; mỗi khâu là một agent mới; người làm ≠ người kiểm; phán quyết do script tính [chung §1].
- Mỗi tập một worktree/nhánh; commit đúng đường dẫn [chung §4].
- Mỗi bước đăng/hẹn giờ có CHECKLIST ở mục 5. Agent làm bước đó dán checklist vào báo cáo, mỗi dòng ✔ hoặc ✘ + lý do, đối chiếu `con-bit.md` hoặc `buck.md`. Còn một dòng ✘ thì không đăng [owner 24/11].
- Thứ tự đăng: video dài YouTube → Short YouTube → Facebook/TikTok cùng nội dung [chung §5].
- Xong mỗi phần: Drive + `rclone check` + xoá bản máy, dọn rác, báo GB trống [chung §3].

## 2. Công cụ cho phép
- Research đề tài: yt-dlp CLI chỉ đọc (`--dump-json`, `ytsearch50:`, `--write-auto-subs --skip-download`, `--write-comments`), không cookie, không tải video kênh khác, file tạm ở `/tmp/ytr-*`, xoá khi xong [chung §8].
- KHÔNG: yt-dlp-mcp, transcript-mcp, youtube-mcp-server, edge-tts-mcp, pexels, comfyui, ffmpeg-skill, yutu; không cài MCP YouTube/TTS/ảnh nào [chung §8].
- Kokoro: Con Bit KHÔNG; Buck THỬ bằng thư viện trực tiếp, không MCP, ngoài lịch đã hẹn [buck §9].
- Đăng: YouTube Data API (private + publishAt); Facebook qua Business Suite, TikTok qua TikTok Studio trên Brave, một agent Brave một lúc [chung §2 §5].

## 3. Bảng outlier (khâu research của cả hai kênh)
- Mỗi tập có file `research-outlier.md` trong thư mục tập: bảng `video | view | trung vị kênh | × | câu móc | bình luận nổi bật`, ≥5 dòng, kèm lệnh yt-dlp đã chạy và ngày lấy số [tranh-luan 2026-11-24 mcp-mien-phi, owner 2026-11-24].
- Trung vị kênh = trung vị view các video dài gần nhất của kênh đó (≥10 video, lấy bằng `--dump-json`). × = view / trung vị [tranh-luan 2026-11-24 mcp-mien-phi].
- Đề tài chỉ qua khi có ≥1 dòng × ≥3 [con-bit §1, buck §2].

## 4. Đo sau khi lên (cho kỳ xét 2026-12-31)
- Mốc 48 giờ và 7 ngày sau mỗi video dài và mỗi Short: ghi `out/do-luong/<kênh>-<slug>.md` (`<kênh>` = `conbit` hoặc `buck`) [tranh-luan 2026-11-24 mcp-mien-phi, owner 2026-11-24].
- Cột: ngày giờ đo, video/Short, view, Đã xem/Lướt qua (Short), nguồn Duyệt/Đề xuất/Tìm kiếm (video dài), % view theo nước, phút xem, giữ chân 0:30 (video dài), lượt xem video dài đến từ Short [tranh-luan 2026-11-24 mcp-mien-phi: thước đo các luật THỬ ở con-bit §5, buck §1 §2 §9 §12].
- Số lấy qua API chỉ đọc: Buck dùng `ytpub analytics` (nhánh `kenh-my-dang`, đừng gọi `load_creds()`); Con Bit chưa có lệnh analytics (nợ DEV ở `flow-con-bit.md`). Đã xem/Lướt qua và số chưa có API: mỗi tuần một agent Brave đọc trong YouTube Studio, CHỈ ĐỌC, không sửa, không gõ đăng nhập; mốc 48 giờ rơi giữa hai lần đọc thì để ô "chờ lượt đọc tuần" [chung §8 owner 2026-11-24, buck §12].
- Số đo không tự kích hoạt sửa video hay bài đã hẹn. Chỉ sửa qua dòng sửa ở chung §5 (trưởng kênh mở dòng sửa, agent soạn, agent khác kiểm). Số đo dùng cho kỳ xét luật THỬ 2026-12-31 [chung §5, owner 2026-11-24].

## 5. CHECKLIST (nguồn duy nhất; dán vào báo cáo, mỗi dòng ✔ hoặc ✘ + lý do)
**Y. YouTube (mỗi video dài / Short)**
- [ ] Đúng kênh (`channelId` của token = kênh của tập); không nhầm Con Bit ↔ Buck.
- [ ] Tiêu đề đúng luật kênh, độ dài đo bằng script (Con Bit dài: ≤60; Buck: ≤60; Short: khẳng định có số, đuôi `#Shorts`); khác hình dạng 3 tiêu đề gần nhất; mọi số có claim/nguồn.
- [ ] Mô tả đủ: tóm tắt, mục lục (dài), nguồn, link video dài (Short), hashtag (`#conbit<n>` cho Con Bit), dòng AI (Buck: + not advice).
- [ ] Ảnh bìa ≤4 từ, không lặp tiêu đề (Buck: không số, không tên hãng), 1280×720; video dài có 2–3 phương án cho Test & Compare.
- [ ] Short 30–45 s, móc giây đầu, outro đúng luật kênh.
- [ ] Con Bit Short: cầu nối Short→dài (beat cuối mở ý + thẻ chữ cuối, không đọc); lịch gắn Video liên quan trong 24 giờ sau khi Short lên.
- [ ] `private` + `publishAt` đúng giờ luật (Con Bit 19:30 +07; Buck 15:00Z / 20:00Z); video dài trước mọi Short.
- [ ] Công cụ upload có cờ `--publish-at` cho đúng loại video (xem nợ DEV trong `flow-<kênh>.md`); chưa có thì ✘, chỉ đi tiếp bằng script tạm đã ghi trong flow kênh.
- [ ] Không trùng ngày giờ với bài khác cùng kênh (≤1 Short/ngày); không cùng giờ với kênh kia.
- [ ] Đã tạo dòng trong `out/do-luong/<kênh>-<slug>.md` với mốc 48 giờ và 7 ngày.

**F. Facebook (mỗi bài)**
- [ ] Đúng page (Con Bit = bitstory168, Buck = followthebuck168), đúng file bản Facebook (có outro FB với video Con Bit và video dài Buck; Reel Buck không outro; không thẻ cầu nối YouTube).
- [ ] Caption theo mẫu kênh, có link YouTube, dòng AI, hashtag đúng.
- [ ] Giờ đúng luật, SAU YouTube cùng nội dung; page ≤3 bài/ngày, cách 15–20 phút.
- [ ] Hẹn giờ, không "Đăng ngay"; thấy bài trong "Đã lên lịch"; ghi `DA-DANG.md` "đã hẹn giờ".

**T. TikTok (chỉ Con Bit)**
- [ ] Tài khoản @chuyencuanhungconbit (không phải @battle.gun5).
- [ ] Chỉ Short phần 1–3; file có thẻ kết D42, không thẻ cầu nối YouTube; âm thanh chỉ giọng hoặc nhạc thư viện thương mại TikTok.
- [ ] Caption khuôn D43: dòng 1 `#conbit<n> <tiêu đề>` (n = tập nguồn), không "(Phần k/N)"; dòng AI; dòng theo dõi/link ở bio; câu hỏi là dòng chữ cuối; 3–4 hashtag; không URL, không nhắc YouTube, không xin like.
- [ ] Nhãn "Nội dung do AI tạo" bật, Mọi người xem, ảnh bìa tải lên.
- [ ] 18:00, SAU Short YouTube cùng nội dung, ≤1 bài/ngày, trong 10 ngày tới; hẹn giờ, không "Đăng ngay"; ghi `DA-DANG-TIKTOK.md`.
