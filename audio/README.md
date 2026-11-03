# aivideo (audio)

Giọng đọc, `timeline.json` và SRT cho video giải thích. Lệnh và lệnh cài: xem `.team/stack.md`.

## Kết quả kiểm engine thật (Mac arm64, 2026-10-31)

| Engine | Gọi | Kiểu trả về | Sample rate (Hz) |
|---|---|---|---|
| korva (`korvatts` 0.1.3) | `TTS().synthesize(text, voice=, lang="vi", total_steps=32, speed=)` -> `(wav, duration)` | `numpy float32`, 1 chiều | 44100 |
| vieneu (`vieneu` 3.8.3) | `Vieneu().infer(text, voice=)` -> `wav` | `numpy float32`, 1 chiều | 48000 |

- Hai gói cùng cài được trong một venv, không xung đột phụ thuộc.
- korva tải mô hình từ Hugging Face (`dogenthq/KorvaTTS`) lần đầu; có 10 giọng: bao_kim, gia_bao, hoang_nam, huu_dat, khanh_vy, ngoc_huyen, phuong_linh, quang_huy, quynh_nhu, thanh_phong.
- vieneu tải `pnnbao-ump/VieNeu-TTS-v3-Turbo` (~0,9 GB) và codec MOSS. `Vieneu()` mặc định lỗi trên máy này: onnxruntime từ chối file dữ liệu ngoài khi cache Hugging Face dùng symlink ("External data path escapes model directory"). `engines.py` vá `OnnxV3LiteEngine._fetch` để liên kết cứng file thật vào `~/.cache/aivideo/` (đổi bằng biến `AIVIDEO_MODELS`).
- vieneu không có tham số `speed`; `synth("vieneu", ..., speed != 1.0)` báo `ValueError`.
- vieneu có 25 giọng; `compare` chỉ lấy 10 giọng "featured" của tác giả.

## Chạy

```bash
cd audio
.venv/bin/python -m aivideo.audio compare --text-file ../content/compare.txt
.venv/bin/python -m aivideo.audio build --engine fake --voice a
```
Bản giọng thật (đã chạy, ra 2631 frame, 87,7 giây):
```bash
cd audio && PYTHONPATH=$PWD/src .venv/bin/python -m aivideo.audio build --engine korva --voice hoang_nam --speed 1.25
```
- `--speed` mặc định 1.0; với tốc độ này kịch bản thật ra 105,7 giây, vượt 90 giây, nên dùng 1.25.
- `voice` trong `content/script.json` chỉ để tham khảo; `build` lấy giọng từ `--voice`.
- `build` chỉ tính `durationInFrames`. Khoảng 1800–2700 frame (60–90 giây) được kiểm bằng test `real` bản giọng thật, `build` không ép.

Ghi chú macOS: nếu `import aivideo` báo không thấy gói, file `.pth` trong venv bị gắn cờ hidden; chạy `chflags nohidden .venv/lib/python3.12/site-packages/*.pth`.

## Dựng tập

Dựng giọng đọc, `timeline.json` (v2), phụ đề và mục lục chương cho một tập từ `episodes/<slug>/script.json`. Hợp đồng dữ liệu: `.team/features/0b-hop-dong-timeline-v2.md`.

```bash
cd audio
export PYTHONPATH=$PWD/src
.venv/bin/python -m aivideo.episode build <slug> --engine fake|korva|vieneu [--voice V] [--speed S]
```
- `--engine` bắt buộc. `--voice` và `--speed` mặc định lấy từ `meta` của `script.json` (speed mặc định 1.0). `vieneu` chỉ chạy `--speed 1.0`.
- Đường dẫn mặc định tính từ `audio/`: `--episodes-dir ../episodes`, `--out-dir ../out/episodes`, `--lexicon ../content/lexicon.json`.
- `_template` là tập mẫu 130 nhịp dùng cho test với `--engine fake` (không cần mô hình TTS). Lỗi in `lỗi: ...` ra stderr, mã 1; sai tham số mã 2.

### Thư mục tập
```
episodes/<slug>/script.json, lexicon.json, sources.md, claims.json, outline.md, ...
episodes/index.json            danh mục tập (mảng, không chứa _template)
out/episodes/<slug>/           đầu ra, gitignore
```
Đầu ra: `narration.wav` (48 kHz mono, -16 LUFS), `timeline.json`, `video.srt`, `chapters.txt`, `cache/`. Không ghi gì vào `video/public/`. Cảnh không có nhịp (`holdMs`) chèn im lặng vào `narration.wav`; `pause_ms` chèn sau nhịp, trừ nhịp cuối tập. Chương ngắn hơn 10 giây chỉ in cảnh báo.

### Cache và chạy lại
Mỗi nhịp lưu vào `cache/` theo khoá (engine, giọng, tốc độ, chuỗi đọc). Chạy lại chỉ tổng hợp nhịp có chuỗi đọc mới hoặc chưa có; đổi một nhịp thì engine được gọi đúng một lần. Ngắt giữa chừng rồi chạy lại chỉ làm nhịp còn thiếu. File cache ghi qua file tạm; file hỏng hay cụt bị phát hiện, xoá và tổng hợp lại; `.tmp` mồ côi được dọn đầu mỗi lần dựng.

### Đọc số (`normalize_vi`)
`text` là chữ hiện phụ đề; lời đọc là `spoken` nếu có, không thì `text` qua `normalize_vi`. Kết quả luôn không còn chữ số. Ví dụ:

| Viết | Đọc |
|---|---|
| `3,14` | ba phẩy mười bốn |
| `1.000.000` | một triệu |
| `50%` | năm mươi phần trăm |
| `2,5 GHz` | hai phẩy năm gi-ga-héc |
| `1995–2005` | một nghìn chín trăm chín mươi lăm đến hai nghìn không trăm linh năm |
| `12:30` | mười hai giờ ba mươi |
| `192.168.1.1` | một trăm chín mươi hai chấm một trăm sáu mươi tám chấm một chấm một |
| `100.000đ` | một trăm nghìn đồng |

Bảng đầy đủ (IP, phiên bản, ngày, số âm, số dính chữ, thứ tự xét chuỗi nối `.`) nằm trong mục "Đọc số" của `0b-hop-dong-timeline-v2.md`.

### Khi nào dùng `spoken` hay lexicon
- Một nhịp đọc chưa hay: đặt `spoken` cho nhịp đó. `spoken` dùng nguyên văn, không qua `normalize_vi` và không qua lexicon; phụ đề vẫn là `text`.
- Một từ đọc sai ở nhiều nơi (tên riêng, từ viết tắt): thêm vào `episodes/<slug>/lexicon.json` (chồng lên `content/lexicon.json`). Khoá được so trên chữ gốc, không phân biệt hoa thường, trước `normalize_vi`, nên khoá có chữ số như `x86` dùng được.

### Kiểm thử (dựng tập)
```bash
cd audio && PYTHONPATH=$PWD/src .venv/bin/pytest -m "not real" tests/test_episode_build.py tests/test_episode_validator.py tests/test_episode_contract.py tests/test_episode_files.py tests/test_normalize_vi.py tests/test_normalize_vi_tinhoc.py tests/test_normalize_vi_dau_cau.py
```
Dùng engine `fake`, không cần mô hình TTS; dựng `_template` 130 nhịp một lần nên cả bộ chạy khoảng một phút. Các test bảo vệ:
- `test_episode_validator.py` và `test_episode_contract.py`: `timeline2.sample.json` hợp lệ, mỗi luật 1–13 của hợp đồng có mẫu sai, ca biên hợp lệ.
- `test_episode_build.py`: tập mẫu 130 nhịp (timeline, SRT, `chapters.txt`, wav -16 LUFS), khoảng nghỉ và cảnh câm tính đúng frame, `spoken` ghi đè hoàn toàn, sfx, cache (đổi 1 nhịp gọi engine 1 lần, chạy lại sau khi ngắt, file hỏng, ghi nguyên tử, dọn `.tmp`), mã thoát và `lỗi:`, cờ CLI, không đổi `video/public`.
- `test_episode_files.py`: `_template`, `index.json`, `episodes/README.md`.
- `test_normalize_vi.py`, `test_normalize_vi_tinhoc.py`, `test_normalize_vi_dau_cau.py`: bảng đọc số, IP, phiên bản, giờ, gạch nối, ngày, lexicon có chữ số; mẫu số đứng sát dấu câu (`5-10.`, `192.168.1.1.`, `1.000.000.`) và số hệ mười sáu (`0xFF`).

Danh sách từng test và kết quả bẻ code thử: `.team/tests/5.md`.

## Âm thanh tập

Trộn giọng đọc, nhạc nền và SFX của một tập thành `mix.wav` (WAV 16-bit mono 48 kHz, -16 LUFS ±1, true peak ≤ -1,5 dBTP, dài đúng `durationInFrames`).

```bash
cd audio && PYTHONPATH=$PWD/src .venv/bin/python -m aivideo.mix <slug> [--stems] [--root <gốc-repo>]
```
`PYTHONPATH=src` là bắt buộc trên Mac vì file `.pth` trong venv bị gắn cờ hidden (xem ghi chú ở trên).

- Đầu vào: `out/episodes/<slug>/narration.wav` và `timeline.json` (v2, cần đủ `durationInFrames`, `fps`, `sfx`); `episodes/<slug>/script.json` lấy `meta.music.track` và `meta.music.gainDb` (không có `music` thì không nhạc).
- Đầu ra: `out/episodes/<slug>/mix.wav`. Có `--stems` thì thêm `mix.voice.wav`, `mix.music.wav` (nhạc đã lọc, gain và ducking, để đo nhạc thấp hơn giọng bao nhiêu dB). Các file chỉ xuất hiện khi cả lượt trộn đạt; lỗi thì bản cũ giữ nguyên.
- Nhạc: lặp hoặc cắt theo độ dài, fade vào 1 s và ra 2 s, lọc 120 Hz–8 kHz, `sidechaincompress` khoá bằng giọng. Nhạc dài quá 7200 giây hoặc rỗng bị từ chối.
- SFX có sẵn (sinh bằng numpy, `aivideo.sfx`): `pop`, `tick`, `whoosh`, `ding`, `buzz`. Đặt đúng mẫu theo `timeline.sfx[].frame`.

### `assets/audio/manifest.json`
`{"tracks": [...]}`, mỗi bài có 7 trường: `id`, `file`, `sourceUrl`, `license`, `downloadedAt`, `sha256`, `attribution`. `file` nằm trong `assets/audio/files/`, thư mục này gitignore, không commit nhạc. Nguồn nhạc theo D17: YouTube Audio Library lọc "Attribution not required" (sau khi có kênh), trước đó Tallbeard CC0; không dùng nhạc AI. Thêm bài: tải vào `files/`, `shasum -a 256`, thêm mục vào manifest, đặt `meta.music.track` = `id`.

### Lỗi thường gặp
Mọi lỗi in `lỗi: ...` ra stderr và thoát mã 1.
- Thiếu file nhạc, id không có trong manifest, hoặc lệch sha256: thông báo nêu đường dẫn file; nạp lại file hoặc cập nhật sha256 đúng.
- Thiếu `narration.wav`, `timeline.json` hay `script.json`: chạy bước dựng tập trước.
- `mix không đạt`: loudness ngoài -16 ±1 LUFS, true peak vượt -1,5 dBTP hoặc độ dài lệch quá 1 frame. Thường gặp khi giọng quá thưa hay quá nhỏ nên không đưa lên đủ -16 mà vẫn dưới trần true peak; kiểm lại `narration.wav` và `gainDb` của nhạc. Theo `.team/doi-san-xuat.md`: không nới ngưỡng; `editor` dừng và trả `voice-producer` tìm nhịp lệch mức để đọc lại; vẫn lỗi sau 2 lần thì `CẦN NGƯỜI DÙNG`. Trộn âm chạy trước render nên lỗi này không tốn thời gian render.

### Kiểm thử
```bash
cd audio && PYTHONPATH=$PWD/src .venv/bin/pytest tests/test_sfx.py tests/test_mix.py tests/test_am_thanh_tap_repo.py
```
Chạy từng file hoặc cả ba đều được; cần `ffmpeg` trên máy. Test dùng tone sinh tại chỗ, đo bằng FFmpeg thật, không dùng và không commit media. Các test bảo vệ:
- `test_sfx.py`: năm SFX (hình dạng, độ dài, tất định), bus SFX đặt đúng mẫu ±5 ms, gain, cộng chồng, lỗi tên và frame.
- `test_mix.py`: -16 ±1 LUFS và true peak ≤ -1,5 dBTP, độ dài ±1 frame, nhạc thấp hơn giọng ít nhất 12 dB lúc có giọng (qua stem), fade, bộ lọc, mix tất định byte-giống-byte, thiếu nhạc hoặc lệch sha256 thì CLI thoát 1 và nêu file, lỗi không để lại hay đè file.
- `test_am_thanh_tap_repo.py`: không có wav, mp3, mp4 trong git; `assets/audio/files/` bị gitignore.

Danh sách từng test: `.team/tests/9.md`.
