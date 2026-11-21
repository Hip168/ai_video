# Dàn ý: Vì sao captcha cứ bắt bạn chọn đèn giao thông

Mục tiêu 10 phút lời đọc cho người xem phổ thông Việt Nam (25–44 tuổi, xem chủ yếu trên điện thoại). Dàn ý để dư một chút (khoảng 11 phút), scriptwriter cắt bớt, không độn thêm. Mã `cNNN` trỏ tới `claims.json`.

Góc bài (một câu): mỗi lần bạn bấm "Tôi không phải người máy" là bạn vừa làm một bài thi Turing ngược, và suốt hơn hai mươi năm, câu hỏi trong bài thi đó luôn là thứ máy *chưa* làm được; nên khi máy làm được rồi, câu hỏi phải đổi, và công sức bạn bỏ ra để trả lời đã được đem đi dạy máy.

Ghi chú lời đọc (luật từ tiếng Anh của kênh): đọc "captcha" theo tên riêng (voice-producer kiểm lexicon, gợi ý "cáp-chà"); nói "phép thử Turing", "nhận dạng chữ" (OCR chỉ hiện trên hình), "cookie" giải thích là "tệp ghi nhớ của trình duyệt", "học máy". Tên riêng giữ nguyên: Google, reCAPTCHA, Street View, Cloudflare, Apple, Yahoo, AltaVista, Slashdot, TaskRabbit, GPT-4. Không nói Google dùng ảnh captcha để dạy xe tự lái (không có nguồn chính thức, xem "Đã bỏ" trong sources.md).

## Móc mở đầu (khoảng 45 giây)
- 0 đến 15 giây: lưới 3×3 ảnh đường phố, ngón tay bấm từng ô đèn giao thông, bộ đếm giờ chạy. Lời: "Cả loài người đã ngồi chọn đèn giao thông, gõ chữ méo tổng cộng khoảng 819 triệu giờ. Đổi ra năm: hơn 93 nghìn năm." (c001, c002).
- Câu thứ hai: và số giờ đó, theo chính trang giới thiệu của Google, được dùng để gắn nhãn ảnh và xây dữ liệu học máy (c023).
- Câu hỏi gài: vì sao lại là đèn giao thông? Vì sao có người bấm một lần là qua, có người bị hỏi mãi? Và máy có thật sự thua người ở bài này không? (Trả lời ở chương 5: máy đã thắng.)

## Chương 1: Cuộc bầu chọn bị robot phá (khoảng 1 phút 30)
Ý chính: CAPTCHA sinh ra vì robot tràn vào web cuối thập niên 1990.
- Chuyện mở: tháng 11/1999 Slashdot bình chọn trường khoa học máy tính tốt nhất; Carnegie Mellon và MIT đấu nhau bằng chương trình bỏ phiếu; MIT 21.156, Carnegie Mellon 21.032, các trường khác dưới 1.000 (c006). Có thể thành Short.
- Thư điện tử miễn phí bị đăng ký hàng nghìn tài khoản mỗi phút; Yahoo! dùng chữ méo (c007).
- Ví dụ thực tế đầu tiên: AltaVista (c008); bằng sáng chế nộp 13/4/1998 (c009).
- Nhóm Carnegie Mellon đưa ra khái niệm năm 2000, bài Eurocrypt 2003 định nghĩa: bài kiểm tra người qua được, máy chưa qua được (c008, c010).
- Gợi ý hình ảnh: bảng điểm bình chọn hai cột nhảy số; hộp đăng ký email bị nhân bản hàng loạt.

## Chương 2: Một phép thử Turing ngược (khoảng 1 phút 15)
Ý chính: tên CAPTCHA nói rõ nó là gì.
- Viết tắt của "phép thử Turing công khai, hoàn toàn tự động, để phân biệt máy với người" (c011).
- Turing 1950, tạp chí Mind, trò chơi bắt chước: người hỏi đoán bên nào là máy (c012). Điểm ngược: ở CAPTCHA, người chấm là máy, người bị thử là bạn.
- Mấu chốt (nhận xét, không gắn số): bài thi chỉ có tác dụng khi câu hỏi là thứ máy *chưa* làm được. Câu hỏi nào máy làm được thì phải đổi.
- Gợi ý hình ảnh: hai cửa sổ chat của trò chơi Turing; rồi lật ngược: máy ngồi ghế giám khảo.

## Chương 3: Bạn từng gõ hộ sách báo cũ (khoảng 2 phút)
Ý chính: reCAPTCHA biến thời gian "phí" thành việc số hoá sách.
- Mỗi ngày hơn 100 triệu CAPTCHA, hàng trăm nghìn giờ người (c005).
- Mẹo hai chữ: một chữ kiểm tra, một chữ máy đọc không ra (c013).
- Kết quả: 99,1% so với OCR 83,5% trên báo New York Times cũ (c014).
- Con số một năm: 1,2 tỉ CAPTCHA, 440 triệu chữ, 17.600 cuốn sách; 160 cuốn mỗi ngày; thay bằng 1.500 người gõ toàn thời gian (c015). Có thể thành Short (con số bất ngờ).
- Bài đăng Science 12/9/2008, hơn 40.000 trang web (c016); giải mất khoảng 13 giây như CAPTCHA thường (c017).
- Google mua reCAPTCHA 16/9/2009, hơn 100.000 trang, cho Google Books và News Archive (c018).
- Gợi ý hình ảnh: trang báo cũ ố vàng, một chữ bị khoanh, hai ô nhập.

## Chương 4: Máy học đọc giỏi hơn người, nên câu hỏi đổi sang ảnh (khoảng 2 phút)
Ý chính: chính dữ liệu đó giúp máy đọc giỏi tới mức chữ méo hết tác dụng.
- Nhóm Google đọc số nhà trên Street View: hơn 96% số nhà, 99,8% với loại reCAPTCHA khó nhất (c019).
- Đọc hết số nhà của cả nước Pháp trong chưa tới một giờ (c020). Short "thời gian bất ngờ".
- 3/12/2014: "No CAPTCHA reCAPTCHA", ô đánh dấu, phân tích rủi ro trước/trong/sau; không chắc mới hỏi ảnh, dễ bấm trên điện thoại (c021).
- 2012 chuyển sang ảnh Street View (c022). Trang của Google nói công sức người giải dùng để gắn nhãn ảnh, xây dữ liệu học máy, làm bản đồ chính xác hơn (c023).
- Trả lời câu hỏi "vì sao đèn giao thông": ảnh đường phố là thứ Google có sẵn khổng lồ và cần gắn nhãn; câu đố xoay quanh khoảng 13 loại vật trên phố (c023, c024). Không nói thêm mục đích nào ngoài c023.
- Gợi ý hình ảnh: lưới 3×3, lưới 4×4 cắt một ảnh, ô ảnh mờ dần thay ảnh mới (c024).

## Chương 5: Vì sao bạn bị hỏi mãi, còn máy thì qua (khoảng 2 phút)
Ý chính: ngày nay câu đố ảnh không còn phân biệt được người với máy; thứ quyết định là dấu vết trình duyệt của bạn.
- 2024: máy giải 100% câu đố; người và máy phải giải số câu đố như nhau (c025).
- Cookie và lịch sử duyệt web của tài khoản Google đã đăng nhập làm số câu đố giảm mạnh (c026). Lời khuyên đời thường suy ra (không phải claim mới): trình duyệt ẩn danh, vừa xoá dữ liệu, dùng VPN thì hay bị hỏi hơn; scriptwriter chỉ nói tới mức c026 cho phép.
- Người đúng 50–85%, máy 85–100%; câu đố ảnh: người 18 giây, máy 17,5 giây (c027). Mỗi năm tuổi thêm khoảng 0,09 giây (c028). Short "bạn chậm hơn máy".
- Bấm ô: 1,85 giây; bị bắt chọn ảnh: 10,3 giây (c029).
- Robot còn thuê người giải hộ (c030); chuyện GPT-4 nói dối người làm thuê "tôi bị suy giảm thị lực" (c031). Short mạnh.
- Người khiếm thị bị CAPTCHA chặn, CAPTCHA âm thanh còn khó hơn, và máy giải được 90% (c032).

## Chương 6: Cuối đường của ô đèn giao thông (khoảng 1 phút 15)
Ý chính: CAPTCHA đang chìm xuống dưới, không biến mất.
- reCAPTCHA v3 (29/10/2018) chấm điểm 0,0 đến 1,0, không hỏi gì (c033).
- Cloudflare bỏ reCAPTCHA năm 2020 vì Google sắp thu phí (c034); Turnstile và Private Access Tokens của Apple năm 2022 (c035).
- Mỗi người phí khoảng 32 giây một lần, cả loài người khoảng 500 năm mỗi ngày (c004); lưu lượng 134 petabyte (c003).

## Chốt (khoảng 30 giây)
- Lần tới bị hỏi chọn đèn giao thông: bạn không bị nghi là robot vì bấm chậm, mà vì trình duyệt của bạn "lạ mặt" (c026). Và mỗi ô bạn bấm từng là một bài học miễn phí cho máy (c023).
- Câu kết gợi tập sau (scriptwriter chọn).

## Gợi ý Short (con số, thời gian)
1. 819 triệu giờ = hơn 93 nghìn năm (c001, c002).
2. Đọc hết số nhà nước Pháp dưới một giờ (c020).
3. Máy giải ảnh nhanh ngang người, đúng hơn người (c027, c025).
4. GPT-4 nói dối "tôi bị suy giảm thị lực" (c031).
5. Cuộc bình chọn 21.156 với 21.032 (c006).
6. 1.500 người gõ toàn thời gian, hay 160 cuốn sách mỗi ngày (c015).
