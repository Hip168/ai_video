# Nguồn: Vì sao máy tính lại sai giờ (đồng hồ, múi giờ, giây nhuận)

Ngày đọc tất cả nguồn dưới đây: 2026-11-20. "Loại" theo luật trong `roles/researcher.md`. Phần lớn nguồn đọc bằng WebFetch: công cụ trả bản tóm tắt theo câu hỏi kèm câu trích, chưa phải đọc từng chữ, nên người kiểm nên mở lại. Riêng hai tệp tzdb (`asia`, `australasia`) đã tải bản thô về và đọc trực tiếp đúng các dòng liên quan.

## Nguồn gốc (primary)

| URL | Loại | Ngày đọc | Dùng cho ý gì |
|---|---|---|---|
| https://support.google.com/chrome/answer/95669?hl=en | primary (Trợ giúp Google Chrome) | 2026-11-20 | Lỗi "Your clock is behind / ahead", NET::ERR_CERT_DATE_INVALID; nguyên nhân là ngày giờ thiết bị sai; cách sửa (c001) |
| https://www.rfc-editor.org/rfc/rfc5280 | primary (RFC 5280, chứng chỉ X.509) | 2026-11-20 | Mục 4.1.2.5: notBefore, notAfter, khoảng hiệu lực tính cả hai đầu (c002, c004) |
| https://letsencrypt.org/docs/faq/ | primary (Let's Encrypt) | 2026-11-20 | Chứng chỉ mặc định 90 ngày, loại ngắn hạn 6 ngày (c003) |
| https://www.nist.gov/pml/time-and-frequency-division/timekeeping-and-clocks-faqs | primary (NIST) | 2026-11-20 | Thạch anh thường 32.768 Hz; lệch 0,1 Hz thì sai 1 giây sau 327.680 giây, khoảng 0,26 giây/ngày; định nghĩa giây theo xêsi từ 1967 (c005–c008) |
| https://www.nist.gov/node/1861426 | primary (NIST) | 2026-11-20 | Chia cho 32.768 để ra nhịp một giây; cùng ví dụ 0,1 Hz (c005, c007). Cùng tên miền nist.gov với dòng trên. |
| https://source.android.com/docs/core/connect/time | primary (tài liệu Android AOSP) | 2026-11-20 | Nguồn giờ tự động: NTP và NITZ bật mặc định, NTP ưu tiên; GNSS có từ Android 12, không mặc định (c009). Trang KHÔNG nói NITZ do nhà mạng phát; đừng nói thêm. |
| https://www.rfc-editor.org/rfc/rfc958 | primary (RFC 958, 9/1985) | 2026-11-20 | NTP lần đầu, tác giả D. L. Mills (c010) |
| https://www.rfc-editor.org/rfc/rfc5905 | primary (RFC 5905, 6/2010, NTPv4) | 2026-11-20 | Độ chính xác (vài chục µs cho máy chủ gốc, vài trăm µs trong LAN); mốc 1/1/1900; kỷ 0 quay vòng "some time in 2036" (Hình 4 ghi 8/2/2036 là ngày đầu kỷ 1; lúc quay vòng 06:28:16 UTC 7/2/2036 là phép tính 2^32 giây) (c011, c012). Chỉ đọc 100.000 ký tự đầu của trang. |
| https://pubs.opengroup.org/onlinepubs/9799919799/basedefs/V1_chap03.html | primary (POSIX, The Open Group) | 2026-11-20 | Định nghĩa 3.125 Epoch: 0 giờ 1/1/1970 UTC (c013, c015) |
| https://pubs.opengroup.org/onlinepubs/9799919799/basedefs/V1_chap04.html | primary (POSIX) | 2026-11-20 | Mục 4.19 Seconds Since the Epoch: mỗi ngày đúng 86.400 giây; công thức (c014, c015). Trang không dùng chữ "leap second"; câu "không có chỗ cho giây nhuận" là suy ra từ 86.400 giây/ngày. |
| https://github.com/eggert/tz/blob/main/asia | primary (tzdb, kho mã của người điều phối Paul Eggert; cùng dữ liệu IANA phát hành) | 2026-11-20 | Lịch sử giờ Việt Nam (Zone Asia/Ho_Chi_Minh): 1906 giờ Phù Liễn 7:06:30; 1911 +7; 1942 +8; 3/1945 +9; 1/9/1945 về +7 (dẫn Việt Nam Dân Quốc Công Báo số 1, 29/9/1945); 1947 +8 vùng Pháp kiểm soát; 1955 miền Nam về +7 (Dụ 46); miền Nam +8 từ 31/12/1959 (dẫn sắc lệnh 362-TTP); 13/6/1975 về +7 (c017–c020, c037). tzdb dẫn sách "Lịch Việt Nam: thế kỷ XX-XXI" của Trần Tiến Bình. |
| https://github.com/eggert/tz/blob/main/australasia | primary (tzdb) | 2026-11-20 | Samoa: International Date Line Act 2011; bỏ thứ Sáu 30/12/2011; −11 sang +13 (c022) |
| https://www.iana.org/time-zones | primary (IANA) | 2026-11-20 | Mô tả cơ sở dữ liệu múi giờ; bản 2026f ngày 27/10/2026 (c021) |
| https://mm.icann.org/pipermail/tz/2011-October/017036.html | primary (thư ICANN gửi danh sách tz, 10/2011) | 2026-11-20 | Vụ Astrolabe nộp đơn 30/9/2011; ICANN nhận vận hành theo đề nghị IETF; Olson ở NIH; "gần ba thập kỷ" (c023) |
| https://www.eff.org/press/releases/eff-wins-protection-time-zone-database | primary (thông cáo EFF, bên bảo vệ Olson và Eggert, 22/2/2012) | 2026-11-20 | Vụ kiện bị rút, xin lỗi, cam kết không kiện; câu của McSherry (c023, c024). Lưu ý EFF là một bên trong vụ việc. |
| https://www.rfc-editor.org/rfc/rfc6557 | primary (RFC 6557, BCP 175, 2/2012) | 2026-11-20 | Quy trình duy trì tz; người điều phối và người dự phòng; không tự đặt chính sách giờ (c025) |
| https://www.nist.gov/pml/time-and-frequency-division/leap-seconds-faqs | primary (NIST) | 2026-11-20 | Giây nhuận giữ lệch dưới 0,9 giây; cuối tháng 6 hoặc tháng 12; ghi 23h 59m 60s; bắt đầu 1972 với hiệu chỉnh 10 giây (c026) |
| https://hpiers.obspm.fr/iers/bul/bulc/Leap_Second.dat | primary (IERS, bảng giây nhuận) | 2026-11-20 | 28 dòng: 1/1/1972 TAI−UTC = 10 s, ... 1/1/2017 = 37 s, tức 27 giây nhuận (c027) |
| https://datacenter.iers.org/data/latestVersion/bulletinC.txt | primary (IERS Bulletin C 72, 6/7/2026) | 2026-11-20 | Không có giây nhuận cuối 12/2026; UTC−TAI = −37 s từ 1/1/2017 (c028) |
| https://blog.cloudflare.com/how-and-why-the-leap-second-affected-cloudflare-dns/ | primary (Cloudflare tự viết về sự cố) | 2026-11-20 | 1/1/2017: RRDNS viết bằng Go, giả định thời gian không lùi, số âm, rand.Int63n panic; 0,2% truy vấn DNS lúc cao điểm; dưới 1% yêu cầu HTTP lỗi; sửa xong toàn cầu 06:45 UTC (c031). Câu cho c038: "If, right when a resolution is happening, time goes back a second the perceived resolution time will be negative." Bài KHÔNG mô tả 23:59:60 hay việc lặp giây. |
| https://github.com/torvalds/linux/blob/65e4fd942f72a9dba0e4e257290c4fa1aa756854/kernel/time/ntp.c#L612-L616 | primary (mã nguồn nhân Linux, kernel/time/ntp.c, hàm second_overflow; ghim theo commit 65e4fd9 của nhánh chính) | 2026-11-20 | Chú thích: "If in leap-insert state at the end of the day, the system clock is set back one second"; nhật ký "Clock: inserting leap second 23:59:60 UTC" (c038). Đã tải tệp thô và đọc trực tiếp. |
| https://go.dev/doc/go1.9 | primary (ghi chú phát hành Go 1.9) | 2026-11-20 | Gói time tự theo dõi monotonic time (c032) |
| https://go.dev/doc/devel/release | primary (lịch phát hành Go) | 2026-11-20 | go1.9 phát hành 2017-08-24 (c032) |
| https://developers.google.com/time/smear | primary (Google Public NTP) | 2026-11-20 | Rải giây nhuận từ 2008; chuẩn đề xuất 24 giờ trưa-tới-trưa; mỗi giây dài hơn khoảng 11,6 µs; trước 2016 Google dùng 20 giờ (c033) |
| https://engineering.fb.com/2022/07/25/production-engineering/its-time-to-leave-the-leap-second-in-the-past/ | primary cho cách làm của Meta; secondary cho chuyện của Reddit, Cloudflare | 2026-11-20 | "UTC has been updated 27 times"; Reddit 2012 sập 30–40 phút do hrtimer; Cloudflare 2017; Meta rải 17 giờ từ 00:00 UTC; giây nhuận âm chưa từng thử ở quy mô lớn (c027, c030, c031, c034, c035) |
| https://www.bipm.org/en/cgpm-2022/resolution-4 | primary (BIPM, Nghị quyết 4 CGPM lần 27, 2022) | 2026-11-20 | Nâng mức UT1−UTC tối đa trong hoặc trước 2035; giây nhuận âm "never been foreseen or tested" (c035). Trang không nêu ngày họp cụ thể. |
| https://today.ucsd.edu/story/global-warming-is-influencing-global-timekeeping | primary (UC San Diego, trường của tác giả) | 2026-11-20 | Agnew, Nature 27/3/2024; giây nhuận âm "some time in 2028"; không có băng tan thì sớm hơn ba năm; "never happened before" (c036) |

## Nguồn thứ cấp (secondary)

| URL | Loại | Ngày đọc | Dùng cho ý gì |
|---|---|---|---|
| https://www.macrumors.com/2016/02/15/apple-to-fix-january-1-1970-date-bug-ios/ | secondary (báo công nghệ, 15/2/2016) | 2026-11-20 | Trích nguyên văn ghi chú hỗ trợ của Apple về tháng 5/1970 (c016) |
| https://fortune.com/2016/02/16/apple-ios-update-will-fix-1970-bug/ | secondary (Fortune, 16/2/2016) | 2026-11-20 | Cùng nội dung lời Apple (c016) |
| https://tienphong.vn/xa-hoi/8102/Truoc-nam-1975-Viet-Nam-su-dung-2-mui-gio.html | secondary (Tiền Phong, 29/4/2005, dẫn Tuổi Trẻ) | 2026-11-20 | Hai múi giờ trước 1975; sắc lệnh 362-TTP ngày 30/12/1959; 13/6/1975 trở lại múi 7, Sài Gòn vặn chậm 1 giờ (c019, c020). Bài ghi văn bản năm 2002 là "132/2002/QĐ-TTg", có vẻ sai số hiệu (xem Rủi ro). |
| https://baovanhoa.vn/doi-song/ca-nuoc-thong-nhat-su-dung-mui-gio-gmt7-236411.html | secondary (Báo Văn Hóa, 13/6/2026) | 2026-11-20 | "Ngày 13.6.1975, Chính phủ quyết định thống nhất giờ ... GMT+7" (c020) |
| https://www.rnz.co.nz/international/pacific-news/201742/samoa-to-skip-a-day-tonight | secondary (Radio New Zealand, 29/12/2011) | 2026-11-20 | Samoa bỏ một ngày lúc nửa đêm; để khớp NZ và Úc (c022). Bài không ghi tên thứ của ngày bị bỏ; phần đó lấy từ tzdb. |
| https://www.theregister.com/2012/02/23/astrolabe_to_leave_tz_database_alone/ | secondary (The Register, 23/2/2012) | 2026-11-20 | Astrolabe rút đơn, xin lỗi: "historical facts are no-one's property" (c024) |
| https://www.theregister.com/2012/07/02/leap_second_crashes_airlines/ | secondary (The Register, 2/7/2012) | 2026-11-20 | Altea của Amadeus ngừng khoảng 1 giờ; Qantas, Virgin Australia làm thủ tục bằng tay; Reddit, LinkedIn, Mozilla... bị ảnh hưởng; lỗi nhân Linux (c029, c030) |
| https://www.itnews.com.au/news/qantas-outage-pinpointed-on-leap-second-linux-bug-307379 | secondary (iTnews, 3/7/2012) | 2026-11-20 | Lời Amadeus: "caused by the Linux bug triggered by the 'leap second'" (c029). Bài không nêu thời lượng. |
| https://www.pbs.org/newshour/science/timekeepers-may-subtract-a-second-from-clocks-as-soon-as-2029-as-planet-spins-slightly-faster | secondary (PBS NewsHour/AP, 27/3/2024) | 2026-11-20 | Nature: "around 2029"; băng tan làm lùi khoảng ba năm (c036) |

## Đã mở nhưng không dùng / không mở được

- https://support.apple.com/en-us/HT205248 : ghi chú gốc của Apple về tháng 5/1970 nay đã chuyển sang trang khác, không còn nội dung đó. Vì vậy c016 chỉ dựa vào hai báo trích lại.
- https://support.google.com/chrome/answer/6098869 : không có nội dung về lỗi đồng hồ; đã thay bằng trang 95669.
- https://www.nature.com/articles/s41586-024-07170-0 : bài gốc của Agnew, không mở được (chuyển hướng sang trang đăng nhập). Dùng thông cáo UCSD và PBS.
- https://www.npr.org/2024/03/30/1241674216/climate-change-time-negative-leap-second : hết thời gian chờ, không mở được.
- https://thuvienphapluat.vn/... Quyết định 134/2002/QĐ-TTg : bị chặn (403), không mở được.
- https://wiki.archlinux.org/title/System_time : bị chặn chống bot. https://help.ubuntu.com/community/UbuntuTime : chuyển hướng tới trang 404.
- https://manpages.ubuntu.com/manpages/jammy/man8/hwclock.8.html và https://www.freedesktop.org/software/systemd/man/latest/timedatectl.html : mở được, nhưng không nói rõ Windows mặc định để đồng hồ phần cứng theo giờ địa phương. Chuyện lệch 7 tiếng khi cài song song Windows và Linux vì thế KHÔNG thành claim.
