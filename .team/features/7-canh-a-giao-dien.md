# Đề mục 7: giao diện 6 cảnh nhóm A

Mỗi loại: `video/src/lib/scenes/<type>.tsx`, `video/src/lib/specs/<type>.ts` (propsSpec, example, minBeats, cues là nguồn chính xác). Dùng chung: `scenes/a-common.tsx` (`T` chữ qua fitText, `appearAt`, `fmtNum`, Tick, Cross).

Không loại nào có cue riêng (`cues: []`): hình neo theo THỨ TỰ beat. Phần tử thứ i hiện ở beat i; thiếu beat thì phần tử dư hiện nối tiếp mỗi 10 frame sau beat cuối; cảnh không beat thì 10 + 20*i frame. Số hiển thị theo kiểu Việt (nghìn "." thập phân ",").

| Loại | Props (bắt buộc *) | minBeats | Neo beat |
|---|---|---|---|
| big-number | value*, from, decimals 0-3, prefix ≤12, suffix ≤16, label* ≤80, note ≤100 | 1 | beat 0: số đếm từ `from` (mặc định 0) lên `value` trong 48 frame; beat 1: note |
| compare | titleA*, titleB* ≤30, rows* 2-5 [{label* ≤60, a* bool, b* bool}] | 2 | hàng i ở beat i, tick (true) hoặc cross (false) |
| myth-fact | pairs* 1-3 [{myth* ≤90, fact* ≤120}] | 2 | thẻ i hiện ở beat 2i (huyền thoại), lật ở beat 2i+1 (sự thật); nên có 2 beat mỗi cặp |
| history-timeline | events* 3-6 [{year* ≤10, title* ≤50, detail ≤100}] | 3 | sự kiện i ở beat i, đường thời gian nối tới nó |
| term-card | term* ≤40, tag ≤24, pronunciation ≤40, definition* ≤160, example ≤110 | 1 | beat 0: thẻ + từ; beat 1: định nghĩa; beat 2: ví dụ |
| chart | kind* "bar"/"line", title ≤60, unit ≤12, decimals 0-3, highlight 0-7, data* 2-8 [{label* ≤16, value* số}] | 2 | cột/điểm i ở beat i |

Mọi chữ qua `fitText`; hình trong y < 830; không filter/blur/URL.
