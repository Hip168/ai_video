#!/bin/zsh
# Một lệnh từ kịch bản ra video: out/video.mp4 + out/video.srt (chỉ chạy trên Mac, zsh).
# Dùng: ./make-video.sh [--engine <id>] [--voice <id>] [--speed <số>]
set -eu

engine=korva
voice=hoang_nam
speed=1.25

usage() { print -u2 "Dùng: ./make-video.sh [--engine <id>] [--voice <id>] [--speed <số>]"; }

while (( $# > 0 )); do
  case "$1" in
    --engine|--voice|--speed)
      if (( $# < 2 )); then print -u2 "Thiếu giá trị cho $1"; usage; exit 2; fi
      case "$1" in
        --engine) engine="$2" ;;
        --voice) voice="$2" ;;
        --speed) speed="$2" ;;
      esac
      shift 2 ;;
    *) print -u2 "Tham số lạ: $1"; usage; exit 2 ;;
  esac
done

root="${0:A:h}"
fail() { print -u2 "LỖI ở $1: $2"; exit 1; }

# --- Bước 1/3: kiểm công cụ ---
step="Bước 1/3: kiểm công cụ"
print "== $step =="
py="$root/audio/.venv/bin/python"
[[ -x "$py" ]] || fail "$step" "thiếu audio/.venv (xem README, mục Cài đặt)"
if [[ "$engine" == korva ]]; then
  "$py" -c "import korvatts" >/dev/null 2>&1 || fail "$step" "thiếu gói korvatts trong audio/.venv (cài extras korva, xem README)"
fi
for tool in node npm ffmpeg ffprobe; do
  command -v "$tool" >/dev/null 2>&1 || fail "$step" "thiếu $tool"
done
[[ -d "$root/video/node_modules" ]] || fail "$step" "thiếu video/node_modules (chạy npm ci trong video/, xem README)"

# Xoá kết quả cũ để không thể nhầm file cũ với kết quả mới.
mkdir -p "$root/out"
rm -f "$root/out/video.mp4" "$root/out/video.srt"
started="$root/out/.started"
: > "$started"

# --- Bước 2/3: giọng đọc, timeline, phụ đề ---
step="Bước 2/3: giọng đọc (engine $engine, giọng $voice, tốc độ $speed)"
print "== $step =="
( cd "$root/audio" && PYTHONPATH="$PWD/src" "$py" -m aivideo.audio build \
    --engine "$engine" --voice "$voice" --speed "$speed" ) \
  || fail "$step" "lệnh audio build lỗi"
[[ -s "$root/out/video.srt" ]] || fail "$step" "không có out/video.srt"

# --- Bước 3/3: dựng hình ---
step="Bước 3/3: dựng hình (Remotion)"
print "== $step =="
( cd "$root/video" && npm run render ) || fail "$step" "npm run render lỗi"
# Không tin mã thoát: kiểm file thật.
mp4="$root/out/video.mp4"
[[ -f "$mp4" ]] || fail "$step" "không có out/video.mp4"
[[ -s "$mp4" ]] || fail "$step" "out/video.mp4 rỗng"
[[ "$mp4" -nt "$started" ]] || fail "$step" "out/video.mp4 không mới hơn lúc bắt đầu"
[[ -s "$root/out/video.srt" && "$root/out/video.srt" -nt "$started" ]] || fail "$step" "out/video.srt thiếu hoặc cũ"
rm -f "$started"

print "XONG: $mp4 và $root/out/video.srt"
