# Đề mục 1 — Âm thanh

Nhánh `1-am-thanh`. Sở hữu `audio/`, `content/`. Không sửa `video/`, trừ việc sinh file đã gitignore vào `video/public/`.

## Mục tiêu
Từ kịch bản tạo giọng đọc đã chuẩn hóa, `timeline.json` và file SRT. Có bước so sánh để người dùng chọn giọng.

## Phạm vi / Ngoài phạm vi
Trong: so sánh giọng, chuẩn hóa văn bản, bảng phát âm, tổng hợp từng nhịp, cắt lặng, ghép, loudnorm, cache, xuất timeline + SRT.
Ngoài: nhạc nền, SFX, thời gian theo từ, nhân bản giọng, `.github/workflows/`, Revideo, edge-tts, librosa.

## Giao diện công khai
```bash
.venv/bin/python -m aivideo.audio compare --text-file ../content/compare.txt
.venv/bin/python -m aivideo.audio build --engine <korva|vieneu|fake> --voice <id>
```
- `compare` ghi `../out/compare/<engine>_<giọng>.wav`, cùng văn bản, cùng mức loudness.
- `build` ghi `../video/public/timeline.json`, `../video/public/audio/narration.wav`, `../out/video.srt`.
- `validate_timeline(doc) -> list[str]`: trả danh sách lỗi theo `.team/features/0-hop-dong-timeline.md`, rỗng là hợp lệ.
- `synth(engine, text, voice, speed) -> (np.ndarray float32 mono, sample_rate)`.

## Dữ liệu
- `content/script.json`: `{title, voice, segments:[{id, scene, text, spoken?, pause_ms, cue?}]}`. `text` là chữ phụ đề, `spoken` ghi đè lời đọc của riêng nhịp đó.
- `content/lexicon.json`: `{ "DNS": "đi en ét", ... }`, thay nguyên từ, không đổi chữ phụ đề (decisions D4).
- `content/compare.txt`: 2–3 câu có `router`, `packet`, `DNS`, `Wi-Fi`, `IP`.
- Nội dung kịch bản lấy nguyên văn từ `.team/features/kich-ban-mau.md`.

## Kiến trúc đã chọn: tối thiểu
```
audio/pyproject.toml          Python >=3.12, extras korva, vieneu, dev; marker pytest `real`
audio/src/aivideo/engines.py  synth(): dispatch korva | vieneu | fake, import engine thật khi cần
audio/src/aivideo/audio.py    chuẩn hóa, cache, cắt lặng, ghép, loudnorm, ghi SRT + timeline, validate, CLI
audio/tests/                  6 file test + conftest.py (test_build, test_compare, test_content, test_engines, test_text, test_timeline)
content/script.json, lexicon.json, compare.txt
```
Không tạo class, interface, registry.

Luồng `build`: đọc kịch bản → chuẩn hóa → tổng hợp từng nhịp (cache trong `out/cache/` theo hash của engine, giọng, tốc độ, lời đọc) → cắt lặng → đo số mẫu → ghép với khoảng nghỉ → tính frame → loudnorm 2 lượt → ghi wav → validate timeline → ghi timeline, rồi SRT (timeline hỏng thì không ghi timeline và SRT, báo lỗi).

FFmpeg, giá trị ban đầu, được chỉnh khi nghe thử:
```
silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05,areverse,
silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.08,areverse,
silenceremove=stop_periods=-1:stop_duration=0.5:stop_threshold=-45dB:stop_silence=0.25,
aresample=48000,aformat=channel_layouts=mono
```
Lượt 1 `loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json`; lượt 2 thêm giá trị đo và `linear=true`. Xuất PCM 16-bit mono 48 kHz.

API đã đọc từ tài liệu, chưa chạy: `korvatts.TTS().synthesize(text, voice=, lang="vi", total_steps=32, speed=1.05)` trả `(wav, duration)`, 44,1 kHz; `vieneu.Vieneu().infer(text, voice=)`, Turbo 48 kHz. vieneu không có `speed`; chỉnh độ dài bằng `pause_ms`. `compare(..., engines_list, lexicon_path)`, CLI `--engines`, `--lexicon`; tên file bỏ dấu (`vieneu_Truc-Ly.wav`). `number_to_words` cam kết 0–99. `validate_timeline` kiểm luật 1-8 và 10; `build` chỉ tính `durationInFrames`; khoảng 1800–2700 (60–90 giây) kiểm bằng test `real` bản giọng thật, không ép trong `build`. `pause_ms` chỉ cần số nguyên ≥ 0. Engine `fake` sinh sóng sin, độ dài tỉ lệ số ký tự, có 0,3 giây lặng ở hai đầu.

## File quan trọng
`.team/features/0-hop-dong-timeline.md`, `.team/contract/timeline.sample.json`, `.team/features/kich-ban-mau.md`, `.team/decisions.md`.

## Task và tiêu chí nghiệm thu
- **[1-1] Khung dự án và kiểm timeline.** `pytest -m "not real"` chạy được; file mẫu qua `validate_timeline`; 7 loại timeline hỏng theo luật hợp đồng bị báo lỗi.
- **[1-2] Engine fake và bọc hai engine thật.** `fake` trả float32 mono đúng độ dài; test `real` trên Mac xác nhận kiểu dữ liệu và sample rate của cả hai engine, ghi kết quả vào README `audio/`; xung đột phụ thuộc (nếu có) được ghi và xử lý.
- **[1-3] Chuẩn hóa văn bản và bảng phát âm.** Test bao phủ số thành chữ, thay từ, ghi đè `spoken`, phụ đề giữ chữ gốc.
- **[1-4] Lệnh `compare`.** Ra file cho cả hai engine, chênh loudness ≤ 0,5 LU. Dừng để người dùng nghe và chọn engine + giọng (`CẦN NGƯỜI DÙNG`).
- **[1-5] Tổng hợp, cắt lặng, ghép, loudnorm, cache.** Với engine `fake`: lặng thừa mỗi đầu nhịp ≤ 100 ms; kết quả -16 ±1 LUFS, true peak ≤ -1,5 dBTP; chạy lần hai không gọi lại `synth`, sửa một nhịp chỉ gọi một lần.
- **[1-6] Xuất SRT và timeline, `build` chạy đầu cuối.** Với engine `fake`: timeline qua `validate_timeline`; độ dài wav lệch mốc timeline ≤ 1 frame; số cue SRT bằng số nhịp, mốc khớp timeline, định dạng `HH:MM:SS,mmm`.
- **[1-7] Bản giọng thật.** Chạy kịch bản thật bằng giọng đã chọn; dài 60–90 giây; timeline qua validate; người dùng nghe và duyệt các từ `router`, `packet`, `DNS`, `Wi-Fi`, `IP`.

## Lệnh dựng bản giọng thật ([1-7])
`cd audio && PYTHONPATH=$PWD/src .venv/bin/python -m aivideo.audio build --engine korva --voice hoang_nam --speed 1.25`
Kết quả thật: 2631 frame, 87,7 giây. Tốc độ mặc định 1.0 ra 105,7 giây (vượt 90 giây) nên phải dùng `--speed 1.25`. `--speed` vẫn mặc định 1.0. Đề mục 3 đưa tham số này vào `make-video.sh`. `voice` trong `content/script.json` chỉ để tham khảo, `build` lấy giọng từ `--voice`.
