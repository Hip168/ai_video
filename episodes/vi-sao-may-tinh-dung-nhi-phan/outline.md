# Dàn ý: Vì sao máy tính dùng hệ nhị phân

Mục tiêu 9 đến 11 phút lời đọc (khoảng 1.400 đến 1.700 từ), người xem phổ thông. Mỗi fact ghi kèm mã claim trong `claims.json`.

## Móc mở đầu (khoảng 40 giây)
- Ảnh, nhạc, cả video bạn đang xem: trong máy chỉ là một dãy 0 và 1. Con người đếm bằng mười ngón tay, vậy tại sao máy lại chọn hai?
- Câu hỏi gài: máy tính điện tử nổi tiếng đầu tiên, ENIAC, lại không dùng nhị phân (c022). Liên Xô từng sản xuất hàng loạt máy tam phân (c027, c029). Vậy nhị phân thắng nhờ đâu?
- Hứa hẹn: cuối video bạn sẽ hiểu vì sao "hai" là con số an toàn nhất cho một cỗ máy chạy bằng điện.

## Chương 1: Bit là gì (khoảng 1 phút 30)
Ý chính: bit là đơn vị nhỏ nhất của thông tin, một lựa chọn giữa hai khả năng.
- Từ "bit" là viết tắt của "binary digit" (chữ số nhị phân), được Claude Shannon dùng trong bài báo năm 1948 và ông ghi là do John Tukey gợi ý (c001, c002).
- Shannon viết: một thiết bị có hai vị trí ổn định, như rơ-le hay mạch flip-flop, lưu được một bit (c003).
- Thêm một rơ-le vào nhóm thì số trạng thái có thể có tăng gấp đôi (c004). Đây là cầu nối sang chương đếm.
- Hình ảnh gợi ý: công tắc đèn bật/tắt.

## Chương 2: Đếm bằng hai ngón tay, và cái byte (khoảng 2 phút)
Ý chính: hệ nhị phân đếm được mọi số, chỉ cần nhiều chữ số hơn; gom 8 bit thành byte.
- Leibniz đã mô tả số học nhị phân "chỉ dùng hai ký tự 0 và 1" trong một bài công bố ở Viện Hàn lâm Khoa học Paris năm 1703 (c005). Nhị phân là ý tưởng toán học cũ hơn máy tính hơn hai thế kỷ.
- Cách đếm: các hàng có giá trị 1, 2, 4, 8, 16..., mỗi hàng gấp đôi hàng trước (c006, minh họa đếm 0 đến 10 trên màn hình).
- Từ "byte" do Werner Buchholz đặt ra năm 1956 khi IBM thiết kế máy Stretch; gốc là "bite" (miếng cắn) nhưng viết thành "byte" để khỏi bị nhầm thành "bit" (c007, c008).
- IBM System/360 ra mắt ngày 7 tháng 4 năm 1964 và phổ biến byte 8 bit mà ta dùng đến nay (c009).
- 8 bit cho 256 giá trị, từ 0 đến 255 (c010).
- Ví dụ chữ: ASCII là mã 7 bit, có 128 mã (c011, c012); chữ "A" mang số 65 (c013). Năm 1969, RFC 20 ghi ASCII được đặt trong byte 8 bit với bit cao nhất luôn là 0 (c014).

## Chương 3: Lý do số một: tín hiệu điện không bao giờ sạch (khoảng 2 phút)
Ý chính: phân biệt hai mức điện áp dễ và chắc chắn hơn nhiều so với phân biệt mười mức; nhiễu không làm sai kết quả.
- Ví dụ thật: cổng logic TTL đời cũ của Texas Instruments chạy ở 5 V; điện áp vào từ 0,8 V trở xuống được hiểu là mức thấp (0), từ 2 V trở lên là mức cao (1) (c015, c016). Khoảng giữa là vùng đệm chống nhiễu.
- Tưởng tượng chia 5 V thành mười nấc cho hệ thập phân: mỗi nấc chỉ còn khoảng nửa vôn, nhiễu nhẹ là đọc sai (phép chia tại chỗ, không cần claim; scriptwriter nói rõ là ví dụ tưởng tượng).
- Linh kiện hai trạng thái rất tự nhiên: transistor dùng như công tắc đóng/mở. Transistor đầu tiên ra đời tại Bell Labs tháng 12 năm 1947 (Bardeen, Brattain, dưới sự dẫn dắt của Shockley), ba người nhận Nobel Vật lý năm 1956 (c017, c018).
- Quy mô hôm nay: chip Apple M1 (2020) có 16 tỉ transistor, làm trên tiến trình 5 nm (c019). Hàng tỉ công tắc chỉ cần biết "bật" hay "tắt".

## Chương 4: Lý do số hai: logic vốn là có/không (khoảng 1 phút 45)
Ý chính: toán logic hai giá trị khớp với mạch công tắc, nên thiết kế máy trở thành làm toán.
- George Boole công bố "An Investigation of the Laws of Thought" năm 1854, nền móng của đại số Boole (c020).
- Năm 1937, Claude Shannon, khi còn là học viên cao học ở MIT, viết luận văn thạc sĩ "A Symbolic Analysis of Relay and Switching Circuits", chỉ ra đại số Boole dùng được để phân tích và thiết kế mạch rơ-le; bản rút gọn đăng năm 1938 (c021).
- Năm 1946, Burks, Goldstine và von Neumann viết báo cáo thiết kế máy IAS và chọn nhị phân, lập luận rằng logic là hệ có/không nên vốn là nhị phân (c023).
- Họ còn tính: muốn độ chính xác mười chữ số thập phân mà mã hóa từng chữ số bằng bit thì cần ít nhất 40 bit, còn nhị phân thật chỉ cần khoảng 33 bit (c024). Nhị phân tiết kiệm thiết bị, và phép nhân đơn giản hơn: mỗi bước chỉ là "lấy" hoặc "không lấy" (c025).

## Chương 5: Những cỗ máy không chịu nhị phân (khoảng 2 phút)
Ý chính: thập phân và tam phân từng chạy thật; chúng chứng minh nhị phân không phải cách duy nhất, chỉ là cách thực tế nhất.
- ENIAC: do John Mauchly và J. Presper Eckert chế tạo ở Đại học Pennsylvania, ra mắt công chúng tháng 2 năm 1946 (c026). Máy tính toán bằng hệ thập phân, mỗi chữ số lưu bằng một bộ đếm vòng mười vị trí (c022).
- Cái giá: khoảng 18.000 bóng đèn chân không, nặng 30 tấn (c030, c031); dù đã cải thiện, vẫn hỏng khoảng một bóng mỗi một đến hai ngày (c032).
- Setun: máy tam phân do nhóm của Nikolay Brusentsov làm tại Đại học Quốc gia Moskva, chiếc đầu tiên chạy được cuối năm 1958 (c027). Dùng tam phân cân bằng với ba chữ số −1, 0, +1 (c028). Tổng cộng khoảng 50 chiếc được sản xuất (c029).
- Toán học nói gì: nếu tính "giá" của một con số bằng số chữ số nhân với số trạng thái mỗi chữ số, cơ số tối ưu là e ≈ 2,718; hai số nguyên gần nhất là 2 và 3, và cơ số 3 rẻ hơn 2 một chút (c033, c034).
- Vậy vì sao tam phân không thắng? Về lý thuyết, cơ số 3 chỉ rẻ hơn cơ số 2 một chút (c033, c034). Trong khi đó, linh kiện hai trạng thái đã rẻ, nhiều và chắc: transistor dùng như công tắc bật/tắt ra đời từ năm 1947 (c017, c018), và ngày nay một chip có tới 16 tỉ chiếc (c019). Phần lợi nhỏ trên giấy không bù được phần lợi rất lớn trong thực tế.

## Chương 6: Hai mức vẫn là chuẩn, kể cả khi ta lén dùng nhiều mức (khoảng 1 phút)
Ý chính: ngày nay có chỗ dùng nhiều mức, và cái giá phải trả lại chính là lý do nhị phân được chọn.
- Ô nhớ flash TLC phân biệt 8 mức điện áp để chứa 3 bit; QLC phân biệt 16 mức để chứa 4 bit (c036).
- Nhà sản xuất Kioxia ghi rõ: càng nhiều mức thì khoảng cách giữa các mức càng hẹp, đọc ghi phải chậm hơn và tuổi thọ ngắn hơn (c037). Đúng bài toán nhiễu ở chương 3.
- Và kết quả đọc ra từ ô nhớ ấy vẫn được biến lại thành bit 0 và 1.

## Chốt (khoảng 30 giây)
- Máy tính không dùng nhị phân vì hai là con số "thông minh" nhất, mà vì hai là con số khó đọc sai nhất, khớp với công tắc và khớp với logic.
- Gợi ý câu hỏi cho người xem: nếu một ngày linh kiện ba trạng thái rẻ và chắc như transistor, máy tính có quay lại tam phân không?

## Ghi chú cho scriptwriter
- Ngày phát minh transistor: nguồn ghi 16/12/1947 (lần đầu chạy được) và 23/12/1947 (trình diễn cho lãnh đạo Bell Labs). Chỉ nói "tháng 12 năm 1947".
- Số bóng đèn ENIAC: nguồn ghi 17.468, 17.480 hoặc 18.000 tùy thời điểm. Chỉ nói "khoảng 18.000".
- Luận văn của Shannon: viết năm 1937, đăng tạp chí năm 1938, MIT cấp bằng năm 1940. Nếu chỉ nêu một năm thì dùng đúng câu của c021.
