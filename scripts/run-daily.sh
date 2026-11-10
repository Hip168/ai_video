#!/bin/zsh
# Một lượt tự tạo và tự đăng theo lịch (D24). LaunchAgent gọi script này; chỉ chạy trên Mac, zsh.
# Dùng: scripts/run-daily.sh (không tham số). Giao diện: .team/features/13-tu-dong-giao-dien.md
set -u
zmodload zsh/system

# Giữ máy thức suốt lượt chạy.
if [[ -z "${AIVIDEO_CAFFEINATED:-}" ]] && command -v caffeinate >/dev/null 2>&1; then
  AIVIDEO_CAFFEINATED=1 exec caffeinate -i -s "$0" "$@"
fi

root="${0:A:h:h}"
py="$root/audio/.venv/bin/python"
claude_cmd=(${(z)${AIVIDEO_CLAUDE:-claude}})
upload_cmd=(${(z)${AIVIDEO_UPLOAD:-$py -m aivideo.upload}})
gates_cmd=(${(z)${AIVIDEO_GATES:-$py -m aivideo.gates}})
git_cmd=(${(z)${AIVIDEO_GIT:-git}})
push_cmd=(${(z)${AIVIDEO_PUSH:-git push origin main}})
logdir="${AIVIDEO_LOG_DIR:-$HOME/Library/Logs/aivideo}"
mkdir -p "$logdir"
logf="$logdir/$(date +%F).log"

log() { print -r -- "$(date '+%F %T') $*" >> "$logf"; }
notify() {
  if [[ -n "${AIVIDEO_NOTIFY:-}" ]]; then
    ${(z)AIVIDEO_NOTIFY} "$1"
  else
    osascript -e 'on run argv' -e 'display notification (item 1 of argv) with title "aivideo"' \
      -e 'end run' "$1"
  fi
}
stop() { log "DỪNG, không đăng: $1"; notify "Lượt tự động dừng, không đăng: $1 (log: $logf)"; exit 1; }

# Khoá chống chạy chồng; tự nhả khi tiến trình kết thúc, kể cả khi bị giết.
lockfile="$logdir/run-daily.lock"
: >> "$lockfile"
if ! zsystem flock -t 0 "$lockfile" 2>/dev/null; then
  log "lượt khác đang chạy, thoát"
  exit 1
fi

prompt="Làm một video theo episodes/PLAYBOOK.md, từ khâu 1 tới hết khâu 12 (Cổng 3). \
Đề tài: mục đầu tiên trong episodes/queue.json chưa có thư mục episodes/<slug>/, dùng đúng slug ghi ở mục đó; \
hàng đợi không còn mục nào thì để researcher tự chọn đề tài không trùng episodes/index.json. \
Không làm khâu 13 (đăng): script chạy lịch tự đăng sau khi bạn xong. \
Gặp điểm dừng ở mục 8 của PLAYBOOK thì dừng và in một dòng CAN_NGUOI_DUNG: <lý do>. \
Cổng 3 đạt thì dòng cuối cùng in đúng SLUG: <slug>."

log "== bắt đầu lượt, gốc $root =="
res="$logdir/$(date +%F-%H%M%S)-claude.json"
( cd "$root" && "${claude_cmd[@]}" -p "$prompt" --permission-mode dontAsk --permission-prompts none \
    --output-format json ) > "$res" 2>> "$logf"
code=$?
log "claude thoát mã $code, kết quả: $res"
(( code == 0 )) || stop "claude thoát mã $code"

# Đọc JSON của claude: dòng 1 là is_error, phần sau là result.
parsed=$("$py" - "$res" <<'PY'
import json, sys
d = json.load(open(sys.argv[1], encoding="utf-8"))
print("1" if d.get("is_error") else "0")
print(d.get("result") or "")
PY
) 2>> "$logf" || stop "không đọc được JSON kết quả của claude"
[[ "${parsed%%$'\n'*}" == 0 ]] || stop "claude báo is_error"
result="${parsed#*$'\n'}"
[[ "$result" != *CAN_NGUOI_DUNG* ]] || stop "CAN_NGUOI_DUNG: ${${(M)${(f)result}:#*CAN_NGUOI_DUNG*}[1]}"
last="${${(f)result}[-1]}"
[[ "$last" =~ '^SLUG: ([a-z0-9]+(-[a-z0-9]+)*)$' ]] || stop "dòng cuối không phải SLUG: <slug>"
slug="${match[1]}"
log "tập $slug"

mp4="$root/out/episodes/$slug/$slug.mp4"

# Commit trong máy chỉ episodes/<slug>/ (D25): gate3 chặn khi sổ chưa commit.
commit_ep() { # $1 = lời commit
  local st
  st=$(cd "$root" && "${git_cmd[@]}" status --porcelain -- "episodes/$slug" 2>> "$logf") || return 1
  [[ -z "$st" ]] && return 0
  ( cd "$root" && "${git_cmd[@]}" add -- "episodes/$slug" \
      && "${git_cmd[@]}" commit -q -m "$1" -- "episodes/$slug" ) >> "$logf" 2>&1
}
commit_ep "[tap] $slug: nội dung tập trước Cổng 3" || stop "commit episodes/$slug lỗi"

( cd "$root/audio" && PYTHONPATH="$PWD/src" "${gates_cmd[@]}" gate3 "$slug" --video "$mp4" ) >> "$logf" 2>&1 \
  || stop "Cổng 3 không đạt cho $slug"

( cd "$root/audio" && PYTHONPATH="$PWD/src" "${upload_cmd[@]}" "$slug" ) >> "$logf" 2>&1
code=$?
commit_ep "[tap] $slug: sổ tập sau khi đăng" || log "commit sổ sau khi đăng lỗi"
:
log "XONG: đã đăng $slug"
# Push lỗi chỉ ghi log, video vẫn tính là đã đăng (D25).
( cd "$root" && "${push_cmd[@]}" ) >> "$logf" 2>&1 || log "push lỗi (video đã đăng): ${push_cmd[*]}"
