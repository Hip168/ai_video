# Đề mục 5: Dựng tập (Python)

Nhánh `5-dung-tap`. Hợp đồng: `0b-hop-dong-timeline-v2.md`. Luật chung: D15.

## Kiến trúc đã chọn
- Module mới `audio/src/aivideo/episode.py`, `audio/src/aivideo/normalize_vi.py`. Tái dùng bằng import từ `audio.py` (`_synth_cached`, `_filter_wav`, `loudnorm`, `normalize_text`, `OUT_SR`). Không sửa `audio.py`.
- CLI mới: `python -m aivideo.episode build <slug> --engine <id> [--voice] [--speed]`. Mặc định lấy từ `meta` của `script.json`.
- `normalize_vi` chạy trước `normalize_text`. Xử lý số thập phân (3,14), phân cách nghìn (1.000), phần trăm, đơn vị (GHz, MB, ms), năm, khoảng (1995–2005). `spoken` trong beat ghi đè hoàn toàn.
- Lexicon: `content/lexicon.json` rồi chồng `episodes/<slug>/lexicon.json`.
- Cache TTS ở `out/episodes/<slug>/cache/`, khoá theo chuỗi đọc + giọng + tốc độ.
- Không ghi vào `video/public/` (D15).

## Task
- [5-1] Validator v2 trong Python và dựng timeline từ `script.json`, gồm cảnh câm, chương, `sfx`.
- [5-2] `normalize_vi`.
- [5-3] SRT, `chapters.txt`, cache, resume theo nhịp, `episodes/README.md`, `episodes/index.json`, `episodes/_template/`.

## Xong khi
- Engine `fake`: `_template` 130 nhịp ra timeline v2 qua validator, SRT, `chapters.txt` đúng hợp đồng.
- Mẫu `timeline2.sample.json` qua validator; mỗi luật 1–12 có test mẫu sai.
- Đổi 1 nhịp thì engine chỉ được gọi 1 lần. Ngắt giữa chừng rồi chạy lại chỉ gọi nhịp thiếu.
- Bảng test `normalize_vi` có ít nhất 30 dòng, gồm số thập phân, %, đơn vị, năm, khoảng.
- Không đổi `video/public/*`. `sha256sum -c` các file khoá xanh. `pytest -m "not real"` xanh.
