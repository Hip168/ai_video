# Đề mục 9: Âm thanh tập

Nhánh `9-am-thanh-tap`. Hợp đồng: `0b-hop-dong-timeline-v2.md`. Quyết định: D5, D15, D17.

## Kiến trúc đã chọn
- Mới: `audio/src/aivideo/{sfx,mix}.py`, `assets/audio/manifest.json`, `assets/audio/README.md`.
- `sfx.py` sinh bằng numpy, tối thiểu `pop`, `tick`, `whoosh`, `ding`, `buzz`. Không tải gì, không commit media.
- Bus SFX đặt tại đúng mẫu theo `timeline.sfx[].frame`.
- `mix.py` một lệnh FFmpeg: nhạc lặp hoặc cắt theo độ dài, fade vào và ra, highpass 120 Hz, lowpass 8 kHz; `sidechaincompress` khoá bằng narration; cộng giọng, nhạc, SFX; `alimiter`; loudnorm hai lượt `linear=true`.
- Thêm hàm đo true peak. Tái dùng `loudnorm`, `measure_lufs` bằng import.
- `manifest.json` gồm `id`, `file`, `sourceUrl`, `license`, `downloadedAt`, `sha256`, `attribution`. File nhạc ở `assets/audio/files/`, gitignore. Thiếu file hoặc lệch sha256 thì báo lỗi rõ.
- OPS nạp nhạc thật sau, không thuộc đề mục này.

## Task
- [9-1] Sinh SFX.
- [9-2] Bus SFX theo timeline.
- [9-3] Trộn, ducking, loudnorm, kiểm.

## Xong khi
Trên tone sinh tại chỗ:
- -16 ±1 LUFS, true peak ≤ -1,5 dBTP.
- Trong lúc có giọng, nhạc thấp hơn giọng ít nhất 12 dB.
- Độ dài khớp timeline ±1 frame.
- SFX xuất hiện đúng mẫu ±5 ms.
- Thiếu nhạc hoặc lệch sha256 thì lệnh thoát khác 0, nêu file.
- `git ls-files '*.wav' '*.mp3' '*.mp4'` rỗng. Test khoá xanh.
