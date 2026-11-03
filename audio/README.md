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
