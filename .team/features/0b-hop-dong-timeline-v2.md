# Hợp đồng tập phim: `script.json` và `timeline.json` phiên bản 2

Dùng chung cho đề mục 5 (ghi), 6, 7, 8, 10 (đọc), 9 (đọc `sfx`). Mẫu hợp lệ: `.team/contract/timeline2.sample.json`. Test các bên đọc thẳng file mẫu, không chép đi nơi khác. Đổi hợp đồng phải qua BA. Hợp đồng v1 giữ nguyên.

## Thư mục

```
episodes/<slug>/script.json, lexicon.json, sources.md, claims.json, outline.md,
                publish.json, ledger.json, handoff/
episodes/_template/          tập mẫu 130 nhịp cho test, TTS fake
episodes/index.json          danh mục tập: slug, title, theme, sceneTypes[]
video/src/episodes/<slug>/   cảnh riêng của tập
out/episodes/<slug>/         sản phẩm, gitignore
```

`slug`: `^[a-z0-9]+(-[a-z0-9]+)*$`. Riêng `_template` là slug dành riêng, CLI chấp nhận để test đầu cuối ở đề mục 10, không xuất hiện trong `episodes/index.json`.

## `script.json`

```json
{
  "meta": {"title": "...", "voice": "hoang_nam", "speed": 1.25, "theme": "mau-a",
           "music": {"track": "ten-bai", "gainDb": -24}},
  "chapters": [{"id": "mo-dau", "title": "Mở đầu"}],
  "scenes": [{
    "id": "sc01", "chapter": "mo-dau", "type": "cold-open", "props": {},
    "holdMs": 0, "sfx": "whoosh",
    "beats": [{"id": "b001", "text": "...", "spoken": null, "cue": "hook",
               "pause_ms": 300, "sfx": null, "claims": ["c001"]}]
  }]
}
```

- `text`: chữ hiện phụ đề. `spoken`: ghi đè cách đọc, không đổi phụ đề (D4).
- `sfx` ở cảnh phát tại đầu cảnh; ở beat phát tại đầu beat. Tên là tên SFX trong đề mục 9.
- `holdMs`: thời lượng cảnh câm, dùng khi `beats` rỗng. Cảnh có beat thì mặc định 0.
- `claims`: id claim trong `claims.json`, có thể rỗng.

## `timeline.json` v2

Mẫu ở `.team/contract/timeline2.sample.json`.

### Luật
1. `version` = 2, `fps` = 30, `width` = 1920, `height` = 1080.
2. Mọi số frame là số nguyên. `startFrame` ≥ 0, `durationFrames` ≥ 1. Mọi `startFrame` tuyệt đối.
3. `scenes[].id` là chuỗi không rỗng, duy nhất. `type` là id trong catalog hoặc `custom:<tên>`. `props` là đối tượng.
4. Cảnh liền nhau, không hở, không chồng: cảnh đầu `startFrame` = 0; cảnh sau bắt đầu tại `startFrame + durationFrames` cảnh trước; cảnh cuối kết thúc đúng `durationInFrames`.
5. Beat trong cảnh tăng dần, không chồng, nằm trọn trong cảnh. Được có khoảng hở.
6. `beats[].id` duy nhất toàn file. Cảnh có `beats` rỗng được phép (khác v1).
7. `text` không rỗng, không chỉ khoảng trắng, tối đa 100 ký tự, NFC.
8. `cue` tuỳ chọn; nếu có thì là chuỗi không rỗng. Không có `cue` thì animation neo theo thứ tự beat.
9. `chapters[]`: `id` duy nhất, `title` không rỗng, `startFrame` tăng dần, chương đầu `startFrame` = 0. `scenes[].chapter` phải có trong `chapters`. `startFrame` của chương bằng `startFrame` của cảnh đầu thuộc chương.
10. `sfx[]`: `frame` trong `[0, durationInFrames)`, `name` không rỗng, `gainDb` là số ≤ 0, `frame` không giảm.
11. `durationInFrames` = làm tròn lên của (độ dài `narration.wav` tính bằng giây + 0,5) × 30. Im lặng của cảnh câm đã nằm trong `narration.wav`, không cộng thêm.
12. `theme` là chuỗi không rỗng. `audio.src` tương đối so với `out/episodes/<slug>/`.
13. `chapters` không rỗng. Khoá `sfx` bắt buộc, được rỗng.

### Catalog 18 loại cảnh
`cold-open`, `chapter-title`, `recap-outro`, `big-number`, `compare`, `myth-fact`, `history-timeline`, `term-card`, `chart`, `flow`, `layers`, `code-walk`, `terminal`, `bits`, `memory-array`, `algo-bars`, `tree-graph`, `scale-ladder`.

### `episodes/index.json`
Mảng `[{"slug","title","theme","sceneTypes":[...]}]`, được rỗng, không chứa `_template`.

### Đọc số
`spoken` dùng nguyên văn, không qua `normalize_vi` và lexicon. Phần lẻ 1–2 chữ số đọc như một số: 3,14 là "ba phẩy mười bốn", 2,4 là "hai phẩy bốn", 0,05 là "không phẩy không năm". Từ 3 chữ số trở lên đọc từng chữ số.

Mọi đầu vào của `normalize_vi` phải ra chuỗi không còn chữ số 0-9. Bảng bổ sung:
- Số dính chữ: tối đa 2 chữ số đọc như số (`4K` "bốn K", `5G` "năm G", `v2` "v hai"); từ 3 chữ số đọc từng chữ số (`1080p` "một không tám không p").
- `-5°C` "âm năm độ xê". `12:30` "mười hai giờ ba mươi". `12:05` "mười hai giờ không năm". `1/2` "một phần hai".
- Số trần có chữ số 0 đứng đầu đọc từng chữ số: `007` "không không bảy".
- Chuỗi số nối bằng `.` xét theo thứ tự sau, luật đầu tiên khớp thì dùng:
  1. Đúng 4 nhóm, mỗi nhóm 1–3 chữ số và ≤ 255, trừ khi mọi nhóm sau nhóm đầu đúng 3 chữ số và có ít nhất một nhóm là `000` (khi đó là số: `2.000.000.100`, `1.000.000.005`, `1.200.000.000`): IP, đọc từng nhóm nối "chấm". `10.255.255.255`, `192.168.100.200`, `192.168.1.1` "một trăm chín mươi hai chấm một trăm sáu mươi tám chấm một chấm một".
     Mỗi nhóm IP đọc theo giá trị số: `000` và `00` đọc "không", `010` đọc "mười".
  2. Nhóm đầu 1–3 chữ số, mọi nhóm sau đúng 3 chữ số: số có phân cách nghìn. `1.000.000` "một triệu", `1.200.000.000` "một tỷ hai trăm triệu".
  3. Còn lại, từ 2 nhóm trở lên và có chữ cái dính phía trước, hoặc từ 3 nhóm trở lên: phiên bản, đọc từng nhóm nối "chấm". `3.11.4`, `v1.2` "v một chấm hai", `1.2.3.4.5`.
  4. Đúng 2 nhóm không có chữ cái phía trước: thập phân như đã ghi.
- Hậu tố sau phiên bản hay IP: `-` đọc như khoảng trắng. `1.2.3-beta` "một chấm hai chấm ba beta", `192.168.1.1-192.168.1.9` đọc hai IP cách nhau khoảng trắng.
- `12:30:45` "mười hai giờ ba mươi phút bốn mươi lăm giây". Cổng sau `:` có bao nhiêu chữ số cũng đọc như số.
- Chuỗi số nối bằng nhiều dấu `-` không phải ngày (`1-2-3`) đọc từng số cách nhau khoảng trắng. Ngày `YYYY-M-D` với tháng, ngày 1–2 chữ số đọc như ngày ISO.
- `IP:cổng` đọc "... cổng tám mươi". Mẫu giờ chỉ khớp khi giờ 0–23, phút 00–59 và không đứng sau chữ, số hay dấu `.`.
- Dấu `-` chỉ đọc "đến" khi hai bên đều là số trần đứng riêng; số có phân cách nghìn hay thập phân cũng tính là số trần (`1.000.000-2.000.000đ` "một triệu đến hai triệu đồng"). Còn lại đọc như khoảng trắng: `x86-64` "x tám mươi sáu sáu mươi bốn". Ngày `2024-01-15` đọc "ngày mười lăm tháng một năm hai nghìn không trăm hai mươi bốn".
- Số tận cùng 4 sau "mươi" đọc "bốn", theo `number_to_words` đã khoá của đề mục 1.
- Khoá lexicon được so trên chữ gốc, trước `normalize_vi`, nên khoá có chữ số như `x86` dùng được.
- `0.001` và `0,001` là thập phân, không phải phân cách nghìn khi phần nguyên là 0.
- `100.000đ` đọc số trước rồi đơn vị "đồng".
- Dấu `.` hoặc `,` ngay sau một mẫu (khoảng, ngày, IP, giờ) mà không có chữ số theo sau là dấu câu, không làm hỏng mẫu: `5-10.` "năm đến mười.".
- Hex `0x…` đọc "không x" rồi từng ký tự: `0x10` "không x một không", `0xFF` "không x F F".
- Biết là đọc chưa hay, xử lý bằng lexicon của tập hoặc `spoken`, không thêm luật: `Python 3.12` (ra "phẩy"), `24/7` (ra phân số), số điện thoại, ngày `15.01.2024`.
Cách đọc nào nghe chưa hay thì sửa bằng `spoken` hoặc lexicon của tập, không đổi bảng này.

### Tên SFX
`pop`, `tick`, `whoosh`, `ding`, `buzz`. `script.json` chỉ dùng các tên này.

### Khoảng nghỉ
`pause_ms` của nhịp chèn ngay sau nhịp đó, kể cả khi nhịp sau ở cảnh khác hay trước cảnh câm, trừ nhịp cuối tập. Tập phải có ít nhất một nhịp; toàn cảnh câm là lỗi.

### Chuỗi
Mọi chuỗi bắt buộc không rỗng cũng không được chỉ gồm khoảng trắng. `audio.src` không chứa `..`, không bắt đầu bằng `/`, không chứa `://`. Python và TypeScript kiểm giống nhau.

### Độ dài chương và mốc thời gian
Bước dựng chỉ cảnh báo khi chương dưới 10 giây. Lint đề mục 6 coi đó là lỗi. `chapters.txt` dùng `h:mm:ss` từ đúng 1 giờ trở lên.

Timeline không có giới hạn tổng frame. Giới hạn 9 phút và 20 giây mỗi cảnh thuộc lint (đề mục 6), không thuộc validator, để test dùng được tập ngắn.

### Cách tính
Giống v1: `startFrame` của beat = `round(giây × 30)`, kết thúc tại `round(giây_cuối × 30)`, cảnh gom beat, cảnh đầu từ 0. Cảnh câm chèn im lặng tương ứng vào `narration.wav`, để cộng dồn thời gian vẫn đúng.

## SRT và chương
`out/episodes/<slug>/video.srt` theo beat. `chapters.txt` mỗi dòng `mm:ss Tiêu đề` (từ `h:mm:ss` nếu dài hơn 1 giờ). Dòng đầu là `00:00`. Mỗi chương dài ít nhất 10 giây, theo yêu cầu chương của YouTube.
