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

### Độ dài chương
Bước dựng chỉ cảnh báo khi chương dưới 10 giây. Lint đề mục 6 coi đó là lỗi.

Timeline không có giới hạn tổng frame. Giới hạn 9 phút và 20 giây mỗi cảnh thuộc lint (đề mục 6), không thuộc validator, để test dùng được tập ngắn.

### Cách tính
Giống v1: `startFrame` của beat = `round(giây × 30)`, kết thúc tại `round(giây_cuối × 30)`, cảnh gom beat, cảnh đầu từ 0. Cảnh câm chèn im lặng tương ứng vào `narration.wav`, để cộng dồn thời gian vẫn đúng.

## SRT và chương
`out/episodes/<slug>/video.srt` theo beat. `chapters.txt` mỗi dòng `mm:ss Tiêu đề` (từ `h:mm:ss` nếu dài hơn 1 giờ). Dòng đầu là `00:00`. Mỗi chương dài ít nhất 10 giây, theo yêu cầu chương của YouTube.
