# Luật kênh Con Bit (24/11/2026)

Kênh "Chuyện Của Những Con Bit": fact tin học tiếng Việt, đào sâu một chủ đề. YouTube @bitstory168 (`UC1aPohYcigcmBGPl7OlQaEw`, `.team/kenh.json`), page facebook.com/bitstory168, TikTok @chuyencuanhungconbit, link-in-bio https://chuyenconbit.vercel.app [D31, memory tiktok-con-bit, conbit-hashtag-d35].

## 1. Nội dung và độ dài
- Một chủ đề, đào sâu, khoảng 10 phút (mục tiêu 9–11 phút lời đọc). Không kéo dài bằng thẻ chương im lặng, chỉnh bằng `pause_ms` [memory youtube-fact-channel, PLAYBOOK 4.1, tiep-theo bài học tập 5].
- Evergreen khoảng 80%, trend khoảng 20% khi có góc tin học thật và ra kịp 3–7 ngày [chien-luoc-kenh ƯT4, memory trend-topics].
- 15 giây đầu: xác nhận lời hứa của tiêu đề, mở một câu hỏi. Không chào kênh, không xin sub ở đầu [chien-luoc-kenh ƯT3].
- Số tập `<n>` = thứ tự trong `episodes/index.json` [D35].

## 2. Tiêu đề video dài
- ≤60 ký tự (trần cứng 100), ý chính trong 40 ký tự đầu, có từ khoá người Việt gõ tìm [chien-luoc-kenh ƯT3, episodes/roles/packager.md].
- Nói đúng điều người xem biết sau video. Không "bạn sẽ sốc", "bạn sẽ không tin" [packager.md, memory video-moi-chuan-tang-view].
- Không lặp khuôn "Vì sao…" ở mọi tập; 10 tiêu đề gần nhất phải có hình dạng khác nhau [chien-luoc-kenh ƯT4].
- Mọi số, tên, năm trong tiêu đề phải có trong lời chốt và claim `DAT` [packager.md].
- Viết 2–3 phương án để chạy Test & Compare [memory video-moi-chuan-tang-view].

## 3. Mô tả video dài (`publish.json`)
- Thứ tự: 2–3 câu tóm tắt đúng nội dung → `Mục lục:` lấy nguyên `chapters.txt` (dòng đầu `00:00`) → `Nguồn chính:` (từ `sources.md`) → dòng ghi công nhạc → `#conbit<n>` → dòng cuối "Giọng đọc trong video do AI tạo." [packager.md, D21, publish.json tập 8].
- `tags` 5–10 từ khoá. `containsSyntheticMedia: false`. `privacy: public` (kênh đã duyệt video đầu). `channelId` đúng `.team/kenh.json` [packager.md, D31].
- Không nhắc tổ chức hay thương hiệu ngoài kênh [packager.md].

## 4. Ảnh bìa
- 1280×720, một ý một hình, chữ tối đa 4 từ, tương phản cao, không lặp chữ của tiêu đề [packager.md; chọn ≤4 thay "≤3" của chien-luoc, owner 24/11].
- Hình do code dựng, khớp hình có trong video. Không ảnh bản quyền, không ảnh AI [packager.md, hoc-tu-github-view §2].
- 2–3 ảnh bìa cho Test & Compare khi có [memory video-moi-chuan-tang-view].

## 5. YouTube Shorts
- Từ tập 7: mỗi tập đúng 3 Short. Tập 6 đã làm 6 Short thì giữ [D43].
- Mỗi Short 30–45 s. Câu móc nói ngay giây đầu; ưu tiên beat mở bằng câu hỏi hoặc sự thật gây bất ngờ. Short phải đứng được một mình [D43, hoc-tu-github-view §3, chien-luoc-kenh §2].
- Short chỉ dùng beat có sẵn của tập. `hook` là chữ trên màn hình, không đọc [D32 MỞ-3].
- Khung 1080×1920 toàn màn hình, chừa lề nhỏ. Ngưỡng chữ: 30 px thường, 25 px nhãn cạnh, 48 px phụ đề [D37, D32 MỞ-2].
- Tiêu đề Short: câu khẳng định có con số, đúng sự thật, có beat làm căn cứ. Bớt kiểu "Vì sao…?" [D43, memory video-moi-chuan-tang-view].
- Tiêu đề YouTube do lệnh ghép: `<title> (Phần k/N) #Shorts`. Mô tả: hook, "Xem bản đầy đủ: <link video dài>", `#Shorts`, dòng AI [audio/src/aivideo/upload.py `short_body`, D33].
- CHỜ CHỦ KÊNH: bỏ "(Phần k/N)" khỏi tiêu đề Short YouTube như chien-luoc đề xuất? Hiện giữ [chien-luoc-kenh ƯT1, hoc-tu-github-view §6].
- CHỜ CHỦ KÊNH: 9 tiêu đề Short 23–30/11 thay thế (hoc-tu-github-view §6) chưa chọn; giữ nguyên tiêu đề đã hẹn [memory video-moi-chuan-tang-view].
- Gắn "Video liên quan" về video dài cho mọi Short [D33, tiep-theo].

## 6. Hashtag
- YouTube video dài: dòng `#conbit<n>` trong mô tả [publish.json tập 8, memory conbit-hashtag-d35].
- Facebook: dòng cuối `#conbit<n> #conbit #tinhoc #<chủ đề>` [caption-cho-dang cb7-*.txt].
- TikTok: dòng 1 mở bằng `#conbit<n>`; dòng hashtag cuối đúng 3–4 thẻ `#conbit<n> #conbit #<chủ đề>` (+ `#hoccungtiktok` nếu muốn). Không `#LearnOnTikTok`, không `#1` trần [D43, D35].
- CHỜ CHỦ KÊNH: có đặt `#conbit<n>` ở ĐẦU tiêu đề/caption YouTube và Facebook không (24/11 chủ kênh nói "phải có #conbit ở đầu… cả youtube cả facebook cả tiktok")? Tới khi chốt: TikTok ở đầu, YT/FB ở dòng hashtag [memory conbit-hashtag-d35].

## 7. Caption TikTok (khuôn D43, thay D35 lần 3)
Theo thứ tự, các đoạn cách nhau một dòng trống [D43]:
1. `#conbit<n> <tiêu đề>`. Không ghi "(Phần k/N)". `<n>` là số tập NGUỒN, kể cả clip lấy từ tập cũ.
2. Đoạn mở (lấy từ `shorts.json` → `tiktok.intro`).
3. "Giọng đọc trong video do AI tạo."
4. "Theo dõi để xem phần tiếp." Bài cuối trong phần 1–3 thì thay bằng "Các phần còn lại và bản đầy đủ: link ở bio nha."
5. Câu hỏi mời bình luận. Đây là dòng chữ CUỐI.
6. Dòng hashtag 3–4 thẻ (mục 6).
- Không URL, không nhắc YouTube, không xin like. Link chỉ ở bio (chuyenconbit.vercel.app) [D43, D35, memory conbit-hashtag-d35].
- Lệnh `aivideo.shorts export` còn sinh caption khuôn cũ (D35 lần 3): phải viết lại tay theo khuôn trên trước khi hẹn, tới khi DEV sửa `tiktok_caption()` [audio/src/aivideo/shorts.py:241, owner 24/11].

## 8. TikTok khác
- Chỉ dùng Short phần 1–3 của tập. Không tạo clip "TikTok thêm" mới; clip thêm đã hẹn thì giữ [D43, memory tiktok-con-bit 22/11].
- Mỗi phần TikTok (tập ≥5) có thẻ kết chữ 2,5 s "Xem full tại diu tiu bé @bitstory168". Không viết tên nền tảng kia bằng chữ thật ở đâu trong file TikTok, không logo, không đọc [D42].
- Đăng/hẹn bằng tài khoản @chuyencuanhungconbit. Gặp @battle.gun5 (acc game) thì DỪNG, nhờ chủ kênh chuyển [memory tiktok-con-bit].
- Bật "Nội dung do AI tạo", quyền xem Mọi người, ảnh bìa tải lên từ file làm sẵn [memory tiktok-con-bit, out/tiktok-dang/HUONG-DAN.md].
- Không chạy `aivideo.tiktok post` (đăng bằng cookie). Đăng qua TikTok Studio trên Brave [D39, D43].

## 9. Facebook (page Con Bit)
- Mọi video dài và mọi Short xuất thêm bản Facebook có đoạn kết Facebook (Thích, Theo dõi, Chia sẻ; #0866FF; không "Đăng ký", không chuông) [D41].
- Caption video dài: tiêu đề → tóm tắt → gạch đầu dòng nội dung → `Mục lục:` → "Danh sách nguồn đầy đủ ở phần mô tả trên YouTube." → "Xem trên YouTube: <link>" → dòng AI → hashtag [caption-cho-dang cb7-long.txt].
- Caption Reel: tiêu đề → 1 đoạn → "Bản đầy đủ: <link YouTube>" → dòng AI → hashtag [caption-cho-dang cb7-s1.txt].
- Link YouTube để trong thân caption FB [HANG-CHO-22-11-den-11-12.md].

## 10. Giờ và nhịp đăng (giờ Việt Nam)
- Video dài YouTube: 1 video/tuần, thứ Bảy 19:30 [D43, lich-dang-2026-11].
- Short YouTube: 19:30, từ ngày sau video dài, tối đa 1 Short/ngày, rải trong tuần (mẫu tập 8: CN, T3, T5) [lich-dang-2026-11, chien-luoc-kenh ƯT1].
- Không đăng Short trong 23:00–07:00. Khung chính 19:30–21:30, khung phụ 09:30–12:00 [memory conbit-analytics-gio-dang].
- Facebook: video dài 20:30 hôm sau video dài YouTube; Reel 12:00 hôm sau Short YouTube cùng nội dung [lich-dang-2026-11].
- TikTok: 18:00 hôm sau Short YouTube cùng nội dung, tối đa 1 bài/ngày [lich-dang-2026-11, D43].
- Xét lại nhịp và giờ theo tỉ lệ Đã xem/Lướt qua giữa 12/2026 [memory video-moi-chuan-tang-view].

## 11. Âm thanh và nhạc
- Loudness -16 LUFS, true peak ≤ -1,5 dBTP, ±1 LU. Không nới ngưỡng [D5, D17].
- Nhạc: YouTube Audio Library "Attribution not required" hoặc Tallbeard CC0; ghi nguồn, giấy phép, sha256 trong `assets/audio/manifest.json`. Không nhạc AI, không tải hàng loạt [D17].
- TikTok: 23/11 TikTok cảnh cáo âm thanh clip-02 (đã xoá, không đăng lại). Từ nay bản TikTok xuất mới chỉ có giọng đọc (tắt nhạc nền, cả ở thẻ kết), hoặc chỉ dùng nhạc từ thư viện thương mại của TikTok [owner 24/11, lich-dang-2026-11].

## 12. Fact
- Mọi số, năm, tên riêng trong lời đọc phải có claim `DAT` (Cổng 1, 2). Claim số cần nguồn `primary` hoặc hai nguồn khác tên miền; nguồn chỉ `anecdotal` thì không qua [PLAYBOOK §3, doi-san-xuat §3].
- Fact-checker mù với kịch bản; nguồn lỗi hoặc hết giờ thì `CHUA_KIEM`, không phải `DAT` [doi-san-xuat §3].
- Sửa lời sau Cổng 2 thì qua lại khâu 5, 6 và các khâu sau [PLAYBOOK §3].
- Caption, tiêu đề, mô tả không thêm số hay so sánh ngoài kịch bản chốt [packager.md, HUONG-DAN.md TikTok].

## 13. Giọng và phát âm
- Từ tập 3: VieNeu giọng "Thiện Minh", speed 1.0, chỉnh độ dài bằng `pause_ms` [D40].
- Từ tiếng Anh: ưu tiên nói nghĩa tiếng Việt ("false" → "sai"), chữ Anh chỉ hiện trên màn hình, kiểu "pound-force (cân Anh lực)". Không phiên âm kiểu "phôn sơ" [memory english-words-pronunciation, tiep-theo tập 4].
- Bắt buộc đọc tiếng Anh thì phải qua `phatam check`; có chỗ không đạt thì không đăng [memory english-words-pronunciation, PLAYBOOK khâu 8].
- Nghe lại âm đầu câu sau khi dựng giọng [tiep-theo tập 4].

## 14. Outro
- Video dài YouTube: đoạn kết thích + đăng ký 6 s, lời tiếng Việt ("bấm thích", "đăng ký kênh"), `meta.outro: true` [D38, D40].
- Short YouTube: gắn đoạn kết ở phần 3 và phần 6; tập ít hơn 6 phần thì phần cuối (tập 3 Short: phần 3) [D38, D43].
- Bản Facebook: mọi video (dài và mọi Short) gắn đoạn kết Facebook [D41].
- Bản TikTok: không đoạn kết thích/đăng ký; chỉ thẻ kết D42 [D38, D42].
