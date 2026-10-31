# Giao diện công khai — Đề mục 1 (Âm thanh)

Hợp đồng giữa DEV-1 và TESTER-1. Nguồn: `1-am-thanh.md`, `0-hop-dong-timeline.md`. Mọi đường dẫn tương đối tính từ thư mục chạy `audio/` (cwd = `audio/`). Test dùng `tmp_path`, không ghi vào `out/` hay `video/public/` thật.

## Gói và file
```
audio/pyproject.toml            gói `aivideo`, src-layout (audio/src/aivideo), Python >=3.12
audio/src/aivideo/__init__.py
audio/src/aivideo/engines.py
audio/src/aivideo/audio.py      cũng là điểm vào CLI: python -m aivideo.audio
audio/tests/test_audio.py       (TESTER-1)
content/script.json  content/lexicon.json  content/compare.txt
```
pytest: marker `real` đăng ký trong `pyproject.toml`; `pytest -m "not real"` không cần mô hình. Mặc định test thường không được import `korvatts`/`vieneu`.

## aivideo.engines
```python
ENGINES = ("korva", "vieneu", "fake")
def synth(engine: str, text: str, voice: str, speed: float = 1.0) -> tuple[np.ndarray, int]
```
- Trả `(wav, sample_rate)`: `wav` là `np.ndarray` dtype `float32`, `ndim == 1` (mono), giá trị trong [-1, 1].
- `engine` ngoài `ENGINES` -> `ValueError`. `text` rỗng/chỉ khoảng trắng -> `ValueError`.
- `fake`: sóng sin, `sample_rate = 24000`; độ dài thân = `len(text) * 0.06 / speed` giây (tỉ lệ số ký tự, xác định, không ngẫu nhiên), cộng 0,3 giây lặng (giá trị 0) mỗi đầu. Cùng đầu vào -> cùng đầu ra. `voice` bất kỳ chuỗi nào, đổi `voice` đổi tần số sin (để cache khác nhau).
- `korva`, `vieneu`: import engine khi gọi (lazy). Thiếu gói -> `RuntimeError` có hướng dẫn cài extra.
- `VOICES: dict[str, list[str]]` — danh sách giọng thử khi `compare` (điền sau khi kiểm gói thật; `fake` có `["a", "b"]`).

## aivideo.audio — hàm
```python
def validate_timeline(doc: dict) -> list[str]        # rỗng = hợp lệ; luật 1-10 của hợp đồng
def number_to_words(n: int) -> str                    # tiếng Việt, 0..999_999_999; vd 1 -> "một", 25 -> "hai mươi lăm"
def normalize_text(text: str, lexicon: dict[str, str]) -> str
def spoken_text(segment: dict, lexicon: dict[str, str]) -> str
def load_script(path) -> dict
def load_lexicon(path) -> dict[str, str]
def srt_timestamp(seconds: float) -> str              # "HH:MM:SS,mmm", làm tròn ms
def write_srt(beats: list[dict], path, fps: int = 30) -> None
def build(engine: str, voice: str, speed: float = 1.0, *, script_path, lexicon_path,
          public_dir, out_dir) -> dict                # trả timeline dict đã ghi
def compare(text_file, out_dir, engines=None, voices=None) -> list[Path]
def main(argv: list[str] | None = None) -> int        # CLI
```
- `validate_timeline`: mỗi vi phạm một chuỗi (không cần khớp nguyên văn thông báo; test chỉ kiểm `len > 0` và có chứa từ khoá luật nếu hợp đồng nêu, hoặc kiểm số lỗi >= 1). File mẫu `.team/contract/timeline.sample.json` -> `[]`. Doc không phải dict / thiếu khoá -> trả lỗi, không ném ngoại lệ.
- `normalize_text`: (1) số nguyên thập phân `\d+` -> chữ qua `number_to_words`; (2) thay từ theo `lexicon`, khớp **nguyên từ**, **không phân biệt hoa thường**, khoá dài ưu tiên (vd `Wi-Fi` khớp trọn, không tách `Fi`); dấu câu giữ nguyên. Không đụng văn bản gốc (hàm thuần).
- `spoken_text(segment, lexicon)`: nguồn = `segment["spoken"]` nếu có và không rỗng, ngược lại `segment["text"]`; rồi áp `normalize_text`. `segment["text"]` không bao giờ bị đổi (phụ đề giữ chữ gốc).
- `build` gọi TTS qua `aivideo.engines.synth` bằng truy cập thuộc tính module (`engines.synth(...)`) nên test `monkeypatch.setattr("aivideo.engines.synth", spy)` đếm được số lần gọi.

## Cache
Thư mục `<out_dir>/cache/`; mỗi nhịp một file `<sha256>.npy`... chính xác: `<sha256>.wav` (float32). Khoá = sha256 của `engine|voice|speed|lời đọc đã chuẩn hóa`. Chạy lại không đổi gì -> `synth` gọi 0 lần; sửa lời đọc đúng một nhịp -> gọi 1 lần.

## Đầu ra của `build`
| File | Đường dẫn |
|---|---|
| timeline | `<public_dir>/timeline.json` |
| wav | `<public_dir>/audio/narration.wav` (PCM 16-bit mono 48 kHz, đã loudnorm -16 LUFS, TP <= -1,5 dBTP) |
| SRT | `<out_dir>/video.srt` |
| cache | `<out_dir>/cache/` |

Mặc định CLI: `public_dir = ../video/public`, `out_dir = ../out`.
- `audio.src` = `"audio/narration.wav"`. `fps 30, 1920x1080, version 1`.
- Khoảng nghỉ: sau nhịp i chèn `pause_ms` (của nhịp i) im lặng; nhịp cuối cộng thêm 0,5 s đuôi theo luật 9. `durationInFrames = ceil((độ dài wav giây + 0.5) * 30)`... theo hợp đồng luật 9 với độ dài wav chưa gồm 0,5 s; |độ dài wav*30 - durationInFrames| <= 1 frame khi tính đúng công thức của hợp đồng (test kiểm `abs(wav_frames - (durationInFrames - 15)) <= 1`).
- SRT: một cue mỗi nhịp, theo thứ tự, đánh số từ 1; thời điểm bắt đầu = `startFrame/30`, kết thúc = `(startFrame+durationFrames)/30` (khớp timeline trong 1 ms); nội dung = `text` gốc (không phải lời đọc đã chuẩn hóa); cue cách nhau một dòng trống.
- Lỗi: engine lạ -> `ValueError`; timeline sinh ra không qua `validate_timeline` -> `RuntimeError`.

## CLI
```bash
python -m aivideo.audio compare --text-file ../content/compare.txt [--out-dir ../out/compare] [--engines korva,vieneu] [--voices korva=ID,vieneu=ID]
python -m aivideo.audio build --engine {korva|vieneu|fake} --voice ID [--speed 1.0]
        [--script ../content/script.json] [--lexicon ../content/lexicon.json]
        [--public-dir ../video/public] [--out-dir ../out]
```
- `--engine`, `--voice` bắt buộc với `build`; thiếu -> thoát mã 2 (argparse). `main` trả 0 khi thành công, khác 0 khi lỗi.
- `compare`: ghi `<out-dir>/<engine>_<giọng>.wav` cho mọi cặp (engine, giọng) (mặc định: các engine thật trong `ENGINES` với giọng trong `VOICES`; `--engines fake` được phép để test). Cùng văn bản (toàn bộ nội dung file, qua lexicon), cùng loudness (loudnorm -16 LUFS mỗi file); chênh loudness giữa các file <= 0,5 LU. Tên giọng trong tên file thay ký tự ngoài `[A-Za-z0-9_-]` bằng `-`. Trả danh sách đường dẫn.

## Dữ liệu
- `content/script.json`: `{title, voice, segments:[{id, scene, text, spoken?, pause_ms, cue?}]}`, 19 nhịp s01..s19 nguyên văn `kich-ban-mau.md`; `scene` thuộc tập 7 cảnh; `pause_ms` số nguyên 250..450.
- `content/lexicon.json`: object chuỗi->chuỗi, có tối thiểu `DNS`, `IP`, `Wi-Fi`, `router`, `packet`.
- `content/compare.txt`: 2-3 câu chứa `router`, `packet`, `DNS`, `Wi-Fi`, `IP`.
