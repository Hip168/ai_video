# aivideo

Từ kịch bản `content/script.json` ra video giải thích `out/video.mp4` + phụ đề `out/video.srt` bằng một lệnh. Chỉ chạy trên Mac (zsh).

## Từ bản clone sạch tới video

Cần sẵn: Python 3.12 tại `/opt/homebrew/bin/python3.12`, `uv`, Node 22, `ffmpeg` + `ffprobe`.

```bash
git clone <địa chỉ repo> && cd <thư mục repo>

# 1. Giọng đọc (Python), cài cả extras korva
cd audio
uv venv --python /opt/homebrew/bin/python3.12
uv pip install -e ".[korva]"
cd ..

# 2. Hình ảnh (Node)
cd video
npm ci
cd ..

# 3. (Mac) dùng Chrome của máy để dựng hình
export REMOTION_BROWSER_EXECUTABLE="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

# 4. Chạy
./make-video.sh
```

- Lần chạy đầu cần mạng: KorvaTTS tải mô hình từ Hugging Face (`dogenthq/KorvaTTS`, không cần khoá API); Remotion có thể tải trình duyệt nếu bạn không đặt `REMOTION_BROWSER_EXECUTABLE`. Các lần sau không cần mạng cho mô hình.
- `REMOTION_BROWSER_EXECUTABLE`: trên Mac này `chrome-headless-shell` do Remotion tải về có thể crash (`icudtl.dat not found in bundle`), nên nên trỏ tới Chrome của máy như trên. Không đặt thì Remotion dùng mặc định. Script chỉ truyền biến này qua nếu bạn đặt.
- Script không tự cài gì. Thiếu `audio/.venv`, gói `korvatts`, `node`, `npm`, `ffmpeg`, `ffprobe` hoặc `video/node_modules` thì nó báo "LỖI ở Bước 1/3" kèm thứ thiếu và thoát mã khác 0.

## Cách dùng

```bash
./make-video.sh [--engine <id>] [--voice <id>] [--speed <số>]
```
Mặc định `--engine korva --voice hoang_nam --speed 1.25`. Tham số lạ: báo lỗi, thoát mã 2.

Ba bước, mỗi bước in tên; lỗi dừng ngay và nêu bước nào:
1. Kiểm công cụ.
2. Giọng đọc: `audio build` ra `video/public/audio/narration.wav`, `video/public/timeline.json`, `out/video.srt`.
3. Dựng hình: `npm run render` trong `video/` ra `out/video.mp4`. Script không tin mã thoát của lệnh này mà kiểm `out/video.mp4` có tồn tại, không rỗng và mới hơn lúc bắt đầu, và `out/video.srt` có. File kết quả cũ bị xoá trước khi chạy.

Kết quả nằm trong `out/` và các file sinh ra khác đều đã gitignore: `git status` không có media.

### Đổi giọng, tốc độ

- Giọng korva: `bao_kim`, `gia_bao`, `hoang_nam`, `huu_dat`, `khanh_vy`, `ngoc_huyen`, `phuong_linh`, `quang_huy`, `quynh_nhu`, `thanh_phong`. Ví dụ `./make-video.sh --voice ngoc_huyen`.
- Tốc độ: `--speed 1.25` mặc định. Với 1.0 kịch bản thật ra khoảng 105,7 giây, vượt 90 giây; giữ video trong 60–90 giây thì dùng khoảng 1.25.
- Engine `vieneu` cần extras `vieneu` (`uv pip install -e ".[vieneu]"`). Engine này không hỗ trợ tốc độ khác 1.0, nên dùng `vieneu` phải thêm `--speed 1.0` (mặc định của script là 1.25 sẽ bị từ chối). Ví dụ:
  ```bash
  ./make-video.sh --engine vieneu --voice "Ngọc Huyền" --speed 1.0
  ```

### Sửa cách phát âm

Chỉnh `content/lexicon.json` (từ viết tắt, tên riêng, số được đổi thành cách đọc), rồi chạy lại `./make-video.sh`. Nội dung lời thoại nằm ở `content/script.json`.

## Xử lý sự cố

- `import aivideo` không thấy gói: file `.pth` trong venv bị gắn cờ hidden. Script đã chạy với `PYTHONPATH=audio/src` nên không bị; nếu tự chạy lệnh audio, thêm `PYTHONPATH=$PWD/src` hoặc `chflags nohidden audio/.venv/lib/python3.12/site-packages/*.pth`.

Chi tiết từng phần: `audio/README.md`, `video/README.md`.
