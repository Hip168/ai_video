# Stack

Môi trường: macOS arm64, RAM 16 GB, 10 nhân, ổ trống ~73 GB (đo 2026-11-03, sau khi dọn).

## Phần âm thanh — thư mục `audio/`
- Python **3.12** (bắt buộc). `/opt/homebrew/bin/python3.12`. Python 3.10, 3.11, 3.14 trên máy này hỏng `pyexpat`; không dùng.
- Quản lý môi trường: `uv`. Phụ thuộc chính `numpy`, `soundfile`. Extra: `korva` (`korvatts` 0.1.3), `vieneu` (`vieneu` 3.8.3), `dev` (`pytest`). Ghim phiên bản.
- FFmpeg + FFprobe 8.1 (đã có trên máy).
- Không dùng librosa, edge-tts.

```bash
cd audio
uv venv --python /opt/homebrew/bin/python3.12
uv pip install -e ".[dev]"            # CI và test thường
uv pip install -e ".[dev,korva,vieneu]"   # trên Mac, chạy giọng thật
export PYTHONPATH=$PWD/src            # trên Mac: cờ hidden của file .pth trong .venv tự bật lại, chưa rõ nguyên nhân
.venv/bin/pytest -m "not real"        # không cần mô hình TTS
.venv/bin/pytest -m real              # chỉ trên Mac
```

## Phần hình ảnh — thư mục `video/`
- Node 22.23, npm 10.9.
- Remotion **4.0.539**, React **19.1**, TypeScript **5.7.2**, ghim chính xác (không dùng `^`).
- Vitest. Vẽ bằng SVG + CSS, `spring`, `interpolate`. Không dùng Revideo.
- Font Việt lưu cục bộ trong `video/public/fonts/` (giấy phép OFL), được commit.

```bash
cd video
npm ci
npx remotion browser ensure   # một lần, cần mạng
npx tsc --noEmit
npx vitest run
RENDER_TEST=1 npx vitest run  # có render khung hình
npm run render                # ra ../out/video.mp4
```

Trình duyệt render: dùng `chrome-headless-shell` đặt ngoài `~/Documents`, không dùng Google Chrome (D23):
```bash
export REMOTION_BROWSER_EXECUTABLE="$HOME/.cache/aivideo/chrome-headless-shell/chrome-headless-shell"
```
Bản trong `video/node_modules/.remotion` crash với `icudtl.dat not found in bundle`: log hệ thống ghi macOS từ chối tiến trình con của nó đọc file trong `~/Documents` (`Sandbox deny file-read-data`), không phải thiếu file. Chép ra `~/.cache` thì chạy được. Google Chrome còn sinh một bản `code_sign_clone` cho mỗi lần mở.
Người dùng cho phép chạy ngoài sandbox riêng các lệnh Remotion trong worktree (2026-10-31).

## Đo tập dài (OPS, 2026-11-03)
Đo trên timeline thật 2643 frame, máy bận, tức cận trên. Quy đổi tuyến tính ra 18.000 frame.

| | Google Chrome 156 | Headless shell 157 |
|---|---|---|
| Ba tiến trình, giây/frame | 0,067 | 0,0607 |
| 18.000 frame, ba tiến trình | 6,7 phút | 6,1 phút |
| RAM cả cây đỉnh mỗi tiến trình | 1,92 GB | 1,41 GB |
| Đĩa tạm đỉnh mỗi tiến trình | 64 MB | 12 MB |
| Mất hình ở frame 1314/1315 | 5/7 lần | 0/5 lần |

TTS: 0,14–0,17 giây/ký tự, 9.500 ký tự mất 22–27 phút, RAM khoảng 2,6 GB. MP4 10 phút ước khoảng 40 MB. Render ghi thẳng vào ffmpeg, không có PNG tạm.
Chốt cho đề mục 10: 3 tiến trình, chặn đĩa 6 GB giữ nguyên. Trộn âm, ghép đoạn, 6000 frame liền chưa đo.

## Chạy render nặng lần lượt (BA chốt, 2026-11-03)
Nhiều agent cùng chạy `RENDER_TEST=1` hay render dài làm máy tải 80–95 và test chập chờn. Mọi lượt chạy cả bộ `RENDER_TEST=1`, `render-episode.ts`, `make-episode.sh` phải giữ khoá chung, chạy lần lượt:
```bash
lockf -t 3600 /tmp/aivideo-render.lock <lệnh>
```
Chạy một file test nhỏ có render (dưới khoảng 1 phút) không cần khoá. Ghi rõ trong báo cáo nếu đỏ xảy ra khi không giữ khoá.

## Giấy phép
Remotion miễn phí cho cá nhân và tổ chức tối đa 3 người. KorvaTTS, VieNeu: Apache-2.0.

## Chưa xác minh (DEV kiểm khi build)
- Kiểu trả về của `korvatts`, `vieneu`; nơi VieNeu lưu mô hình; dung lượng mô hình.
- `korvatts` và `vieneu` có xung đột phụ thuộc không.
- API `<Audio>`, `staticFile`, tên hàm trong `remotion.config.ts` đúng với 4.0.539.
