# Đề mục 21: Đoạn kết thích + đăng ký dùng chung (D38)

## Làm gì
- Một đoạn kết 6 giây (180 frame) dùng cho mọi tập: ảnh kênh, tên "Chuyện Của Những Con Bit", nút "Thích" và "Đăng ký" tự vẽ bằng SVG (không dùng logo YouTube), lời đọc tiếng Việt.
- Cấu hình ở `assets/brand/outro.json` (lời đọc, chữ trên hình, giọng `hoang_nam`, tốc độ 1.25, số frame). `Outro.tsx` và `aivideo.outro` cùng đọc file này.
- Composition `OutroWide` (1920×1080) và `OutroVertical` (1080×1920, toàn khung theo D37), ở `video/src/Outro.tsx`.

## Bật cho tập nào
- `script.json` có `meta.outro: true` thì gắn. Không có khoá này thì không gắn, nên tập 1, 2 đã đăng giữ nguyên. Tập 3 đã bật; scene-director đặt khoá này cho tập mới.
- Video dài: nối sau cảnh cuối. `chapters.txt` không đổi, đoạn kết thuộc chương cuối.
- YouTube Shorts: phần 3 và phần 6. Tập ít hơn 6 phần thì gắn phần 3 và phần cuối (`outro.short_parts`). Phần có đoạn kết vẫn phải ≤ 180 s; `shorts cut` báo lỗi nếu vượt.
- TikTok: không gắn. `shorts export` render lại phần nào bên YouTube có đoạn kết (`concat(..., outro=False)`).

## Cache
- `python -m aivideo.outro ensure <slug> [--short n]` (make-episode gọi trước `assemble concat`): làm `out/outro/<khoá>/wide.mp4`, `vertical.mp4` (hình câm), `mix.wav` (lời Korva + nhạc nền của tập, trộn bằng `mix.mix_episode`, -16 LUFS).
- Khoá = sha256 của `outro.json`, ảnh kênh, `Outro.tsx`, file nhạc và gainDb. Đổi một thứ thì làm lại; không thì dùng lại.
- Lời đọc kiểm bằng luật từ ngoại của `phatam` (`outro.foreign_words`); có chữ tiếng Anh thì dừng.

## Ghép
- `assemble concat` nối `wide.mp4` / `vertical.mp4` vào danh sách đoạn (copy, cùng thông số x264 của Remotion) và ghi `manifest.outro = {frames, mp4, wav}`.
- `mux` nối `mix.wav` của tập với `mix.wav` của đoạn kết. `verify` cộng thêm số frame đoạn kết.
- `framecheck` chỉ quét các đoạn của tập, không quét đoạn kết.

## Test
- `audio/tests/test_outro.py`: giọng và render là hàm giả, ffmpeg thật.
- `video/tests/outro.test.ts`: `RENDER_TEST=1` render khung thật cả hai khung.
