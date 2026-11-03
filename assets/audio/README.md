# Nhạc nền và SFX của tập

- SFX (`pop`, `tick`, `whoosh`, `ding`, `buzz`) sinh bằng code trong `audio/src/aivideo/sfx.py`, không có file.
- Nhạc nền nằm ở `assets/audio/files/` (gitignore, không commit). Mỗi bài có một mục trong `manifest.json`:
  `id`, `file`, `sourceUrl`, `license`, `downloadedAt`, `sha256`, `attribution`.
- Nguồn cho phép (D17): YouTube Audio Library lọc "Attribution not required" (sau khi có kênh); trước đó Tallbeard CC0.
  Không dùng nhạc AI, Freesound API, Pixabay tải hàng loạt.
- Nạp nhạc (OPS): tải file vào `files/`, tính `shasum -a 256`, thêm mục vào `manifest.json`,
  đặt `meta.music.track` = `id` trong `episodes/<slug>/script.json`.
- Thiếu file hoặc lệch sha256 thì `python -m aivideo.mix <slug>` thoát khác 0 và nêu tên file.
