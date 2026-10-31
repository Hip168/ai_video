# aivideo (audio)

Giọng đọc, `timeline.json` và SRT cho video giải thích. Lệnh và lệnh cài: xem `.team/stack.md`.

## Kết quả kiểm engine thật (Mac arm64, 2026-10-31)

| Engine | Gọi | Kiểu trả về | Sample rate |
|---|---|---|---|
| korva (`korvatts` 0.1.3) | `TTS().synthesize(text, voice=, lang="vi", total_steps=32, speed=)` -> `(wav, duration)` | `numpy float32`, 1 chiều | 44100 |
| vieneu (`vieneu` 3.8.3) | `Vieneu().infer(text, voice=)` -> `wav` | `numpy float32`, 1 chiều | 48000 |

- Hai gói cùng cài được trong một venv, không xung đột phụ thuộc.
- korva tải mô hình từ Hugging Face (`dogenthq/KorvaTTS`) lần đầu; có 10 giọng: bao_kim, gia_bao, hoang_nam, huu_dat, khanh_vy, ngoc_huyen, phuong_linh, quang_huy, quynh_nhu, thanh_phong.
- vieneu tải `pnnbao-ump/VieNeu-TTS-v3-Turbo` (~0,9 GB) và codec MOSS. `Vieneu()` mặc định lỗi trên máy này: onnxruntime từ chối file dữ liệu ngoài khi cache Hugging Face dùng symlink ("External data path escapes model directory"). `engines.py` vá `OnnxV3LiteEngine._fetch` để liên kết cứng file thật vào `~/.cache/aivideo/` (đổi bằng biến `AIVIDEO_MODELS`).
- vieneu không có tham số `speed`; `synth("vieneu", ..., speed != 1.0)` báo `ValueError`.
- vieneu có 25 giọng; `compare` chỉ lấy 10 giọng "featured" của tác giả.
