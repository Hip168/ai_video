#!/bin/zsh
# Một lệnh từ kịch bản tập ra MP4 dài: out/episodes/<slug>/<slug>.mp4 (chỉ chạy trên Mac, zsh).
# Dùng: ./make-episode.sh <slug> [--engine <id>] [--voice <id>] [--speed <số>] [--from <bước>] [--procs <N>] [--short <n>]
# Bước: tools build lint mix render assemble check. Giao diện: .team/features/10-render-dai-giao-dien.md
# --short <n>: Short phần n sau tập dài, bước tools lint mix render assemble check (.team/features/14-shorts-giao-dien.md).
set -eu
zmodload zsh/datetime

steps=(tools build lint mix render assemble check)
engine=korva
voice=""
speed=""
from=tools
procs=""
short=""

usage() { print -u2 "Dùng: ./make-episode.sh <slug> [--engine <id>] [--voice <id>] [--speed <số>] [--from <bước>] [--procs <N>] [--short <n>]"; }

slug=""
while (( $# > 0 )); do
  case "$1" in
    --engine|--voice|--speed|--from|--procs|--short)
      if (( $# < 2 )); then print -u2 "Thiếu giá trị cho $1"; usage; exit 2; fi
      case "$1" in
        --engine) engine="$2" ;;
        --voice) voice="$2" ;;
        --speed) speed="$2" ;;
        --from) from="$2" ;;
        --procs) procs="$2" ;;
        --short)
          if [[ -n "$short" ]]; then print -u2 -- "--short chỉ được ghi một lần"; usage; exit 2; fi
          short="$2" ;;
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
[[ -z "$short" || "$short" =~ '^[1-8]$' ]] || { print -u2 -- "--short phải là số 1..8"; exit 2; }
[[ -z "$short" || "$from" != build ]] || { print -u2 -- "--short không có bước build"; exit 2; }

root="${0:A:h}"
out="$root/out/episodes/$slug"
py="$root/audio/.venv/bin/python"
total=7
mkdir -p "$out"
logf="$out/render.log"
if [[ -n "$short" ]]; then total=6; logf="$out/short-$short.log"; fi
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
# Làm đoạn kết nếu tập bật (có cache thì bỏ qua), ghép đoạn main, gắn tiếng, kiểm MP4 cuối (dùng ở bước 6 và lại ở bước 7 khi có đoạn render lại).
assemble_all() {
  ( cd "$root/audio" && run "$py" -m aivideo.outro ensure "$slug" ) || fail "$step" "đoạn kết lỗi"
  ( cd "$root/audio" && run "$py" -m aivideo.assemble concat "$slug" ) || fail "$step" "ghép đoạn lỗi"
  need_file "$out/video.silent.mp4"
  ( cd "$root/audio" && run "$py" -m aivideo.assemble mux "$slug" ) || fail "$step" "gắn tiếng lỗi"
  need_file "$out/$slug.mp4"
  [[ "$out/$slug.mp4" -nt "$started" ]] || fail "$step" "$slug.mp4 không mới hơn lúc bắt đầu"
  ( cd "$root/audio" && run "$py" -m aivideo.assemble verify "$slug" ) || fail "$step" "kiểm MP4 không đạt"
}

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
# nhạc nền nằm ngoài git: thiếu thì báo ngay, không đợi tới bước trộn tiếng hay đoạn kết
PYTHONPATH="$root/audio/src" "$py" -m aivideo.mix "$slug" --check --root "$root" >/dev/null \
  || fail "$step" "thiếu hoặc lệch file nhạc của tập (xem dòng lỗi trên)"
if [[ -z "$short" && "$engine" == korva ]]; then
  "$py" -c "import korvatts" >/dev/null 2>&1 || fail "$step" "thiếu gói korvatts trong audio/.venv (cài extras korva)"
fi
free_gb="${AIVIDEO_FREE_GB:-$(df -k "$out" | awk 'END{printf "%.1f", $4/1048576}')}"
min_gb="${AIVIDEO_MIN_FREE_GB:-6}"
(( free_gb >= min_gb )) || fail "$step" "đĩa trống ${free_gb} GB < ${min_gb} GB"
: > "$started"
export PYTHONPATH="$root/audio/src"

# --- Short phần n (đề mục 14): dùng lại lint, mix, render-episode, assemble, framecheck với --short ---
if [[ -n "$short" ]]; then
  sout="$out/shorts/$short"
  final="$out/$slug-short-$short.mp4"
  [[ -f "$root/episodes/$slug/shorts.json" ]] || fail "đầu vào" "thiếu episodes/$slug/shorts.json"
  for f in timeline.json narration.wav; do [[ -s "$out/$f" ]] || fail "đầu vào" "thiếu $f của tập dài (chạy tập dài trước)"; done
  short_assemble() {
    ( cd "$root/audio" && run "$py" -m aivideo.outro ensure "$slug" --short "$short" ) || fail "$step" "đoạn kết lỗi"
    for c in concat mux verify; do
      ( cd "$root/audio" && run "$py" -m aivideo.assemble $c "$slug" --short "$short" ) || fail "$step" "assemble $c lỗi"
    done
    need_file "$final"
  }
  if want lint; then
    begin 2 "lint phần $short (shorts.json, cỡ chữ khung dọc)"
    ( cd "$root/video" && run npm run --silent lint:episode -- "$slug" --short "$short" ) || fail "$step" "lint không đạt"
  fi
  if want mix; then
    begin 3 "cắt phần $short và trộn tiếng"
    rm -f "$sout/mix.wav"
    ( cd "$root/audio" && run "$py" -m aivideo.shorts cut "$slug" "$short" ) || fail "$step" "cắt phần lỗi"
    ( cd "$root/audio" && run "$py" -m aivideo.mix "$slug" --short "$short" ) || fail "$step" "lệnh mix lỗi"
    need_file "$sout/mix.wav"
  fi
  if want render; then
    begin 4 "render phần $short (Remotion, ${procs:-3} trình duyệt)"
    rm -f "$sout/video.silent.mp4" "$final"
    [[ -n "$procs" ]] && export AIVIDEO_PROCS="$procs"
    ( cd "$root/video" && run npx tsx scripts/render-episode.ts "$slug" --short "$short" ) || fail "$step" "render-episode lỗi"
    need_file "$sout/manifest.json"
  fi
  if want assemble; then
    begin 5 "ghép, gắn tiếng, kiểm MP4 phần $short"
    short_assemble
  fi
  if want check; then
    begin 6 "kiểm mất hình phần $short"
    ( cd "$root/audio" && run "$py" -m aivideo.framecheck verify "$slug" --short "$short" ) || fail "$step" "kiểm mất hình không đạt"
    newer=0
    for seg in "$sout"/segments/*.mp4(N.); do
      if [[ "$seg" -nt "$final" ]]; then newer=$((newer + 1)); fi
    done
    if [[ ! -s "$final" ]] || (( newer > 0 )); then
      print "có đoạn render lại sau lần ghép: ghép và kiểm MP4 lại"
      short_assemble
    fi
    ( cd "$root/audio" && run "$py" -m aivideo.assemble clean "$slug" --short "$short" ) || fail "$step" "dọn lỗi"
  fi
  rm -f "$started"
  print "XONG: $final (cùng $sout/video.srt)"
  print "$(date '+%F %T') XONG" >> "$logf"
  exit 0
fi

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
  assemble_all
fi

# --- 7/7: kiểm mất hình, dọn ---
if want check; then
  begin 7 "kiểm mất hình (quét đột biến, render lượt hai lệch ranh giới)"
  ( cd "$root/audio" && run "$py" -m aivideo.framecheck verify "$slug" ) || fail "$step" "kiểm mất hình không đạt"
  mp4="$out/$slug.mp4"
  # framecheck verify có thể render lại đoạn main: MP4 cuối không được giữ đoạn cũ, nên ghép và kiểm lại.
  # Đếm bằng vòng lặp: phép gán glob có qualifier e trả mã 1 khi không đoạn nào khớp, làm set -e thoát.
  newer=0
  for seg in "$out"/segments/*.mp4(N.); do
    if [[ "$seg" -nt "$mp4" ]]; then newer=$((newer + 1)); fi
  done
  if [[ ! -s "$mp4" ]] || (( newer > 0 )); then
    print "có đoạn render lại sau lần ghép: ghép và kiểm MP4 lại"
    assemble_all
  fi
  ( cd "$root/audio" && run "$py" -m aivideo.assemble clean "$slug" ) || fail "$step" "dọn lỗi"
  [[ ! -d "$out/segments" ]] || fail "$step" "segments/ vẫn còn sau khi dọn"
  [[ -s "$mp4" && -s "$out/video.srt" && -s "$out/chapters.txt" ]] || fail "$step" "thiếu file giữ lại sau khi dọn"
fi

rm -f "$started"
print "XONG: $out/$slug.mp4 (cùng video.srt, chapters.txt)"
print "$(date '+%F %T') XONG" >> "$logf"
