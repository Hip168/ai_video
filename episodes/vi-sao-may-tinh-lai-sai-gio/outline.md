# Dàn ý: Vì sao máy tính lại sai giờ (đồng hồ, múi giờ, giây nhuận)

Mục tiêu 10 đến 11 phút lời đọc cho người xem phổ thông Việt Nam. Tập 5 bị hụt dưới 9 phút, nên dàn ý này cố ý để dư: tổng các chương cộng lại khoảng 12 phút, tức nguyên liệu cho khoảng 1.900 đến 2.100 từ lời đọc. Scriptwriter có thể cắt bớt chứ không phải độn thêm. Mã `cNNN` trỏ tới `claims.json`.

Nối mạch: tập 1 máy chỉ có 0 và 1; tập 2 số thực cất không trọn; tập 3 số nguyên có trần (đã nói năm 2038 và tuần GPS, KHÔNG lặp lại ở đây, chỉ nhắc một câu); tập 4 nhầm đơn vị; tập 5 chữ là số theo một bảng tra. Tập 6: thời gian cũng chỉ là một con số, nhưng là con số mà cả thế giới phải đồng ý với nhau, và chính Trái Đất cũng không chạy đều.

Mạch "máy tính biểu diễn dữ liệu và lỗi sinh ra từ đó": máy cất giờ bằng một bộ đếm giây (dữ liệu); muốn đổi ra "giờ Hà Nội" thì cần thêm một bảng luật múi giờ (bảng tra, giống tập 5); và giây nhuận là chỗ con số và thực tế không khớp nhau.

Ghi chú lời đọc (theo luật từ tiếng Anh của kênh): nói "giây nhuận", "múi giờ", "chứng chỉ bảo mật", "giờ đơn điệu", "rải giây nhuận"; tên riêng như Cloudflare, Reddit, Google, Go giữ nguyên nhưng đừng phiên âm kiểu Việt hóa. Mã lỗi NET::ERR_CERT_DATE_INVALID chỉ hiện trên hình, không đọc.

## Móc mở đầu (khoảng 1 phút)
- Cảnh ai cũng gặp: mở điện thoại hay máy tính cũ lâu ngày không dùng, vào trang báo quen thì Chrome hiện "Đồng hồ của bạn bị chậm" (Your clock is behind) và không cho vào. Theo Google, nguyên nhân là ngày giờ trên máy sai; cách sửa là chỉnh lại đồng hồ (c001).
- Vì sao giờ sai lại chặn được cả trang web? Mỗi trang web có "chứng chỉ bảo mật" ghi hai mốc: bắt đầu có hiệu lực và hết hiệu lực (c002). Chứng chỉ phổ biến nhất (Let's Encrypt) mặc định chỉ sống 90 ngày (c003). Máy tưởng hôm nay là năm 2015 thì chứng chỉ cấp năm 2026 "chưa tới ngày", bị từ chối (c004, phép tính minh họa).
- Câu hỏi gài: máy tính biết bây giờ là mấy giờ bằng cách nào? Và tại sao thứ tưởng đơn giản nhất là "bây giờ là mấy giờ" lại làm sập cả hãng hàng không và một phần Internet?
- Gợi ý hình ảnh: ổ khóa trang web có hai cái nhãn ngày tháng; đồng hồ trên máy chỉ năm 2015.

## Chương 1: Một viên đá rung 32.768 lần mỗi giây (khoảng 1 phút 45)
Ý chính: bên trong máy có một đồng hồ thật sự, nhưng nó chỉ là một cái máy đếm nhịp, và đếm thì luôn lệch dần.
- Tinh thể thạch anh trong đồng hồ đeo tay, và trong máy tính, thường rung 32.768 lần mỗi giây; mạch điện đếm đủ 32.768 nhịp thì tính là một giây (c005).
- Vì sao lại là con số lẻ như vậy? 32.768 = 2 mũ 15: chia đôi 15 lần là ra đúng 1 nhịp một giây (c006). Nối tập 1: lại là hệ nhị phân, chia đôi là việc dễ nhất với mạch điện.
- Nhưng đá nào cũng rung hơi sai. NIST lấy ví dụ: lệch 0,1 Hz thì cứ 327.680 giây sai một giây, khoảng 0,26 giây một ngày (c007). Không nhiều, nhưng để cả năm là lệch vài chục giây (phép tính: 0,26 × 365 ≈ 95 giây, scriptwriter nói rõ đây là phép tính trên ví dụ của NIST, không phải con số của mọi máy).
- Muốn chuẩn thì phải hỏi một chiếc đồng hồ tốt hơn: từ 1967, một giây được định nghĩa bằng 9.192.631.770 chu kỳ bức xạ của nguyên tử xêsi-133 (c008).
- Gợi ý hình ảnh: viên thạch anh rung, bộ đếm 15 nấc chia đôi; so sánh "đồng hồ đá" với "đồng hồ nguyên tử".

## Chương 2: Hỏi giờ qua mạng, và cái mốc năm 1970 (khoảng 1 phút 45)
Ý chính: máy tự sửa giờ bằng cách hỏi máy chủ giờ; còn bên trong, "giờ" chỉ là một con số giây đếm từ một mốc.
- Điện thoại Android mặc định tự lấy giờ từ hai nguồn: máy chủ giờ qua giao thức NTP và tín hiệu NITZ của mạng di động, ưu tiên NTP (c009). Nói rõ đây là tài liệu Android; KHÔNG khẳng định iPhone làm giống hệt.
- NTP ra đời năm 1985, RFC 958 của David Mills (c010). Bản 4 (RFC 5905, 2010): máy chủ gốc chính xác tới vài chục micro giây, trong mạng nội bộ vài trăm micro giây (c011).
- Giờ trong máy là một con số: chuẩn POSIX lấy mốc 0 giờ UTC ngày 1/1/1970 (c013). Ví dụ: 7 giờ sáng hôm nay 20/11/2026 giờ Việt Nam là số 1.795.132.800 (c015, phép tính). Một câu nối tập 3: bộ đếm này từng được nói tới ở chuyện năm 2038; NTP cũng có mốc riêng, 1/1/1900, và quay vòng vào ngày 8/2/2036 (c012). Không đào sâu phần tràn số.
- Chuyện nhỏ: năm 2016 Apple thừa nhận chỉnh tay ngày iPhone về tháng 5/1970 hoặc sớm hơn có thể làm máy không khởi động lại được (c016). KHÔNG nói nguyên nhân (Apple không nêu; giả thuyết "tràn số âm" chỉ là suy đoán của người ngoài). Chỉ dùng như ví dụ "mốc 0 nguy hiểm", và nhắc người xem đừng thử.
- Gợi ý hình ảnh: điện thoại hỏi "mấy giờ rồi?" lên máy chủ; một dãy số giây chạy liên tục.

## Chương 3: Con số giống nhau, giờ khác nhau: múi giờ của Việt Nam (khoảng 2 phút)
Ý chính: con số giây là chung cho cả thế giới; muốn ra "giờ Hà Nội" thì máy phải tra một bảng luật, và bảng đó chứa cả lịch sử chính trị. Đây là phần "gần Việt Nam" nhất của tập.
- Năm 1906, Đông Dương lấy giờ theo đài thiên văn Phù Liễn ở Hải Phòng, nhanh hơn Greenwich 7 giờ 6 phút 30 giây; năm 1911 làm tròn thành UTC+7 (c017).
- Chiến tranh đổi cả đồng hồ: cuối 1942 sang UTC+8; tháng 3/1945 sang giờ Nhật UTC+9; rồi từ 24 giờ ngày 1/9/1945, theo Việt Nam Dân Quốc Công Báo số 1, Việt Nam lùi về UTC+7 (c018). Lưu ý: tzdb dẫn công báo; câu "ngay sau Tuyên ngôn Độc lập" là nối mốc thời gian, scriptwriter nói cẩn thận, không nói "Bác Hồ ra lệnh đổi giờ".
- Sau 1945 còn đổi tiếp: 1947 vùng do Pháp kiểm soát sang UTC+8; giữa 1955 miền Nam lùi về UTC+7 (c037).
- Hai miền hai giờ: từ đêm 31/12/1959, theo sắc lệnh 362-TTP, miền Nam vặn nhanh 1 giờ sang UTC+8 (c019). Ngày 13/6/1975 cả nước dùng chung UTC+7, Sài Gòn vặn chậm 1 giờ (c020).
- Vì vậy máy tính muốn biết "8 giờ sáng ở Sài Gòn năm 1970" là mấy giờ UTC thì phải biết cả lịch sử này. Cơ sở dữ liệu múi giờ của IANA ghi chính "lịch sử giờ địa phương" cho các nơi trên thế giới; điện thoại nhận bản cập nhật qua hệ điều hành; bản mới nhất 2026f ra ngày 27/10/2026 (c021).
- Ví dụ quốc tế, cực đoan: Samoa bỏ hẳn thứ Sáu 30/12/2011, từ thứ Năm nhảy sang thứ Bảy, chuyển từ UTC−11 sang UTC+13 để khớp với New Zealand và Úc (c022). Mọi phần mềm lịch phải biết điều này, nếu không sẽ tính sai một ngày.
- Gợi ý hình ảnh: bản đồ Việt Nam hai màu giờ trước 1975; cuốn lịch Samoa bị xé mất một tờ.

## Chương 4: Cuốn sổ múi giờ của cả thế giới suýt bị kiện mất (khoảng 1 phút 30)
Ý chính: bảng luật múi giờ mà mọi điện thoại dùng chỉ do một nhóm nhỏ tình nguyện viên giữ, và nó từng bị đe dọa.
- Gần ba thập kỷ, cơ sở dữ liệu được nhóm tình nguyện duy trì, người điều phối là Arthur David Olson ở Viện Y tế Quốc gia Mỹ (c023).
- Ngày 30/9/2011, Astrolabe, một công ty phần mềm chiêm tinh, kiện Olson và Paul Eggert vì cho rằng dữ liệu lấy từ một cuốn atlas mà họ giữ bản quyền (c023, c024). Tháng 10/2011 ICANN nhận vận hành cơ sở dữ liệu theo đề nghị của IETF (c023).
- Tháng 2/2012, vụ kiện bị rút; Astrolabe xin lỗi. Câu chốt của luật sư EFF: "sự thật không có bản quyền" (c024).
- Sau đó RFC 6557 (2/2012) ghi lại luật chơi: một người điều phối có người dự phòng, và người điều phối không được tự quyết giờ của một vùng, chỉ ghi lại giờ người dân nơi đó dùng (c025).
- Gợi ý hình ảnh: một cuốn sổ mở, nhiều người góp từng dòng; con dấu tòa án.

## Chương 5: Khi một phút có 61 giây (khoảng 2 phút 15)
Ý chính: Trái Đất quay không đều, nên thỉnh thoảng thế giới chèn thêm một giây; nhiều phần mềm tin rằng chuyện đó không thể xảy ra, và chúng sập.
- Đồng hồ nguyên tử chạy đều, Trái Đất thì không. Giây nhuận giữ độ lệch giữa hai loại giờ dưới 0,9 giây; được chèn vào cuối tháng 6 hoặc cuối tháng 12, giây đó ghi là 23 giờ 59 phút 60 giây (c026). Hình ảnh mạnh: đồng hồ chỉ 23:59:60.
- Từ 1972 đến nay đã chèn 27 lần; lần gần nhất là đêm 31/12/2016 (c027). Bản tin mới nhất của IERS: không có giây nhuận cuối năm 2026 (c028). Theo giờ Việt Nam, giây nhuận rơi vào 6 giờ 59 phút 60 giây sáng (phép tính UTC+7; scriptwriter ghi rõ là phép tính).
- Trong khi đó chuẩn POSIX coi mỗi ngày đúng 86.400 giây (c014): bộ đếm giây không có chỗ cho giây thứ 60. Đây là gốc của lỗi.
- Câu chuyện 1, 30/6/2012: hệ thống đặt chỗ Altea của Amadeus ngừng khoảng một giờ, Qantas và Virgin Australia phải làm thủ tục cho khách bằng tay; Amadeus đổ cho một lỗi trong nhân Linux bị giây nhuận kích hoạt (c029). Cùng đêm đó Reddit không vào được khoảng 30 đến 40 phút (c030).
- Câu chuyện 2, 1/1/2017 (đúng 7 giờ sáng ngày đầu năm ở Việt Nam): mã DNS của Cloudflare tin rằng thời gian không thể chạy lùi; một phép đo ra số âm, hàm của Go gặp số âm thì dừng hẳn; lúc cao điểm khoảng 0,2% truy vấn DNS bị lỗi, đến 6 giờ 45 UTC mới sửa xong toàn cầu (c031). Kết của chuyện: tháng 8/2017, Go 1.9 thêm "giờ đơn điệu", loại giờ chỉ chạy tới, để đo khoảng thời gian an toàn (c032).
- Bài học nhỏ cho người xem: "giờ trên đồng hồ" và "thời gian đã trôi qua" là hai thứ khác nhau.
- Gợi ý hình ảnh: phút có 61 ô; đồ thị thời gian đo được rơi xuống dưới 0.

## Chương 6: Rải giây nhuận, bỏ giây nhuận, và giây nhuận âm (khoảng 1 phút 30)
Ý chính: các hãng lớn tìm cách né, rồi cả thế giới quyết định bỏ, nhưng Trái Đất lại đặt ra bài toán mới.
- Cách né: từ 2008 Google không chèn đột ngột mà "rải" giây nhuận ra trong nhiều giờ; chuẩn hiện nay là 24 giờ, mỗi giây dài thêm khoảng 11,6 micro giây (c033). Meta rải trong 17 giờ (c034). Hình ảnh: kéo giãn một sợi dây thay vì thắt một nút.
- Năm 2022, Đại hội Cân đo Quốc tế quyết định nâng mức lệch cho phép "trong hoặc trước năm 2035", tức thực tế là ngừng thêm giây nhuận (c035).
- Bước ngoặt: gần đây Trái Đất quay hơi nhanh lên. Nghiên cứu của Duncan Agnew trên Nature (3/2024): có thể cần một giây nhuận ÂM, tức bớt một giây, vào cuối thập niên 2020; băng tan ở hai cực đã làm mốc này lùi khoảng ba năm; việc bớt giây chưa từng xảy ra (c036). Nghị quyết 2022 cũng lo đúng điều này: giây nhuận âm "chưa từng được tính trước hay thử nghiệm" (c035).
- Nói năm cẩn thận: thông cáo UCSD ghi 2028, báo PBS ghi khoảng 2029; dùng "cuối thập niên 2020", KHÔNG nêu một năm cụ thể.
- Gợi ý hình ảnh: Trái Đất quay, đồng hồ nguyên tử bên cạnh; một phút chỉ có 59 ô.

## Chốt (khoảng 45 giây)
- Tóm lại ba tầng: viên đá đếm nhịp (Chương 1), con số giây và máy chủ giờ (Chương 2), bảng luật múi giờ mang cả lịch sử (Chương 3–4), và Trái Đất không chạy đều (Chương 5–6).
- Mẹo thực dụng: gặp lỗi "đồng hồ bị chậm" thì bật "đặt giờ tự động" trước khi nghĩ tới chuyện trang web hỏng (c001, c009).
- Câu hỏi cho người xem: ông bà, bố mẹ bạn có nhớ ngày Sài Gòn vặn đồng hồ chậm lại một giờ năm 1975 không? (c020)
- Nối tập sau (gợi ý, không phải nội dung): ảnh gửi qua lại nhiều lần thì "rỗ" dần, vì sao.

## Ghi chú cho scriptwriter
- Mọi phép tính (c004, c006, c015, đổi giờ UTC+7, 0,26 × 365) phải nói là "làm phép tính", không nói là số liệu chính thức.
- Lịch sử giờ Việt Nam (c017–c020, c037) chủ yếu dựa vào tzdb, nguồn này dẫn lại sách của Trần Tiến Bình và các số công báo; riêng mốc 1959 và 1975 có thêm báo Việt. Đừng thêm chi tiết ngoài claim, ví dụ ai ký quyết định năm 1975.
- Không nói số hiệu văn bản năm 2002 về múi giờ: báo Tiền Phong ghi "132/2002/QĐ-TTg", nhưng kết quả tìm kiếm cho thấy văn bản đúng có thể là 134/2002/QĐ-TTg (trang bị chặn, chưa mở được).
- Không nói Windows và Linux lệch 7 tiếng khi cài song song: chưa có nguồn chính thức (xem sources.md).
- Chuyện năm 2038 và tuần GPS đã nói ở tập 3: chỉ nhắc một câu, không lặp lại số liệu.

## Sáu đoạn cắt Short (mỗi đoạn tự đứng được, khoảng 60 đến 90 giây, một ý, một chuyện nhỏ)
1. S1 "Vì sao Chrome bảo đồng hồ của bạn bị chậm": móc mở đầu, c001–c004. Ý: chứng chỉ có ngày bắt đầu và ngày hết hạn, máy sai giờ thì chặn cả trang đúng. Kết bằng mẹo bật giờ tự động.
2. S2 "Con số 32.768 trong đồng hồ của bạn": Chương 1, c005–c008. Ý: 2 mũ 15, chia đôi 15 lần ra một giây; đá rung lệch thì đồng hồ lệch.
3. S3 "Ngày Sài Gòn vặn đồng hồ chậm một giờ": Chương 3, c017–c020, c037. Ý: trước 1975 hai miền hai giờ; theo tzdb, giờ ở Sài Gòn đổi 9 lần từ 1906 đến 1975 (c037, phép đếm). (Đây là Short "gần Việt Nam" nên đăng sớm.)
4. S4 "Đất nước bỏ hẳn một ngày": Chương 3 đoạn Samoa, c022, c021. Ý: thứ Năm nhảy sang thứ Bảy; phần mềm phải tra bảng múi giờ mới biết.
5. S5 "Khi một phút có 61 giây": Chương 5, c026, c027, c029, c030. Ý: 23:59:60 làm sập hãng bay và Reddit năm 2012.
6. S6 "Lỗi vì tin rằng thời gian không chạy lùi": Chương 5 đoạn Cloudflare, c031, c032, c014. Ý: số âm từ đồng hồ; bài học "giờ đơn điệu".
Dự phòng: "Cuốn sổ múi giờ bị kiện" (Chương 4, c023–c025) hoặc "Giây nhuận âm" (Chương 6, c033–c036) nếu cần đổi một Short.
