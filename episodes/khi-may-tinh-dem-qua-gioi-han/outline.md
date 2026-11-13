# Dàn ý: Khi máy tính đếm quá giới hạn (tràn số nguyên)

Mục tiêu 10 đến 11 phút lời đọc (khoảng 1.550 đến 1.750 từ), người xem phổ thông. Mỗi fact ghi kèm mã claim trong `claims.json`.

Nối từ hai tập trước: tập 1 nói máy chỉ có 0 và 1; tập 2 nói số lẻ như 0,1 không cất trọn được. Tập này hỏi: còn số nguyên, thứ "dễ" nhất, thì sao? Câu trả lời: số nguyên trong máy cũng có trần, và khi chạm trần thì máy không báo, nó quay vòng.

## Móc mở đầu (khoảng 50 giây)
- Tháng 12 năm 2014, YouTube cho biết lượt xem "Gangnam Style" của PSY đã vượt 2.147.483.647, con số lớn nhất mà bộ đếm số nguyên 32 bit của họ giữ được; họ phải nâng bộ đếm lên 64 bit (c001).
- Lời YouTube viết trên Google+: họ chưa từng nghĩ một video được xem nhiều hơn mức của số nguyên 32 bit, "nhưng đó là trước khi chúng tôi gặp PSY" (c002).
- Hai câu hỏi gài: vì sao trần lại là con số lẻ tẻ 2.147.483.647 mà không phải một số tròn? Và nếu đếm vượt trần thì chuyện gì xảy ra? Hé lộ: cùng một kiểu lỗi đã làm nổ một tên lửa năm 1996 (c009) và khiến cơ quan hàng không Mỹ yêu cầu máy bay Boeing 787 phải định kỳ tắt hẳn điện (c017, c019).

## Chương 1: Bộ đếm nào cũng có số ô hữu hạn (khoảng 1 phút 30)
Ý chính: một biến số nguyên giống đồng hồ công-tơ-mét xe máy: có số ô cố định, đếm hết thì quay về đầu.
- Hình ảnh gợi ý (không cần claim): công-tơ-mét 5 chữ số chạy đến 99.999 km thì nhảy về 00.000.
- Với n bit, máy có 2ⁿ trạng thái. Phép tính tại chỗ (scriptwriter nói là phép tính): 8 bit có 256 trạng thái, 16 bit có 65.536, 32 bit có 4.294.967.296.
- Ví dụ chính thức trong sách Rust: kiểu u8 (8 bit không dấu) chứa từ 0 đến 255; gán 256 là tràn số; khi biên dịch chế độ phát hành, 256 thành 0, 257 thành 1, chương trình không báo lỗi (c004). Ở chế độ gỡ lỗi thì chương trình dừng lại với lỗi (c004).
- Ý nhấn: máy không "biết" con số đã quá lớn. Nó chỉ cộng bit, và bit nhớ cuối cùng rơi ra ngoài.

## Chương 2: Vì sao lại là 2.147.483.647 (khoảng 1 phút 45)
Ý chính: muốn có số âm thì phải nhường một nửa số trạng thái cho số âm; trần của số 32 bit có dấu vì thế chỉ là 2³¹ − 1.
- Số nguyên có dấu được lưu theo cách "bù hai"; một kiểu n bit chứa từ −2ⁿ⁻¹ đến 2ⁿ⁻¹ − 1, ví dụ 8 bit là từ −128 đến 127 (c005).
- Đặc tả Java ghi rõ: int 32 bit chứa từ −2.147.483.648 đến 2.147.483.647; long 64 bit chứa đến 9.223.372.036.854.775.807 (c006). Đó chính là con số của YouTube.
- Minh họa (phép tính tại chỗ, đã thử bằng Python ctypes): lấy 2.147.483.647 cộng 1 trong số 32 bit có dấu thì ra −2.147.483.648. Công-tơ-mét không về 0 mà nhảy sang số âm lớn nhất.
- Đặc tả Java nói thẳng: các phép toán số nguyên không báo tràn số theo bất kỳ cách nào (c007).
- Ví dụ ngay trong đặc tả: nhân 1.000.000 với 1.000.000 bằng số int ra −727.379.968, trong khi đáp số đúng là 1.000.000.000.000 (c008). Một triệu nhân một triệu ra số âm.
- Sửa lại móc mở đầu cho đúng (myth-fact): báo chí viết "Gangnam Style làm hỏng YouTube", nhưng phát ngôn viên Google nói về mặt kỹ thuật YouTube không hỏng; YouTube đã nâng bộ đếm lên 64 bit (c003). Không nói kỹ sư "lường trước" hay nâng cấp "từ trước": chưa có nguồn đọc được.

## Chương 3: 37 giây của Ariane 5 (khoảng 2 phút)
Ý chính: một con số quá lớn bị nhét vào ô 16 bit đã làm tê liệt cả hai bộ dẫn đường của một tên lửa.
- Ngày 4 tháng 6 năm 1996, chuyến bay đầu tiên của tên lửa Ariane 5 (chuyến 501) thất bại (c009).
- Nguyên nhân: phần mềm đổi một số dấu phẩy động 64 bit sang số nguyên có dấu 16 bit; giá trị "độ lệch ngang" (BH) quá lớn so với ô 16 bit, gây lỗi "Operand Error" (c011). Nối tập 2: số thực 64 bit chứa thoải mái, nhưng ô 16 bit có dấu chỉ chứa đến 32.767 (c006, kiểu short).
- Hai bộ tham chiếu quán tính chạy song song, giống hệt nhau cả phần cứng lẫn phần mềm, nên bộ dự phòng hỏng y như vậy, chỉ sớm hơn một chu kỳ 72 mili giây (c012).
- Mắt xích còn thiếu (vì sao hỏng bộ dẫn đường lại thành bẻ lái, chứ không chỉ là "mất dẫn đường"): bộ SRI hỏng không im lặng. Nó gửi sang máy tính chính một dãy bit chẩn đoán (báo lỗi), và máy tính chính đọc dãy bit đó như thể là số liệu bay thật (c032).
- Tin vào số liệu sai đó, máy tính chính tưởng tên lửa đang lệch tư thế, nên ra lệnh bẻ hết cỡ vòi phun của hai tầng đẩy rồi của động cơ chính Vulcain để "sửa" một độ lệch không hề có (c033).
- Hậu quả: khoảng 37 giây sau khi bắt đầu đánh lửa động cơ chính, tên lửa đã mất hoàn toàn thông tin dẫn đường và tư thế; vòi phun bẻ hết cỡ làm góc tấn vượt 20 độ, tên lửa bắt đầu vỡ ra ở khoảng giây thứ 39 và kích hoạt hệ thống tự hủy (c010).
- Gợi ý hình ảnh: một con số báo lỗi bị đọc như một con số đo đạc; giống người lái nhìn đèn báo hỏng mà tưởng là kim la bàn.
- Trớ trêu 1: phần mềm gần như dùng lại từ Ariane 4, nhưng Ariane 5 tăng tốc độ ngang nhanh gấp 5 lần, nên con số vượt mức mà Ariane 4 chưa từng gặp (c013).
- Trớ trêu 2: chức năng tính con số đó (căn chỉnh) không còn tác dụng gì sau khi cất cánh, nhưng vẫn chạy thêm khoảng 40 giây bay (c014).
- Trớ trêu 3: trong bảy biến có nguy cơ tràn, bốn biến được bảo vệ, ba biến thì không; một lý do là mục tiêu giữ tải máy tính dưới 80% (c015).
- Hội đồng điều tra do giáo sư Jacques-Louis Lions chủ trì, báo cáo ngày 19 tháng 7 năm 1996; khuyến nghị đầu tiên là tắt chức năng căn chỉnh ngay sau khi cất cánh (c016).

## Chương 4: Boeing 787 và con số 248 ngày (khoảng 1 phút 45)
Ý chính: tràn số không chỉ do số quá lớn, mà còn do thời gian. Một bộ đếm chạy đủ lâu thì sẽ chạm trần.
- Năm 2015, Cục Hàng không Liên bang Mỹ (FAA) ra chỉ thị khẩn: máy bay Boeing 787 được cấp điện liên tục 248 ngày có thể mất toàn bộ điện xoay chiều, vì một bộ đếm phần mềm trong các bộ điều khiển máy phát điện (GCU) bị tràn (c017).
- Lỗi được Boeing phát hiện khi thử nghiệm trong phòng thí nghiệm. Nếu bốn GCU chính được bật cùng lúc, sau 248 ngày cả bốn cùng chuyển sang chế độ an toàn, mất toàn bộ điện xoay chiều bất kể đang ở giai đoạn bay nào, có thể dẫn đến mất kiểm soát máy bay (c018).
- Cách xử lý tạm: tắt điện máy bay định kỳ, không quá 120 ngày một lần (c019). Chỉ thị áp dụng cho 28 chiếc đăng ký tại Mỹ (c020).
- Năm 2018, chỉ thị mới thay thế, yêu cầu cài phần mềm mới vào cả sáu GCU (c021).
- Gợi ý cho scriptwriter (phép tính tại chỗ, KHÔNG phải fact đã kiểm): 2³¹ phần trăm giây xấp xỉ 248,55 ngày. Được nói đây là "một sự trùng khớp đáng chú ý", KHÔNG được khẳng định GCU đếm theo phần trăm giây, vì FAA không công bố đơn vị của bộ đếm.
- Ý nhấn: "tắt đi bật lại" nghe như mẹo vặt, nhưng ở đây là thủ tục bắt buộc của nhà chức trách.

## Chương 5: Khi chính đồng hồ bị tràn: GPS và năm 2038 (khoảng 2 phút)
Ý chính: máy đo thời gian bằng một con số đếm từ một mốc; con số đó cũng có trần.
- GPS: tín hiệu dân sự chính (C/A) phát số tuần bằng 10 bit, tối đa 1.023, nên khoảng 19,7 năm lại quay về 0 (c022).
- Lần quay về 0 đầu tiên vào tháng 8 năm 1999; lần thứ hai lúc 23:59:42 UTC ngày 6 tháng 4 năm 2019 (c023). Một số máy thu có thể báo ngày lệch 19,7 năm về quá khứ hoặc tương lai (c031); nhiều thiết bị thiết kế không đúng đã gặp sự cố, có cái hỏng trước hoặc sau đó vài tháng (c024).
- Lần tới với thiết bị đời cũ: ngày 20 tháng 11 năm 2038; tín hiệu mới dùng số tuần 13 bit, không quay vòng đến năm 2137 (c025).
- Năm 2038 còn một hạn chót khác: nhiều hệ thống đếm giờ bằng số giây kể từ 0 giờ 0 phút 0 giây ngày 1 tháng 1 năm 1970 theo giờ UTC (c026). Nếu số giây đó cất trong số nguyên 32 bit có dấu, nó không biểu diễn được thời điểm từ 03:14:08 UTC ngày 19 tháng 1 năm 2038 trở đi (c027).
- Phép tính tại chỗ (scriptwriter nói là phép tính, đã thử bằng Python): 2.147.483.647 giây sau mốc 1970 là 03:14:07 UTC ngày 19/1/2038 (tức 10:14:07 sáng giờ Việt Nam); cộng thêm 1 giây thì số quay về −2.147.483.648, tức ngày 13/12/1901 lúc 20:45:52 UTC. Nói "đồng hồ có thể nhảy về năm 1901" là phép tính, không nói đó là điều chắc chắn xảy ra với mọi máy.
- Cách chữa: dùng kiểu thời gian rộng hơn (64 bit); từ glibc 2.34, chương trình Linux 32 bit có thể dùng thời gian 64 bit (c028).
- Gợi ý hình ảnh: hai cái hẹn năm 2038 (tháng 1 và tháng 11), hai con số khác nhau, cùng một bệnh.

## Chương 6: Sống chung với cái trần (khoảng 1 phút)
Ý chính: không có bộ đếm vô hạn trong phần cứng; chỉ có chọn ô đủ lớn và kiểm tra khi tràn.
- Dùng ô to hơn: số 64 bit có dấu chứa đến 9.223.372.036.854.775.807 (c006). Phép tính tại chỗ: đếm giây bằng 64 bit thì đủ khoảng 292 tỉ năm.
- Dùng ngôn ngữ có số nguyên không giới hạn: số nguyên của Python có độ chính xác không giới hạn (c029).
- Bắt máy kiểm tra: Rust có các hàm checked_, wrapping_, saturating_, overflowing_ để xử lý tràn số rõ ràng, và coi việc dựa vào quay vòng là lỗi (c030).
- Hoặc như Ariane 5: tắt thứ không cần nữa (c016).

## Chốt (khoảng 30 giây)
- Máy tính không đếm sai. Nó đếm đúng trong số ô mà người ta cho nó; người ta chỉ quên hỏi "lỡ đếm hết ô thì sao".
- Nối ba tập: hai trạng thái (tập 1), số lẻ không cất trọn (tập 2), số nguyên có trần (tập 3). Mọi con số trong máy đều là một sự đánh đổi.
- Câu hỏi cho người xem: điện thoại của bạn sẽ ra sao vào 10:14:08 sáng ngày 19/1/2038 giờ Việt Nam?

## Ghi chú cho scriptwriter
- Gangnam Style: nhiều báo viết trần mới là 9.223.372.036.854.775.808; số đúng là 9.223.372.036.854.775.807 (c006). Đừng đọc số của báo.
- Gangnam Style: đừng nói bộ đếm "về số âm" hay "YouTube sập". Google nói không hỏng về mặt kỹ thuật (c003). Chỉ nói là YouTube phải nâng lên 64 bit.
- Ngày Google+ đăng bài: báo (4/12/2014) nói "thứ Hai", tức 1/12/2014, nhưng bài gốc trên Google+ đã mất, không mở được. Chỉ nói "tháng 12 năm 2014".
- Ariane 5: báo cáo ghi H0 + 36,7 giây là lúc hai bộ SRI ngừng, H0 + 39 giây là lúc vỡ; thông cáo ESA nói "37 giây". Dùng "khoảng 37 giây" và "khoảng giây thứ 39". Không nêu thiệt hại tiền (không có trong báo cáo).
- Ariane 5: 32.767 là trần của số 16 bit có dấu (c006, kiểu short); báo cáo không nói giá trị BH lúc đó là bao nhiêu, đừng bịa.
- Boeing 787: không có vụ máy bay nào mất điện thật; đây là lỗi tìm ra trong phòng thí nghiệm (c018). Đừng nói có sự cố trên không.
- GPS: gps.gov ghi mốc đếm tuần là 5/1/1980, bản ghi nhớ DHS ghi 6/1/1980 (lúc 0 giờ). Đừng nêu ngày mốc; nếu cần thì nói "đầu năm 1980". Lần quay vòng 1999: DHS ghi 21/8/1999, gps.gov chỉ ghi "tháng 8 năm 1999"; dùng "tháng 8 năm 1999".
- Năm 2038 (Unix): gnulib ghi thời điểm không biểu diễn được là 03:14:08 UTC (giây cuối cùng còn biểu diễn được là 03:14:07). Đổi sang giờ Việt Nam (UTC+7) là phép tính.
