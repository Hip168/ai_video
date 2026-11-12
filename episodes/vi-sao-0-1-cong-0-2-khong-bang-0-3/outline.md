# Dàn ý: Vì sao 0,1 + 0,2 không bằng 0,3

Mục tiêu 9 đến 11 phút lời đọc (khoảng 1.400 đến 1.700 từ), người xem phổ thông. Mỗi fact ghi kèm mã claim trong `claims.json`.

Nối từ tập 1 ("Vì sao máy tính dùng hệ nhị phân"): tập trước nói máy chỉ có 0 và 1. Tập này hỏi: vậy số lẻ như 0,1 thì sao?

## Móc mở đầu (khoảng 45 giây)
- Mở cửa sổ lập trình của trình duyệt, gõ 0.1 + 0.2. Máy trả về 0.30000000000000004, và phép so sánh "có bằng 0.3 không" ra false (c001). Python cũng vậy: cộng 0,1 ba lần không bằng 0,3 (c002).
- Không phải lỗi của trình duyệt hay của Python. Mọi máy tính bạn từng dùng đều làm vậy.
- Câu hỏi gài: một con số sai ở chữ số thứ mười mấy thì có gì nguy hiểm? Năm 1991, một sai số kiểu này khiến một hệ thống tên lửa phòng thủ bắn trượt (c025). Cuối video ta sẽ quay lại chuyện đó.

## Chương 1: Có những phân số không bao giờ viết hết (khoảng 1 phút 45)
Ý chính: mỗi hệ đếm có những phân số "viết mãi không hết"; 1/10 là một phân số như thế trong hệ nhị phân.
- Trong hệ thập phân, 1/3 viết thành 0,333... Viết bao nhiêu chữ số cũng không bao giờ đúng hẳn 1/3, chỉ gần hơn mà thôi (c003).
- Trong hệ nhị phân, 1/10 là phân số lặp vô hạn: 0,000110011001100110011... (c004).
- Lý do 1/10 không viết gọn được trong nhị phân giống lý do 1/3 không viết gọn được trong thập phân (c005).
- Gợi ý minh họa (phép tính tại chỗ, không cần claim; scriptwriter nói là ví dụ): hệ nhị phân chỉ viết gọn được những phân số mà mẫu số là 2, 4, 8, 16... nên 0,5 và 0,25 thì gọn, còn 0,1 thì không, vì 10 có thừa số 5.
- Mà máy chỉ có số bit hữu hạn, nên phải cắt ở đâu đó. Cắt là có sai số (c004).

## Chương 2: Máy cất một con số lẻ như thế nào (khoảng 2 phút)
Ý chính: số thực trong máy là "ký hiệu khoa học bằng nhị phân" với 64 bit; nó chỉ giữ được khoảng 15 chữ số thập phân.
- Hầu hết máy tính ngày nay (ít nhất từ năm 2000) dùng chuẩn IEEE 754 cho số dấu phẩy động; số thực của Python và số của JavaScript là kiểu binary64, gọi là "độ chính xác kép" (c008, c009).
- 64 bit chia làm ba phần: 1 bit dấu, 11 bit số mũ, 52 bit phần định trị (c010). Chữ số 1 đứng đầu được ngầm hiểu, không lưu, nên thực tế có 53 bit độ chính xác (c011).
- Hình ảnh gợi ý: giống viết 6,02 × 10²³, nhưng cơ số là 2 thay vì 10.
- 53 bit tương đương khoảng 15 chữ số thập phân "chắc chắn" (c012). Khoảng cách từ 1 đến số kế tiếp mà máy biểu diễn được là khoảng 2,2 × 10⁻¹⁶ (c013).
- Hệ quả bất ngờ: số nguyên lớn nhất "an toàn" trong JavaScript là 9.007.199.254.740.991, tức 2⁵³ − 1; vượt qua đó thì 9.007.199.254.740.993 bị máy ghi thành 9.007.199.254.740.992 (c014).
- Vậy 0,1 thật sự được cất thành gì? Đúng bằng 0,1000000000000000055511151231257827021181583404541015625 (c006), tức phân số 3.602.879.701.896.397 chia cho 2⁵⁵ (c007). Gần 0,1 nhưng không phải 0,1.

## Chương 3: Giải mã 0,30000000000000004 (khoảng 1 phút 30)
Ý chính: sai số nhỏ của từng số cộng lại, rồi kết quả lại bị làm tròn lần nữa, và rơi vào một con số khác với "0,3 của máy".
- Chuẩn IEEE bắt buộc phép cộng, trừ, nhân, chia phải cho kết quả như thể tính chính xác rồi làm tròn về số biểu diễn được gần nhất; mặc định làm tròn về số gần nhất (c015).
- Minh họa trên màn hình (giá trị đã tính sẵn, scriptwriter có thể dùng như phép tính tại chỗ): 0,1 của máy hơi lớn hơn 0,1; 0,2 của máy hơi lớn hơn 0,2; nhưng 0,3 của máy lại hơi nhỏ hơn 0,3. Cộng hai số "hơi lớn" rồi làm tròn thì ra số máy ngay trên 0,3, không phải số máy gần 0,3 nhất. Máy in ra số đó là 0.30000000000000004 (c001).
- Cộng 0,1 mười lần cũng không ra đúng 1,0 (c017). Sai số nhỏ, nhưng tích lũy được.
- Bài kinh điển về chủ đề này: "What Every Computer Scientist Should Know About Floating-Point Arithmetic" của David Goldberg, đăng trên ACM Computing Surveys tháng 3 năm 1991 (c016).

## Chương 4: Trước khi có luật chung (khoảng 1 phút 45)
Ý chính: sai số làm tròn thì không tránh được, nhưng từng có thời mỗi máy sai một kiểu; IEEE 754 biến sự hỗn loạn đó thành luật chung.
- Trước chuẩn, mỗi dòng máy có phạm vi, độ chính xác và cách làm tròn riêng; lập trình viên phải tự xoay xở với từng máy (c018).
- Năm 1976, Intel bắt đầu thiết kế một bộ đồng xử lý dấu phẩy động và mời William Kahan, giáo sư Đại học California, Berkeley, làm cố vấn (c019).
- Kahan cùng nghiên cứu sinh Jerome Coonen và giáo sư thỉnh giảng Harold Stone soạn bản đề xuất, ban đầu gọi là "K-C-S", cho tiểu ban IEEE p754 (c020).
- Năm 1980, Intel ra chip 8087; kiểu dữ liệu và cách tính của nó là nền của chuẩn IEEE 754 (c021).
- Ngày 21 tháng 3 năm 1985, IEEE thông qua chuẩn IEEE 754-1985 (c022). Năm 1989, Kahan nhận giải Turing (c023). Bản hiện hành là IEEE 754-2019 (c024).
- Ý nhấn: chuẩn không xóa được sai số, nhưng làm cho sai số giống nhau ở mọi máy, nên đoán được và xử lý được.

## Chương 5: 0,34 giây ở Dhahran (khoảng 2 phút)
Ý chính: một sai số làm tròn của 1/10 tích lũy theo thời gian có thể gây hậu quả thật. Nói giọng nghiêm túc, tôn trọng người đã mất.
- Ngày 25 tháng 2 năm 1991, trong Chiến tranh vùng Vịnh, một hệ thống tên lửa Patriot ở Dhahran, Ả Rập Xê Út không theo dõi và đánh chặn được một tên lửa Scud. Scud rơi trúng doanh trại, 28 lính Mỹ thiệt mạng (c025).
- Đồng hồ trong máy đếm thời gian bằng số nguyên, đơn vị phần mười giây, và các thanh ghi của máy chỉ dài 24 bit (c026). Phân tích sau đó chỉ ra lỗi nằm ở cách biểu diễn 0,1 bằng 24 bit nhị phân, bị cắt cụt (c033). Lưu ý: Patriot dùng số dấu phẩy tĩnh 24 bit, không phải IEEE 754; scriptwriter không được nói Patriot dùng chuẩn IEEE 754.
- Sai số tăng theo thời gian chạy: sau 8 giờ lệch 0,0275 giây, sau 100 giờ lệch 0,3433 giây; vùng radar tìm mục tiêu lệch khoảng 687 mét (c028, c029).
- Lúc đó khẩu đội đã chạy liên tục hơn 100 giờ (c027). Dữ liệu của Israel từ trước cho thấy sau 8 giờ đã lệch 20%; ước tính sau khoảng 20 giờ hệ thống sẽ không bám được mục tiêu (c030). Chỉ cần khởi động lại, mất khoảng 60 đến 90 giây, là đồng hồ về 0 (c031).
- Chi tiết trớ trêu: bản sửa đã có, nhưng đoạn mã chuyển đổi chính xác hơn không được gọi ở mọi chỗ cần, nên hai sai số không còn triệt tiêu nhau (c034). Phần mềm sửa đến Dhahran ngày 26 tháng 2 năm 1991, một ngày sau vụ tấn công (c032).

## Chương 6: Sống chung với 0,30000000000000004 (khoảng 1 phút)
Ý chính: dấu phẩy động không "sai"; nó là sự đánh đổi. Biết nó thì dùng đúng chỗ.
- Đừng so sánh hai số thực bằng dấu bằng; so xem chúng có đủ gần nhau không, như hàm math.isclose của Python (c036).
- Với tiền bạc, dùng số thập phân thật: mô-đun decimal của Python biểu diễn chính xác số thập phân; 0,1 + 0,1 + 0,1 − 0,3 ra đúng 0, còn với số nhị phân thì ra khoảng 5,55 × 10⁻¹⁷; vì vậy decimal được ưa dùng trong kế toán (c035).
- Hoặc tính bằng số nguyên, như đếm bằng đồng thay vì nghìn đồng (gợi ý chung, không cần claim).

## Chốt (khoảng 30 giây)
- Máy tính không cộng sai. Nó cộng đúng những con số mà nó cất được, và 0,1 không nằm trong số đó.
- Nối với tập 1: chọn hai trạng thái làm máy chắc chắn, nhưng cái giá là có những phân số quen thuộc mà máy không bao giờ viết trọn.
- Câu hỏi cho người xem: bạn thử gõ 0.1 + 0.7 vào trình duyệt xem ra gì.

## Ghi chú cho scriptwriter
- Patriot: chỉ dùng số trong báo cáo GAO (0,3433 giây; 687 mét; 28 lính; hơn 100 giờ). Không dùng "1.676 m/s" hay "hơn nửa cây số" (chỉ có nguồn thứ cấp). Không nói Patriot dùng IEEE 754.
- Ngày họp thứ hai của tiểu ban p754: phỏng vấn Kahan ghi tháng 11/1977, trang ETHW ghi tháng 9/1977. Đừng nêu tháng; nếu cần thì chỉ nói "năm 1977".
- Kahan vào Berkeley: trang Berkeley ghi 1968, Britannica (qua kết quả tìm kiếm) ghi 1969. Đừng nêu năm.
- "15 chữ số" là `sys.float_info.dig` = 15 (số chữ số thập phân giữ trọn được). Đừng nói "17 chữ số" trừ khi thêm claim mới.
- Câu hỏi chốt "0.1 + 0.7" ra 0.7999999999999999 (đã thử bằng Python và Node). Nếu đọc kết quả trong video thì cần thêm claim.
