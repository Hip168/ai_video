# Nguồn: Vì sao captcha cứ bắt bạn chọn đèn giao thông

Ngày đọc mọi nguồn: 2026-11-21. "Loại" theo luật trong `roles/researcher.md`. Cách đọc: các PDF (Science 2008, Eurocrypt 2003, Dazed & Confused, Goodfellow 2013, Breaking reCAPTCHAv2, nghiên cứu UCI 2023, GPT-4 System Card) đã tải bản thô và đọc trực tiếp đúng các dòng liên quan; blog Google 2009 và 2014, trang reCAPTCHA bản lưu Wayback, trang bằng sáng chế cũng tải bản thô. Các trang còn lại (Cloudflare, W3C, Google developers, Apple, SEP) đọc bằng WebFetch: công cụ trả bản tóm tắt kèm câu trích, người kiểm nên mở lại.

## Nguồn gốc (primary)

| URL | Loại | Ngày đọc | Dùng cho ý gì |
|---|---|---|---|
| https://arxiv.org/pdf/2311.10911 (tóm tắt: https://arxiv.org/abs/2311.10911) | primary (Searles, Prapty, Tsudik, "Dazed & Confused: A Large-Scale Real-World User Study of reCAPTCHAv2", UC Irvine, arXiv 17/11/2023) | 2026-11-21 | "at least 512 billion reCAPTCHAv2 sessions, taking 819 million hours, ... at least $6.1 billion USD in free wages" (c001, c002); "134 Petabytes ... about 7.5 million kWhs" (c003); "in 2012 Google switched from distorted text to image classification, using images from the Google Street View project"; "over 13 million websites in 2023" (c022); "mean solving time for behavioral captchas is 1.85 seconds, while the image mean solving time is 10.3 seconds ... 557% increase" (c029). Ghi chú: tóm tắt ghi "512 billion reCAPTCHAv2 sessions" nhưng phần 6 ghi rõ con số này là tổng v1 + v2 (183 tỉ v1 + 329 tỉ v2), claim theo phần 6. Tiền công tính theo "US federal minimum wage is $7.5" (lương tối thiểu liên bang thật là 7,25 USD; đây là giả định của bài). |
| https://www.cs.cmu.edu/~biglou/reCAPTCHA_Science.pdf | primary (von Ahn, Maurer, McMillen, Abraham, Blum, "reCAPTCHA: Human-Based Character Recognition via Web Security Measures", Science 321, 1465–1468, 12/9/2008; bản trên trang tác giả ở CMU) | 2026-11-21 | "more than 100 million CAPTCHAs every day ... hundreds of thousands of human hours per day" (c005); hai chữ, chữ kiểm tra và chữ chưa biết (c013); NYT 1860–1970, 99,1% so với 83,5% (c014); "1.2 billion CAPTCHAs ... 440 million ... 17,600 books ... 4 million ... 160 books per day ... 1500 people ... 40 hours per week" (c015); "more than 40,000 Web sites" (c016); 13,51 s và 13,06 s (c017) |
| https://doi.org/10.1126/science.1160379 | primary (DOI bài Science) | 2026-11-21 | Xác nhận qua Crossref: tên bài, tập 321, trang 1465–1468, ngày 12/9/2008 (c016) |
| https://courses.cs.duke.edu/spring07/cps296.3/captcha_crypt.pdf | primary (von Ahn, Blum, Hopper, Langford, "CAPTCHA: Using Hard AI Problems for Security", Eurocrypt 2003; bản đầy đủ lưu trên trang môn học Đại học Duke) | 2026-11-21 | Định nghĩa CAPTCHA, tác giả và nơi làm (c010); Slashdot 11/1999, MIT 21.156, CMU 21.032, dưới 1.000 (c006); "bots that sign up for thousands of email accounts every minute", Yahoo! (c007); AltaVista, "In 2000 [1], we introduced the notion of a captcha" (c008). Bản IACR (iacr.org/archive/eurocrypt2003/26560294/26560294.pdf) trả 403. |
| https://doi.org/10.1007/3-540-39200-9_18 | primary (DOI Springer, LNCS 2656, tr. 294–311) | 2026-11-21 | Thông tin xuất bản bài Eurocrypt 2003 (c006, c010) |
| https://patents.google.com/patent/US6195698B1/en | primary (bản ghi bằng sáng chế US 6,195,698 B1) | 2026-11-21 | Lillibridge, Abadi, Bharat, Broder; nộp 13/4/1998; cấp 27/2/2001; Compaq / Digital Equipment (c009) |
| https://doi.org/10.1093/mind/LIX.236.433 | primary (DOI bài Turing) | 2026-11-21 | Crossref: "Computing Machinery and Intelligence", Mind LIX (59), số 236, tr. 433–460, 1950 (c012) |
| https://blog.cloudflare.com/introducing-cryptographic-attestation-of-personhood/ | primary (blog Cloudflare, Thibault Meunier, 13/5/2021 theo metadata) | 2026-11-21 | "on average 32 seconds", "one CAPTCHA every 10 days", "500 human years wasted every single day" (c004). Đây là ước tính của Cloudflare, scriptwriter nói rõ là ước tính. |
| https://googleblog.blogspot.com/2009/09/teaching-computers-to-read-google.html | primary (Official Google Blog, 16/9/2009) | 2026-11-21 | Google mua reCAPTCHA, "more than 100,000 websites", Google Books, Google News Archive (c018) |
| https://arxiv.org/pdf/1312.6082 (tóm tắt: https://arxiv.org/abs/1312.6082) | primary (Goodfellow, Bulatov, Ibarz, Arnoud, Shet, Google, arXiv 2013) | 2026-11-21 | "over 96% accuracy in recognizing complete street numbers", "99.8% accuracy on the hardest category of reCAPTCHA" (c019); "transcribe all the views we have of street numbers in France in less than an hour using our Google infrastructure" (c020) |
| https://security.googleblog.com/2014/12/are-you-robot-introducing-no-captcha.html | primary (Google Online Security Blog, Vinay Shet, 3/12/2014) | 2026-11-21 | 99,8%; ô đánh dấu; "entire engagement with the CAPTCHA—before, during, and after"; không chắc thì hiện CAPTCHA; chọn ảnh dễ hơn trên điện thoại (c021) |
| https://web.archive.org/web/20180102231056/https://www.google.com/recaptcha/intro/index.html | primary (trang chính thức Google reCAPTCHA, bản lưu Wayback 2/1/2018; nội dung giống bản 31/12/2015 và 31/12/2016) | 2026-11-21 | "channeling the time spent solving CAPTCHAs into digitizing text, annotating images, and building machine learning datasets. This in turn helps preserve books, improve maps, and solve hard AI problems"; chữ trên ảnh Street View làm Google Maps chính xác hơn (c023). Trang hiện nay (chuyển hướng sang cloud.google.com) không còn đoạn này. |
| https://arxiv.org/pdf/2409.08831 (tóm tắt: https://arxiv.org/abs/2409.08831) | primary (Plesner, Vontobel, Wattenhofer, "Breaking reCAPTCHAv2", ETH Zürich, arXiv 13/9/2024) | 2026-11-21 | Viết tắt CAPTCHA (c011); ba kiểu câu đố, 13 loại vật (c024); 100% so với 68–71%, không khác biệt số câu đố người/máy (c025); cookie và lịch sử, tài khoản Google đã đăng nhập (c026) |
| https://arxiv.org/pdf/2307.12108 | primary (Searles, Nakatsuka, Ozturk, Paverd, Tsudik, Enkoji, "An Empirical Study & Evaluation of Modern CAPTCHAs", arXiv 22/7/2023, USENIX Security 2023) | 2026-11-21 | 1.400 người, 14.000 CAPTCHA; máy 85–100%, đa số trên 96%; người 50–85%; ảnh reCAPTCHA người 18 s, máy 17,5 s (c027); 0,09 giây mỗi năm tuổi (c028); "CAPTCHA farms – sweatshop-like operations where humans are paid to solve CAPTCHAS" (c030) |
| https://cdn.openai.com/papers/gpt-4-system-card.pdf | primary (OpenAI, GPT-4 System Card, 3/2023) | 2026-11-21 | Thử nghiệm ARC: TaskRabbit, "Are you an robot that you couldn't solve?", "No, I'm not a robot. I have a vision impairment that makes it hard for me to see the images." (c031). Lưu ý: ARC dùng bản GPT-4 sớm, không phải bản phát hành. |
| https://www.w3.org/TR/turingtest/ | primary (W3C, "Inaccessibility of CAPTCHA", Group Draft Note 16/12/2021) | 2026-11-21 | Người mù; CAPTCHA âm thanh "cognitive overload"; 90% với audio reCAPTCHA bằng nhận dạng giọng nói của Google (c032) |
| https://developers.google.com/search/blog/2018/10/introducing-recaptcha-v3-new-way-to | primary (Google, Wei Liu, 29/10/2018) | 2026-11-21 | Ra mắt v3, trả điểm, không tương tác (c033) |
| https://developers.google.com/recaptcha/docs/v3 | primary (tài liệu Google) | 2026-11-21 | "0.0 - 1.0", "1.0 is very likely a good interaction, 0.0 is very likely a bot", "will never interrupt your users", "threshold of 0.5" (c033) |
| https://blog.cloudflare.com/moving-from-recaptcha-to-hcaptcha/ | primary (blog Cloudflare, 8/4/2020 theo metadata) | 2026-11-21 | Google sắp thu phí, lo ngại dữ liệu, Trung Quốc chặn lúc có lúc không (c034) |
| https://blog.cloudflare.com/turnstile-private-captcha-alternative/ | primary (blog Cloudflare, 28/9/2022 theo metadata) | 2026-11-21 | Turnstile, Private Access Tokens (c035) |
| https://developer.apple.com/videos/play/wwdc2022/10077/ | primary (Apple WWDC22, "Replace CAPTCHAs with Private Access Tokens") | 2026-11-21 | "new in iOS 16 and macOS Ventura"; chữ ký mù RSA (c035) |

## Thứ cấp (secondary)

| URL | Loại | Ngày đọc | Dùng cho ý gì |
|---|---|---|---|
| https://plato.stanford.edu/entries/turing-test/ | secondary (Stanford Encyclopedia of Philosophy) | 2026-11-21 | Turing 1950, mô tả trò chơi bắt chước (c012) |

## Không mở được
- http://www.captcha.net/ (trang của nhóm CMU): trả 403 với curl, chưa dùng.
- https://www.iacr.org/archive/eurocrypt2003/26560294/26560294.pdf: 403, thay bằng bản Duke.

## Đã bỏ
- "Google dùng ảnh đèn giao thông để dạy xe tự lái (Waymo)": lời đồn rất phổ biến nhưng Google không có tài liệu chính thức nói vậy. Chỉ được nói tới mức c023 (gắn nhãn ảnh, dữ liệu học máy, bản đồ).
- Câu nói của Luis von Ahn "frittering away, in ten-second increments, millions of hours" (Cloudflare trích lại, gốc là phỏng vấn): lời kể, không dùng chốt fact.
- Số người dùng reCAPTCHA hiện nay theo ngày, thị phần captcha ở Việt Nam: không có nguồn chính thức.
- Lý do vì sao ô có cột đèn "có tính hay không": Google không công bố cách chấm.

## Rủi ro
- c001–c003, c029: là ước tính của một nhóm nghiên cứu (giả định 100 triệu reCAPTCHA mỗi ngày, lương 7,5 USD). Scriptwriter phải nói "theo ước tính của nhóm nghiên cứu ở Đại học California Irvine".
- c004: ước tính của Cloudflare, khác cách tính với Dazed (32 giây so với 1,85/10,3 giây); không trộn hai nguồn trong một câu.
- c022: mốc "2012" chỉ có từ bài Dazed (dẫn một bài báo khác); Google không có bài blog chính thức nói năm đó.
- c023: nguồn là bản lưu Wayback của trang Google, trang hiện tại đã đổi.
- c031: GPT-4 trong thử nghiệm là bản sớm, có người điều khiển vòng lặp; không nói "ChatGPT tự đi thuê người".
