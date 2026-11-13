# Nguồn: Khi máy tính đếm quá giới hạn (tràn số nguyên)

Ngày đọc tất cả nguồn dưới đây: 2026-11-14. "Loại" theo luật trong `roles/researcher.md`.

## Nguồn gốc (primary)

| URL | Loại | Ngày đọc | Dùng cho ý gì |
|---|---|---|---|
| https://docs.oracle.com/javase/specs/jls/se21/html/jls-4.html | primary (Java Language Specification SE 21, mục 4.2, 4.2.1, 4.2.2) | 2026-11-14 | byte, short, int, long là số nguyên có dấu bù hai 8/16/32/64 bit; phạm vi từng kiểu; "The integer operators do not indicate overflow or underflow in any way"; ví dụ 4.2.2-1: 1000000 * 1000000 kiểu int in ra -727379968 (c005–c008) |
| https://doc.rust-lang.org/book/ch03-02-data-types.html | primary (sách chính thức "The Rust Programming Language", chương 3.2) | 2026-11-14 | u8 từ 0 đến 255; tràn số: debug thì panic, release thì quay vòng (256 thành 0, 257 thành 1); "Relying on integer overflow's wrapping behavior is considered an error"; wrapping_/checked_/overflowing_/saturating_; số có dấu lưu bù hai, phạm vi −(2ⁿ⁻¹) đến 2ⁿ⁻¹ − 1, i8 từ −128 đến 127 (c004, c005, c030) |
| https://docs.python.org/3/library/stdtypes.html | primary (tài liệu chính thức Python, mục Numeric Types) | 2026-11-14 | "Integers have unlimited precision." (c029) |
| https://people.eecs.berkeley.edu/~demmel/ma221_Fall04/ariane5rep.html | primary (toàn văn báo cáo "ARIANE 5 Flight 501 Failure, Report by the Inquiry Board", Paris 19/7/1996, chủ tịch J.-L. Lions; bản lưu trên trang của J. Demmel, UC Berkeley; chưa đối chiếu từng chữ với bản ESA) | 2026-11-14 | 4/6/1996; mất dẫn đường 37 giây sau đánh lửa; SRI ngừng ở H0 + 36,7 giây; vỡ ở khoảng H0 + 39 giây, góc tấn hơn 20 độ, tự hủy; đổi số dấu phẩy động 64 bit sang số nguyên có dấu 16 bit của biến BH, Operand Error; hai SRI giống hệt phần cứng và phần mềm, bộ dự phòng hỏng ở chu kỳ trước (72 ms); SRI gần như giống Ariane 4; tốc độ ngang tăng nhanh gấp 5 lần; căn chỉnh vô ích sau cất cánh nhưng chạy thêm khoảng 40 giây; 7 biến, 4 được bảo vệ, 3 không; mục tiêu tải 80%; mã Ada; khuyến nghị R1 (c009–c016); mục 2.1 và 3.1 g–i: SRI hỏng gửi dãy bit chẩn đoán, máy tính chính (OBC) hiểu là dữ liệu bay, ra lệnh bẻ hết cỡ vòi phun tầng đẩy và Vulcain để sửa độ lệch tư thế không có, gây góc tấn lớn (c032, c033) |
| https://www.esa.int/Newsroom/Press_Releases/Ariane_501_-_Presentation_of_Inquiry_Board_report | primary (thông cáo báo chí ESA số 33-1996, ngày 23/7/1996; tóm tắt, không có toàn văn, không nêu tên chủ tịch, không nêu phép đổi 64→16 bit) | 2026-11-14 | 4/6/1996 chuyến bay đầu tiên thất bại; mất thông tin dẫn đường và tư thế ở H0 + 37 giây; lỗi đặc tả và thiết kế phần mềm hệ quán tính (c009, c010, c016) |
| https://ad.easa.europa.eu/blob/2015-09-07_superseded.pdf/AD_US-2015-09-07_1 | primary (bản Federal Register của FAA AD 2015-09-07, 80 FR 24789, do EASA lưu; đọc bằng pdftotext) | 2026-11-14 | 248 ngày cấp điện liên tục; bộ đếm phần mềm trong GCU bị tràn; bốn GCU chính cùng vào chế độ an toàn; mất toàn bộ điện xoay chiều bất kể giai đoạn bay, có thể mất kiểm soát; phát hiện khi thử nghiệm phòng thí nghiệm; hiệu lực 1/5/2015; tắt điện định kỳ không quá 120 ngày; 28 máy bay đăng ký tại Mỹ (c017–c020) |
| https://www.federalregister.gov/documents/2015/05/01/2015-10066/airworthiness-directives-the-boeing-company-airplanes | primary (bản gốc AD 2015-09-07 trên Federal Register) | 2026-11-14 | Không mở được (bị chuyển hướng sang trang chặn bot unblock.federalregister.gov). Không dùng trong claims; dùng bản EASA ở trên |
| https://www.govinfo.gov/content/pkg/FR-2018-10-16/html/2018-22152.htm | primary (FAA AD 2018-20-15, 83 FR 52131, Federal Register qua govinfo.gov) | 2026-11-14 | Nhắc lại bộ đếm GCU tràn sau 248 ngày; thay thế AD 2015-09-07; cài phần mềm OPS mới vào cả sáu GCU; hiệu lực 20/11/2018 (c017, c021) |
| https://archive.gps.gov/support/user/rollover/ | primary (trang lưu trữ chính thức GPS.gov của chính phủ Mỹ) | 2026-11-14 | Số tuần C/A 10 bit, tối đa 1.023; 19,7 năm quay về 0; đếm tuần từ 5/1/1980; lần đầu tháng 8/1999; lần hai 23:59:42 UTC ngày 6/4/2019; nhiều thiết bị gặp sự cố, có cái hỏng trước/sau vài tháng; lần tới với C/A + LNAV là 20/11/2038; CNAV số tuần 13 bit, đến 2137 (c022–c025) |
| https://www.measurement.govt.nz/assets/Uploads/Memorandum-on-GPS-2019.pdf | primary (bản ghi nhớ của DHS NCCIC "Memorandum for U.S. owners and operators using GPS to obtain UTC time", bản lưu trên trang Measurement Standards Laboratory New Zealand; đọc bằng pdftotext) | 2026-11-14 | Tham số số tuần 10 bit, giá trị 0 đến 1023, quay vòng mỗi 1024 tuần từ 0000Z ngày 6/1/1980; lần quay vòng trước 21/8/1999; lần tới 6/4/2019 (c022, c023) |
| https://www.gov.uk/government/publications/safety-bulletin-13-gps-week-number-rollover/safety-bulletin-13-gps-week-number-rollover | primary (Maritime & Coastguard Agency, chính phủ Anh, Safety Bulletin 13, 19/2/2019) | 2026-11-14 | Số tuần lưu bằng 10 bit, tối đa 1024 tuần (19,7 năm); quay vòng lần hai 6/4/2019; máy thu có thể cho dữ liệu lệch 19,7 năm về quá khứ hoặc tương lai (c022, c031) |
| https://www.gnu.org/software/gnulib/manual/html_node/Avoiding-the-year-2038-problem.html | primary (tài liệu chính thức GNU Gnulib) | 2026-11-14 | time_t 32 bit có dấu không biểu diễn được thời điểm từ 2038-01-19 03:14:08 UTC; cách chữa là time_t rộng hơn; glibc 2.34 trở lên, _TIME_BITS=64 (c027, c028) |
| https://pubs.opengroup.org/onlinepubs/9799919799/basedefs/V1_chap03.html | primary (POSIX.1-2024, Base Definitions, chương 3, định nghĩa 3.125 Epoch) | 2026-11-14 | Epoch là 0 giờ 0 phút 0 giây ngày 1/1/1970 UTC (c026) |
| https://pubs.opengroup.org/onlinepubs/9799919799/basedefs/V1_chap04.html | primary (POSIX.1-2024, mục "Seconds Since the Epoch") | 2026-11-14 | Thời gian là số giây xấp xỉ kể từ Epoch, kèm công thức (bổ trợ c026, không ghi trong claims) |

## Nguồn thứ cấp (secondary)

| URL | Loại | Ngày đọc | Dùng cho ý gì |
|---|---|---|---|
| https://www.guinnessworldrecords.com/world-records/381953-first-youtube-video-to-require-a-64-bit-counter | secondary (Guinness World Records, kỷ lục "First YouTube video to require a 64-bit counter") | 2026-11-14 | Gangnam Style của PSY, tháng 12/2014, vượt 2.147.483.647 lượt xem, số lớn nhất của bộ đếm 32 bit; YouTube nâng lên 64 bit (c001) |
| https://www.heraldnet.com/news/gangnam-style-pushes-youtube-to-its-limits | secondary (The Daily Herald, Everett; bài của Sarah Parvini, Los Angeles Times, 4/12/2014) | 2026-11-14 | Trích bài Google+ của YouTube ("...but that was before we met PSY"); trần 2.147.483.647; nâng lên 64 bit; phát ngôn viên Google Matt McLernon (theo CNN) nói YouTube "didn't technically break" (c001–c003) |
| https://www.dawn.com/news/1148775 | secondary (Dawn, Pakistan; tin AFP, 4/12/2014) | 2026-11-14 | Trích bài Google+ của YouTube ("We never thought a video would be watched in numbers greater than a 32-bit integer"); trần 32 bit là 2.147.483.647; có câu "YouTube engineers anticipated the problem and upgraded to a 64-bit integer" (đọc lại 2026-11-14, có trong bài) nhưng KHÔNG nói nâng cấp lúc nào (trước hay sau khi chạm trần); không trích phát ngôn viên Google nào (c001–c003) |
| https://lwn.net/Articles/643234/ | secondary (LWN.net, "System call conversion for year 2038", Jonathan Corbet, 5/5/2015) | 2026-11-14 | time_t 32 bit có dấu tràn vào tháng 1/2038 (không nêu giờ cụ thể) (c027) |

## Không mở được
- https://www.federalregister.gov/... (AD 2015-09-07): bị chặn bot, xem bảng trên.
- Bài gốc của YouTube trên Google+ (12/2014): Google+ đã đóng; web.archive.org không truy cập được từ máy này. Lời trích chỉ dựa vào hai bài báo thứ cấp khác tên miền.
- https://sourceware.org/glibc/wiki/Y2038ProofnessDesign: bị chặn bot (Anubis).
- https://www.cbc.ca/lite/story/1.2860186 (403) và https://www.bbc.com/news/world-asia-30288542 (không truy cập được): bài báo về Gangnam Style, không dùng.
- https://www.engadget.com/2014/12/04/op-op-op-op/: trang trả về rỗng, không dùng.

## Kiểm tra tại chỗ (không phải nguồn, chỉ để người kiểm tái lập)
Python 3 (`python3 -I`):
- `ctypes.c_int32(2**31).value` = −2147483648; `ctypes.c_int32(1000000*1000000).value` = −727379968; `ctypes.c_int16(32768).value` = −32768.
- 2⁸ − 1 = 255; 2¹⁶ − 1 = 65535; 2³² − 1 = 4294967295; 2³¹ − 1 = 2147483647; 2⁶³ − 1 = 9223372036854775807.
- `datetime(1970,1,1,tzinfo=utc) + timedelta(seconds=2**31-1)` = 2038-01-19 03:14:07 UTC; với `seconds=-2**31` = 1901-12-13 20:45:52 UTC.
- 2³¹ / 100 / 86400 ≈ 248,55 (ngày, nếu bộ đếm tính phần trăm giây; FAA KHÔNG nói đơn vị, chỉ là phép tính).
- (2⁶³ − 1) giây ≈ 292 tỉ năm (365,2425 ngày/năm).

## Ý đã bỏ (không có nguồn tốt hoặc ngoài phạm vi)
- "Gandhi hạt nhân" trong game Civilization (tràn số làm Gandhi hiếu chiến): chính Sid Meier nói đây là chuyện đồn; chỉ có sách hồi ký và báo game, dễ gây hiểu nhầm, bỏ.
- Màn 256 của Pac-Man (bộ đếm màn 8 bit): chỉ thấy nguồn thứ cấp và lời kể, không có nguồn gốc của Namco.
- Hãng Comair ngừng bay dịp Giáng sinh 2004 vì hệ thống xếp lịch tổ bay chạm giới hạn 32.767: chưa tìm được báo cáo gốc mở được, bỏ.
- Thiệt hại tiền của Ariane 501 (hàng trăm triệu USD): không có trong báo cáo điều tra hay thông cáo ESA, bỏ.
- Đơn vị bộ đếm GCU của Boeing 787 (phần trăm giây): chỉ là suy luận từ con số 248 ngày, FAA không công bố; để ở dạng phép tính, không làm claim.
