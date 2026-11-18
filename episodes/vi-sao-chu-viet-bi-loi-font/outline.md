# Dàn ý: Vì sao chữ Việt bị lỗi font (bảng mã, Unicode, UTF-8)

Mục tiêu 9 đến 11 phút lời đọc (khoảng 1.450 đến 1.700 từ), người xem phổ thông Việt Nam. Mã `cNNN` trỏ tới `claims.json`.

Nối mạch: tập 1 máy chỉ có 0 và 1; tập 2 số thực cất không trọn; tập 3 số nguyên có trần; tập 4 nhầm đơn vị. Tập 5: chữ cũng chỉ là con số, và hai bên nhầm "bảng tra" thì ra "chữ ma".

Đề tài này nằm đúng mạch "máy tính biểu diễn dữ liệu và lỗi sinh từ đó": một chữ cái là một con số theo một bảng quy ước; lỗi nằm ở chỗ hai bên dùng hai bảng khác nhau.

## Móc mở đầu (khoảng 50 giây)
- Cảnh quen thuộc: một tin nhắn, email hay trang web hiện ra "Tiáº¿ng Viá»‡t" thay vì "Tiếng Việt". Người Việt gọi là "chữ ma", "loạn mã" (c002).
- Đây không phải máy hỏng và không phải chữ bị mất: các byte vẫn nguyên, chỉ bị đọc theo bảng tra sai. Phép tính tại chỗ: "Tiếng Việt" lưu UTF-8 là 54 69 E1 BA BF 6E 67 20 56 69 E1 BB 87 74; đọc theo Windows-1252 ra đúng "Tiáº¿ng Viá»‡t" (c001).
- Câu hỏi gài: vì sao một chữ "ế" lại thành ba ký tự lạ "áº¿"? Và vì sao chuyện này làm khổ người Việt hơn người Anh rất nhiều?

## Chương 1: Chữ chỉ là con số trong một bảng tra (khoảng 1 phút 40)
Ý chính: máy chỉ cất số; "bảng mã" là bảng nói số nào ứng với chữ nào. ASCII là bảng đầu tiên.
- ASCII công bố 1963, 7 bit, 128 vị trí: 95 ký tự in được và 33 ký tự điều khiển (c005). Bit thứ tám của byte ban đầu để dành làm bit chẵn lẻ kiểm tra lỗi (c006).
- 128 vị trí là đủ cho tiếng Anh, nhưng không có chỗ cho "ế" hay "ệ" (c007).
- Hình ảnh gợi ý: một tủ 128 ngăn kéo, mỗi ngăn một ký tự.
- Mẫu "nói trước": tập 1 đã nói bit; bảng tra này chính là thứ ghép bit thành chữ.

## Chương 2: Thời mỗi nhà một bảng mã (khoảng 2 phút)
Ý chính: ngăn kéo từ 128 trở lên bỏ trống, ai cũng tự nhét chữ của mình vào, nên mỗi nơi một kiểu.
- Bit thứ tám được giải phóng nên có nhiều bộ mã mở rộng: ISO 8859, tập mở rộng của Latin 1 trên Windows, MacRoman; nhiều tổ chức làm riêng, đôi khi mâu thuẫn nhau (c008). ASCII vẫn là bảng mã phổ biến nhất trên web cho tới tháng 12/2007, khi UTF-8 vượt lên (c009).
- Hệ quả ở Việt Nam: trước 2001 có khoảng 40 bảng mã 8 bit (ABC, VNI, TCVN 5712...) (c010). Miền Bắc hay dùng TCVN (phông ABC), miền Nam hay dùng VNI (c012). TCVN3 (ABC), VNI, VPS, VISCII là những bảng mã cũ được dùng nhiều (c011). Không nói năm 1993, ba biến thể, hay con số 134 chữ cái: đã bỏ vì thiếu nguồn.
- Chữ hoa có dấu của TCVN3 phải dùng phông chữ hoa riêng (c013): đổi phông là chữ thành ký tự lạ.
- Cảnh người xem nhớ: soạn văn bản Word phải cài "bộ phông" VNI hay ABC, gửi cho người khác mà máy họ thiếu phông thì thấy ký tự lạ (đây là ký ức chung, KHÔNG phải claim; không nêu số).
- Mô hình đối chiếu: mojibake kinh điển là đọc UTF-8 như Windows-1252, (c001); "latin1" trong đặc tả WHATWG thực ra là windows-1252 (c004).
- Gợi ý hình ảnh: hai người cầm hai cuốn từ điển mật mã khác nhau đọc cùng một dãy số.

## Chương 3: Unicode và tấm lót đĩa ở New Jersey (khoảng 2 phút)
Ý chính: một bảng duy nhất cho mọi chữ (Unicode) và một cách ghi thành byte (UTF-8) vừa thông minh vừa tương thích ngược.
- Unicode 1.0 xuất bản tháng 10/1991 (c016).
- Câu chuyện nhỏ: khoảng tháng 9/1992, Ken Thompson và Rob Pike thiết kế UTF-8; theo Pike là trên một tấm lót đĩa trong quán ăn ở New Jersey (c018). Mốc 4/9 và 8/9/1992 (c019). Pike: Thompson nghĩ ra cách đóng gói bit, "Ken designed it with me cheering him on, whatever the history books say" (c020).
- Hai yêu cầu thiết kế: byte ASCII không bao giờ nằm bên trong ký tự nhiều byte, và đọc giữa chừng vẫn tự đồng bộ lại (c021).
- RFC 3629 (11/2003): 1 đến 4 byte một ký tự (c022). ASCII chỉ 1 byte, nên văn bản ASCII cũ vẫn đọc được (c023).
- Số liệu minh họa (phép tính): "é" 2 byte, "ế" 3 byte, 👍 4 byte (c024).
- Hôm nay 99,1% website biết được bảng mã dùng UTF-8 (c025); đặc tả WHATWG nói định dạng mới phải dùng UTF-8 (c026).

## Chương 4: Việt Nam chuyển sang một bảng chung (khoảng 1 phút 40)
Ý chính: nhà nước và doanh nghiệp cùng dọn "chiến trường" bảng mã.
- Tháng 9/2001: TCVN 6909:2001, bộ mã chữ Việt dựa trên ISO/IEC 10646 (Unicode), được ban hành (c027). Không nói ngày 24/9 và không nói cơ quan ban hành: chưa đủ nguồn.
- 10/6/2002: Quyết định 72/2002/QĐ-TTg: từ 1/1/2003 thống nhất dùng TCVN 6909:2001 trong trao đổi thông tin điện tử giữa các tổ chức của Đảng và Nhà nước (c028). Cơ sở dữ liệu cũ chuyển dần (c029). Nói rõ phạm vi: không phải mọi người dân hay doanh nghiệp.
- (Đã bỏ lời trích của ông Bùi Quang Ngọc tại hội thảo 2002: chỉ có một nguồn báo.)
- Không nói bao giờ thì "hết chữ ma": chưa có nguồn. Không nói Unikey hay Windows 2000/Vista hỗ trợ Unicode khi nào: chưa có nguồn tốt.

## Chương 5: Một chữ, hai cách viết (khoảng 1 phút 50)
Ý chính: ngay trong Unicode, chữ có dấu vẫn có thể được lưu theo hai cách, nên hai chữ nhìn y hệt có thể khác nhau với máy.
- Chữ "ệ": dạng dựng sẵn một điểm mã U+1EC7, hoặc dạng phân rã e + dấu nặng + dấu mũ (c031). Đây là phép tính, ghi rõ.
- Unicode gọi là NFC (ghép lại) và NFD (phân rã); hai dạng được xem là tương đương chính tắc (c032).
- Hệ quả đời thường (nêu thận trọng): tên tệp hoặc ô tìm kiếm có thể so sánh hai dạng khác nhau. Theo Apple (TN1150): HFS+ lưu tên tệp dạng phân rã hoàn toàn (c033). Không nói gì về APFS: đã bỏ vì người kiểm không xác minh được. Không khẳng định "lỗi tiếng Việt trên macOS" cụ thể vì chưa có nguồn riêng cho tiếng Việt.
- Giải thích tại sao "chữ ma" kiểu Windows-1258/VNI từng xuất hiện: chúng dùng ký tự ghép rời, không dựng sẵn; nên bớt ký tự nhưng dễ rối khi hiển thị (đã có ở Wikipedia VSCII/Vietnamese and computers; chưa chốt thành claim riêng, chỉ dùng nếu người kiểm chấp nhận).

## Chương 6: Khi máy đoán sai, và tin nhắn 70 chữ (khoảng 1 phút 40)
Ý chính: hai chuyện đời thường cho thấy máy phải "đoán" bảng mã, và SMS tính tiền theo số bit.
- Notepad của Windows: tệp không có chữ ký bảng mã (BOM), Notepad đoán bằng IsTextUnicode; Raymond Chen (2004): không tuyệt đối chắc chắn, chuỗi ngắn dễ đoán nhầm nhất (c034).
- Gõ "Bush hid the facts", lưu, mở lại thì ra chữ Trung Quốc vô nghĩa (c035). Tài liệu Microsoft: các phép thử thống kê của IsTextUnicode "not foolproof", có chuỗi ASCII bị nhận nhầm (c036). Không nói năm 1994, 2004 hay Vista: đã bỏ vì thiếu nguồn. Chỉ là chuyện vui, không nói do lỗi của ai.
- Điện thoại: tin SMS bảng 7 bit chứa 160 ký tự, UCS2 chỉ 70 (c037). Phép tính: (140×8)/7 = 160 (c038). Các chữ ệ, ữ, ế không nằm trong bảng 7 bit mặc định lẫn bảng mở rộng của GSM, nên tin có chúng phải dùng UCS2 còn 70 ký tự (c039). Gợi ý: đây là lý do nhiều người từng nhắn tin "không dấu" để tiết kiệm; điều này là suy luận, KHÔNG được khẳng định là lý do duy nhất, vì chưa có nguồn.

## Chương 7 (ngắn): Không riêng Việt Nam, và phần chốt (khoảng 1 phút)
- Myanmar: 26/9/2019 Facebook công bố bộ chuyển đổi phông chữ trong Facebook và Messenger vì phần lớn thiết bị còn dùng Zawgyi, không tương thích Unicode (c040); đã bỏ Zawgyi khỏi ngôn ngữ giao diện cho người mới năm trước (c041).
- Chốt: chữ chỉ là số; lỗi font là hai bên dùng hai bảng tra. Đừng nói "máy hỏng"; hãy hỏi "đang đọc bằng bảng nào?". Mẹo thực dụng: lưu và gửi bằng UTF-8.
- Nối tập sau: máy đã cất số, chữ, ký hiệu; còn thời gian và ngày tháng thì sao (năm 2038, múi giờ...) là gợi ý tập kế, KHÔNG phải nội dung tập này.

## Sáu đoạn cắt Short (mỗi đoạn tự đứng được, 60 đến 150 giây, một ý, một chuyện nhỏ)
1. S1 "Vì sao hiện Tiáº¿ng Viá»‡t": móc mở đầu + c001, c002. Ý: các byte vẫn đúng, chỉ đọc sai bảng tra. Cắt từ móc mở đầu, kết bằng một câu chốt riêng.
2. S2 "Chiến tranh bảng mã chữ Việt": Chương 2, c010–c013. Ý: khoảng 40 bảng mã, Bắc ABC, Nam VNI.
3. S3 "UTF-8 sinh ra trên tấm lót đĩa": Chương 3 đoạn câu chuyện, c018–c021, c024. Ý: một thiết kế gọn, tương thích ASCII.
4. S4 "Bush hid the facts": Chương 6 đoạn Notepad, c034–c036. Ý: máy đoán bảng mã, đoán sai ra chữ Trung Quốc.
5. S5 "Một chữ ệ, hai cách lưu": Chương 5, c031–c032. Ý: chữ giống hệt mà khác điểm mã.
6. S6 "Vì sao tin nhắn tiếng Việt chỉ còn 70 chữ": Chương 6 đoạn SMS, c037–c039. Ý: 160 so với 70 là bài toán bit.
Dự phòng: Myanmar/Facebook (Chương 7) nếu cần đổi một Short.
