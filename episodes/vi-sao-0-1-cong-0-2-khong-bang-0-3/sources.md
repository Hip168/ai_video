# Nguồn: Vì sao 0,1 + 0,2 không bằng 0,3

Ngày đọc tất cả nguồn dưới đây: 2026-11-12. "Loại" theo luật trong `roles/researcher.md`.

## Nguồn gốc (primary)

| URL | Loại | Ngày đọc | Dùng cho ý gì |
|---|---|---|---|
| https://docs.python.org/3/tutorial/floatingpoint.html | primary (tài liệu chính thức Python, chương "Floating-Point Arithmetic: Issues and Limitations") | 2026-11-12 | 1/3 trong thập phân; 1/10 lặp vô hạn trong nhị phân; giá trị lưu thật của 0.1 và phân số 3602879701896397 / 2**55; 53 bit; "since at least 2000" IEEE 754 binary64; 0.1 cộng 3 lần và 10 lần; math.isclose (c002–c004, c006–c008, c011, c017, c036) |
| https://docs.python.org/3/library/decimal.html | primary (tài liệu chính thức Python) | 2026-11-12 | Decimal biểu diễn chính xác; 0.1+0.1+0.1-0.3 bằng 0 so với 5.5511151231257827e-017; ưa dùng trong kế toán; Decimal.from_float(0.1) (c002, c006, c035) |
| https://docs.python.org/3/library/sys.html | primary (tài liệu chính thức Python) | 2026-11-12 | sys.float_info: dig = 15, mant_dig, epsilon (c012, c013) |
| https://tc39.es/ecma262/ | primary (đặc tả ECMAScript, mục 6.1.6.1 The Number Type, 21.1.2.1 Number.EPSILON, 21.1.2.6 Number.MAX_SAFE_INTEGER) | 2026-11-12 | Number là binary64 IEEE 754-2019; EPSILON ≈ 2,2204460492503130808472633361816 × 10⁻¹⁶; MAX_SAFE_INTEGER = 9007199254740991 = 2⁵³ − 1; 9007199254740992 và 9007199254740993 cùng ra 9007199254740992; làm tròn roundTiesToEven (c001, c009, c013–c015, c024) |
| https://learn.microsoft.com/en-us/cpp/build/ieee-floating-point-representation | primary (tài liệu chính thức Microsoft C++) | 2026-11-12 | double: 1 bit dấu, 11 bit mũ, 52 bit định trị; bit 1 đầu ngầm hiểu nên thực tế 53 bit; 1/10 lặp vô hạn, giống 1/3 trong thập phân (c004, c005, c010, c011) |
| https://docs.oracle.com/cd/E19957-01/806-3568/ncg_goldberg.html | primary (bản in lại có biên tập của bài gốc D. Goldberg, Computing Surveys, 3/1991, © ACM 1991) | 2026-11-12 | 0.1 có biểu diễn nhị phân lặp vô hạn; double p = 53, mũ 11 bit, 64 bit; IEEE yêu cầu làm tròn chính xác, mặc định làm tròn về gần nhất (round to even) (c004, c011, c015, c016) |
| https://people.eecs.berkeley.edu/~wkahan/ieee754status/754story.html | primary (phỏng vấn W. Kahan do Charles Severance thực hiện ngày 20/2/1998, bản cho IEEE Computer 3/1998, đặt trên trang của Kahan) | 2026-11-12 | Mỗi dòng máy có phạm vi, độ chính xác, cách làm tròn riêng; Intel bắt đầu thiết kế bộ đồng xử lý năm 1976 và mời Kahan; Kahan, Coonen, Stone soạn bản "K-C-S" cho p754 (c018–c020) |
| https://www2.eecs.berkeley.edu/Faculty/Homepages/kahan.html | primary (trang giảng viên chính thức UC Berkeley EECS) | 2026-11-12 | Kahan nhận giải Turing năm 1989; góp phần chính tạo ra IEEE 754-1985; giảng viên Berkeley (c019, c023) |
| https://standards.ieee.org/ieee/754/993/ | primary (trang chuẩn IEEE) | 2026-11-12 | IEEE 754-1985, thông qua 21/3/1985, xuất bản 12/10/1985, bị thay bởi 754-2008 (c022) |
| https://standards.ieee.org/ieee/754/6210/ | primary (trang chuẩn IEEE) | 2026-11-12 | IEEE 754-2019 đang hiệu lực, thông qua 13/6/2019, xuất bản 22/7/2019 (c024) |
| https://www.gao.gov/products/imtec-92-26 | primary (trang báo cáo GAO) | 2026-11-12 | Tên báo cáo, số IMTEC-92-26, ngày 4/2/1992 (c025) |
| https://www.gao.gov/assets/imtec-92-26.pdf | primary (toàn văn báo cáo GAO, bản quét; đọc bằng pdftotext) | 2026-11-12 | 25/2/1991, Dhahran, 28 lính Mỹ; đồng hồ phần mười giây; thanh ghi 24 bit; chạy hơn 100 giờ; bảng phụ lục II (8 giờ: 0,0275 giây, 55 m; 100 giờ: 0,3433 giây, 687 m); dữ liệu Israel 20% sau 8 giờ, khoảng 20 giờ thì hỏng; khởi động lại 60–90 giây; phần mềm sửa đến 26/2/1991 (c025–c032) |
| https://www-users.cse.umn.edu/~arnold/disasters/Patriot-dharan-skeel-siam.pdf | primary (bài của Robert Skeel, "Roundoff Error and the Patriot Missile", SIAM News 7/1992, tập 25 số 4, trang 11; bản lưu trên trang của D. Arnold, UMN) | 2026-11-12 | 0,1 biểu diễn bằng 24 bit bị cắt cụt; 0,0275 và 0,3433 giây; chương trình con chuyển đổi chính xác hơn không được gọi ở mọi chỗ, nên sai số không triệt tiêu (c026, c028, c029, c033, c034) |

## Nguồn thứ cấp (secondary)

| URL | Loại | Ngày đọc | Dùng cho ý gì |
|---|---|---|---|
| https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/EPSILON | secondary (MDN) | 2026-11-12 | Ví dụ console.log(0.1 + 0.2) // 0.30000000000000004 và === 0.3 là false (c001) |
| https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number | secondary (MDN) | 2026-11-12 | 1 bit dấu, 11 bit mũ, 52 bit định trị; số nguyên an toàn đến 2⁵³ − 1 (c009, c010, c014) |
| https://ethw.org/Milestones:IEEE_Standard_754_for_Binary_Floating-Point_Arithmetic,_1985 | secondary (IEEE Engineering and Technology History Wiki, trang cột mốc) | 2026-11-12 | Trước chuẩn "portability ... was a nightmare"; Kahan, Stone, Coonen soạn đề xuất năm 1978; thông qua 1985; Kahan nhận Turing 1989 (c018–c020, c022, c023) |
| https://ethw.org/Milestones:Intel_8087_Math_Coprocessor,_1980 | secondary (ETHW, trang cột mốc IEEE, gắn biển năm 2025) | 2026-11-12 | 8087 năm 1980; kiểu dữ liệu và số học của nó là nền của IEEE 754 (c021) |
| https://en.wikipedia.org/wiki/Intel_8087 | secondary (chỉ thấy qua đoạn trích kết quả tìm kiếm, chưa mở trang) | 2026-11-12 | 8087 công bố năm 1980 (c021) |
| https://www-users.cse.umn.edu/~arnold/disasters/patriot.html | secondary (trang giảng dạy của D. Arnold, UMN; cùng tên miền gốc với bản PDF của Skeel nên không tính là nguồn độc lập) | 2026-11-12 | 1/10 bị cắt ở 24 bit; sai số khoảng 0,34 giây (c033) |

## Kiểm tra tại chỗ (không phải nguồn, chỉ để người kiểm tái lập)
- Python 3 và Node trên máy: `0.1 + 0.2` in `0.30000000000000004`; `Decimal(0.1)`, `Decimal(0.2)`, `Decimal(0.3)` cho thấy 0,1 và 0,2 lưu hơi lớn, còn 0,3 lưu hơi nhỏ (0.299999999999999988897769753748434595763683319091796875); `0.1 + 0.7` in `0.7999999999999999`; `sys.float_info.dig` = 15; `Number.MAX_SAFE_INTEGER` = 9007199254740991.

## Ý đã bỏ (không có nguồn tốt hoặc ngoài phạm vi)
- Tốc độ Scud khoảng 1.676 m/s, "hơn nửa cây số": chỉ có trang Arnold (thứ cấp); dùng con số 687 m của GAO.
- Sở giao dịch chứng khoán Vancouver (chỉ số tính sai do cắt bớt, 1982–1983): chỉ thấy nguồn thứ cấp và kể lại, không có nguồn gốc mở được.
- Tên lửa Ariane 5 (1996): lỗi tràn số khi đổi số thực sang số nguyên 16 bit, không phải lỗi làm tròn 0,1; dễ làm người xem hiểu nhầm nên không đưa vào.
- IEEE 754 được nhận làm chuẩn quốc tế ISO/IEC 60559 năm 1989: chỉ có một nguồn thứ cấp (ETHW), không đưa thành claim.

## Đã thử nhưng không mở được (không dùng)
- https://amturing.acm.org/award_winners/kahan_1023746.cfm : không mở được (HTTP 403).
- https://awards.acm.org/award_winners/kahan_1023746 : không mở được (HTTP 403).

## Bổ sung sau Cổng 2 (c037–c049), ngày đọc 2026-11-12

| URL | Loại | Ngày đọc | Dùng cho ý gì |
|---|---|---|---|
| https://docs.python.org/3/faq/general.html | primary (FAQ chính thức Python) | 2026-11-12 | "Python is an interpreted, interactive, object-oriented programming language" (c042) |
| https://docs.python.org/3/library/string.html | primary (tài liệu Python, kiểu 'e' = scientific notation) | 2026-11-12 | Ký hiệu khoa học: một chữ số trước dấu chấm, phần mũ; `f'{1500:.1e}'` cho `1.5e+03` (c041) |
| https://docs.python.org/3/library/stdtypes.html | primary (tài liệu Python) | 2026-11-12 | "Integers have unlimited precision"; float thường là double của C (c049) |
| https://tc39.es/ecma262/ (mục 6.1.6.1.7 Number::add, 21.1.2.6) | primary | 2026-11-12 | Number::add trả 𝔽(ℝ(x) + ℝ(y)): tính tổng chính xác rồi đổi về Number theo roundTiesToEven; số nguyên lớn hơn MAX_SAFE_INTEGER mới bị trùng (c047–c049) |
| https://docs.python.org/3/library/decimal.html | primary | 2026-11-12 | Decimal(float) / Decimal.from_float đổi CHÍNH XÁC một float sang thập phân; đây là cách lấy giá trị thật của 0.2, 0.3 và tổng (c045–c048). Tài liệu chỉ in sẵn giá trị của 0.1; giá trị của 0.2, 0.3 và tổng là kết quả chạy lệnh đó |
| https://docs.python.org/3/tutorial/floatingpoint.html | primary | 2026-11-12 | Phân số nhị phân có mẫu là lũy thừa của 2 (0.101 = 1/2 + 0/4 + 1/8); "17 significant digits" (c040, c043) |
| https://docs.python.org/3/library/sys.html | primary | 2026-11-12 | Ví dụ '9876543211234567' in lại thành 9876543211234568 khi vượt quá dig (c044) |
| https://en.wikipedia.org/wiki/Repeating_decimal | secondary | 2026-11-12 | 1/3 = 0,333...; 1/7 = 0,142857 với 6 chữ số lặp; quy tắc mẫu chỉ có thừa số 2 và 5; quy tắc cho cơ số bất kỳ; 1/5 = 0,2 (c037–c040) |
| https://mathworld.wolfram.com/RepeatingDecimal.html | secondary (Wolfram MathWorld) | 2026-11-12 | 1/3 = 0,333...; chu kỳ của 1/7 là 6; bỏ hết thừa số 2 và 5 khỏi mẫu, còn lại 1 thì khai triển dừng (c037–c039) |
| https://en.wikipedia.org/wiki/Scientific_notation | secondary | 2026-11-12 | Dạng m × 10ⁿ, 1 ≤ \|m\| < 10; 350 = 3,5 × 10² (c041) |
| https://mathworld.wolfram.com/ScientificNotation.html | secondary | 2026-11-12 | Định nghĩa ký hiệu khoa học (c041) |
| https://jvns.ca/blog/2023/02/08/why-does-0-1-plus-0-2-equal-0-30000000000000004/ | anecdotal (blog Julia Evans, 8/2/2023) | 2026-11-12 | In đủ giá trị thật của 0.1, 0.2, hai số double quanh 0,3, tổng chính xác; nói tổng nằm đúng giữa và làm tròn lên vì phần định trị chẵn (c045–c048). Không dùng để chốt fact; chỉ để người kiểm đối chiếu |

Ghi chú: không tìm được nguồn primary/secondary nào in sẵn giá trị thật của 0.2, 0.3 hay nói "tổng nằm đúng giữa". Người kiểm tái lập được: `python3 -c "from decimal import Decimal as D; import math; print(D(0.2), D(0.3), D(0.1)+D(0.2), D(math.nextafter(0.3,1)))"`; trung điểm của hai số double quanh 0,3 bằng đúng tổng (đã chạy, ra True). Đã bỏ: `0.1 + 0.7` = 0.7999999999999999 (chỉ có kết quả chạy máy, không có nguồn), đề xuất scriptwriter đổi câu thách thức.
