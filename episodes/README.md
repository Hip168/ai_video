# Thư mục `episodes/`

Mỗi tập một thư mục `episodes/<slug>/` (`slug` dạng `^[a-z0-9]+(-[a-z0-9]+)*$`). `_template/` là tập mẫu 130 nhịp dùng cho test với giọng `fake`.

## Tệp của một tập
- `script.json`: kịch bản (hợp đồng ở `.team/features/0b-hop-dong-timeline-v2.md`). `meta` có `title`, `theme`, `voice`, `speed`, `music`; `chapters[]`; `scenes[]` với `beats[]`.
- `lexicon.json`: bảng phát âm riêng của tập (từ gốc -> cách đọc), chồng lên `content/lexicon.json`.
- `sources.md`, `claims.json`, `outline.md`, `publish.json`, `ledger.json`, `handoff/`: do đội sản xuất ghi.
- `index.json` (ở `episodes/`): danh mục `[{"slug","title","theme","sceneTypes":[...]}]`.

## Cách đọc
- `text` là chữ hiện phụ đề. `spoken` (nếu có) là lời đọc, dùng nguyên văn, không qua chuẩn hoá. Không có `spoken` thì `text` đi qua `normalize_vi` (số, %, đơn vị, năm, khoảng) rồi bảng phát âm.
- Cảnh không có beat cần `holdMs` > 0: cảnh câm, chèn im lặng vào giọng đọc.

## Dựng tập
```bash
cd audio
export PYTHONPATH=$PWD/src
.venv/bin/python -m aivideo.episode build <slug> --engine fake|korva|vieneu [--voice V] [--speed S]
```
Ra `out/episodes/<slug>/`: `narration.wav`, `timeline.json` (v2), `video.srt`, `chapters.txt`, `cache/`. Chạy lại chỉ tổng hợp các nhịp có chuỗi đọc, giọng hoặc tốc độ mới; ngắt giữa chừng rồi chạy lại chỉ làm nhịp còn thiếu. Không ghi vào `video/public/`.
