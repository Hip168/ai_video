# Kịch bản video mẫu (bản nháp BA, chờ người dùng duyệt)

**Tiêu đề:** Một tin nhắn đi qua Internet thế nào
**Độ dài dự kiến:** 304 âm tiết. Giả định đọc 4,3 âm tiết/giây và nghỉ 250–450 ms giữa các nhịp thì được ~77 giây (số trong `.team/contract/timeline.sample.json`). Tốc độ thật của giọng chưa đo; nếu ngoài 60–90 giây thì chỉnh `speed` hoặc khoảng nghỉ trước khi sửa lời.
**Đơn giản hóa có chủ ý:** không nói về mã hóa, TCP handshake, cache DNS, hay kết nối giữ sẵn.

| Nhịp | Cảnh | Cue | Lời đọc |
|---|---|---|---|
| s01 | phone | send | Bạn vừa bấm gửi một tin nhắn, và chỉ khoảng một giây sau, người bạn ở đầu bên kia đã nhận được. |
| s02 | phone | | Trong khoảnh khắc ngắn ngủi đó, tin nhắn đã đi qua cả một chặng đường dài. |
| s03 | phone | | Hãy cùng đi theo nó, từng chặng một. |
| s04 | dns | dns-need | Trước hết, điện thoại cần biết địa chỉ của máy chủ ứng dụng nhắn tin. |
| s05 | dns | dns-query | Nó hỏi DNS, một hệ thống hoạt động giống như cuốn danh bạ của Internet. |
| s06 | dns | dns-reply | Đưa vào một cái tên, DNS trả về một địa chỉ IP, dãy số mà máy tính hiểu được. |
| s07 | packets | split | Có địa chỉ rồi, tin nhắn được chia thành nhiều packet, tức là những gói dữ liệu nhỏ. |
| s08 | packets | label | Mỗi packet giống như một phong bì, ghi rõ nơi gửi, nơi đến và số thứ tự. |
| s09 | wifi | wifi | Từ điện thoại, các packet bay qua sóng Wi-Fi để tới router trong nhà bạn. |
| s10 | wifi | gateway | Router giống như người gác cổng, đưa chúng ra khỏi mạng gia đình và đi vào Internet. |
| s11 | hops | hop | Trên Internet, packet nhảy qua rất nhiều router của các nhà mạng khác nhau. |
| s12 | hops | next-hop | Mỗi router không cần biết toàn bộ đường đi, nó chỉ chọn chặng kế tiếp. |
| s13 | hops | paths | Vì vậy, các packet có thể đi những con đường khác nhau và đến nơi không đúng thứ tự. |
| s14 | server | reorder | Tại máy chủ, các packet được sắp xếp lại theo số thứ tự, ghép thành tin nhắn ban đầu. |
| s15 | server | resend | Nếu thiếu mất packet nào, máy chủ sẽ yêu cầu gửi lại phần đó. |
| s16 | server | forward | Sau đó, máy chủ tìm xem người nhận là ai và chuyển tin nhắn đi tiếp. |
| s17 | receiver | deliver | Tin nhắn lại được chia thành các packet, đi qua mạng tới điện thoại của người nhận. |
| s18 | receiver | notify | Điện thoại rung lên, và dòng chữ của bạn hiện ra trên màn hình. |
| s19 | receiver | end | Cả chặng đường ấy, từ đầu đến cuối, thường chỉ mất khoảng một giây. |

Khi đã duyệt, đề mục 1 chuyển bảng này nguyên văn sang `content/script.json`.
