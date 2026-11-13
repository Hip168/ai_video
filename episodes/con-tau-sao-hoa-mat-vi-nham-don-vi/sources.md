# Nguồn: Con tàu Sao Hỏa mất tích vì nhầm đơn vị (Mars Climate Orbiter, 1999)

Ngày đọc tất cả nguồn dưới đây: 2026-11-14. "Loại" theo luật trong `roles/researcher.md`. Các PDF đọc bằng `curl` + `pdftotext`.

## Nguồn gốc (primary)

| URL | Loại | Ngày đọc | Dùng cho ý gì |
|---|---|---|---|
| https://llis.nasa.gov/llis_lib/pdf/1009464main1_0641-mr.pdf | primary (NASA, "Mars Climate Orbiter Mishap Investigation Board Phase I Report", 10/11/1999, chủ tịch Arthur G. Stephenson; bản PDF trên hệ thống bài học kinh nghiệm LLIS của NASA) | 2026-11-14 | Nguồn chính của cả tập: nguyên nhân gốc (file "Small Forces"/SM_FORCES, file AMD, SIS quy định N·s, phần mềm mặt đất ghi lbf·s, tính thấp 4,45 lần, phần mềm trên tàu đúng); nhiệm vụ vệ tinh thời tiết + chuyển tiếp cho MPL; phóng 11/12/1998, Delta II, Canaveral; bánh xe phản lực và AMD; AMD nhiều gấp 10–14 lần do pin mặt trời không đối xứng; chế độ "barbecue" bị bỏ; 4 tháng đầu file lỗi định dạng, dùng email, tháng 4/1999 thấy bất thường; lực đẩy vuông góc đường nhìn; mối lo chỉ báo không chính thức; TCM-4 15/9 nhắm 226 km, sau đó 150–170 km, rồi 110 km, tối thiểu 80 km; MOI 09:00:46 UTC, mất tín hiệu 09:04:52 UTC sớm 49 giây, khuất 21 phút, tìm đến 25/9; phát hiện lỗi 29/9; 57 km, thấp hơn khoảng 170 km; TCM-5 bàn nhưng không làm; đội dẫn đường vào ngay trước phóng, không kiểm thử phần mềm mặt đất; khuyến nghị kiểm tra đơn vị; danh sách thành viên (Peter Norvig, Ames) (c001, c003–c006, c008–c023, c026, c027, c031) |
| https://www.jpl.nasa.gov/news/press_kits/mcoarrivehq.pdf | primary (NASA/JPL, bộ tài liệu báo chí "Mars Climate Orbiter Arrival", 9/1999) | 2026-11-14 | Vệ tinh thời tiết liên hành tinh đầu tiên; phóng 11/12/1998 18:45:51 UTC, Delta II 7425, Launch Complex 17A Canaveral; 629 kg = 338 kg tàu + 291 kg nhiên liệu; bay 9 tháng rưỡi, 669 triệu km; chi phí Mars 98: 193,1 triệu phát triển + 42,8 triệu vận hành = 235,9 triệu cho cả tàu quỹ đạo và tàu đổ bộ, chưa tính tên lửa và Deep Space 2; bánh xe phản lực "giống bánh đà" (c003–c007, c009) |
| https://www.jpl.nasa.gov/news/press_kits/mars98launch.pdf | primary (NASA/JPL, bộ tài liệu báo chí "Mars 98 Launch", 12/1998) | 2026-11-14 | Khối lượng 629/338/291 kg; 669 triệu km; cùng con số chi phí 235,9 triệu cho cả hai tàu, chưa tính tên lửa (c005–c007) |
| https://nssdc.gsfc.nasa.gov/planetary/text/mco_pr_19990930.txt | primary (NASA Release 99-113, 30/9/1999, "Mars Climate Orbiter Team Finds Likely Cause of Loss", bản lưu trên NSSDC của NASA Goddard) | 2026-11-14 | Lỗi trao đổi thông tin giữa đội tàu ở Colorado và đội dẫn đường ở California; một đội dùng đơn vị Anh, một đội dùng hệ mét; câu nói của Edward Weiler; JPL ở Pasadena, Lockheed Martin Astronautics ở Denver (c001, c008, c024, c025) |
| https://nssdc.gsfc.nasa.gov/planetary/news/mco_19990923.html | primary (tin NSSDC/NASA Goddard ngày 23/9/1999, kèm thông cáo JPL) | 2026-11-14 | Đốt động cơ lúc 09:01 UT; telemetry bình thường đến lúc khuất; ước tính ban đầu 60 km thay vì 150 km, tối thiểu khoảng 85 km (c016, c030) |
| https://www.nist.gov/pml/special-publication-811/nist-guide-si-appendix-b-conversion-factors/nist-guide-si-appendix-b9 | primary (NIST SP 811, phụ lục B.9, bảng hệ số chuyển đổi) | 2026-11-14 | pound-force (lbf) → newton (N): 4,448 222 (c002) |
| https://learn.microsoft.com/en-us/dotnet/fsharp/language-reference/units-of-measure | primary (tài liệu chính thức Microsoft về F#, "Units of Measure") | 2026-11-14 | Gắn đơn vị vào số, trình dịch kiểm tra và báo "mismatched units"; mục "Units at Runtime": đơn vị bị loại bỏ khi biên dịch, mất lúc chạy (c028, c029) |

## Nguồn thứ cấp (secondary)

| URL | Loại | Ngày đọc | Dùng cho ý gì |
|---|---|---|---|
| https://www.sciencedaily.com/releases/1999/09/990924075938.htm | secondary (ScienceDaily đăng lại thông cáo JPL ngày 24/9/1999) | 2026-11-14 | Lời Richard Cook (JPL): dự định 150 km, thực tế khoảng 60 km, tối thiểu 85 km (ước tính ban đầu) (c030) |

## Chỗ nguồn lệch nhau
- Độ cao: thông cáo ngày 23–24/9/1999 nói khoảng 60 km, tối thiểu 85 km, dự định 150 km; báo cáo điều tra 10/11/1999 nói 57 km, tối thiểu 80 km, nhắm 226 km (sau đó tụt 150–170 km). Dùng số của báo cáo; số 60/85 chỉ được nói là ước tính ban đầu (c030).
- Chi phí: báo chí năm 1999 và về sau dùng 125 triệu, 193,1 triệu, 327,6 triệu đô... với cách tính khác nhau. Nguồn chính thức đọc được chỉ có con số gộp 235,9 triệu (193,1 + 42,8) cho cả hai tàu (c007). Không dùng "125 triệu" vì chưa có nguồn gốc đọc được.

## Không mở được / không dùng
- https://sunnyday.mit.edu/accidents/MCO_report.pdf (bản lưu báo cáo điều tra): không kết nối được.
- https://www.jpl.nasa.gov/news/mars-climate-orbiter-team-finds-likely-cause-of-loss và https://www.jpl.nasa.gov/missions/mars-climate-orbiter: trả 403 với curl. Dùng bản thông cáo trên nssdc.gsfc.nasa.gov thay.
- https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1998-073A: không kết nối được.
- https://www.nasa.gov/home/hqnews/1999/99-134.txt (thông cáo ngày công bố báo cáo): 404.
- http://edition.cnn.com/TECH/space/9909/30/mars.metric.02/: 404.
