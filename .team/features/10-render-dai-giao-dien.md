# Đề mục 10: giao diện công khai

Đường dẫn tính từ gốc repo. `<out>` = `out/episodes/<slug>`. Môi trường: `npm ci` trong `video/`, `audio/.venv` (Python 3.12, extras `dev`), `PYTHONPATH=src` khi chạy Python từ `audio/`.

## 1. `./make-episode.sh <slug> [--engine fake|korva|vieneu] [--voice V] [--speed S] [--from <bước>] [--procs N]`
Chỉ Mac, zsh. `--engine` mặc định `korva`. Các bước (in `== Bước i/7: <tên> ==`), tên dùng cho `--from`:
1. `tools` kiểm công cụ, trình duyệt (D23), đĩa
2. `build` `python -m aivideo.episode build`
3. `lint` `npm run lint:episode -- <slug>`
4. `mix` `python -m aivideo.mix`
5. `render` `render-episode.ts` (lượt chính)
6. `assemble` ghép `video.silent.mp4`, gắn tiếng ra `<slug>.mp4`, `assemble verify`
7. `check` `framecheck verify` (quét đột biến, lượt hai lệch ranh giới). Nếu bước này render lại đoạn `main` nào (có `segments/*.mp4` mới hơn `<slug>.mp4`), hoặc chưa có `<slug>.mp4`, thì ghép, gắn tiếng và `assemble verify` lại như bước 6, để MP4 cuối không bao giờ giữ đoạn cũ. Chỉ sau lượt kiểm cuối đạt mới chạy `assemble clean` (D26).

`--from <bước>` bỏ qua các bước trước (bước `tools` luôn chạy). Mỗi bước xong, script kiểm file thật (không tin mã thoát): `narration.wav`, `timeline.json`, `mix.wav`, `manifest.json` đủ đoạn `done`, `video.silent.mp4`, `<slug>.mp4` mới hơn lúc bắt đầu. Lỗi: `LỖI ở <bước>: <lý do>` ra stderr, mã 1; tham số sai mã 2. Nhật ký: `<out>/render.log`, mọi dòng (kể cả dòng của lệnh con) bắt đầu bằng `YYYY-MM-DD HH:MM:SS`. Đầu ra giữ lại: `<out>/<slug>.mp4`, `video.srt`, `chapters.txt`, `cache/`, `manifest.json`, `render.log`.

## 2. `video/scripts/render-episode.ts`
```
cd video && npx tsx scripts/render-episode.ts <slug> [--root <gốc>] [--layout main|shift] [--procs N] [--frames a-b] [--redo id,id] [--force] [--plan]
```
- Đọc `<out>/timeline.json`, qua `validateTimeline2`. Bundle một lần. Mỗi đoạn một `renderMedia`: `frameRange`, `concurrency: 1`, `muted: true`, `crf: 18`, `codec h264`, `yuv420p`, `imageFormat png`, `browserExecutable` truyền tường minh. `N` trình duyệt chạy song song (mặc định 3, hoặc `AIVIDEO_PROCS`), mỗi cái xử lý đoạn lần lượt. Tiêu chí (D26): sau khi chạy, dù xong, lỗi, SIGINT/SIGTERM hay `close()` hỏng, không còn tiến trình `chrome-headless-shell` mồ côi và manifest đã được ghi. Khi xong hoặc lỗi, mỗi trình duyệt được `close()` với hạn 10 giây; `close()` ném lỗi hoặc quá hạn thì diệt dự phòng cả nhóm tiến trình (xem dưới), rồi ghi manifest. Pid trình duyệt lấy bằng `pgrep -P <pid node> -f user-data-dir=` ngay sau mỗi `openBrowser` (object Browser của Remotion 4.0.539 không lộ pid); diệt bằng `process.kill(-pid, "SIGKILL")` vì Remotion spawn Chrome `detached` (trưởng nhóm tiến trình). SIGINT/SIGTERM: handler (đăng ký trước `openBrowser`, nên chạy trước listener SIGINT của Remotion vốn tự `process.exit(130)`) làm đồng bộ: diệt nhóm tiến trình mọi trình duyệt, xoá `.part.mp4` của đoạn đang render, ghi manifest (đoạn đang dở giữ trạng thái cũ, không `done`), rồi `process.exit(130)`.
- Chọn trình duyệt: `REMOTION_BROWSER_EXECUTABLE` nếu đặt (phải tồn tại, không thì lỗi mã 1). Không đặt: macOS dùng `~/.cache/aivideo/chrome-headless-shell/chrome-headless-shell`, thiếu thì lỗi mã 1 nêu cách cài; Linux (CI) để Remotion tự chọn.
- `--root` là gốc DỮ LIỆU (`episodes/`, `out/`). Thư mục `video/` luôn tìm theo vị trí mã (kể cả khi `framecheck verify` gọi lại `render-episode.ts`).
- Điểm móc cho test: `AIVIDEO_FAIL_SEGMENT=<id đoạn>` làm đoạn đó ném lỗi sau khi trình duyệt đã mở; chương trình thoát mã 1, không còn trình duyệt mồ côi, manifest đã ghi. `AIVIDEO_FAIL_CLOSE=throw|hang` làm `close()` của mọi trình duyệt ném lỗi (`throw`) hoặc treo (`hang`, chờ hết hạn 10 giây); mã thoát như khi không đặt, nhưng phải đi qua đường diệt dự phòng theo nhóm tiến trình: không còn trình duyệt mồ côi, manifest đã ghi.
- Chia đoạn: `target` 1800 frame, cắt ở biên cảnh (thêm cảnh vào đoạn khi tổng chưa vượt 1800; đoạn không rỗng). Cảnh dài hơn 2700 frame được cắt đều thành các khúc ≤ 1800. `--layout shift`: đoạn đầu chỉ 900 frame, rồi như trên; ranh giới lệch so với `main`, ra `segments-shift/`.
- `--plan`: chỉ in kế hoạch JSON (`[{id,startFrame,endFrame,frames}]`, `endFrame` tính cả) ra stdout, không mở trình duyệt, mã 0.
- `--frames a-b`: chỉ render các đoạn giao với [a,b] (cả đoạn). `--redo id,id`: xoá và render lại đúng các đoạn đó. `--force`: bỏ resume.
- Resume: đoạn có file, trạng thái `done` trong manifest, hash khớp, `ffprobe` đếm đúng số frame thì bỏ qua (in `bỏ qua <id>`). Còn lại render lại. Ghi ra file `.part.mp4` rồi đổi tên, nên ngắt giữa chừng không để lại đoạn cụt giả `done`.
- Đường ra: `<out>/segments/seg-NNN.mp4` (main), `<out>/segments-shift/seg-NNN.mp4` (shift).
- Mã thoát: 0 xong, 1 lỗi, 2 sai tham số, 3 đĩa thiếu, 130 bị ngắt.
- In ra `đoạn <id> xong (<frames> frame, <giây> s)` mỗi đoạn.

### Đĩa
Trước khi render (và trước khi `assemble concat/mux`): trống dưới `AIVIDEO_MIN_FREE_GB` (mặc định 6) thì in `LỖI: đĩa trống <x> GB < <y> GB` và thoát mã 3, không mở trình duyệt. Dành cho test: `AIVIDEO_FREE_GB=<số>` thay giá trị đo thật bằng số đó (cả TS lẫn Python).

### `manifest.json` (`<out>/manifest.json`)
```json
{ "version": 1, "slug": "...", "fps": 30, "durationInFrames": 0, "srcHash": "<sha256 video/src>",
  "layouts": { "main": [Segment...], "shift": [Segment...] },
  "assembled": { "silent": "video.silent.mp4", "final": "<slug>.mp4" } }
Segment = { "id": "seg-000", "startFrame": 0, "endFrame": 1799, "frames": 1800, "file": "segments/seg-000.mp4",
            "hash": "<sha256>", "status": "pending|done|failed", "attempts": 1, "bytes": 0 }
```
`hash` = sha256 của: các cảnh giao với đoạn (chuỗi JSON khoá sắp xếp), `theme`, `fps`, kích thước, `startFrame`, `endFrame`, `crf`, hash mã `video/src`, phiên bản `@remotion/renderer`. `assembled` chỉ có sau `assemble`. Khoá `layouts.shift` chỉ có khi đã chạy `--layout shift`.

## 3. `python -m aivideo.assemble <lệnh> <slug> [--root <gốc>]`
`--root` mặc định `AIVIDEO_ROOT` nếu có, không thì gốc repo (theo vị trí mã). Cổng `ky-thuat` của `gates.py` đặt `AIVIDEO_ROOT` = gốc repo của tập (`<tập>/../..`). Lỗi in `lỗi: ...` stderr mã 1 (đĩa thiếu mã 3).
- `concat`: đọc manifest `main`, kiểm từng đoạn `done` và đủ frame (ffprobe), ghép `ffmpeg -f concat -c copy` thành `<out>/video.silent.mp4`, kiểm tổng frame = `durationInFrames`.
- `mux`: `video.silent.mp4` + `mix.wav` thành `<out>/<slug>.mp4` (video copy, AAC 192k, `+faststart`), ghi `assembled` vào manifest.
- `verify`: kiểm `<slug>.mp4`: codec h264, `yuv420p`, 1920x1080, 30 fps, có audio AAC, số frame = `durationInFrames`, loudness -16 ±1 LUFS, true peak ≤ -1,0 dBTP (AAC có thể vượt nhẹ so với mix -1,5), độ dài âm thanh lệch hình ≤ 1 frame, không có đoạn đen liền ≥ 0,5 giây (check `black`, `blackdetect pix_th=0.02`: chỉ bắt khung đen, không bắt khung chỉ còn nền theme), không có đột biến mất hình (check `dips`: `framecheck scan` trên toàn video, bỏ qua khung theo `<out>/timeline.json` nếu có; chỉ chạy khi đúng 1920x1080). In JSON `{ok, checks:{...}}`; mã 0 đạt, 1 không.
- `clean`: chỉ chạy khi `<slug>.mp4` có và `verify` đạt, không thì mã 1 và không xoá gì. Xoá: `segments/`, `segments-shift/`, `mix.wav`, `mix.voice.wav`, `mix.music.wav`, `video.silent.mp4`, `*.part.mp4`. Giữ: `<slug>.mp4`, `video.srt`, `chapters.txt`, `cache/`, `timeline.json`, `narration.wav`, `manifest.json`, `render.log`. In JSON `{"freed": <byte>, "kept": <byte>}` (`kept` = tổng byte các file còn lại trong `<out>`).

## 4. `python -m aivideo.framecheck <lệnh>`
- `scan <mp4> [--start N]`: quét từng khung vùng `y < 830` (nửa độ phân giải, xám). Với khung n, `c[n]` = số điểm khác màu nền (nền = giá trị xám phổ biến nhất của khung, ngưỡng lệch 40). Báo đột biến khi `c` tụt ít nhất `max(25, 4%)` so với `c[n-1]` rồi hồi về trong ±`max(20, 5%)` của `c[n-1]` sau không quá 2 khung. Bỏ qua 8 khung quanh đầu cảnh và quanh cue (đọc từ `--timeline <file>` nếu có). In từng dòng `đột biến: khung <số> (c từ <a> còn <b>)`. `--start N` cộng vào số khung in ra.
- `compare <a.mp4> <b.mp4> [--start-a N] [--start-b M] [--count K]`: so từng khung vùng `y < 830`, mức khác = ngưỡng 40 trên ảnh nửa độ phân giải; một khung chỉ tính lệch khi sau khi bào mòn 3x3 còn ít nhất 30 điểm liền khối (lệch nửa điểm ảnh ở chữ chỉ cho nét mảnh nên bị bào mòn hết). In `lệch: khung <số> (<n> điểm)`.
- `verify <slug> [--root <gốc>]`: (1) `scan` trên các đoạn `main` đã ghép (theo manifest); đoạn nào có đột biến: `render-episode --redo <id>`, tối đa 3 lần; (2) nếu chưa có thì `render-episode --layout shift`, `scan` đoạn shift, `compare` toàn tập main với shift; khung lệch: render lại cả hai đoạn chứa khung đó (main và shift), tối đa 3 lần, rồi so lại. Còn lệch hoặc đột biến sau 3 lần: in `LỖI: khung <số> ...`, mã 1. Đạt mã 0 (`framecheck: ĐẠT`).
- Mã thoát chung: 0 sạch, 1 phát hiện hoặc lỗi dữ liệu, 2 sai tham số. Với `scan`/`compare`, 1 kèm danh sách khung.

## 5. Validator chung Python và TypeScript
- Bộ mẫu chung do TESTER-10 giữ: `audio/tests/data/timeline2-cases.json` (mỗi ca có `valid`) và `audio/tests/data/template-timeline.json`. `validateTimeline2` (TS) và `validate_timeline2` (Python, `aivideo.episode`, kiểm cả tên SFX) phải khớp `valid`.
- Timeline do `episode build` sinh cho `_template` (engine fake) qua được `validateTimeline2` của TS.

## 6. Biến môi trường
| Biến | Tác dụng |
|---|---|
| `REMOTION_BROWSER_EXECUTABLE` | trình duyệt render (thắng đường mặc định D23) |
| `AIVIDEO_PROCS` | số trình duyệt song song, mặc định 3 |
| `AIVIDEO_MIN_FREE_GB` | ngưỡng đĩa, mặc định 6 |
| `AIVIDEO_FREE_GB` | giả lập dung lượng trống (test) |
| `AIVIDEO_FAIL_SEGMENT` | gây lỗi ở một đoạn (test đóng trình duyệt) |
