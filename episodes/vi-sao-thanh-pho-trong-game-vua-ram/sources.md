# Nguồn: Vì sao cả một thành phố trong game vừa trong vài GB RAM

Ngày đọc tất cả nguồn dưới đây: 2026-11-20. "Loại" theo luật trong `roles/researcher.md`. Phần lớn nguồn đọc bằng WebFetch (công cụ trả bản tóm tắt kèm câu trích, chưa phải đọc từng chữ), nên người kiểm nên mở lại. Ghi chú riêng từng nguồn ở cột cuối:
- Bài nói "The Road to PS5": đã tải phụ đề tiếng Anh tự động của YouTube và đọc trực tiếp theo mốc thời gian. Phụ đề tự động có lỗi nghe (vd ghi "16 gigabytes of gddr5", "Sikhs" thay cho "seeks", "Xen two" thay cho "Zen 2"); người kiểm nên nghe lại đúng mốc ghi trong `claims.json`.
- Trang Newswire của Rockstar dựng bằng JavaScript: công cụ chỉ đọc được tiêu đề và thẻ mô tả (meta description, đọc bằng curl), không đọc được thân bài.
- Ba thông cáo năm 2013 trên trang nhà đầu tư Take-Two: đã tải PDF và đọc chữ trực tiếp.
- Metadata hai bài báo ACM: đọc trực tiếp từ API Crossref theo DOI.

## Nguồn gốc (primary)

| URL | Loại | Ngày đọc | Dùng cho ý gì |
|---|---|---|---|
| https://www.rockstargames.com/newswire/article/39akk424a9oo53/grand-theft-auto-vi-now-available | primary (Rockstar Newswire) | 2026-11-20 | Thẻ mô tả: "Today we are proud to announce that Grand Theft Auto VI is now available worldwide for PlayStation 5 and XBOX Series X\|S." Thân bài không đọc được (JS). (c001) |
| https://www.rockstargames.com/newswire/article/ak3ak31a49a221/grand-theft-auto-vi-is-now-set-to-launch-november-19-2026 | primary (Rockstar Newswire) | 2026-11-20 | Tiêu đề: "Grand Theft Auto VI is Now Set to Launch November 19, 2026". Chỉ đọc được tiêu đề. (c001) |
| https://www.xbox.com/en-US/games/grand-theft-auto-vi | primary (cửa hàng Microsoft) | 2026-11-20 | Ngày phát hành "November 19, 2026"; nền tảng Xbox Series X\|S và Cloud; nhà phát hành Rockstar Games; trang KHÔNG ghi dung lượng (c001) |
| https://www.rockstargames.com/newswire/article/k4ak9okk485712/grand-theft-auto-vi-pre-load-begins-on-november-10 | primary (Rockstar Newswire, 3/11/2026) | 2026-11-20 | Bài gốc về tải trước, được TechRadar dẫn link. Chỉ đọc được tiêu đề và thẻ mô tả (phát hành 19/11 trên PS5, Xbox Series X\|S). Câu "up to 212 GB depending on your device" CHƯA đọc trực tiếp được từ trang này, chỉ qua hai nguồn thứ cấp bên dưới. (c002) |
| https://blog.playstation.com/2020/03/18/unveiling-new-details-of-playstation-5-hardware-technical-specs/ | primary (PlayStation Blog, 18/3/2020) | 2026-11-20 | PS5: GDDR6 16GB, 448GB/s; SSD 825GB; 5.5GB/s Read Bandwidth (Raw) (c003, c004) |
| https://www.youtube.com/watch?v=ph8LyNIT9sg | primary (kênh PlayStation chính thức, "The Road to PS5", Mark Cerny, 18/3/2020) | 2026-11-20 | Ổ cứng 50–100 MB/s, 1 GB ~10 s rồi ~20 s, 2/3 thời gian để tìm (05:50–07:01); game PS4 dùng 5–6 GB RAM (07:05); zlib +50% (06:24); hành lang, Haven City/Jak 2 (09:09–09:57); quay đầu nửa giây 4 GB (10:10–10:28); khối phố, Spider-Man, hộp thư/sạp báo hàng trăm lần, giới hạn tốc độ chạy (10:31–11:25); RAM giữ 30 giây, 8 GB (12:09–12:34); SSD gần như RAM (12:38–13:10); 2 GB 1/4 giây, 100 lần (07:52–08:10); SSD gấp 10 chỉ nhanh gấp đôi (13:40–13:50); 825 GB, 5,5 GB/s (15:42–15:53); Kraken, 10%, >5 GB/s vào, 8–9 GB/s, 22 GB/s, 9 nhân Zen 2 (16:53–18:04) (c004, c012–c019, c026–c028, c032–c035) |
| https://www.xbox.com/en-US/consoles/xbox-series-x | primary (Microsoft) | 2026-11-20 | 16GB GDDR6; 10GB @ 560 GB/s, 6GB @ 336 GB/s; 2.4 GB/s raw, 4.8 GB/s compressed (c005, c029) |
| https://www.xbox.com/en-US/consoles/xbox-series-s | primary (Microsoft) | 2026-11-20 | 10GB GDDR6; 8GB @ 224 GB/s, 2GB @ 56 GB/s; bản 512GB SSD; 2.4/4.8 GB/s (c006, c029) |
| https://news.xbox.com/en-us/2020/07/14/a-closer-look-at-xbox-velocity-architecture/ | primary (Xbox Wire, 14/7/2020) | 2026-11-20 | GPU thường truy cập "less than 1/3" dữ liệu texture đã nạp; SFS "approximately 2.5x"; BCPack; "more than 100GB of game data" (c030, c031) |
| https://ir.take2games.com/static-files/cd1abec3-a89b-44ce-8fb2-04636febfe8e | primary (thông cáo Rockstar/Take-Two, 31/1/2013, PDF) | 2026-11-20 | GTA V dự kiến ra 17/9/2013 trên Xbox 360 và PS3 (c008) |
| https://ir.take2games.com/static-files/dd93d264-3d54-404a-ab30-bc6c0fa07ed2 | primary (thông cáo Rockstar/Take-Two, 17/9/2013, PDF) | 2026-11-20 | GTA V "now available worldwide" cho PS3 và Xbox 360 (c008). Cùng tên miền với dòng trên. |
| https://doi.org/10.1145/360349.360354 | primary (J. H. Clark, Communications of the ACM 19(10):547–554, 10/1976) | 2026-11-20 | Tóm tắt bài: giữ độ phức tạp nhìn thấy dưới mức trần; thay đổi lượng chi tiết; clipping là phép tìm logarit trong tầm nhìn; "working set" trong bộ nhớ chính (c011). Trang ACM chặn công cụ (403); tóm tắt đọc từ https://api.crossref.org/works/10.1145/360349.360354 |
| https://dev.epicgames.com/documentation/en-us/unreal-engine/world-partition-in-unreal-engine | primary (tài liệu Unreal Engine, Epic) | 2026-11-20 | Ô lưới, nạp/dỡ theo nguồn nạp như người chơi, Loading Range (c020) |
| https://dev.epicgames.com/documentation/en-us/unreal-engine/visibility-and-occlusion-culling-in-unreal-engine | primary (tài liệu Unreal Engine) | 2026-11-20 | Định nghĩa view frustum culling, occlusion, distance culling (c021) |
| https://learn.microsoft.com/en-us/windows/win32/direct3d9/texture-filtering-with-mipmaps | primary (Microsoft Learn) | 2026-11-20 | Mipmap: chuỗi ảnh độ phân giải giảm dần, mỗi mức nhỏ một nửa; gần dùng ảnh nét, xa dùng ảnh nhỏ; tốn thêm bộ nhớ (c022) |
| https://learn.microsoft.com/en-us/windows/win32/direct3d11/texture-block-compression-in-direct3d-11 | primary (Microsoft Learn) | 2026-11-20 | Bảng "Bytes per 4x4 pixel block": BC1 = 8, BC7 = 16; "fast decoding by the hardware" (c023, c024) |

## Thứ cấp (secondary)

| URL | Loại | Ngày đọc | Dùng cho ý gì |
|---|---|---|---|
| https://www.theglobeandmail.com/investing/markets/stocks/MSFT/pressreleases/8933493/take-twos-rockstar-games-announces-grand-theft-auto-vi-now-available/ | secondary (bản đăng lại thông cáo Take-Two qua TipRanks, 20/11/2026) | 2026-11-20 | GTA VI có mặt trên PS5 và Xbox Series X\|S (c001). Bản gốc trên trang IR Take-Two (gcs-web.com) chặn công cụ (403). |
| https://www.techradar.com/au/gaming/gta-6-digital-pre-loads-for-ps5-and-xbox-will-begin-9-days-early-and-require-a-whopping-212gb-of-free-space | secondary (TechRadar, 3/11/2026) | 2026-11-20 | Trích Rockstar: "up to 212 GB depending on your device"; dẫn link bài Newswire gốc (c002) |
| https://digitaltrends.com/gaming/gta-6-is-finally-ready-to-download-all-212gb-of-it | secondary (Digital Trends, 10/11/2026) | 2026-11-20 | "Rockstar confirms that GTA 6 requires up to 212GB of free space, depending on the console" (c002) |
| https://www.itmedia.co.jp/news/article/0505/17/1050517019/ | secondary (ITmedia, 17/5/2005, đưa tin thông số Sony công bố) | 2026-11-20 | PS3: 256MB XDR Main RAM, 256MB GDDR3 VRAM (c009) |
| https://en.wikipedia.org/wiki/PlayStation_3_technical_specifications | secondary (bách khoa) | 2026-11-20 | 256 MB XDR + 256 MB GDDR3 (c009) |
| https://www.computerbase.de/2005-05/xbox-360-enthuellt-und-spezifikationen-bestaetigt/ | secondary (ComputerBase, 17/5/2005) | 2026-11-20 | Xbox 360: 512 MB GDDR3 dùng làm cả bộ nhớ chính và bộ nhớ đồ họa (c010) |
| https://en.wikipedia.org/wiki/Xbox_360_technical_specifications | secondary (bách khoa) | 2026-11-20 | 512 MB GDDR3 (c010) |

## Đã xem nhưng KHÔNG dùng

| URL | Lý do |
|---|---|
| Các trang tin nói GTA VI 209,75 GB trên PS5, 211,9 GB trên Xbox, 230 GB trên hộp Đức, 676 GB | Số đo của người chơi, trang tin không dẫn nguồn chính thức, hoặc rò rỉ. Chỉ dùng mức "tới 212 GB" của Rockstar. |
| Tin Xbox Series S chỉ dùng được 364 GB (hoặc 362, 379 GB) | Gốc từ một người dùng Reddit, các nguồn lệch nhau, không có trang Microsoft xác nhận. Lời đọc chỉ nói "dùng được thực tế nhỏ hơn con số in trên hộp". |
| Bài Digital Foundry/Eurogamer "Inside Xbox Series X: the full specs" (13,5 GB cho game, 2,5 GB cho hệ điều hành) | Eurogamer chặn công cụ; các bản đưa lại (TechSpot, VGC) cũng chặn (403); chưa đọc được trực tiếp. Bỏ ý. |
| Giá GTA VI, kích thước bản đồ Leonida, bản PC | Không cần cho đề bài, hoặc chỉ có nguồn thứ cấp/tin đồn. |
| https://doi.org/10.1145/800059.801126 (Lance Williams 1983, "Pyramidal parametrics", bài gốc mipmap) | Crossref không có tóm tắt, ACM chặn công cụ; không chốt được nội dung nên không gắn tên người và năm vào claim mipmap. |
