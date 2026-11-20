# Dàn ý: Vì sao cả một thành phố trong game vừa trong vài GB RAM (streaming, LOD, culling, nén, SSD)

Mục tiêu 10 đến 11 phút lời đọc cho người xem phổ thông Việt Nam. Như tập 6, dàn ý cố ý để dư: các chương cộng lại khoảng 12 phút, tức nguyên liệu cho khoảng 1.900 đến 2.100 từ. Scriptwriter cắt bớt, không độn. Mã `cNNN` trỏ tới `claims.json`.

Nối mạch: tập 1 máy chỉ có 0 và 1; tập 2 số thực cất không trọn; tập 3 số nguyên có trần; tập 4 nhầm đơn vị; tập 5 chữ là số theo bảng tra; tập 6 thời gian là một con số. Tập 7: bộ nhớ cũng có trần, và cả một ngành kỹ thuật sinh ra chỉ để giả vờ rằng nó không có trần.

Mạch "máy tính biểu diễn dữ liệu và giới hạn của nó": thế giới game là dữ liệu (hình khối, ảnh bề mặt, âm thanh); dữ liệu nằm trên ổ đĩa rất to nhưng chậm; máy chỉ vẽ được thứ nằm trong RAM nhỏ nhưng nhanh. Mọi mẹo trong tập là cách chọn đúng phần dữ liệu cần, đúng lúc.

**Luật hình ảnh và nội dung (bắt buộc):**
- GTA VI và GTA V chỉ là điểm vào bài (móc và một câu ở phần chốt). Lõi bài là kỹ thuật chung có nguồn: tài liệu Sony, Microsoft, Epic, bài báo ACM, bài nói chính thức của Mark Cerny.
- KHÔNG dùng hình, đoạn quay, logo, nhân vật hay bản đồ của game nào. Thành phố minh họa là thành phố tự vẽ, dạng khối hộp chung chung, không gợi Vice City, Leonida hay Los Santos.
- KHÔNG dùng tin đồn, rò rỉ, số đo của người chơi hay trang tin không dẫn nguồn. Không nói kích thước bản đồ GTA VI, số người làm, kinh phí, cấu hình PC: không có nguồn chính thức. Không nói "GTA VI dùng World Partition / Kraken / ..." vì Rockstar không công bố công nghệ bên trong. Chỉ nói "game thế giới mở nói chung" hoặc "theo Sony / Microsoft / Epic".
- Không nói giá GTA VI (đề bài không cần; chỉ có nguồn thứ cấp).

Ghi chú lời đọc (luật từ tiếng Anh của kênh): nói "bộ nhớ RAM" hoặc "RAM" (đọc rời từng chữ "ram" thì cần nghe thử ở khâu phát âm), "ổ cứng quay", "ổ thể rắn SSD", "nạp dần theo vùng" (streaming), "mức chi tiết" (LOD), "loại bỏ thứ không thấy" (culling), "ảnh bề mặt" (texture), "bộ giải nén". Tên riêng (PlayStation, Xbox, Rockstar, Unreal, Kraken, Mark Cerny, Spider-Man) giữ nguyên, không phiên âm kiểu Việt hóa. Đơn vị: GB đọc "gi-ga-bai" theo lexicon cũ của kênh nếu đã có; MB, GB/s hiện trên hình.

## Móc mở đầu (khoảng 1 phút)
- Hôm qua, 19/11/2026, GTA VI ra mắt trên PlayStation 5 và Xbox Series X|S (c001). Trước đó, Rockstar báo bản tải trước cần tới 212 GB trống, tùy máy (c002).
- Trong khi đó PS5 chỉ có 16 GB bộ nhớ RAM (c003). Phép tính: dữ liệu game to gấp khoảng 13 lần cả bộ nhớ của máy (c007). Câu gài: vậy máy cất cả thành phố ở đâu, và làm sao người chơi lái xe xuyên thành phố mà không gặp màn hình chờ?
- Nhìn lại một chút: GTA V ra ngày 17/9/2013 trên PS3 và Xbox 360 (c008), hai máy chỉ có 512 MB bộ nhớ: PS3 chia 256 MB chính + 256 MB đồ họa (c009), Xbox 360 dùng chung 512 MB (c010). Phép tính: 512 MB là một phần 32 của 16 GB. Vậy mà vẫn có cả một thành phố.
- Hứa hẹn của tập: năm mẹo kỹ thuật, có từ năm 1976 tới nay, giúp máy "giả vờ" có cả thành phố trong đầu.
- Gợi ý hình ảnh: một chiếc hộp nhỏ ghi "16 GB" bên cạnh một kho hàng khổng lồ ghi "212 GB"; thành phố khối hộp tự vẽ.

## Chương 1: Hai loại bộ nhớ, và ý tưởng "tập làm việc" từ năm 1976 (khoảng 1 phút 45)
Ý chính: RAM nhanh nhưng nhỏ, ổ đĩa to nhưng chậm; game chỉ cần giữ trong RAM phần thế giới đang "dùng tới".
- Hình ảnh so sánh: RAM như mặt bàn làm việc, ổ đĩa như kho. Không ai bê cả kho lên bàn.
- Ý tưởng này có từ rất sớm: năm 1976, James Clark viết trên tạp chí Communications of the ACM rằng cả môi trường có thể phức tạp rất nhiều, trong khi phần nhìn thấy ở mỗi khung hình được giữ dưới một mức trần; ông gọi phần cần có trong bộ nhớ chính là "tập làm việc" (working set) đồ họa, và đề xuất thay đổi lượng chi tiết theo cảnh (c011).
- Ba câu hỏi game phải trả lời liên tục, cũng là khung cho cả tập: nạp phần nào (Chương 2, 3)? vẽ chi tiết tới đâu (Chương 4)? cất gọn thế nào (Chương 5)?
- Gợi ý hình ảnh: bàn làm việc nhỏ và cái kho; một vòng tròn sáng quanh người chơi trên bản đồ khối hộp.

## Chương 2: Cắt thành phố thành ô, và cái giá của ổ cứng quay (khoảng 2 phút)
Ý chính: thế giới được chia thành nhiều mảnh, nạp mảnh gần, bỏ mảnh xa; với ổ cứng quay, việc này rất khó.
- Cách làm phổ biến hiện nay, ví dụ Unreal Engine (công cụ làm game của Epic): World Partition chia không gian thành các ô lưới, ô được nạp và dỡ khi đang chạy tùy theo khoảng cách tới "nguồn nạp" như người chơi; "tầm nạp" quyết định bán kính (c020). Nói rõ đây là ví dụ Unreal, không phải công nghệ của Rockstar.
- Nhưng ô phải nạp kịp. Mọi máy PS4 đều có ổ cứng quay, và từ 2015–2016 các nhà làm game đã chạm giới hạn của nó (c025). Với ổ cứng quay, Mark Cerny (kiến trúc sư trưởng PS5) nói trong bài "The Road to PS5": dữ liệu nằm liền một khối thì đọc được 50 đến 100 MB mỗi giây; ở vùng ngoài của đĩa, 1 GB mất khoảng 10 giây (c012).
- Thực tế dữ liệu nằm rải rác, đầu đọc phải di chuyển ("tìm") liên tục; theo kinh nghiệm của Cerny, ổ cứng dành khoảng hai phần ba thời gian để tìm và một phần ba để đọc, nên 1 GB mất khoảng 20 giây (c013). Trong khi game trên PS4 dùng 5 đến 6 GB RAM (c014).
- Nén giúp được phần nào: PS4 hỗ trợ giải nén zlib, cho thêm khoảng 50% dữ liệu trên đĩa và 50% tốc độ đọc hiệu dụng (c015).
- Mẹo của người thiết kế màn chơi: hai khu vực giàu chi tiết thì nối bằng cầu thang dài, thang máy, hành lang ngoằn ngoèo để có khoảng 30 giây xóa dữ liệu cũ, nạp dữ liệu mới; hoặc chia thế giới thành mảnh nhỏ và tính toán tầm nhìn, tốc độ chạy, như Cerny kể khi làm thành phố Haven City trong Jak 2 (c016). Câu hay cho lời đọc: "những hành lang ngoằn ngoèo ấy có lý do của nó".
- Gợi ý hình ảnh: lưới ô vuông phủ thành phố, ô sáng quanh người chơi; đầu đọc ổ cứng chạy qua lại; hành lang zigzag.

## Chương 3: Cái hộp thư nằm trên ổ hàng trăm lần (khoảng 1 phút 45)
Ý chính: để ổ cứng đọc nhanh hơn, game chép trùng dữ liệu, và cái giá là dung lượng; RAM thì phải giữ sẵn dữ liệu cho cả nửa phút tới.
- Mẹo: gom mọi dữ liệu của một khối phố thành một khúc liền để bớt "tìm". Marvel's Spider-Man trên PS4 dùng cách này; hệ quả là chép trùng rất nhiều: những vật như hộp thư, sạp báo nằm trên ổ cứng hàng trăm lần (c017). Lưu ý: chỉ nói "hàng trăm lần", không nêu một con số cụ thể.
- Hệ quả khác: hoặc dữ liệu không vừa đĩa Blu-ray, hoặc phải giới hạn tốc độ chạy và lái của người chơi, vì người chơi không được đi nhanh hơn tốc độ nạp của ổ (c018). Nối với game thế giới mở: chạy xe càng nhanh, ổ càng phải theo kịp.
- RAM bị "đỗ" chờ: trên PS4, khi nhận ra cần một mẩu dữ liệu thì đã quá muộn để đi lấy, nên RAM phải chứa mọi thứ có thể dùng trong khoảng 30 giây chơi tới; phần lớn 8 GB RAM nằm chờ (c019).
- Gợi ý hình ảnh: một chiếc hộp thư tự vẽ được nhân bản kín cả kệ; đồng hồ cát 30 giây cạnh RAM.

## Chương 4: Xa thì vẽ thô, khuất thì không vẽ (khoảng 2 phút)
Ý chính: không phải thứ gì trong RAM cũng được vẽ đủ chi tiết; máy chỉ tốn công cho thứ người chơi thật sự thấy rõ.
- Mức chi tiết (LOD): ý tưởng thay đổi lượng chi tiết theo cảnh có từ bài của Clark năm 1976 (c011). Ví dụ minh họa (không cần nguồn số): một tòa nhà ở gần là hàng nghìn mặt, ở xa chỉ còn một khối hộp.
- Ảnh bề mặt cũng có nhiều mức: mipmap là chuỗi ảnh cùng nội dung, mỗi mức nhỏ đi một nửa chiều rộng và chiều cao; vật ở gần dùng ảnh nét, vật ở xa dùng ảnh nhỏ (c022). Microsoft cũng ghi rõ mipmap đổi lại tốn thêm bộ nhớ (c022). Phép tính cho scriptwriter: chuỗi 1/4 + 1/16 + ... cộng thêm khoảng một phần ba so với ảnh gốc (nói là phép tính, không cần nguồn ngoài).
- Loại bỏ thứ không thấy (culling), theo tài liệu Unreal: thứ nằm ngoài khung nhìn camera thì bỏ (frustum culling); thứ bị vật khác che thì bỏ (occlusion culling); thứ quá xa khoảng cách vẽ thì bỏ (distance culling) (c021).
- Bài báo năm 1976 của Clark đã nói tới việc cắt bỏ phần ngoài tầm nhìn bằng một phép tìm rất nhanh trên cây phân cấp (c011). Nối tập 1: lại là chia đôi, chia nhỏ.
- Gợi ý hình ảnh: hình nón tầm nhìn của camera, nhà ngoài nón mờ đi; tòa nhà ba mức chi tiết; chuỗi ảnh mipmap 256, 128, 64.

## Chương 5: Nén, và những con chip chỉ để giải nén (khoảng 2 phút)
Ý chính: dữ liệu được nén hai lớp: ảnh bề mặt nén theo kiểu GPU đọc thẳng được, còn gói dữ liệu trên ổ thì nén thêm và giải nén bằng chip riêng.
- Nén ảnh bề mặt theo khối: định dạng BC1 cất mỗi khối 4×4 điểm ảnh (16 điểm) trong 8 byte; BC7 dùng 16 byte cho mỗi khối; phần cứng giải mã nhanh (c023). Phép tính: ảnh thường 4 byte mỗi điểm thì 16 điểm là 64 byte, BC1 chỉ còn một phần tám (c024).
- Nén gói dữ liệu: PS4 dùng zlib; PS5 dùng thêm Kraken của RAD Game Tools, nén tốt hơn zlib khoảng 10% (c026).
- Sony xây hẳn một bộ giải nén Kraken trong chip: nhận hơn 5 GB dữ liệu nén mỗi giây, sau giải nén thường thành 8 đến 9 GB mỗi giây, tối đa 22 GB/s nếu dữ liệu nén tốt (c027). Muốn làm việc đó bằng CPU thường thì cần tương đương 9 nhân Zen 2 (c028).
- Xbox Series X|S cũng có khối giải nén phần cứng: 2,4 GB/s thô, 4,8 GB/s sau giải nén (c029); Microsoft làm thêm thuật toán riêng cho ảnh bề mặt tên BCPack (c030).
- Microsoft còn đo được: GPU thường chỉ truy cập chưa tới một phần ba dữ liệu ảnh bề mặt đã nạp vào bộ nhớ; tính năng Sampler Feedback Streaming chỉ nạp phần ảnh thật sự cần, trung bình cho hiệu quả khoảng 2,5 lần về tốc độ đọc và bộ nhớ (c030). Nói là "theo Microsoft", không phải số đo độc lập.
- Gợi ý hình ảnh: khối 4×4 ô màu thu gọn thành một thẻ nhỏ; con chip giải nén như cái phễu: 5,5 vào, 8 đến 9 ra.

## Chương 6: Khi ổ đĩa gần như thành RAM (khoảng 1 phút 45)
Ý chính: ổ SSD nhanh thay đổi cách làm game: bớt chép trùng, bớt dữ liệu đỗ chờ, bớt hành lang ngoằn ngoèo. Nhưng game vẫn to.
- PS5: ổ SSD 825 GB, đọc thô 5,5 GB/s (c004). Cerny: hỏi lại câu "mất bao lâu để nạp 2 GB?", đáp án khoảng một phần tư giây, nhanh hơn chừng 100 lần (c032).
- Hình ảnh mạnh nhất: người chơi quay đầu mất nửa giây; trong nửa giây đó có thể nạp khoảng 4 GB dữ liệu nén cho mọi thứ phía sau lưng (c033).
- Không chỉ ổ nhanh: Cerny kể trên PS4, gắn ổ SSD nhanh gấp 10 lần ổ cứng có khi chỉ nạp nhanh gấp đôi, vì nút thắt nằm ở chỗ khác; nên PS5 làm thêm phần cứng riêng (c035).
- Hệ quả cho RAM: SSD của PS5 "gần như là thêm RAM": cần gì thì nạp ngay, không phải đỗ sẵn nhiều dữ liệu; Cerny nói đây là một lý do PS5 không cần tăng RAM gấp nhiều lần so với đời trước (c034). Phép tính: PS4 8 GB (c019) lên PS5 16 GB (c003) là gấp 2.
- Microsoft nói tương tự: kiến trúc Velocity cho truy cập trực tiếp hơn 100 GB dữ liệu game trên SSD (c031).
- Nhưng dung lượng cài vẫn lớn: 212 GB (c002). Phép tính: khoảng một phần tư ổ 825 GB của PS5 trên giấy (c004), và hơn 40% ổ 512 GB của bản Xbox Series S thấp nhất trên giấy (c006, c036). Nói rõ dung lượng dùng được thực tế còn nhỏ hơn con số in trên hộp, KHÔNG nêu số cụ thể.
- Gợi ý hình ảnh: người chơi quay 180 độ, phía sau hiện dần các khối nhà; thanh dung lượng ổ đĩa đầy một phần tư.

## Chốt (khoảng 45 giây)
- Tóm năm mẹo: chỉ giữ tập làm việc (Chương 1), cắt thế giới thành ô và nạp dần (Chương 2–3), xa thì vẽ thô, khuất thì không vẽ (Chương 4), nén hai lớp (Chương 5), ổ nhanh để bớt phải giả vờ (Chương 6).
- Câu kết: từ 512 MB của thời GTA V (c009, c010) tới 16 GB hôm nay (c003), bộ nhớ to lên 32 lần, nhưng thế giới game luôn to hơn bộ nhớ; nên game không bao giờ "có cả thành phố" cùng lúc, nó chỉ có đúng phần bạn đang nhìn.
- Câu hỏi để lại cho người xem (bình luận): game thế giới mở nào bạn thấy "nạp" mượt nhất?
