# Đội sản xuất video

Yêu cầu gốc: một đội chuẩn chỉ, không "tự làm sau tự thấy không hay tự sửa". Người dùng ra lệnh một câu; đội đi hết từ đề tài đến khi video lên kênh. Luật chung vẫn là `~/.claude/team/CONVENTIONS.md`. File này chỉ thêm phần riêng của sản xuất.

## 1. Vai

| Vai | Làm | Ghi được | Không được |
|---|---|---|---|
| Sếp tổng (luồng chính) | Nhận lệnh, giao việc, chuyển trao tay, ghi sổ tập, báo người dùng | Sổ tập, `.team/` | Sửa sản phẩm, dặn người kiểm bỏ qua lỗi, tự quyết thay vai |
| `researcher` | Chọn đề tài, gom nguồn, viết dàn ý và sổ fact | `outline.md`, `sources.md`, `claims.json` | Viết kịch bản |
| `scriptwriter` | Viết kịch bản từ dàn ý | `script.json` phần lời | Thêm fact không có trong sổ, tự duyệt |
| `fact-checker` | Kiểm từng claim, mù với bản nháp | Không ghi file, trả kết quả cho sếp tổng | Xem kịch bản, xem lý lẽ biên kịch |
| `script-editor` | Đọc như người xem: dễ hiểu, nhịp, móc mở đầu | Không ghi file | Sửa câu chữ |
| `scene-director` | Gán cảnh, viết props và cảnh riêng | `script.json` phần cảnh, `video/src/episodes/<slug>/` | Sửa lời đã chốt |
| `voice-producer` | Chạy TTS, sửa phát âm | `lexicon.json` của tập | Sửa `text` đã chốt |
| `editor` | Chạy `make-episode.sh`, nhạc, render | `out/episodes/<slug>/` | Sửa kịch bản, cảnh |
| `qc` | Xem khung hình, nghe đoạn, đo kỹ thuật, đối chiếu kịch bản | Không ghi file | Sửa bất cứ thứ gì |
| `packager` | Tiêu đề, mô tả, chương, thumbnail | `episodes/<slug>/publish.json`, ảnh bìa | Hứa điều video không nói |
| `publisher` | Đăng lên Studio bằng Claude in Chrome | Ghi nhận link video | Đăng khi chuỗi hash lệch, đăng sang tài khoản khác |

Người làm và người kiểm luôn là hai agent khác nhau, gọi mới, không chung ngữ cảnh. Vai nằm ở `episodes/roles/`, cách gọi ở `episodes/PLAYBOOK.md` (không đặt trong `.claude/`).

## 2. Luồng

```
Lệnh → researcher → fact-checker (CỔNG 1) → scriptwriter
     → script-editor → fact-checker lượt 2 trên số trong lời đọc
     → CHỐT KỊCH BẢN (CỔNG 2, ghi hash) → scene-director + lint
     → voice-producer → editor → qc → packager → CỔNG 3 → publisher
```

Mỗi chữ `→` là một lần trao tay, ghi vào sổ tập theo mục 5.

## 3. Ba cổng cứng

Cổng cứng do script tính, không do ai tuyên bố. Các khâu còn lại là cổng mềm: người kiểm trả lại thì sửa, không cần script.

**Cổng 1, fact.** Input cho `fact-checker` chỉ gồm danh sách claim và câu hỏi kiểm chứng, chép ra thư mục tạm ngoài repo, tên trung tính. Không kèm kịch bản. Công cụ của vai: Read, Grep, WebFetch, WebSearch, không có Bash. Ưu tiên nguồn gốc. Nguồn lỗi hoặc hết giờ thì claim là `CHƯA KIỂM`, không phải `ĐẠT`.

**Cổng 2, chốt kịch bản.** Mọi số, năm, tên riêng trong lời đọc phải có `claim` hợp lệ. Regex bắt số chạy trên `text` gốc, trước khi đổi số thành chữ cho TTS. Đạt thì ghi sha256 của `script.json` phần lời vào sổ tập.

**Cổng 3, đăng.** Script kiểm: sha256 khớp sổ, lint đạt, kỹ thuật đạt, `qc` có dòng phán quyết đúng định dạng, `publish.json` đủ trường, đúng kênh trong `.team/kenh.md`.

## 4. Phát hiện và phán quyết

Người kiểm trả JSON:

```json
{"findings":[{"severity":"CRITICAL|MAJOR|MINOR","rule":"<luật>","file":"<file>","quote":"<trích nguyên văn>","failing_case":"<sai thế nào>","owner":"<vai sửa>"}]}
```

- Script tính: có CRITICAL thì `CHẶN`; có MAJOR thì `SỬA`; còn lại `ĐẠT`. Không ai tự viết phán quyết.
- `quote` không tìm thấy trong file gốc thì phát hiện bị loại và người kiểm phải báo lại.
- Không có JSON đúng dạng thì coi như chưa duyệt.
- Phát hiện về sự thật trả về `scriptwriter` hoặc `researcher`, không sửa ở khâu sau. Người tìm lỗi không sửa.

## 5. Sửa có giới hạn

- Mỗi cặp làm/kiểm tối đa 3 vòng. Vòng 3 vẫn trượt thì dừng, `CẦN NGƯỜI DÙNG`. Không có cơ chế tự cho qua.
- Trả xuyên khâu (vd `qc` trả về `scriptwriter`) tối đa 2 lần mỗi tập.
- Sửa lời sau Cổng 2 thì hash đổi, nên phải qua lại Cổng 1 phần liên quan, Cổng 2 và các khâu sau bị ảnh hưởng.
- Lỗi vòng trước còn sống ở vòng sau được ghi tăng số lần, tới 2 lần thì lên người dùng.

## 6. Sổ tập và trao tay

`episodes/<slug>/ledger.json` ghi theo thời gian: khâu, vai, input hash, output hash, phán quyết, vòng. Chỉ sếp tổng ghi, qua script, để phiên bị ngắt vẫn biết đang ở đâu.

Trao tay ghi ở `episodes/<slug>/handoff/<khâu>.md`, năm mục: Đã chốt, Đã bỏ, Rủi ro, File, Còn lại.

Bản trộn bị từ chối vì thiếu LUFS (D5) thì không nới ngưỡng. `editor` dừng và trả `voice-producer` tìm nhịp lệch mức để đọc lại. Vẫn lỗi sau 2 lần thì `CẦN NGƯỜI DÙNG`. Trộn âm chạy trước render nên lỗi này không tốn thời gian render.

## 7. Đo người kiểm

Trước tập đầu và mỗi khi sửa prompt người kiểm: lấy một bản kịch bản sạch, cài lỗi đã biết vào bản sao (số sai, năm sai, nhân vật sai, câu khó hiểu, khung hình mất), kèm một bản sạch làm đối chứng. Ghi độ bắt lỗi và số báo sai vào `.team/qualification.md`. Chưa đạt ngưỡng ở `features/11-doi-san-xuat.md` thì chưa làm tập.

## 8. Điều không làm theo các repo đã đọc

- Không tự cho qua khi hết vòng.
- Không để agent tự duyệt sản phẩm của mình.
- Không để sếp tổng tự phán để chạy tiếp, luật KHÔNG TỰ ĐOÁN vẫn áp dụng.
- Không chạy agent ở chế độ bỏ qua quyền.
