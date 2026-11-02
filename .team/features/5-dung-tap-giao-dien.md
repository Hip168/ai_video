# Đề mục 5: giao diện công khai (DEV-5 ghi, TESTER-5 đọc)

Hợp đồng dữ liệu: `0b-hop-dong-timeline-v2.md`. Tất cả chạy với cwd = `audio/`, `PYTHONPATH=src` (hoặc `pip install -e`).

## `aivideo.normalize_vi` ([5-2])
- `normalize_vi(text: str) -> str` : đổi mọi chuỗi số trong `text` thành chữ (không còn chữ số 0-9 trong kết quả). Quy tắc:
  - Thập phân `3,14` (và `3.14` khi không phải phân cách nghìn) (phần lẻ 1–2 chữ số đọc như một số: `3,14` -> `ba phẩy mười bốn`, `2,4` -> `hai phẩy bốn`, `0,05` -> `không phẩy không năm`; từ 3 chữ số đọc từng chữ số).
  - Phân cách nghìn `1.000`, `1.000.000` (nhóm 3 chữ số) -> `một nghìn`, `một triệu`. Hỗ trợ tới 999 tỷ (có `tỷ`).
  - `%` sau số -> `phần trăm` (`50%` -> `năm mươi phần trăm`).
  - Đơn vị đứng ngay sau số (cách 0 hoặc 1 dấu cách), phân biệt hoa thường: Hz `héc`, kHz `ki-lô-héc`, MHz `mê-ga-héc`, GHz `gi-ga-héc`, KB `ki-lô-bai`, MB `mê-ga-bai`, GB `gi-ga-bai`, TB `tê-ra-bai`, Kbps `ki-lô-bít trên giây`, Mbps `mê-ga-bít trên giây`, Gbps `gi-ga-bít trên giây`, ns `na-nô giây`, µs `micro giây`, ms `mili giây`, s `giây`, km/h `ki-lô-mét trên giờ`, km `ki-lô-mét`, cm `xen-ti-mét`, mm `mi-li-mét`, kg `ki-lô-gam`, °C `độ xê`.
  - Năm: số 4 chữ số đọc như số thường (`năm 1995` -> `năm một nghìn chín trăm chín mươi lăm`).
  - Khoảng: gạch ngang `-` hoặc `–` giữa hai số (không dấu cách hoặc có) -> ` đến ` (`1995–2005` -> `một nghìn chín trăm chín mươi lăm đến hai nghìn không trăm linh năm`).
  - `1920x1080` / `1920×1080` -> `... nhân ...`.
  - Số trần còn lại: dùng `audio.number_to_words`.
- `speak(text: str, lexicon: dict[str, str]) -> str` : `audio.normalize_text(normalize_vi(text), lexicon)`.
- `spoken` của beat (khác null, khác rỗng) **ghi đè hoàn toàn**: dùng nguyên văn, không qua `normalize_vi`, không qua lexicon.

## `aivideo.episode` ([5-1], [5-3])
- `validate_script(doc) -> list[str]` : lỗi `script.json` (rỗng = hợp lệ).
- `validate_timeline2(doc, catalog=None, narration_seconds=None) -> list[str]` : mỗi lỗi bắt đầu `luật N:` (N = 1..12 theo hợp đồng). `catalog` = tập id loại cảnh hợp lệ; `episode.CATALOG` là 18 id của hợp đồng, `build_episode` truyền nó vào (nếu None: chấp nhận mọi id dạng `^[a-z0-9]+(-[a-z0-9]+)*$` và `custom:<tên>`). `narration_seconds` có thì kiểm luật 11 (`durationInFrames == ceil((giây + 0.5) * 30)`; im lặng của cảnh câm đã nằm trong wav).
- `chapters_txt(timeline: dict) -> str` : mỗi dòng `mm:ss Tiêu đề` (`h:mm:ss` nếu tập >= 1 giờ), dòng đầu `00:00`, kết thúc bằng `\n`. Giây = `startFrame // 30` (cắt xuống).
- `build_episode(slug, engine, voice=None, speed=None, *, episodes_dir, out_dir, content_lexicon_path=None) -> dict` : trả timeline v2. `voice`/`speed` None -> lấy `meta.voice`/`meta.speed` (speed mặc định 1.0). Lexicon: `content_lexicon_path` (nếu có file) rồi chồng `episodes/<slug>/lexicon.json` (nếu có). Ghi vào `<out_dir>/<slug>/`: `narration.wav` (PCM16 48 kHz mono, -16 LUFS), `timeline.json`, `video.srt`, `chapters.txt`, `cache/<sha256>.wav`. Không ghi gì vào `video/public/`.
  - Giữa hai beat liền nhau chèn `pause_ms` của beat trước (kể cả qua ranh giới cảnh). Không chèn sau beat cuối của tập.
  - Cảnh câm (`beats` rỗng, `holdMs` > 0): chèn `holdMs` ms im lặng vào wav tại vị trí đó; cảnh dài `round` theo mẫu, tối thiểu 1 frame.
  - `sfx[]` của timeline: sfx cảnh tại `startFrame` cảnh, sfx beat tại `startFrame` beat, `gainDb` = -18, sắp theo frame (ổn định).
  - `timeline.chapters[].startFrame` = `startFrame` cảnh đầu của chương; `theme` = `meta.theme`; `audio.src` = `"narration.wav"`.
  - Timeline luôn qua `validate_timeline2` trước khi ghi; sai -> `RuntimeError`.
  - Cache TTS: khoá theo (engine, voice, speed, chuỗi đọc). Mỗi beat ghi cache ngay sau khi tổng hợp, nên ngắt giữa chừng rồi chạy lại chỉ gọi `engines.synth` cho beat chưa có. Đổi 1 beat -> đúng 1 lần gọi. Ghi cache qua file tạm `<khoá>.wav.<pid>.tmp` rồi `os.replace` (không để lại `.wav` dở, tmp bị xoá). Trước khi dùng, cache được kiểm: header RIFF/WAVE, kích thước RIFF và kích thước chunk `data` phải khớp đúng số byte file, có >= 1 mẫu. Nếu file `<khoá>.wav` có sẵn mà sai (cắt nửa, rác, rỗng, chỉ còn header) hoặc đọc lỗi thì xoá nó và tổng hợp lại đúng beat đó (1 lần gọi engine); các beat còn lại không bị gọi. Hàm: `episode._synth_cached(cache_dir, engine, voice, speed, spoken)`.
  - Chương ngắn hơn 10 giây: in cảnh báo ra stderr (`cảnh báo: chương ... < 10 giây`), không lỗi.
- `_template` là slug dành riêng: CLI `build` chấp nhận; slug khác phải khớp `^[a-z0-9]+(-[a-z0-9]+)*$`. `cue` nếu có phải là chuỗi không rỗng (luật 8).
- `main(argv) -> int` ; CLI: `python -m aivideo.episode build <slug> --engine {korva,vieneu,fake} [--voice V] [--speed S] [--episodes-dir ../episodes] [--out-dir ../out/episodes] [--lexicon ../content/lexicon.json]`. Mã thoát 0 khi xong, 1 khi lỗi (in `lỗi: ...` ra stderr), 2 khi sai tham số. In `timeline: <n> frame (<s> s)`.

## Dữ liệu
- `episodes/_template/` : `script.json` (130 beat, `meta.voice`/`speed`/`theme`), `lexicon.json`, `claims.json` (`[]`), `sources.md`, `outline.md`.
- `episodes/index.json` : mảng rỗng `[]` ban đầu, không chứa `_template`; dạng mảng `[{"slug","title","theme","sceneTypes":[...]}]`.
- `episodes/README.md` : cách tạo tập, `script.json`, lệnh dựng.

## Cập nhật theo hợp đồng mới (đọc số, SFX, nghỉ, chuỗi)
- `normalize_vi`: kết quả không bao giờ còn chữ số 0-9. Thêm: `0.001`/`0,001` là thập phân ("không phẩy không không một", phân cách nghìn chỉ khi phần nguyên 1–999); `2.000.000.100` -> "hai tỷ một trăm"; `100.000đ` -> "một trăm nghìn đồng" (đơn vị `đ`, `₫` = "đồng"); chữ số dính chữ: <= 2 chữ số đọc như số (`v2` "v hai", `4K` "bốn K", `5G` "năm G"), từ 3 chữ số đọc từng chữ số (`1080p` "một không tám không p"); `-5°C` "âm năm độ xê" (dấu `-` đầu chuỗi hoặc sau khoảng trắng/`(`, liền chữ số); `12:30` "mười hai giờ ba mươi", `12:00` "mười hai giờ", `12:05` "mười hai giờ không năm"; `1/2` "một phần hai".
- `validate_script`: `sfx` (cảnh, beat) chỉ nhận `pop`, `tick`, `whoosh`, `ding`, `buzz` (`episode.SFX_NAMES`); tập toàn cảnh câm là lỗi; id sai kiểu (mảng...) trả lỗi chứ không ném. `validate_timeline2` không ném với đầu vào sai kiểu. `audio.src` không chứa `..` (chuỗi con), `://`, không bắt đầu `/` hoặc `\`.
- `build_episode`/`main`: `holdMs` nhỏ vẫn cho cảnh câm tối thiểu 1 frame (im lặng tối thiểu 1/30 s). `pause_ms` của nhịp cuối tập không được chèn (kể cả khi sau nó là cảnh câm). `main` bắt `TypeError`/`AttributeError`: in `lỗi:` mã 1.
- `_template` dùng SFX `ding` thay `chime`.
