# Nguồn: Vì sao ảnh gửi qua gửi lại nhiều lần thì cứ mờ dần (JPEG, nén mất dữ liệu, mất thế hệ)

Ngày đọc tất cả nguồn dưới đây: 2026-11-20. "Loại" theo luật trong `roles/researcher.md`. Cách đọc: các PDF (Wallace, Farid, Zach, Giudice, bài JPEG AI 2025, bài của Nasir Ahmed, JFIF 1.02) và tài liệu libjpeg-turbo (usage.txt, README.ijg, jcparam.c), trang Hỏi đáp Telegram đã tải bản thô về và đọc trực tiếp đúng các dòng liên quan. Các trang còn lại đọc bằng WebFetch: công cụ trả bản tóm tắt kèm câu trích, người kiểm nên mở lại.

## Nguồn gốc (primary)

| URL | Loại | Ngày đọc | Dùng cho ý gì |
|---|---|---|---|
| https://telegram.org/faq | primary (Hỏi đáp chính thức của Telegram, mục "How do I send photos in full quality?") | 2026-11-20 | "Telegram makes photos smaller before sending..."; Standard mặc định; High Definition "4 times more pixels, while still using less than 0.5 MB"; "As a file — the original photo with no compression at all" (c001). Đã đọc bản thô. |
| https://raw.githubusercontent.com/libjpeg-turbo/libjpeg-turbo/main/doc/usage.txt | primary (tài liệu sử dụng chính thức của libjpeg-turbo, thừa kế từ IJG) | 2026-11-20 | "after ten or so cycles the image may be noticeably worse" (c002); "full-color (24-bit through 48-bit)" (c003); mắt nhạy độ sáng hơn màu (c008); mặc định "2x2, AKA 4:2:0" (c009); chất lượng mặc định 75, khuyên 50–95, trên 95 tệp to "dramatically" (c015); quality 100 vẫn mất ở lấy mẫu thưa và làm tròn (c016); đừng chuyển hình hoạt hình, hình vẽ nét sang JPEG (c017) |
| https://raw.githubusercontent.com/libjpeg-turbo/libjpeg-turbo/main/README.ijg | primary (README của IJG trong libjpeg-turbo) | 2026-11-20 | JPEG hợp ảnh chuyển màu mượt; nét sắc, cạnh đột ngột nén kém, dễ lộ vết nén; JPEG "normally lossy" (c017) |
| https://raw.githubusercontent.com/libjpeg-turbo/libjpeg-turbo/main/src/jcparam.c | primary (mã nguồn libjpeg-turbo) | 2026-11-20 | Bảng lượng tử mẫu Phụ lục K của T.81: "good" quality, chia 2 "very good"; mức 50 dùng bảng nguyên vẹn; "our recommended scaling curve" (c013, c014) |
| https://www.w3.org/Graphics/JPEG/jfif.pdf | primary (JFIF 1.02, Eric Hamilton, 1/9/1992; bản lưu của W3C) | 2026-11-20 | Một hoặc ba thành phần, YCbCr 256 mức (8 bit) (c003). Bản chuẩn hiện hành là ITU-T T.871 (05/2011), trang ITU không có phần tóm tắt nên không dùng làm nguồn chốt. |
| https://www.comp.nus.edu.sg/~cs5342/readings/wallace.pdf | primary (G. K. Wallace, "The JPEG Still Picture Compression Standard", bản nộp IEEE Trans. Consumer Electronics, 12/1991, đăng vol. 38 số 1, 2/1992; bản lưu ở Đại học Quốc gia Singapore) | 2026-11-20 | "Joint" = CCITT và ISO; 6/1987 chọn 3 trong 12; 1/1988 ADCT dựa trên DCT 8×8 thắng (c006); ô 8×8, DC là trung bình 64 mẫu (c010); lượng tử hoá "many-to-one... principal source of lossiness", bước 1–255 (c012); bảng bit/điểm ảnh: 1,5–2,0 "usually indistinguishable", 0,75–1,5 "excellent" (c004) |
| https://www.itu.int/rec/T-REC-T.81 | primary (ITU-T) | 2026-11-20 | T.81 (09/92), tên chuẩn, soạn chung với ISO/IEC (c005). Trang không ghi số ISO. |
| https://jpeg.org/jpeg/index.html | primary (trang chính thức ủy ban JPEG) | 2026-11-20 | "created in 1992 (latest version, 1994)... process that started in 1986"; ISO/IEC 10918-1 \| ITU-T T.81; "the most dominant still image format around" (c005, c007) |
| https://farid.berkeley.edu/downloads/publications/tifs09.pdf | primary (H. Farid, "Exposing Digital Forgeries from JPEG Ghosts", IEEE TIFS 2009, bản trên trang tác giả) | 2026-11-20 | YCbCr, kênh màu lấy mẫu thưa 2 lần, ô 8×8, DCT, ĉ = round(c/q) (c009, c010, c012); sai khác nhỏ nhất khi q2 = q1; q2 khác q1 làm "shift" giá trị; lệch lưới 8×8 sinh tần số mới, 64 vị trí lệch 0–7 điểm. Vòng Cổng 1: người kiểm KHÔNG mở được (chuyển hướng hfarid.org, tệp khoảng 16 MB, quá giới hạn 10 MB). Nay chỉ còn là nguồn phụ của c009, c010, c012 (các claim này đã có Wallace hoặc libjpeg); c018, c019 chuyển sang bài Zach 2012. |
| https://faui1-files.cs.fau.de/public/publications/mmsec/2012-Zach-AIF.pdf | primary (F. Zach, C. Riess, E. Angelopoulou, "Automated Image Forgery Detection through Classification of JPEG Ghosts", Đại học Erlangen-Nürnberg, 2012; PDF khoảng 1,5 MB) | 2026-11-20 | Nhắc lại quan sát của Farid: "the squared differences become smaller for this part of the image as q2 approaches q0" (c018); lưới khối "aligned and shifted JPEG grids in double-JPEG compression", "all possible 64 JPEG grid alignments"; "different quantization matrices in the first and second compression leads to a telltale high frequency component in the coefficient spectrum" (c019). Đã tải bản thô và đọc trực tiếp. |
| https://www.cse.iitd.ac.in/~pkalra/siv864-2019/assignment/DCT-History.pdf | primary (N. Ahmed, "How I Came Up with the Discrete Cosine Transform", Digital Signal Processing 1, 4–5, 1991; bản quét lưu ở IIT Delhi) | 2026-11-20 | Đầu 1972 đề xuất NSF không được cấp, người thẩm định chê "too simple"; làm với Natarajan và Rao mùa hè 1973; đăng IEEE Computer Transactions số tháng 1/1974 (c011). Researcher đọc được bản chữ, nhưng người kiểm Cổng 1 không mở được (lỗi chứng chỉ), nên c011 đã thu hẹp về những gì IEEE Spectrum và DOI xác nhận. |
| https://doi.org/10.1016/1051-2004(91)90086-Z | primary (DOI bài của Ahmed 1991) | 2026-11-20 | Xác nhận qua Crossref: tên bài, tạp chí Digital Signal Processing, tập 1, trang 4–5, 1991 (c011) |
| https://doi.org/10.1109/T-C.1974.223784 | primary (DOI bài "Discrete Cosine Transform") | 2026-11-20 | Xác nhận qua Crossref: Ahmed, Natarajan, Rao; IEEE Transactions on Computers C-23 số 1, trang 90–93, 1/1974 (c011). Trang IEEE Xplore không mở được bằng WebFetch. |
| https://arxiv.org/pdf/2504.03191 | primary (bài nghiên cứu "Three Forensic Cues for JPEG AI Images", arXiv 2025) | 2026-11-20 | "For traditional JPEG, repeated compressions barely lead to a change in PSNR, particularly at low bitrates. Only at a bitrate of 2.0 or higher, PSNRs are decreased by iterated compression." (c018) |
| https://arxiv.org/pdf/1610.06347 | primary (Giudice, Paratore, Moltisanti, Battiato, "A Classification Engine for Image Ballistics of Social Data", Đại học Catania, arXiv 20/10/2016) | 2026-11-20 | 2.720 ảnh, 10 nền tảng; bảng III: Facebook LQ M>960, HQ M>2048; WhatsApp M>1600; Telegram M>2560; Instagram M>1080; Facebook, Twitter, Telegram, WhatsApp, Instagram "always re-compress"; ngưỡng đổi theo thời gian (Twitter 1024 → 2048); xoá EXIF; "QF does not have a unique method to be computed" (c014, c020–c022). Số đo năm 2016. |
| https://www.facebook.com/help/instagram/1631821640426723 | primary (Trung tâm trợ giúp Instagram, bản tiếng Việt) | 2026-11-20 | "Khi bạn chia sẻ ảnh có chiều rộng từ 320 đến 1080 pixel, chúng tôi sẽ giữ ảnh đó ở độ phân giải gốc"; giảm xuống 1080; tỉ lệ 1,91:1 đến 3:4; cắt nếu không hỗ trợ (c023) |
| https://help.instagram.com/1631821640426723 | primary (cùng bài, tên miền help.instagram.com) | 2026-11-20 | Trang dựng bằng JavaScript, WebFetch chỉ thấy tiêu đề; nội dung khớp bản trên theo đoạn trích kết quả tìm kiếm. Kết quả tìm kiếm cho thấy có bản cũ ghi tỉ lệ 4:5 thay vì 3:4 (xem Rủi ro). |
| https://faq.whatsapp.com/759301289012856/?cms_platform=android | primary (Trung tâm trợ giúp WhatsApp, "About HD photos and videos") | 2026-11-20 | Standard hoặc HD; đặt mặc định ở Settings > Storage and data > Media upload quality; "The internet connection will impact the quality of media being sent and received, even if the media is sent in HD quality" (c024). Câu cuối đọc ở bản `cms_platform=iphone` cùng bài. Trang không có con số độ phân giải. |
| https://about.fb.com/news/2024/04/hd-photos-shared-albums-and-more-on-messenger/ | primary (Meta, 9/4/2024) | 2026-11-20 | Messenger gửi ảnh HD: chọn ảnh, bật nút HD, gửi (c025). Không có số độ phân giải. |
| https://www.w3.org/TR/png-3/ | primary (W3C, PNG Third Edition, Khuyến nghị 24/6/2025) | 2026-11-20 | Lossless "bit-for-bit"; deflate, lưu dạng zlib (c026) |
| https://www.w3.org/TR/REC-png-961001 | primary (W3C, PNG 1.0, Khuyến nghị 1/10/1996) | 2026-11-20 | "lossless, portable, well-compressed storage"; ngày 1/10/1996 (c026, c027) |
| https://developers.google.com/speed/webp | primary (Google) | 2026-11-20 | WebP lossless nhỏ hơn PNG 26%; lossy nhỏ hơn JPEG 25–34% ở cùng SSIM (c028). Số do Google tự công bố. |
| https://support.apple.com/en-us/116944 | primary (Apple, "Using HEIF or HEVC media on Apple devices") | 2026-11-20 | iOS 11 và macOS High Sierra; nén tốt hơn JPEG; chia sẻ sang thiết bị chưa hỗ trợ có thể đổi sang JPEG (c029) |
| https://aomediacodec.github.io/av1-avif/v1.0.0.html | primary (AOMedia, đặc tả AVIF) | 2026-11-20 | "v1.0.0, 19 February 2019"; AV1 trong HEIF (c030). Bản hiện hành là v1.2.0 (16/10/2025). |
| https://jpeg.org/jpegxl/ | primary (ủy ban JPEG) | 2026-11-20 | ISO/IEC 18181; JPEG có sẵn chuyển sang JPEG XL không mất dữ liệu, nhỏ đi đáng kể (c031). Trang không nêu phần trăm. |
| https://github.com/libjxl/libjxl | primary (kho mã tham chiếu JPEG XL) | 2026-11-20 | "JPEG XL was standardized in 2022 as ISO/IEC 18181"; cjxl mặc định nén lại JPEG không mất dữ liệu, djxl khôi phục tệp JPEG gốc (c031) |

## Nguồn thứ cấp (secondary)

| URL | Loại | Ngày đọc | Dùng cho ý gì |
|---|---|---|---|
| https://spectrum.ieee.org/compression-algorithms | secondary (IEEE Spectrum) | 2026-11-20 | Lời Ahmed: "the reviewers said the idea was too simple"; NSF năm 1972; bài tháng 1/1974 (c011) |
| http://www.libpng.org/pub/png/pnghist.html | secondary (Greg Roelofs, thành viên nhóm PNG, "History of the Portable Network Graphics Format"; lời kể của người trong cuộc) | 2026-11-20 | CompuServe công bố thoả thuận với Unisys "28 December 1994"; bản nháp đầu (tên PBF) "4 January 1995"; W3C 1/10/1996; RFC 2083 ngày 15/1/1997 (c027) |

## Đã mở nhưng không dùng / không mở được

- https://www.itu.int/rec/T-REC-T.871 : trang ITU chỉ có danh sách phiên bản (05/11, đính chính 03/13), không có tóm tắt nội dung; c003 dùng JFIF 1.02 và libjpeg.
- https://ieeexplore.ieee.org/document/1672377 : trang trống khi mở bằng WebFetch; thay bằng DOI và Crossref.
- https://help.instagram.com/1631821640426723 : dựng bằng JavaScript, đọc qua bản facebook.com/help/instagram.
- https://core.telegram.org/bots/api : quá dài, không tới được mục sendPhoto; không dùng.
- Facebook (ảnh đăng lên Facebook): KHÔNG tìm được trang trợ giúp chính thức hiện hành ghi kích thước hay mức nén. Các con số 720/960/2048 lưu truyền đều từ blog nhiếp ảnh 2014–2017 (fstoppers.com, photographylife.com...), loại `anecdotal`, không dùng. Chỉ dùng số đo của Giudice 2016 (c021), nói rõ năm đo.
- WhatsApp: báo công nghệ (MacRumors, 9to5mac, TechRadar, 2023–2024) ghi ảnh Standard bị thu về 960×1280 hoặc tương tự; không có tài liệu chính thức, KHÔNG dùng.
- Messenger 2017 (https://about.fb.com/news/2017/11/making-visual-messaging-even-better-introducing-high-resolution-photos-in-messenger/): Meta ghi gửi được ảnh "4K... up to 4,096 x 4,096 pixels". Đã mở, nhưng không dùng: là thông báo 2017, không nói mặc định, dễ mâu thuẫn với nút HD 2024.
- Zalo: tìm không ra tài liệu chính thức của Zalo về nén ảnh; chỉ có bài hướng dẫn của các trang bán điện thoại (thegioididong, cellphones, phongvu...), loại `anecdotal`. Không có claim nào về Zalo.
- Định dạng ảnh chụp màn hình trên iPhone (PNG hay HEIF): chỉ có diễn đàn Apple Community và MacRumors; trang chính thức Apple chỉ nói về Mac. Không thành claim.
- Thí nghiệm nén lặp trên blog (blog.codinghorror.com, blog.kasson.com, kazukikandakk.github.io): `anecdotal`, chỉ để hiểu; ý chốt dùng bài nghiên cứu (c018).
- Báo cáo kỹ thuật Chan 1992 "Recompression of Still Images" (kar.kent.ac.uk/id/document/3322): chưa mở được toàn văn, không dùng.

## Rủi ro

- c021, c022 dựa trên một nghiên cứu duy nhất, đo năm 2016 (arXiv, chưa kiểm bản đăng hội nghị). Các nền tảng có thể đã đổi ngưỡng; lời đọc phải gắn "năm 2016".
- c023: bản tiếng Việt hiện ghi tỉ lệ 1,91:1 đến 3:4; kết quả tìm kiếm cho thấy có bản ghi 4:5. Nếu người kiểm thấy khác thì bỏ phần tỉ lệ khung, giữ phần 1.080.
- c027: các mốc 28/12/1994 và 4/1/1995 chỉ có lời kể của Greg Roelofs (secondary); mốc 1/10/1996 có W3C (primary). Nếu Cổng 1 đòi thêm nguồn thì bỏ hai mốc đầu, chỉ nói "cuối năm 1994".
- c028: con số WebP do chính Google công bố, không có nghiên cứu độc lập trong lô này.
- c018: kết quả "nén lặp gần như không giảm PSNR" là của một bài arXiv 2025 (chưa rõ đã bình duyệt) cộng với quan sát JPEG ghost (Farid, nhắc lại trong bài Zach 2012); libjpeg (c002) nói ngược sắc thái ("sau khoảng mười vòng xấu thấy rõ"). Hai ý không mâu thuẫn nếu nói đúng: cùng cài đặt thì ít đổi, đổi cài đặt/lưới thì cộng dồn.
- Bản PDF của Wallace (NUS) và của Ahmed (IIT Delhi) là bản lưu ở trường đại học, không phải trang nhà xuất bản; đã khớp thông tin xuất bản qua Crossref (Ahmed) và lời trong PDF (Wallace).
