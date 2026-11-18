# Nguồn: Vì sao chữ Việt bị lỗi font (bảng mã, Unicode, UTF-8)

Ngày đọc tất cả nguồn dưới đây: 2026-11-18. "Loại" theo luật trong `roles/researcher.md`. Phần "đọc bằng WebFetch" nghĩa là công cụ trả bản tóm tắt theo câu hỏi, chưa phải đọc từng chữ; người kiểm nên mở lại nguồn.

## Nguồn gốc (primary)

| URL | Loại | Ngày đọc | Dùng cho ý gì |
|---|---|---|---|
| https://www.cl.cam.ac.uk/~mgk25/ucs/utf-8-history.txt | primary (bản lưu thư của Rob Pike về lịch sử UTF-8, trên trang của Markus Kuhn, ĐH Cambridge) | 2026-11-18 | UTF-8 do Ken Thompson và Rob Pike thiết kế khoảng tháng 9/1992 "trên tấm lót đĩa trong quán ăn ở New Jersey"; 4/9/1992 đổi mã Plan 9, 8/9/1992 gửi X/Open; vai trò Thompson; yêu cầu tự đồng bộ và không có byte ASCII bên trong ký tự nhiều byte (c018–c021) |
| https://www.rfc-editor.org/rfc/rfc3629 | primary (RFC 3629, tháng 11/2003) | 2026-11-18 | UTF-8 dùng 1 đến 4 byte cho U+0000..U+10FFFF; bảng mẫu bit; ASCII 1 byte, chuỗi ASCII là UTF-8 hợp lệ (c001, c022–c024) |
| https://encoding.spec.whatwg.org/ | primary (đặc tả Encoding của WHATWG; chỉ đọc 100.000 ký tự đầu của trang 157.000) | 2026-11-18 | "latin1" và "ascii" chỉ là nhãn của windows-1252; giao thức/định dạng mới "must use the UTF-8 encoding exclusively"; windows-1258 nằm trong nhóm bảng mã cũ (c001, c004, c026). Chưa tự kiểm bảng ánh xạ byte 0xE1, 0xBA, 0xBF, 0x87 của windows-1252 trong đặc tả (phần index nằm ngoài vùng đọc); kết quả "Tiáº¿ng Viá»‡t" là do Python tính. |
| https://www.unicode.org/history/publicationdates.html | primary (Unicode Consortium, ngày phát hành các phiên bản) | 2026-11-18 | Unicode 1.0 tập 1 tháng 10/1991; 6.0 ngày 11/10/2010 (c016, c017) |
| https://www.unicode.org/versions/Unicode6.0.0/ | primary (Unicode Consortium) | 2026-11-18 | Unicode 6.0 phát hành 11/10/2010, 2.088 ký tự mới, thêm emoji, "especially important for mobile phones" (c017). Trang không nêu số emoji chính xác. |
| https://www.unicode.org/reports/tr15/ | primary (UAX #15, chuẩn hóa Unicode) | 2026-11-18 | NFD là phân rã, NFC phân rã rồi ghép lại; ví dụ a + dấu mũ rời thành â; tương đương chính tắc (c031, c032). Trang không nhắc tiếng Việt; chữ ệ là phép tính bằng Python unicodedata. |
| https://www.etsi.org/deliver/etsi_ts/123000_123099/123038/17.00.00_60/ts_123038v170000p.pdf | primary (3GPP/ETSI TS 123 038 v17.0.0, tải PDF, đọc bằng pdftotext) | 2026-11-18 | Bảng 7 bit mặc định tối đa 160 ký tự; UCS2 tối đa 140 octet, 70 ký tự; (140×8)/7 = 160 (c037–c039). Tìm các chữ ệ ữ ế ơ ư ă trong toàn bộ văn bản PDF bằng grep: 0 kết quả (chưa tự đọc được ảnh bảng 6.2.1). Trong văn bản không thấy bảng ngôn ngữ riêng cho tiếng Việt (chỉ Turkish, Spanish, Portuguese, Bengali, Gujarati, Hindi, Urdu...), nhưng đây là tìm chuỗi "Vietnam" bằng grep, không phải khẳng định đã đọc hết. |
| https://devblogs.microsoft.com/oldnewthing/20040324-00/?p=40093 | primary (blog của Raymond Chen, Microsoft, 24/3/2004) | 2026-11-18 | Notepad đoán bảng mã tệp không BOM bằng IsTextUnicode; "Absolute certainty is not guaranteed"; chuỗi ngắn dễ đoán nhầm (c034). Bài KHÔNG chứa câu "Bush hid the facts". |
| https://caselaw.vn/van-ban-phap-luat/235396-quyet-dinh-so-72-2002-qd-ttg-ngay-10-06-2002-cua-thu-tuong-chinh-phu-thong-nhat-dung-bo-ma-cac-ky-tu-chu-viet-theo-tieu-chuan-tcvn-6909-2001-trong-trao-doi-thong-tin-dien-tu-giua-cac-to-chuc-cua-dang-va-nha-nuoc | primary (văn bản pháp luật Quyết định 72/2002/QĐ-TTg, trang tra cứu caselaw.vn, không phải cổng chính phủ; nên đối chiếu thuvienphapluat.vn hoặc CSDL quốc gia) | 2026-11-18 | Ký 10/6/2002 (Phạm Gia Khiêm); Điều 1: từ 1/1/2003 thống nhất dùng TCVN 6909:2001 trong trao đổi thông tin điện tử giữa tổ chức Đảng và Nhà nước; Điều 2: chuyển đổi cơ sở dữ liệu từng bước; hiệu lực từ ngày ký (c028, c029) |
| https://engineering.fb.com/2019/09/26/android/unicode-font-converter/ | primary (blog kỹ thuật của Facebook, 26/9/2019; đọc bằng WebFetch) | 2026-11-18 | Zawgyi không tương thích Unicode; phần lớn thiết bị ở Myanmar còn dùng Zawgyi; bỏ Zawgyi khỏi ngôn ngữ giao diện cho người mới năm trước; làm bộ chuyển đổi trong Facebook và Messenger (c040, c041). Bài không nêu số người dùng và không giải thích vì sao có Zawgyi. |

## Nguồn thứ cấp (secondary)

| URL | Loại | Ngày đọc | Dùng cho ý gì |
|---|---|---|---|
| https://en.wikipedia.org/wiki/ASCII | secondary (Wikipedia; chỉ đọc 100.000 ký tự đầu) | 2026-11-18 | ASCII 1963, 7 bit, 128 vị trí (95 in được + 33 điều khiển); lý do 7 bit; ASCII mở rộng; UTF-8 vượt các bảng mã cũ khoảng 2008 (c005–c009). Nên tìm thêm bản gốc ASA X3.4-1963 hoặc nguồn khác để chốt. |
| https://en.wikipedia.org/wiki/Mojibake | secondary (Wikipedia; đọc 100.000 ký tự đầu của 130.000) | 2026-11-18 | Từ mojibake (文字化け); "chữ ma", "loạn mã"; UTF-8 đọc như Windows-1252 là lỗi phổ biến nhất (c002, c003) |
| https://en.wikipedia.org/wiki/VSCII | secondary (Wikipedia) | 2026-11-18 | TCVN 5712:1993 và ba biến thể; VN3/TCVN3/ABC; Bắc dùng VSCII, Nam dùng VNI; phông chữ hoa riêng (c011–c013, c015). Wikipedia KHÔNG nói biến thể nào dùng nhiều nhất; ý đó đã bỏ khỏi c011. |
| https://en.wikipedia.org/wiki/Vietnamese_language_and_computers | secondary (Wikipedia) | 2026-11-18 | 134 chữ cái thêm ngoài 52 của ASCII (trích báo cáo Viet-Std); TCVN3, VNI, Windows-1258; trình duyệt không hỗ trợ bảng mã đặc thù (c011–c015) |
| https://vnexpress.net/hay-dung-unicode-de-phuc-vu-cho-tieng-viet-1505023.html | secondary (báo VnExpress, 16/11/2002, tường thuật hội thảo Microsoft VN) | 2026-11-18 | Hơn 40 bảng mã 8 bit (ABC, VNI, TCVN 5712); TCVN 6909:2001 ban hành 24/9/2001; Quyết định tháng 6/2002 hiệu lực 1/1/2003; lời ông Bùi Quang Ngọc (FPT) (c010, c027, c030) |
| https://itecspec.com/spec/3gpp-23-038-4-sms-data-coding-scheme | secondary (trang chép lại TS 23.038 mục 4) | 2026-11-18 | 160 ký tự 7 bit; 140 octet, 70 ký tự UCS2 (c037) |
| https://en.wikipedia.org/wiki/GSM_03.38 | secondary (Wikipedia; bảng 7 bit mặc định và bảng mở rộng, đọc 100.000 ký tự đầu) | 2026-11-18 | Bảng 7 bit mặc định gồm è é ù ì ò à Ç É Ä Ö Ñ Ü Å Ø Æ ä ö ñ ü å ø æ ß; bảng mở rộng chỉ có FF CR2 ^ { } \ [ ~ ] \| €; không có ệ, ữ, ế (c039). Sau khi sửa: nguồn đọc trực tiếp bảng. |
| https://en.wikipedia.org/wiki/Bush_hid_the_facts | secondary (Wikipedia) | 2026-11-18 | Hiện tượng "Bush hid the facts"; chuỗi kích hoạt khác; IsTextUnicode từ NT 3.5 năm 1994; phát hiện đầu 2004; Vista đổi thuật toán (c035, c036) |
| https://w3techs.com/technologies/details/en-utf8 | secondary (khảo sát W3Techs) | 2026-11-18 | UTF-8: 99,1% website biết được bảng mã, tiêu đề trang ghi tháng 11/2026 (c025). Số này đổi theo ngày. |
| https://eclecticlight.co/2021/05/08/explainer-unicode-normalization-and-apfs/ | secondary (blog Eclectic Light, giải thích APFS và chuẩn hóa; chỉ thấy qua kết quả tìm kiếm, CHƯA mở trang) | 2026-11-18 | HFS+ chuẩn hóa tên tệp dạng phân rã, APFS không chuẩn hóa (c033). Cần người kiểm mở trang trước khi dùng. |

## Lời kể, blog, bình luận (anecdotal; không dùng chốt fact)

| URL | Loại | Ngày đọc | Dùng cho ý gì |
|---|---|---|---|
| https://archives.miloush.net/michkap/archive/2007/04/22/2239345.html | anecdotal (blog Michael Kaplan, bản lưu, 22/4/2007) | 2026-11-18 | Chỉ để biết cộng đồng đã bàn về IsTextUnicode và Notepad; ông nhắc cụm "Bush hid the facts" như chuyện đùa (c035) |

## Không mở được / chưa đọc

- https://vietunicode.sourceforge.net/charset/ : lỗi 503; https://vietunicode.sourceforge.net/faq.htm : lỗi 404. (Đây là nguồn tốt về TCVN3/VNI; chưa dùng được. Wikipedia chỉ trích lại nó.)
- https://www.unicode.org/faq/vietnamese.html : 404. https://www.freecalypso.org/.../0338-720.pdf : 404 (đã dùng bản ETSI v17 thay thế).
- Chưa tìm được văn bản gốc TCVN 5712:1993 và TCVN 6909:2001 (bản trả phí); các claim về chúng chỉ có nguồn thứ cấp.
- Chưa tìm được nguồn gốc về lúc Windows/Microsoft hỗ trợ Unicode tiếng Việt, hay về Unikey; đã bỏ khỏi dàn ý.


## Bổ sung vòng sửa nguồn (2026-11-18, sau Cổng 1)

Đã tự mở và đọc các nguồn mới dưới đây (WebFetch trả bản tóm tắt theo câu hỏi; riêng IRG và APFS tôi tải PDF và đọc bằng pdftotext).

| URL | Loại | Dùng cho ý gì |
|---|---|---|
| https://ethw.org/Milestones:American_Standard_Code_for_Information_Interchange_ASCII,_1963 | primary (IEEE, trang cột mốc ASCII) | Bản đầu tiên 1963 do tiểu ban X3.2 của ASA xuất bản; 128 ký tự, mã 7 bit; 33 điều khiển, 95 in được; ASCII là bảng mã phổ biến nhất trên web đến tháng 12/2007 rồi UTF-8 vượt lên (c005, c009) |
| https://www.rfc-editor.org/rfc/rfc20 | primary (RFC 20, 10/1969, V. Cerf) | ASCII 7 bit nhúng trong byte 8 bit có bit cao luôn 0; bảng không có chữ cái có dấu (c005, c007). RFC 20 trích "USAS X3.4-1968", không nhắc 1963 |
| https://www.linfo.org/ascii.html | secondary (The Linux Information Project) | 1963 ASA; 128 mã; bit thứ tám ban đầu để làm bit chẵn lẻ; ISO 8859, Windows dùng tập mở rộng của Latin 1, MacRoman, nhiều bản mở rộng mâu thuẫn nhau (c006, c008). Bài tự đếm "95" và "96" ký tự in được không nhất quán. |
| https://ngonngu.net/cv_datdau_ptl0/86 | secondary (bài trên ngonngu.net) | "40 bảng mã 8-bit" cho chữ Việt (c010). CẢNH BÁO: trang này ghi Quyết định 72 là ngày 20/06/2002, mâu thuẫn với văn bản gốc (10/06/2002, đã đối chiếu ở c028); không dùng ngày của trang này. |
| https://vietunicode.sourceforge.net/main.html | secondary (Vietnamese Unicode FAQs) | "Most popular among them were VNI, VPS, VISCII, and TCVN3 (ABC)" (c011) |
| https://vietunicode.sourceforge.net/charset/index.html | secondary (Vietnamese Unicode FAQs, trang so sánh bảng mã) | Chữ hoa nguyên âm TCVN3 ánh xạ sang phông chữ hoa riêng; các bảng mã 8 bit tương tự Latin-1; VNI dùng hai byte (c013). Không nhắc "ABC" và không nhắc TCVN 5712/VN1-3. |
| https://unicode.org/irg/docs/n0866-VietnamActivityReport.pdf | primary (báo cáo Việt Nam gửi IRG, Unicode.org; đọc bằng pdftotext) | TCVN (Directorate of Standards and Quality) công bố TCVN 6909:2001 "in September", mọi ký tự La-tinh tiếng Việt và điểm mã trong ISO/IEC 10646 được chấp nhận (c027). Không có ngày 24. |
| https://developer.apple.com/library/archive/technotes/tn/tn1150.html | primary (Apple Technical Note TN1150, HFS Plus Volume Format) | "HFS Plus stores strings fully decomposed and in canonical order" (c033) |
| https://developer.apple.com/support/downloads/Apple-File-System-Reference.pdf | primary (Apple File System Reference; đọc bằng pdftotext) | Tên tệp là chuỗi UTF-8; cờ APFS_INCOMPAT_NORMALIZATION_INSENSITIVE "Filenames on this volume are normalization insensitive"; băm tên: chuẩn hóa NFD rồi tính CRC-32C (c033) |
| https://learn.microsoft.com/en-us/windows/win32/api/winbase/nf-winbase-istextunicode | primary (Microsoft Learn, IsTextUnicode, cập nhật 2024-02) | "These tests are not foolproof... some ASCII strings can slip through" (c036). Trang yêu cầu tối thiểu Windows 2000, không nhắc NT 3.5 hay 1994. |
| https://w3techs.com/technologies/details/en-utf8 | primary (chính W3Techs là nơi công bố số liệu) | c025 đổi `credibility` từ secondary sang primary |

Đã bỏ vì không tìm được nguồn thứ hai tên miền khác: c003 (UTF-8 đọc như Windows-1252 là lỗi phổ biến nhất), c014 (134 chữ cái), c015 (trình duyệt không hỗ trợ TCVN3/VNI), c030 (lời ông Bùi Quang Ngọc). Đã làm yếu: c006, c008, c009, c010, c011, c013, c027, c033, c036 (chữ claim đổi, xem báo cáo). Ghi chú: google blog 2008 (Moving to Unicode 5.1) không mở được bản gốc; W3C blog, Britannica trả 403; web.archive.org bị chặn; itscj.ipsj.or.jp không phân giải tên miền.

Vòng 3: c033 chỉ còn phần HFS+ (TN1150); bỏ vế APFS, nên nguồn Apple File System Reference không còn dùng cho claim nào. c008 bỏ mốc "giữa thập niên 1980" (linfo.org có nói, nhưng chỉ một nguồn).
