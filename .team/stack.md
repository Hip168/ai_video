# Stack

Môi trường: macOS arm64, RAM 16 GB, 10 nhân, ổ trống ~53 GB (đo 2026-10-31).

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

Ở phiên chính trên Mac này, `chrome-headless-shell` do Remotion tải về crash (`icudtl.dat not found in bundle`), trong và ngoài sandbox; TEST-LEAD-2 chạy được nó. Nguyên nhân chưa xác định. Cách chạy ổn định là dùng Chrome của máy:
```bash
export REMOTION_BROWSER_EXECUTABLE="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
```
Người dùng cho phép chạy ngoài sandbox riêng các lệnh Remotion trong worktree (2026-10-31).

## Giấy phép
Remotion miễn phí cho cá nhân và tổ chức tối đa 3 người. KorvaTTS, VieNeu: Apache-2.0.

## Chưa xác minh (DEV kiểm khi build)
- Kiểu trả về của `korvatts`, `vieneu`; nơi VieNeu lưu mô hình; dung lượng mô hình.
- `korvatts` và `vieneu` có xung đột phụ thuộc không.
- API `<Audio>`, `staticFile`, tên hàm trong `remotion.config.ts` đúng với 4.0.539.
