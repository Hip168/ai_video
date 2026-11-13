# Dàn ý: Con tàu Sao Hỏa mất tích vì nhầm đơn vị (Mars Climate Orbiter, 1999)

Mục tiêu 10 đến 12 phút lời đọc (khoảng 1.600 đến 1.850 từ), người xem phổ thông. Mỗi fact ghi kèm mã claim trong `claims.json`.

Nối từ ba tập trước: tập 1 nói máy chỉ có 0 và 1; tập 2 nói số lẻ không cất trọn được; tập 3 nói số nguyên có trần. Tập này: ngay cả khi con số đúng hoàn toàn, máy vẫn có thể sai, vì máy chỉ cất con số, không cất "đơn vị" đi kèm.

Luật kênh áp dụng ngay từ dàn ý:
- Lời đọc nói nghĩa tiếng Việt; chữ tiếng Anh (AMD, SM_FORCES, SIS, TCM, newton-giây, lbf·s) chỉ hiện trên màn hình. Gợi ý cách gọi: "tàu quỹ đạo khí hậu Sao Hỏa", "pao lực" (pound-force), "niu-tơn" (newton, tên riêng nên đọc theo phiên âm quen dùng ở trường Việt Nam), "phòng thí nghiệm Sức đẩy Phản lực" (JPL), "hãng Lockheed Martin" (tên riêng, chỉ nhắc một hai lần).
- Mỗi thuật ngữ được giải thích bằng hình ảnh đời thường TRƯỚC khi dùng (đơn vị, lực, xung lực, bánh đà, quỹ đạo, điểm thấp nhất của quỹ đạo).
- Kể nguyên nhân trước, hậu quả sau (chương 3 và 4 là nguyên nhân; chương 5 là hậu quả). Móc mở đầu chỉ hé hậu quả, không kể chi tiết.
- Mỗi chương tối đa hai ba mốc ngày; các mốc dồn dày nhất (ngày đến Sao Hỏa) được tách riêng thành chương 5.

## Móc mở đầu (khoảng 50 giây)
- Rạng sáng 23 tháng 9 năm 1999 (giờ Mỹ), con tàu bay vòng ra sau Sao Hỏa đúng kế hoạch, và mất tín hiệu sớm hơn dự kiến 49 giây. Tín hiệu không bao giờ trở lại (c016, c017).
- Không có vụ nổ, không có hỏng hóc phần cứng: mọi hệ thống trên tàu vẫn chạy bình thường đến lúc mất tín hiệu (c016).
- Câu hỏi gài: một con tàu trị giá cả trăm triệu đô, bay 9 tháng rưỡi qua hàng trăm triệu ki-lô-mét, mất tích vì thứ mà học sinh cấp hai nào cũng từng bị trừ điểm: quên đổi đơn vị (c001, c007). Hứa: video sẽ chỉ ra con số sai nằm ở file nào, vì sao chín tháng không ai bắt được, và lập trình viên ngày nay chống lại nó ra sao.

## Chương 1: Máy tính chỉ cất con số, không cất đơn vị (khoảng 1 phút 45)
Ý chính: "4,45" hay "1" chỉ có nghĩa khi đi kèm đơn vị; trong máy, đơn vị thường không được lưu cùng con số.
- Hình ảnh mở: mẹ dặn mua "2" thịt; 2 lạng hay 2 cân là hai chuyện khác nhau. Con số giống nhau, đơn vị khác nhau.
- Giải thích "lực" bằng hình ảnh đẩy xe. Đơn vị lực hệ mét là niu-tơn; hệ Anh-Mỹ có "pao lực". 1 pao lực bằng khoảng 4,448 niu-tơn (c002). Báo cáo điều tra làm tròn là 4,45 (c013).
- Giải thích "xung lực": lực nhân thời gian đẩy (đẩy mạnh trong thời gian ngắn hay đẩy nhẹ lâu có thể cho cùng một cú hích). Đơn vị hệ mét là niu-tơn nhân giây (c012).
- Ý nhấn cho người lập trình: một biến kiểu số thực chỉ chứa con số. Ngay cả ngôn ngữ có hỗ trợ đơn vị như F# cũng chỉ kiểm đơn vị lúc dịch chương trình; khi chạy, đơn vị đã bị xóa (c029). Tức là nếu hai chương trình trao đổi qua một file số liệu, đơn vị nằm ở "lời hứa" giữa hai đội chứ không nằm trong con số.
- Chuyển cảnh: năm 1999, có một lời hứa như thế giữa hai đội ở hai bang nước Mỹ.

## Chương 2: Vệ tinh thời tiết đầu tiên của một hành tinh khác (khoảng 1 phút 45)
Ý chính: giới thiệu con tàu, nhiệm vụ, và việc chia công giữa hai đội (gốc rễ của chuyện "hai bên hiểu khác nhau").
- Nhiệm vụ: bay quanh Sao Hỏa làm vệ tinh thời tiết liên hành tinh đầu tiên, và làm trạm chuyển tiếp liên lạc cho tàu đổ bộ Mars Polar Lander (c003).
- Phóng ngày 11 tháng 12 năm 1998 từ mũi Canaveral, Florida (c004). Nặng 629 kg lúc phóng, trong đó 291 kg là nhiên liệu (c005). Hành trình khoảng 9 tháng rưỡi, quãng đường khoảng 669 triệu km (c006).
- Chi phí: dự án Mars 98 tốn 193,1 triệu đô phát triển và 42,8 triệu đô vận hành, tổng 235,9 triệu đô cho CẢ tàu quỹ đạo và tàu đổ bộ, chưa tính tên lửa phóng (c007). Không được nói "con tàu 125 triệu đô" hay "327 triệu đô": báo chí dùng nhiều con số khác nhau, nguồn chính thức đọc được chỉ có con số gộp này.
- Hai đội: hãng Lockheed Martin ở Denver, bang Colorado, thiết kế, chế tạo và vận hành con tàu; Phòng thí nghiệm Sức đẩy Phản lực (JPL) của NASA ở Pasadena, bang California, lo dẫn đường (tính xem tàu đang ở đâu) (c008). Thông cáo NASA cũng mô tả lỗi là thông tin trao đổi giữa đội tàu ở Colorado và đội dẫn đường ở California (c024).

## Chương 3: Bánh đà và những cú phụt nhỏ (khoảng 2 phút)
Ý chính: giải thích cơ chế bình thường của con tàu, để người xem hiểu con số sai đi vào đâu. Chưa nói đến lỗi.
- Giải thích "bánh đà" (bánh xe phản lực): tàu giữ hướng bằng cách quay các bánh xe bên trong; quay mãi thì bánh xe "đầy" (quay đến giới hạn), phải phụt các động cơ đẩy nhỏ để "xả" bớt; NASA gọi việc này là xả động lượng (AMD trên màn hình) (c009).
- Mỗi lần phụt, số liệu được gửi về mặt đất, một phần mềm trên mặt đất (SM_FORCES, "lực nhỏ") tính xung lực rồi ghi vào một file; đội dẫn đường dùng file đó để tính quỹ đạo (c010). Mỗi cú phụt chỉ đẩy tàu lệch một chút, nhưng cộng dồn chín tháng thì thành chuyện lớn.
- Tàu có tấm pin mặt trời một bên, không đối xứng, nên ánh nắng đẩy lệch nhiều hơn; số lần phải phụt nhiều gấp 10 đến 14 lần so với đội dẫn đường dự tính (c011). Một chế độ quay lật 180 độ mỗi ngày ("chế độ quay thịt nướng") từng được lên kế hoạch để giảm việc này, nhưng bị bỏ, và quyết định đó không được báo cho đội dẫn đường (c022).
- Ý nhấn: càng phụt nhiều, một sai số nhỏ trong mỗi lần càng được nhân lên.

## Chương 4: Con số đúng, đơn vị sai (khoảng 2 phút)
Ý chính: nguyên nhân gốc, kể trọn trước khi đến hậu quả.
- Bản đặc tả giao tiếp phần mềm (SIS trên màn hình; lời đọc: "bản thỏa thuận viết sẵn giữa hai phần mềm") quy định xung lực trong file phải tính bằng niu-tơn nhân giây (c012).
- Phần mềm trên mặt đất lại ghi bằng pao lực nhân giây. Đội dẫn đường đọc con số như thể niu-tơn giây, nên tính thấp tác động của mỗi lần phụt đi 4,45 lần (c013).
- Trớ trêu: phần mềm cùng chức năng chạy TRÊN con tàu thì dùng đúng hệ mét; lỗi chỉ nằm ở phần mềm mặt đất (c014).
- Vì sao chín tháng không ai bắt được (chia thành ba lý do, không dồn ngày):
  1. Bốn tháng đầu, file đó lỗi định dạng, không dùng được; đội dẫn đường phải dựa vào email báo giờ phụt và tự ước lượng. Đến tháng 4 năm 1999 file mới dùng được, và chỉ trong khoảng một tuần đã thấy số liệu "lạ" (c015).
  2. Hướng đẩy chủ yếu vuông góc với đường nhìn từ Trái Đất tới tàu, mà trạm mặt đất chủ yếu đo được chuyển động dọc theo đường nhìn (đo qua hiệu ứng Doppler; giải thích bằng tiếng còi xe đổi giọng khi lại gần rồi đi xa), nên sai số tồn tại mà không lộ rõ (c015).
  3. Mối lo được nêu ở cấp nhân viên nhưng chỉ báo cáo không chính thức; các phương pháp tính quỹ đạo cho kết quả lệch nhau mà không được giải quyết (c019).
- Đội dẫn đường vào dự án ngay trước lúc phóng, không tham gia kiểm thử phần mềm mặt đất đó (c023).

## Chương 5: Ngày 23 tháng 9 năm 1999 (khoảng 2 phút)
Ý chính: hậu quả, kể theo thời gian, chỉ trong một tuần cuối.
- Giải thích "điểm thấp nhất của quỹ đạo" (độ cao gần mặt Sao Hỏa nhất khi bay qua) bằng hình ảnh ném hòn đá lướt qua mặt nước.
- Ngày 15 tháng 9, lần chỉnh hướng cuối nhắm cho tàu bay qua ở độ cao 226 km (c018).
- Trong tuần sau đó, các phép tính cho thấy độ cao tụt xuống khoảng 150 đến 170 km; khoảng một giờ trước giờ G, số liệu chính xác hơn cho thấy có thể chỉ còn 110 km. Độ cao thấp nhất con tàu chịu được là 80 km (c018).
- Một lần chỉnh hướng khẩn (TCM-5 trên màn hình) đã được bàn bằng miệng ngay trước giờ G nhưng không thực hiện, vì đội chưa chuẩn bị quy trình cho nó (c021).
- 09:00:46 giờ UTC (tức khoảng 16 giờ chiều giờ Việt Nam) động cơ chính bắt đầu đốt để vào quỹ đạo; 09:04:52 UTC tàu khuất sau Sao Hỏa, sớm hơn dự kiến 49 giây; sau khoảng 21 phút khuất bóng, tín hiệu không trở lại; tìm kiếm đến 25 tháng 9 vẫn không được (c016, c017).
- Ngày 29 tháng 9 phát hiện nguyên nhân pao lực và niu-tơn (c013). Tính lại với số liệu đúng: tàu đã bay qua ở độ cao khoảng 57 km, thấp hơn kế hoạch khoảng 170 km (c020). Tàu hoặc bị phá hủy trong khí quyển, hoặc văng ra khỏi Sao Hỏa đi vào quỹ đạo quanh Mặt Trời (c020).
- Ghi chú cho scriptwriter: thông cáo JPL ngày 24/9/1999 (trước khi điều tra xong) nói "khoảng 60 km" và "tối thiểu 85 km". Dùng số của báo cáo điều tra (57 km, 80 km); nếu muốn nhắc số 60 km thì nói rõ đó là ước tính ban đầu (c030).

## Chương 6: Lỗi của cả một hệ thống, và cách lập trình viên chống lại (khoảng 1 phút 30)
Ý chính: không đổ cho "một kỹ sư quên đổi đơn vị"; bài học là quy trình kiểm tra, và đưa đơn vị vào chính chương trình.
- Câu của ông Edward Weiler, phụ trách khoa học vũ trụ của NASA: con người đôi khi mắc lỗi; vấn đề không phải lỗi, mà là hệ thống kiểm tra của NASA đã không phát hiện ra nó (c025).
- Hội đồng điều tra do ông Arthur Stephenson chủ trì công bố báo cáo giai đoạn 1 ngày 10 tháng 11 năm 1999 (c026); khuyến nghị đứng đầu danh sách cho tàu đổ bộ đi sau là kiểm tra việc dùng đơn vị nhất quán trong toàn bộ thiết kế và vận hành con tàu, kèm rà soát phần mềm cho mọi dữ liệu trao đổi giữa JPL và Lockheed Martin (c027).
- Cách lập trình hiện đại: có ngôn ngữ cho phép gắn đơn vị vào con số, ví dụ F#; trình dịch báo lỗi khi cộng nhầm hai đơn vị khác nhau (c028). Nhưng như chương 1: đơn vị bị xóa khi chạy, nên giữa hai chương trình vẫn phải có thỏa thuận và kiểm thử từ đầu đến cuối (c029).
- (Tùy chọn, có claim) Trong ban điều tra có Peter Norvig của trung tâm nghiên cứu Ames của NASA (c031). Chỉ dùng nếu cần một chi tiết bất ngờ; không cần nói thêm về ông.

## Chốt (khoảng 30 giây)
- Tóm ba tầng: máy chỉ giữ con số; đơn vị là lời hứa giữa người với người; và khi lời hứa vỡ, con số đúng vẫn đưa con tàu xuống thấp hơn 170 km.
- Câu nối tập sau (gợi ý): khi con số và đơn vị đều đúng nhưng thời điểm sai thì sao?

## Ghi chú cho scriptwriter
- Phép tính tại chỗ (nói là phép tính, KHÔNG phải fact đã kiểm): 09:00:46 UTC cộng 7 giờ là 16:00:46 giờ Việt Nam.
- Không nói "Lockheed Martin dùng hệ Anh, NASA dùng hệ mét" như một quy tắc chung của hai tổ chức; nguồn chỉ nói về file và phần mềm cụ thể (c012–c014). Thông cáo 30/9/1999 nói "một đội dùng đơn vị Anh, đội kia dùng hệ mét" cho một thao tác quan trọng (c024) là được.
- Không nêu tên người viết phần mềm lỗi; nguồn không có.
- Mars Polar Lander (tàu đổ bộ) cũng mất tích tháng 12/1999 nhưng vì nguyên nhân khác; KHÔNG nhắc để tránh lẫn, chưa có claim.
