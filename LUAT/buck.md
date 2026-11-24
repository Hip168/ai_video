# Luật kênh Follow the Buck (24/11/2026, sửa theo tranh luận mcp-mien-phi)

Kênh tiếng Anh cho khán giả Mỹ, ngách "the hidden economics of everyday American life". YouTube `UClykX046oc534Pk2kLxe2FQ`, page facebook.com/followthebuck168. KHÔNG có TikTok. Repo `~/Documents/AI_VIDEO_FLOW_STORY`, worktree `.worktrees/kenh-my-bible` (tập ở `channels/us-econ/episodes/<nn>-<slug>/`), công cụ đăng `ytpub` ở `channels/us-econ/publish` [memory us-econ-channel, youtube.json ep14].
`channels/us-econ/bible.md` vẫn là chuẩn hình (nhân vật, màu, font, khung, chuyển động); các dòng "no Shorts" và "team không đăng Facebook" trong đó đã cũ, theo file này [owner 24/11].

## 1. Nội dung và độ dài
- [2026-11-24] Video dài 10–15 phút; 2 tập kế nhắm 12–15 phút. (THỬ đến 2026-12-31; thước đo: phút xem mỗi video và tỉ lệ Đề xuất so với 3 tập trước; bỏ nếu: tổng phút xem không tăng, khi đó về 8–12) Nguồn: tranh luận 2026-11-24 mcp-mien-phi [thay "16:9, 8–12 phút" của bible.md; khung vẫn 16:9]
- Mỗi tập khác hẳn nhau, có nguồn thật, chống "inauthentic content": ≥1 bối cảnh mới so với 3 tập trước, ≥4 loại khung, khung mở khác tập trước, ≥5 nguồn khác nhau trên hình và trong mô tả, không dùng lại cùng một cảnh [bible §9, chien-luoc-kenh ƯT5].
- Hook 15 s đầu: khoảnh khắc đời thường + câu hỏi. Không chào kênh, không xin sub ở đầu [bible §2, chien-luoc-kenh ƯT3].
- Lời dẫn ngôi thứ hai, điềm tĩnh, câu ≤22 từ. Không "insane", "shocking", "you won't believe" [bible §2].
- Không khuyên đầu tư, thuế, pháp lý, y tế; không bảo người xem làm gì với tiền. Trung lập chính trị. Giọng không xưng chuyên gia tài chính [bible §2, chien-luoc-kenh ƯT5].
- Hình vẽ SVG trong code, không ảnh AI, không logo thật, không biếm hoạ người thật, tờ đô không giống tiền thật. Chỉ màu trong palette kênh [memory us-econ-channel, bible §3 §5, us-econ-ep14.test.ts].
- Không dùng chữ chỉ thời điểm tương đối như "this year" [us-econ-ep14.test.ts].
- Đề tài: evergreen "Why is X so expensive / Why do Americans…" là chính, trend có góc kinh tế thật [chien-luoc-kenh ƯT4, memory trend-topics].

## 2. Tiêu đề video dài
- Câu hỏi người Mỹ hay gõ tìm kết bằng "?", hoặc khung suy thoái theo luật THỬ bên dưới; ≤60 ký tự. Mẫu tốt: "Why Do Americans Tip?" [memory ftb-title-and-audience, us-econ-ep14.test.ts, tranh-luan 2026-11-24 mcp-mien-phi].
- [2026-11-24] Cho phép khung tiêu đề "How X Got So Bad" / "The Collapse of X" (không cần "?"), tối đa 1 trong 2 tập; đề tài là ngành ai cũng biết, sát một video lớn. (THỬ đến 2026-12-31; thước đo: view 7 ngày ≥3× trung vị video dài Buck; bỏ nếu: 2 tập đều <1×) Nguồn: tranh luận 2026-11-24 mcp-mien-phi
- [2026-11-24] 2 tập kế chọn đề tài bằng bảng outlier yt-dlp: có ≥1 video đối thủ ≥3× trung vị kênh đối thủ đó. Nguồn: tranh luận 2026-11-24 mcp-mien-phi
- Từ tập 7 cấm khuôn "Where Your … Actually Goes". Kiểm khác kiểu 3 tập gần nhất [memory ftb-title-and-audience].
- Viết 3 truy vấn video phải thắng, tiêu đề chứa từ của các truy vấn đó [chien-luoc-kenh ƯT3].
- 2–3 phương án cho Test & Compare [memory video-moi-chuan-tang-view].

## 3. Mô tả video dài (`publish.json`)
- Gồm: tóm tắt, điểm chính, dated notes (số liệu tính tới tháng nào), nguồn chính có link, `Previous episodes` (link tập trước), dòng credits (giọng Chatterbox MIT, font OFL, nhạc CC0), câu nhãn hiệu "not affiliated" khi nhắc công ty [publish.json ep14, buck8-long.txt].
- Bắt buộc có "voice is AI-generated" và "Not financial advice"; dưới 5.000 ký tự [us-econ-ep14.test.ts].
- `categoryId` 27, `defaultLanguage`/`defaultAudioLanguage` `en`, `madeForKids: false`, `containsSyntheticMedia: false`, 5–10 tags có "Follow the Buck" [publish.json ep14].

## 4. Ảnh bìa
- Tối đa 4 từ, không chữ số, không lặp tiêu đề, không tên thương hiệu/công ty, cùng chữ với `script.json` → `thumbnail_text`. Comment "at most 3 words" trong test là cũ; test kiểm ≤4 [us-econ-ep14.test.ts; chọn ≤4, owner 24/11].
- [2026-11-24] Ảnh bìa: 1 vật + mũi tên giá, không chữ số. Nguồn: tranh luận 2026-11-24 mcp-mien-phi
- Gợi tò mò cho nguồn Duyệt; 3 bản Remotion (`Thumbnail.tsx`) cùng ý khác bố cục/màu số tiền cho Test & Compare [hoc-tu-github-view §3].

## 5. Shorts
- Mỗi tập 3 Short (`short-01..03`) [youtube.json ep8–14, D43].
- Mỗi Short 30–45 s (trần cứng dưới 50 s), mở bằng câu hook riêng (`short-hooks.json`, beat `h00k`), đứng được một mình [memory video-moi-chuan-tang-view, us-econ-ep14.test.ts].
- Phụ đề in cứng trên Short; video dài không in phụ đề, chỉ CC `.srt` [memory us-econ-channel, bible §0 #4].
- Short kết bằng thẻ mustard "watch the full video", không đoạn kết like & sub (cả trên Facebook) [bible §13, memory facebook-outro].
- Tiêu đề Short: câu khẳng định có số, đúng sự thật, ≤100 ký tự, đuôi ` #Shorts`. Không lặp khuôn video dài [D43, short-01/publish.json ep14, memory ftb-title-and-audience].
- Mô tả Short: 1–2 câu số liệu, "Full video: <link video dài>", nguồn, dòng "The voice is AI-generated; not tax, financial or investment advice." Trước khi video dài có ID thì để `FULL_VIDEO_URL`, upload video dài xong mới điền [us-econ-ep14.test.ts, publish.json ep14 `_notes`].
- Gắn "Video liên quan" về video dài; ghi vào `out/follow-the-buck-shorts/GAN-VIDEO-LIEN-QUAN.md` [memory us-econ-channel].

## 6. Hashtag
- Facebook: dòng cuối `#FollowTheBuck #<chủ đề> #<chủ đề> #<chủ đề>` (4 thẻ) [buck8-long.txt, buck8-s1.txt].
- YouTube: tag "Follow the Buck" trong `tags`; Short có tag "Shorts" và đuôi `#Shorts` [publish.json ep14].

## 7. Facebook (page Follow the Buck)
- Video dài: bản Facebook có outro Like / Follow the page / Share (màu Denim, không Subscribe, không chuông), xuất bằng `export_facebook.py` [bible §13 Facebook cut].
- Reel: dùng file Short, không outro [bible §13, memory facebook-outro].
- Caption video dài: như mô tả YouTube rút gọn + "Watch on YouTube: <link>" + "Narration uses an AI-generated voice." + hashtag [buck8-long.txt].
- Caption Reel: tiêu đề → đoạn số liệu có nguồn → "Full breakdown: watch the full video on our page, or on YouTube: <link>" → "Our arithmetic. Not financial advice." → dòng AI → hashtag [buck8-s1.txt].
- Đội hẹn giờ qua Business Suite. Dòng "Nothing is posted to Facebook by the team" ở bible §13 đã cũ [D43, memory hen-gio-fb-tiktok].

## 8. Giờ và nhịp đăng (giờ Việt Nam)
- Video dài: 1 video/tuần, thứ Bảy 22:00 (= 15:00Z, 10:00 sáng miền Đông Mỹ) [lich-dang-2026-11, youtube.json ep9–14].
- Short (đang A/B giờ): Short 1 thứ Hai 22:00 (15:00Z), Short 2 thứ Tư 03:00 (20:00Z thứ Ba), Short 3 thứ Năm 22:00 (15:00Z) [memory video-moi-chuan-tang-view, youtube.json ep9–14].
- Xét lại A/B giờ Short giữa 12/2026 theo số liệu, không theo cảm tính [memory dang-ho-fb-tiktok-theo-lich, video-moi-chuan-tang-view].
- Facebook: video dài 22:30 hôm sau video dài YouTube; Reel 22:30 sau khi Short YouTube cùng nội dung đã lên (cùng ngày muộn hơn hoặc hôm sau) [lich-dang-2026-11, D43].
- Không đăng cùng giờ với Con Bit (chung tài khoản Google, tránh giống bot) [chien-luoc-kenh ƯT5].
- Không TikTok: chưa có tài khoản, TikTok phân phối theo khu vực máy đăng (VN), không đăng tiếng Anh vào @chuyencuanhungconbit [memory dang-ho-fb-tiktok-theo-lich, lich-dang-2026-11].

## 9. Âm thanh
- Giọng: Chatterbox bản gốc 0.5B, giọng nữ mặc định, không clone, không time-stretch (atempo); nghỉ 0,5 s giữa beat, 1,0 s giữa phần [bible §0 #7 #8].
- Mỗi beat kiểm bằng Whisper; WER > 0 thì tổng hợp lại với seed khác. Số 1900–2099 chỉ số lượng thì có dấu phẩy ("2,000 cups") [bible §12].
- Chatterbox chiếm ~22 GB RAM: chỉ tổng hợp lại beat đã đổi, không render song song lúc đang tổng hợp [tiep-theo bài học tập 5].
- -16 LUFS. Nhạc CC0 (vd "Reverence", Abstraction Music / Tallbeard) và ghi công trong mô tả, `CREDITS.md`, `assets/manifest.json` [bible §12, buck8-long.txt, AI_VIDEO_FLOW_STORY/CLAUDE.md].
- ElevenLabs chỉ khi kênh có doanh thu, gói Free cấm thương mại [memory us-econ-channel].
- [2026-11-24] Buck THỬ giọng Kokoro-82M trên 1 tập ngoài lịch đã hẹn, cạnh bản Chatterbox; làm lại outro.wav và facebook/outro.wav cùng giọng. (THỬ đến 2026-12-31; thước đo: thời gian dựng giọng giảm ≥50%, Whisper WER 0, giữ chân 0:30 ≥ trung vị 3 tập trước; bỏ nếu: trượt một ngưỡng hoặc chủ kênh nghe mù chọn Chatterbox) Nguồn: tranh luận 2026-11-24 mcp-mien-phi
- CHỜ CHỦ KÊNH: giữ Kokoro sau đợt THỬ. Tới khi chốt: Chatterbox vẫn là giọng chính của mọi tập trong lịch [tranh-luan 2026-11-24 mcp-mien-phi].

## 10. Fact
- Mọi số trên hình hoặc trong lời có nguồn có tên và ngày (BLS, FRED, Fed, BEA, Census, CMS, SEC 10-K/10-Q, báo cáo công ty, bài bình duyệt). Không nguồn thì cắt. Ước tính phải ghi "estimate" trong lời và trên hình. Con số tự tính ghi "by our math" [bible §2, buck8-long.txt].
- Source Stamp trên mọi khung có số; mô tả có link đầy đủ [bible §2 §7].
- Số liệu theo kỳ (CPI, BLS…) ghi rõ tính tới tháng nào; trang nguồn có thể đổi thì kiểm lại ngay trước khi upload [memory us-econ-channel, publish.json ep14 `_notes`].
- Mỗi tập có QC độc lập (`qc-epNN.md`, người làm không tự kiểm) [qc-ep14.md, memory proper-team-no-solo-fix].

## 11. Outro
- Video dài YouTube: outro like & subscribe 7,9 s, Buck vẫy cạnh hoá đơn, giọng dùng chung `outro/outro.wav`, không nút đỏ nhấp nháy [bible §13, memory us-econ-channel].
- Video dài Facebook: outro Facebook (Like / Follow / Share) [bible §13].
- Short (YouTube và Facebook): không outro [bible §13, memory facebook-outro].

## 12. Mốc kiểm
- Giữa 12/2026: có ≥1 video dài >1.000 view, hoặc >50% giờ xem từ nước nói tiếng Anh → giữ nhịp; không thì xem lại đề tài/tiêu đề trước khi đăng thêm. Số lấy bằng `ytpub analytics` (nhánh `kenh-my-dang`), chỉ đọc, đừng gọi `load_creds()` [memory ftb-title-and-audience, chien-luoc-kenh §4].
- Chưa mua máy chủ; không nói tới RPM/hoà vốn khi chưa chạy `ytpub analytics` lấy số mới [memory ftb-title-and-audience].
- [2026-11-24] Đo Short bằng Đã xem/Lướt qua và % view từ US/CA/GB/AU, không đo tổng view; câu móc Short dùng giá USD cụ thể của người hoặc chiêu thật. (THỬ đến 2026-12-31; thước đo: % view nước nói tiếng Anh ≥30%, hiện khoảng 20%; bỏ nếu: không tăng) Nguồn: tranh luận 2026-11-24 mcp-mien-phi
