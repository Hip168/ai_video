#!/bin/zsh
# Một lệnh từ kịch bản tập ra MP4 dài: out/episodes/<slug>/<slug>.mp4 (chỉ chạy trên Mac, zsh).
# Dùng: ./make-episode.sh <slug> [--engine <id>] [--voice <id>] [--speed <số>] [--from <bước>] [--procs <N>]
# Bước: tools build lint mix render assemble check. Giao diện: .team/features/10-render-dai-giao-dien.md
set -eu
zmodload zsh/datetime

steps=(tools build lint mix render assemble check)
engine=korva
voice=""
speed=""
from=tools
procs=""

usage() { print -u2 "Dùng: ./make-episode.sh <slug> [--engine <id>] [--voice <id>] [--speed <số>] [--from <bước>] [--procs <N>]"; }

slug=""
while (( $# > 0 )); do
  case "$1" in
    --engine|--voice|--speed|--from|--procs)
      if (( $# < 2 )); then print -u2 "Thiếu giá trị cho $1"; usage; exit 2; fi
      case "$1" in
        --engine) engine="$2" ;;
        --voice) voice="$2" ;;
        --speed) speed="$2" ;;
        --from) from="$2" ;;
        --procs) procs="$2" ;;
      esac
      shift 2 ;;
    --*) print -u2 "Tham số lạ: $1"; usage; exit 2 ;;
    *)
      if [[ -n "$slug" ]]; then print -u2 "Thừa tham số: $1"; usage; exit 2; fi
      slug="$1"; shift ;;
  esac
done
[[ -n "$slug" ]] || { print -u2 "Thiếu <slug>"; usage; exit 2; }
[[ "$slug" =~ '^[a-z0-9_]+([-][a-z0-9_]+)*$' ]] || { print -u2 "slug không hợp lệ: $slug"; exit 2; }
(( ${steps[(Ie)$from]} )) || { print -u2 -- "--from phải là một trong: ${steps[*]}"; exit 2; }
[[ -z "$procs" || "$procs" =~ '^[1-9][0-9]*$' ]] || { print -u2 -- "--procs phải là số nguyên dương"; exit 2; }

root="${0:A:h}"
out="$root/out/episodes/$slug"
py="$root/audio/.venv/bin/python"
total=7
mkdir -p "$out"
logf="$out/render.log"
fail() { print -u2 "LỖI ở $1: $2"; print "$(date '+%F %T') LỖI ở $1: $2" >> "$logf"; exit 1; }
begin() { # $1 = số thứ tự, $2 = tên bước (đồng thời là khoá)
  step="Bước $1/$total: $2"
  print "== $step =="
  print "$(date '+%F %T') == $step ==" >> "$logf"
}
# Chạy lệnh, ghi cả vào nhật ký, trả mã thoát của lệnh (không phải của tee).
run() {
  "$@" 2>&1 | while IFS= read -r line; do
    print -r -- "$line"
    print -r -- "$(strftime '%F %T' $EPOCHSECONDS) $line" >> "$logf"
  done
  return ${pipestatus[1]}
}
want() { (( ${steps[(Ie)$1]} >= ${steps[(Ie)$from]} )); }
need_file() { [[ -s "$1" ]] || fail "$step" "thiếu hoặc rỗng: ${1#$root/}"; }

started="$out/.started"

# --- 1/7: công cụ, trình duyệt, đĩa (luôn chạy) ---
begin 1 "kiểm công cụ"
[[ -x "$py" ]] || fail "$step" "thiếu audio/.venv (xem README, mục Cài đặt)"
for tool in node npm npx ffmpeg ffprobe; do
  command -v "$tool" >/dev/null 2>&1 || fail "$step" "thiếu $tool"
done
[[ -d "$root/video/node_modules" ]] || fail "$step" "thiếu video/node_modules (chạy npm ci trong video/)"
if [[ -z "${REMOTION_BROWSER_EXECUTABLE:-}" ]]; then
  browser="$HOME/.cache/aivideo/chrome-headless-shell/chrome-headless-shell"
  [[ -x "$browser" ]] || fail "$step" "thiếu $browser (D23, xem .team/stack.md); hoặc đặt REMOTION_BROWSER_EXECUTABLE"
else
  [[ -x "$REMOTION_BROWSER_EXECUTABLE" ]] || fail "$step" "REMOTION_BROWSER_EXECUTABLE không trỏ tới file chạy được: $REMOTION_BROWSER_EXECUTABLE"
fi
[[ -f "$root/episodes/$slug/script.json" ]] || fail "$step" "thiếu episodes/$slug/script.json"
if [[ "$engine" == korva ]]; then
  "$py" -c "import korvatts" >/dev/null 2>&1 || fail "$step" "thiếu gói korvatts trong audio/.venv (cài extras korva)"
fi
free_gb="${AIVIDEO_FREE_GB:-$(df -k "$out" | awk 'END{printf "%.1f", $4/1048576}')}"
min_gb="${AIVIDEO_MIN_FREE_GB:-6}"
(( free_gb >= min_gb )) || fail "$step" "đĩa trống ${free_gb} GB < ${min_gb} GB"
: > "$started"
export PYTHONPATH="$root/audio/src"

# --- 2/7: dựng tập ---
if want build; then
  begin 2 "dựng tập (giọng đọc, timeline, phụ đề)"
  rm -f "$out/timeline.json" "$out/video.srt" "$out/narration.wav"
  args=(build "$slug" --engine "$engine")
  [[ -n "$voice" ]] && args+=(--voice "$voice")
  [[ -n "$speed" ]] && args+=(--speed "$speed")
  ( cd "$root/audio" && run "$py" -m aivideo.episode "${args[@]}" ) || fail "$step" "lệnh episode build lỗi"
  for f in narration.wav timeline.json video.srt chapters.txt; do need_file "$out/$f"; [[ "$out/$f" -nt "$started" ]] || fail "$step" "$f không mới hơn lúc bắt đầu"; done
fi
for f in timeline.json; do [[ -s "$out/$f" ]] || fail "đầu vào" "thiếu $f (chạy từ bước build)"; done

# --- 3/7: lint ---
if want lint; then
  begin 3 "lint chống lặp"
  ( cd "$root/video" && run npm run --silent lint:episode -- "$slug" ) || fail "$step" "lint không đạt"
fi

# --- 4/7: trộn tiếng ---
if want mix; then
  begin 4 "trộn tiếng"
  rm -f "$out/mix.wav"
  ( cd "$root/audio" && run "$py" -m aivideo.mix "$slug" ) || fail "$step" "lệnh mix lỗi"
  need_file "$out/mix.wav"
  [[ "$out/mix.wav" -nt "$started" ]] || fail "$step" "mix.wav không mới hơn lúc bắt đầu"
fi

# --- 5/7: render đoạn ---
if want render; then
  begin 5 "render đoạn (Remotion, ${procs:-3} trình duyệt)"
  rm -f "$out/video.silent.mp4" "$out/$slug.mp4"
  [[ -n "$procs" ]] && export AIVIDEO_PROCS="$procs"
  ( cd "$root/video" && run npx tsx scripts/render-episode.ts "$slug" ) || fail "$step" "render-episode lỗi"
  need_file "$out/manifest.json"
  "$py" - "$out/manifest.json" <<'PY' || fail "$step" "manifest.json còn đoạn chưa xong hoặc thiếu file"
import json, sys
from pathlib import Path
m = json.load(open(sys.argv[1]))
segs = m["layouts"]["main"]
d = Path(sys.argv[1]).parent
bad = [s["id"] for s in segs if s["status"] != "done" or not (d / s["file"]).is_file() or (d / s["file"]).stat().st_size == 0]
if bad or sum(s["frames"] for s in segs) != m["durationInFrames"]:
    print("đoạn lỗi:", bad, file=sys.stderr); sys.exit(1)
PY
fi

# --- 6/7: ghép, gắn tiếng, kiểm MP4 ---
if want assemble; then
  begin 6 "ghép đoạn, gắn tiếng, kiểm MP4"
  ( cd "$root/audio" && run "$py" -m aivideo.assemble concat "$slug" ) || fail "$step" "ghép đoạn lỗi"
  need_file "$out/video.silent.mp4"
  ( cd "$root/audio" && run "$py" -m aivideo.assemble mux "$slug" ) || fail "$step" "gắn tiếng lỗi"
  need_file "$out/$slug.mp4"
  [[ "$out/$slug.mp4" -nt "$started" ]] || fail "$step" "$slug.mp4 không mới hơn lúc bắt đầu"
  ( cd "$root/audio" && run "$py" -m aivideo.assemble verify "$slug" ) || fail "$step" "kiểm MP4 không đạt"
fi

# --- 7/7: kiểm mất hình, dọn ---
if want check; then
  begin 7 "kiểm mất hình (quét đột biến, render lượt hai lệch ranh giới)"
  ( cd "$root/audio" && run "$py" -m aivideo.framecheck verify "$slug" ) || fail "$step" "kiểm mất hình không đạt"
  mp4="$out/$slug.mp4"
  [[ -s "$mp4" ]] || fail "$step" "không có $slug.mp4"
  ( cd "$root/audio" && run "$py" -m aivideo.assemble clean "$slug" ) || fail "$step" "dọn lỗi"
  [[ ! -d "$out/segments" ]] || fail "$step" "segments/ vẫn còn sau khi dọn"
  [[ -s "$mp4" && -s "$out/video.srt" && -s "$out/chapters.txt" ]] || fail "$step" "thiếu file giữ lại sau khi dọn"
fi

rm -f "$started"
print "XONG: $out/$slug.mp4 (cùng video.srt, chapters.txt)"
print "$(date '+%F %T') XONG" >> "$logf"
