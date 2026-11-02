# Đề mục 9: giao diện công khai (DEV-9 ghi, TESTER-9 đọc)

Mọi hàm chạy với `PYTHONPATH=audio/src`. Mọi âm thanh nội bộ: float32 mono, 48000 Hz (`OUT_SR` của `aivideo.audio`). 1 frame = 1600 mẫu (30 fps).

## `aivideo/sfx.py` — [9-1], [9-2]
- `SR = 48000`; `NAMES = ("pop", "tick", "whoosh", "ding", "buzz")`.
- `generate(name: str, sr: int = SR) -> np.ndarray`: một SFX, float32 mono, tất định (cùng đầu vào cho cùng mẫu), đỉnh tuyệt đối 0,9, bắt đầu ngay mẫu 0 (không im lặng đầu), kết thúc về 0, dài 0,05–1,5 s. Tên lạ → `ValueError` nêu tên và danh sách hợp lệ.
- `render_bus(events: list[dict], duration_frames: int, fps: int = 30, sr: int = SR) -> np.ndarray`: `events` là `timeline["sfx"]` (`frame`, `name`, `gainDb`). Trả mảng dài đúng `round(duration_frames * sr / fps)` mẫu; SFX bắt đầu ở mẫu `round(frame * sr / fps)`, nhân `10 ** (gainDb / 20)`, các SFX chồng nhau thì cộng. Phần vượt cuối bị cắt. `frame` ngoài `[0, duration_frames)` hoặc `gainDb > 0` → `ValueError`.
- `write_wav(name, path, sr=SR)`: ghi một SFX ra file (dùng nghe thử).

## `aivideo/mix.py` — [9-3]
- Lỗi nhạc: `class MusicError(RuntimeError)`; thông điệp nêu đường dẫn file thiếu hoặc id/file lệch sha256.
- `load_manifest(path) -> dict`: đọc `assets/audio/manifest.json`. Cấu trúc: `{"tracks": [{"id","file","sourceUrl","license","downloadedAt","sha256","attribution"}]}`. `file` tương đối so với `assets/audio/files/`.
- `resolve_track(track_id, manifest_path=DEFAULT_MANIFEST, files_dir=DEFAULT_FILES) -> Path`: trả đường dẫn nhạc đã kiểm sha256. Id không có → `MusicError`; file thiếu → `MusicError`; sha256 lệch → `MusicError`.
- `mix_episode(timeline_path, narration_path, out_path, *, music_path=None, music_gain_db=-24.0) -> dict`: đọc `timeline.json` v2 (lấy `durationInFrames`, `fps`, `sfx`), trộn giọng + nhạc (nếu có) + bus SFX, ghi `out_path` (WAV 16-bit mono 48 kHz), rồi gọi `verify_mix`. Trả `{"lufs","true_peak","frames"}`. Tham số thêm `stem_voice_path=None, stem_music_path=None`: nếu có, ghi stem giọng (đã đệm/cắt đúng độ dài) và stem nhạc đã qua lọc, gain và ducking (trước limiter/loudnorm), cùng thang với nhau, để đo chênh giọng - nhạc trong lúc có giọng (cần nhạc để có stem nhạc).
  - Độ dài đầu ra đúng `durationInFrames` frame (giọng ngắn hơn thì đệm im lặng, dài hơn thì cắt).
  - Nhạc: lặp hoặc cắt cho đủ độ dài, fade vào 1 s, fade ra 2 s, highpass 120 Hz, lowpass 8 kHz, `music_gain_db` đặt trước ducking, `sidechaincompress` khoá bằng giọng. Mục tiêu: lúc có giọng, nhạc thấp hơn giọng ít nhất 12 dB.
  - `alimiter` rồi `loudnorm` hai lượt `linear=true`, mục tiêu -16 LUFS, TP -1,5.
- `true_peak(path) -> float`: dBTP của file (ebur128 `peak=true`). `measure_lufs` lấy từ `aivideo.audio` bằng import.
- `verify_mix(path, duration_frames, fps=30) -> dict`: ném `RuntimeError` nếu LUFS lệch quá ±1 khỏi -16, true peak > -1,5 dBTP, hoặc độ dài lệch quá 1 frame.
- CLI theo tập: `python -m aivideo.mix <slug> [--root R] [--stems]`. `R` mặc định là gốc repo. Đọc `meta.music` (`track`, `gainDb`) trong `R/episodes/<slug>/script.json` (không có `music` thì không nhạc); đọc `R/out/episodes/<slug>/narration.wav` và `timeline.json`; ghi `R/out/episodes/<slug>/mix.wav`. `--stems` thêm `mix.voice.wav` và `mix.music.wav` (stem như trên) cùng thư mục. Nhạc lấy qua `resolve_track` với manifest `R/assets/audio/manifest.json`, `R/assets/audio/files/`.
- Lỗi (thiếu script/narration/timeline, id lạ, thiếu file nhạc, lệch sha256, `verify_mix` fail): in `lỗi: ...` (có đường dẫn file) ra stderr, thoát 1, không để lại `mix.wav` mới. Thành công thoát 0, in LUFS, true peak, số frame.

## `assets/audio/`
- `assets/` ở gốc repo. `manifest.json` commit dạng `{"tracks": []}`, `README.md` (cách nạp nhạc, giấy phép), `files/` có luật gitignore riêng (`assets/audio/files/*` trừ `.gitkeep`), không dựa vào `*.mp3`.
