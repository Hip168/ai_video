# Dàn ý: Vì sao ảnh gửi qua gửi lại nhiều lần thì cứ mờ dần (JPEG, nén mất dữ liệu, mất thế hệ)

Mục tiêu 10 đến 11 phút lời đọc cho người xem phổ thông Việt Nam. Dàn ý cố ý để dư một chút: tổng các chương khoảng 11 phút 30, tức nguyên liệu cho khoảng 1.800 đến 2.000 từ lời đọc. Scriptwriter cắt bớt, không độn thêm. Mã `cNNN` trỏ tới `claims.json`.

Nối mạch: tập 1 máy chỉ có 0 và 1; tập 2 số thực cất không trọn; tập 3 số nguyên có trần; tập 4 nhầm đơn vị; tập 5 chữ là số theo bảng tra; tập 6 giờ là một con số và cuối tập đã hứa đề tài này. Tập 7: một tấm ảnh cũng chỉ là một đống số, và để gửi cho nhanh, máy cố ý vứt bớt số. Vứt một lần thì mắt không thấy; vứt đi vứt lại nhiều lần theo nhiều kiểu khác nhau thì ảnh "rỗ" dần.

Góc bài (một câu): ảnh mờ dần không phải vì "mạng làm hỏng ảnh", mà vì mỗi lần ảnh đi qua một ứng dụng là một lần bị thu nhỏ và nén lại theo luật của ứng dụng đó, và JPEG là cách nén cố ý vứt đi phần mắt khó thấy; vứt nhiều lần, theo nhiều lưới, nhiều mức khác nhau thì phần vứt đi bắt đầu lộ ra.

Ghi chú lời đọc (luật từ tiếng Anh của kênh): nói "nén mất dữ liệu", "nén không mất dữ liệu", "lượng tử hoá" (giải thích là "làm tròn thô"), "phép biến đổi cosin" (DCT chỉ hiện trên hình), "ô tám nhân tám", "lấy mẫu thưa phần màu". Tên định dạng JPEG, PNG, WebP, AVIF, HEIF, JPEG XL đọc theo tên riêng, không phiên âm kiểu Việt hoá; voice-producer kiểm cách đọc "JPEG" (gợi ý "giây-pếch" là cách người Việt hay nói, nhưng phải qua lexicon và nghe thử). Tên ứng dụng (Telegram, WhatsApp, Instagram, Messenger) giữ nguyên. Không nhắc Zalo bằng con số nào (không có tài liệu chính thức, xem sources.md).

## Móc mở đầu (15 giây đầu + khoảng 45 giây)
- 0 đến 15 giây (móc mạnh, có hình): một tấm ảnh chạy qua "lần gửi thứ 1, 2, 5, 10, 20..." ngay trên màn hình, rỗ dần, viền chữ lem, mảng trời nổi ô vuông. Lời: "Bức ảnh bạn vừa nhận trong nhóm chat gần như chắc chắn không phải bức ảnh người ta chụp. Không phải tôi nói, chính Telegram viết trong trang hỏi đáp: họ làm ảnh nhỏ đi trước khi gửi" (c001). Hình mẫu là đội tự dựng bằng cách nén lại nhiều lần (minh hoạ, KHÔNG phải số liệu, không nói là "Zalo/Facebook làm ra ảnh này").
- Câu thứ hai của móc: ngay tài liệu của thư viện JPEG phổ biến nhất cũng cảnh báo: nén đi nén lại chừng mười lần, ảnh có thể xấu đi thấy rõ (c002).
- Câu hỏi gài: thứ gì bị vứt đi mỗi lần gửi? Vì sao vứt một lần không ai thấy, mà vứt nhiều lần thì ai cũng thấy? Và có cách nào gửi ảnh mà không mất gì không? (Trả lời ở cuối: có, gửi dạng tệp, c001.)
- Gợi ý hình ảnh: một ảnh chân dung hoặc cảnh trời xanh có chữ trên ảnh, chạy "thế hệ" 1 → 20; bộ đếm "lần gửi" ở góc.

## Chương 1: Một tấm ảnh nặng bao nhiêu nếu không nén, và JPEG ra đời (khoảng 1 phút 45)
Ý chính: ảnh là một lưới số; không nén thì rất nặng, nên năm 1992 cả thế giới thống nhất một cách nén "vứt bớt có chọn lọc".
- Mỗi điểm ảnh màu gồm 3 thành phần, mỗi thành phần 8 bit, tức 24 bit một điểm ảnh khi chưa nén (c003). Phép tính minh hoạ (scriptwriter nói rõ "làm phép tính"): ảnh 12 triệu điểm × 3 byte = 36 triệu byte, khoảng 36 MB (phép tính trong c003). Không nói "ảnh điện thoại nào cũng 12 MP".
- Bài tổng quan chuẩn JPEG của Gregory Wallace: nén còn 1,5 đến 2 bit mỗi điểm ảnh thì thường không phân biệt được với ảnh gốc (c004). Tức nhỏ đi khoảng 12 đến 16 lần mà mắt không nhận ra (phép tính trong c004).
- Lịch sử: chuẩn JPEG là ITU-T T.81, bản tháng 9/1992, cùng nội dung ISO/IEC 10918-1; quá trình bắt đầu từ năm 1986 (c005). "Joint" là hợp tác giữa CCITT (nay thuộc ITU) và ISO. Tháng 6/1987 chấm mù 12 phương pháp, chọn 3; tháng 1/1988 phương pháp dựa trên DCT 8×8 thắng (c006).
- Kết quả: tới nay JPEG vẫn là định dạng ảnh tĩnh thống trị (c007). Không đưa con số phần trăm web dùng JPEG (không có nguồn ổn định).
- Gợi ý hình ảnh: lưới điểm ảnh phóng to, mỗi ô ba con số R, G, B; thanh dung lượng 36 MB và một thanh ngắn hơn 12 đến 16 lần (theo c004, không ghi số MB); dòng thời gian 1986 → 1987 → 1988 → 1992.

## Chương 2: Bước 1, bớt màu; bước 2, cắt ô tám nhân tám (khoảng 2 phút)
Ý chính: JPEG lợi dụng điểm yếu của mắt người. Mắt nhìn rõ độ sáng hơn màu, và ít để ý chi tiết li ti.
- Mắt người nhạy với thay đổi độ sáng hơn thay đổi màu, nên phần màu có thể bớt chi tiết mà không thấy (c008).
- Vì vậy JPEG tách ảnh thành một kênh sáng tối và hai kênh màu; hai kênh màu thường chỉ giữ một nửa chiều ngang, một nửa chiều dọc: kiểu "4:2:0", mặc định của libjpeg (c009). Tức là phần màu chỉ còn một phần tư số điểm (phép tính trong c009). Hình ảnh mạnh: ảnh đen trắng sắc nét + lớp màu nhoè to gấp đôi chồng lên vẫn trông như ảnh thật.
- Tiếp theo, mỗi kênh được cắt thành ô 8×8, tức 64 điểm, và mỗi ô được đổi sang "công thức pha trộn các hoa văn" bằng phép biến đổi cosin rời rạc; con số đầu tiên là độ sáng trung bình của cả ô (c010). Giải thích kiểu đời thường: thay vì nhớ 64 điểm, nhớ "màu nền trung bình + một ít sọc to + rất ít sọc li ti".
- Chuyện nhỏ (có thể thành Short): phép biến đổi cosin do Nasir Ahmed nghĩ ra. Đầu năm 1972 ông xin tiền NSF để nghiên cứu nhưng bị từ chối, một người thẩm định chê ý tưởng "quá đơn giản"; ông làm tiếp với Natarajan và Rao suốt mùa hè 1973 và đăng bài tháng 1/1974 (c011). Ý tưởng "quá đơn giản" đó nay nằm trong gần như mọi bức ảnh JPEG. Câu cuối là nhận xét, scriptwriter không gắn con số.
- Gợi ý hình ảnh: tách ảnh thành 3 lớp; lưới ô 8×8 phủ lên ảnh; bảng 64 hoa văn sọc kinh điển của DCT.

## Chương 3: Bước 3, làm tròn thô: chỗ ảnh thật sự mất (khoảng 2 phút)
Ý chính: tới bước lượng tử hoá thì dữ liệu mất thật, không lấy lại được. "Chất lượng 85" hay "nén còn 85%" không phải một đơn vị chung.
- Lượng tử hoá: chia mỗi con số cho một bước nhảy (1 đến 255) rồi làm tròn. Nhiều giá trị khác nhau bị làm tròn về cùng một số, nên đây là bước mất dữ liệu chính (c012). Ví dụ đời thường (minh hoạ, không phải claim): làm tròn giá tiền 12.400, 12.900, 13.300 đều thành "khoảng 13 nghìn": biết 13 nghìn thì không đoán lại được giá gốc.
- Sọc li ti (tần số cao) bị chia cho bước nhảy lớn, nên thường thành 0 và biến mất. Đó là vì sao ảnh nén nhiều mất chi tiết, mảng trời nổi ô vuông: mỗi ô 8×8 còn lại quá ít hoa văn (giải thích từ c010, c012; không thêm số).
- Bảng lượng tử mẫu trong chuẩn T.81 (Phụ lục K): chuẩn nói cho chất lượng "tốt", chia đôi thì "rất tốt"; libjpeg dùng đúng bảng này ở mức chất lượng 50 (c013).
- Thang "chất lượng 0–100" không phải đơn vị chung: libjpeg tự gọi là "đường co giãn khuyến nghị của chúng tôi", nghiên cứu pháp chứng ảnh nói mức chất lượng không có cách tính duy nhất (c014). Vì vậy câu đồn "Facebook nén còn 85%" không có nghĩa gì chính xác. (Không nói Facebook dùng mức nào.)
- Mặc định libjpeg là 75, khuyên dùng 50 đến 95; trên 95 thì tệp to lên rất nhiều mà mắt hiếm khi thấy khác (c015).
- Bất ngờ: chất lượng 100 vẫn mất dữ liệu, vì vẫn bớt màu và vẫn làm tròn (c016).
- JPEG hợp ảnh chụp chuyển màu mượt, không hợp nét mảnh, cạnh sắc, chữ, hình vẽ nét (c017). Nối sang chương 5: ảnh chụp màn hình tin nhắn toàn chữ là loại JPEG ghét nhất.
- Gợi ý hình ảnh: ô 8×8 với 64 con số, bảng lượng tử phủ lên, các số nhỏ rơi về 0; thanh trượt chất lượng 100 → 10.

## Chương 4: Mất thế hệ: vì sao nén lại nhiều lần thì mờ dần (khoảng 2 phút)
Ý chính: điều bất ngờ là lưu lại một ảnh JPEG với đúng cài đặt cũ thì gần như không mất thêm. Ảnh mờ dần vì mỗi lần đi qua một nơi khác là một luật nén khác, một kích thước khác, một lưới khác.
- Lời cảnh báo gốc: libjpeg khuyên tránh nén–giải nén lặp lại; sau khoảng mười vòng ảnh có thể xấu đi thấy rõ (c002). Từ ngữ: "mất thế hệ", như photo copy của bản photo copy.
- Nhưng nếu lặp đúng cài đặt cũ: thí nghiệm 2025 thấy JPEG truyền thống nén lặp gần như không giảm chất lượng đo được, nhất là khi nén mạnh; Farid (2009): sai khác nhỏ nhất khi lần sau dùng cùng bước lượng tử (c018). Lý do dễ hiểu: số đã làm tròn rồi thì làm tròn lại theo cùng bước vẫn ra số đó.
- Vậy cái gì làm ảnh xấu dần? (1) Nén lại với bước lượng tử khác thì các con số bị xê dịch (c019). (2) Ảnh bị cắt, thu nhỏ hay có viền mới thì lưới ô 8×8 cũ lệch đi (có 64 cách lệch), lần lưu mới sinh ra hoa văn mới phải làm tròn tiếp (c019). (3) Mỗi lần thu nhỏ là mất điểm ảnh thật (ý của chương 5). Ba thứ này xảy ra khi ảnh đi qua nhiều ứng dụng khác nhau, mỗi nơi một luật.
- Câu chốt chương (nhận xét, không phải số liệu): ảnh không mờ vì "bị gửi nhiều", mà vì "bị nhiều nơi khác nhau nén lại theo nhiều kiểu".
- Gợi ý hình ảnh: hai lưới 8×8 lệch nhau vài điểm chồng lên; chuỗi photo copy; đồ thị "lưu lại cùng cài đặt" phẳng so với "lưu qua nhiều nơi" dốc xuống (đồ thị minh hoạ định tính, không ghi số).
- Ghi chú cho scene-director: nếu dựng thí nghiệm thật (nén lại bằng các mức khác nhau, cắt 1 điểm mỗi lần) thì là minh hoạ của đội, nói rõ trên hình "minh hoạ"; không đặt số PSNR lên hình nếu không có claim.

## Chương 5: Ứng dụng làm gì với ảnh của bạn, và cái bẫy chụp màn hình (khoảng 2 phút 15)
Ý chính: các ứng dụng nói thẳng là họ thu nhỏ và nén ảnh; nghiên cứu đo được mỗi nơi một ngưỡng; chụp màn hình rồi gửi lại là cách tạo "thế hệ mới" nhanh nhất.
- Lời chính chủ: Telegram làm ảnh nhỏ đi trước khi gửi; mặc định là Standard; HD gấp 4 lần số điểm ảnh nhưng vẫn dưới 0,5 MB; gửi dạng tệp thì không nén chút nào (c001).
- Instagram: ảnh rộng hơn 1.080 điểm bị giảm xuống 1.080; tỉ lệ khung lạ thì bị cắt (c023). Phép tính minh hoạ: ảnh rộng 4.000 điểm (ví dụ) xuống 1.080 thì mỗi chiều còn khoảng 27%, số điểm ảnh còn khoảng 7% (phép tính trong c023; scriptwriter nói "ví dụ").
- WhatsApp có hai mức Standard và HD, đặt mặc định HD được trong cài đặt; và chính WhatsApp ghi đường truyền mạng vẫn ảnh hưởng tới chất lượng kể cả khi gửi HD (c024). Messenger thêm nút gửi ảnh HD từ 9/4/2024 (c025). Ý: nút "HD" tồn tại chứng tỏ mặc định không phải ảnh gốc. KHÔNG đưa độ phân giải cụ thể của Standard/HD WhatsApp (chỉ có báo đưa tin, không có tài liệu chính thức).
- Nghiên cứu đo thật: năm 2016, nhóm Đại học Catania tải 2.720 ảnh qua 10 nền tảng; Facebook, Twitter, Telegram, WhatsApp, Instagram luôn nén lại mọi ảnh (c020); ngưỡng thu nhỏ khi đó: WhatsApp 1.600, Telegram 2.560, Instagram 1.080, Facebook 960 hoặc 2.048 (c021). Phải nói rõ "đo năm 2016, nay có thể đã khác"; chính bài báo ghi ngưỡng đổi theo thời gian (Twitter 1.024 lên 2.048 ngay trong lúc làm) (c021).
- Chi tiết phụ hay: các nền tảng đó còn xoá siêu dữ liệu EXIF, kể cả thông tin máy chụp (c022). Một câu, không đào sâu.
- Cái bẫy chụp màn hình (lập luận, ghép từ các claim): chụp màn hình là chụp lại đúng những điểm đang hiện trên màn, gồm cả vết nén cũ, viền giao diện, và kích thước theo màn hình chứ không theo ảnh gốc; gửi đi thì ứng dụng lại thu nhỏ và nén lại với lưới mới (c019, c020). Ảnh chụp màn hình tin nhắn toàn chữ, nét sắc, là loại JPEG nén kém nhất nên chữ lem quanh viền (c017). KHÔNG khẳng định định dạng tệp chụp màn hình của iPhone/Android (không có nguồn chính thức).
- Gợi ý hình ảnh: một ảnh đi qua chuỗi biểu tượng chat; mỗi trạm đóng dấu "thu nhỏ / nén lại / xoá EXIF"; bảng ngưỡng năm 2016 có chữ to "đo năm 2016".

## Chương 6: PNG và các định dạng mới có cứu được không (khoảng 1 phút 30)
Ý chính: có cách nén không mất gì, và có định dạng nén giỏi hơn JPEG, nhưng không định dạng nào cứu được ảnh nếu ứng dụng vẫn đổi và nén lại nó.
- PNG nén không mất dữ liệu: giải nén ra giống hệt từng bit, dùng deflate (c026). PNG sinh ra từ một vụ bản quyền: cuối 12/1994 lộ chuyện phí bản quyền thuật toán LZW trong GIF; bản nháp định dạng mới đăng 4/1/1995; W3C công nhận PNG 1.0 ngày 1/10/1996; bản thứ ba ngày 24/6/2025 (c027, c026).
- Nhưng PNG hợp với hình vẽ, chữ, ảnh chụp màn hình; với ảnh chụp thì tệp lớn hơn nhiều (lập luận, không đưa số). Và gửi PNG qua ứng dụng chat ở chế độ ảnh thường thì ứng dụng vẫn có thể đổi và nén lại (c001, c020).
- Các định dạng mới: WebP nhỏ hơn JPEG 25–34% ở cùng chất lượng SSIM, bản không mất dữ liệu nhỏ hơn PNG 26% (theo Google, c028). HEIF trên iPhone từ iOS 11, nén tốt hơn JPEG; gửi sang máy chưa hỗ trợ thì có thể tự đổi về JPEG (c029). AVIF bản 1.0.0 ngày 19/2/2019 (c030). JPEG XL thành chuẩn ISO/IEC 18181 năm 2022, đổi ảnh JPEG cũ sang mà không mất gì, và khôi phục lại đúng tệp gốc được (c031).
- Câu chốt chương: định dạng mới làm mỗi lần nén "đỡ phí" hơn, nhưng mất thế hệ vẫn còn nếu ảnh cứ bị nén lại có mất dữ liệu. Thứ cứu ảnh là đừng nén lại.
- Gợi ý hình ảnh: bàn cân dung lượng các định dạng (chỉ ghi các con số có claim); chiếc iPhone gửi HEIF sang máy khác thành JPEG.

## Chốt (khoảng 45 giây)
- Tóm ba ý: JPEG cố ý vứt phần mắt khó thấy (Chương 2–3); vứt lại với cùng luật thì gần như không mất thêm, nhưng mỗi ứng dụng một luật, một kích thước, một lưới nên ảnh rỗ dần (Chương 4–5); định dạng mới giúp, nhưng chỉ không nén lại mới giữ được ảnh (Chương 6).
- Ba mẹo thực dụng: (1) cần giữ ảnh gốc thì gửi dạng tệp (Telegram ghi rõ "không nén", c001); (2) giữ bản gốc, đừng lưu lại ảnh nhận được rồi gửi tiếp; (3) đừng chụp màn hình một bức ảnh để gửi lại.
- Câu hỏi cho người xem: bức ảnh "rỗ" nhất bạn từng nhận trong nhóm gia đình là ảnh gì?
- Nối tập sau: để trống, sếp tổng chọn.

## Ghi chú cho scriptwriter
- Mọi phép tính (24 bit → 36 MB cho 12 triệu điểm; 12 đến 16 lần; 1/4 số điểm màu; 1.080/4.000) phải nói "làm phép tính" hoặc "ví dụ", không nói là số liệu chính thức.
- Con số về ngưỡng thu nhỏ của WhatsApp, Telegram, Facebook (c021) chỉ dùng kèm "nghiên cứu đo năm 2016". Không nói "hiện nay WhatsApp thu ảnh về 1.600".
- KHÔNG dùng: "Facebook nén còn 85%", "WhatsApp Standard là 1600 hay 1280 điểm", số liệu về Zalo, độ phân giải HD của Messenger, định dạng tệp chụp màn hình của iPhone. Lý do ở sources.md.
- c018 là ý tinh tế: không nói "nén lại không bao giờ mất", chỉ nói "lưu lại đúng cài đặt cũ thì gần như không đổi thêm"; libjpeg (c002) vẫn khuyên tránh nén lặp.
- Chuyện Nasir Ahmed (c011): chỉ kể đúng những gì trong claim. Không nói ông "đoạt giải" hay "không được trả tiền bản quyền".

## Ba đoạn cắt Short (mỗi đoạn tự đứng, khoảng 60 đến 90 giây, một ý)
1. S1 "Ảnh bạn nhận qua chat không phải ảnh gốc": móc + Chương 5, c001, c023, c024, c020, c021. Ý: chính Telegram nói họ làm ảnh nhỏ đi; Instagram ghi rõ 1.080; nghiên cứu đo thấy mọi nền tảng nén lại. Kết bằng mẹo gửi dạng tệp. Đoạn này khớp từ khoá tìm kiếm "vì sao ảnh gửi qua Messenger/Zalo bị mờ" (tiêu đề có thể dùng từ khoá, nội dung không đưa số về Zalo).
2. S2 "Lưu JPEG chất lượng 100 vẫn mất dữ liệu": Chương 3, c012, c014, c015, c016, c008, c009. Ý: chất lượng 100 vẫn bớt màu và vẫn làm tròn; trên 95 tệp phình to mà mắt không thấy; "85%" không phải đơn vị chung.
3. S3 "Thuật toán bị chê 'quá đơn giản' nay nằm trong mọi tấm ảnh": Chương 2, c011, c010, c005, c006. Ý: NSF từ chối năm 1972, bài 1974, năm 1988 thắng cuộc chấm mù, thành lõi JPEG 1992.
Dự phòng: S4 "Vì sao chụp màn hình tin nhắn làm chữ lem" (Chương 5 đoạn chụp màn hình, c017, c019); S5 "PNG ra đời từ một vụ bản quyền" (Chương 6, c026, c027).

## Ghi chú cho packager (tìm kiếm, lâu bền)
- Từ khoá người Việt hay tìm: "vì sao ảnh gửi qua Zalo bị mờ", "gửi ảnh không bị giảm chất lượng", "ảnh bị vỡ khi gửi Messenger", "JPEG là gì", "PNG và JPG khác gì". Tiêu đề gợi ý: "Vì sao ảnh gửi qua lại cứ mờ dần?" hoặc "Ảnh gửi qua chat bị mờ: thủ phạm thật là gì?". Nội dung không có số liệu Zalo; nếu tiêu đề có chữ Zalo thì lời đọc vẫn nói đúng ý chung "các ứng dụng chat".
