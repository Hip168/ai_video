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
# Mặc định gán mảng trực tiếp (đường dẫn có khoảng trắng vẫn đúng); chỉ tách (z) khi ghi đè.
claude_cmd=(claude);                    [[ -n "${AIVIDEO_CLAUDE:-}" ]] && claude_cmd=(${(z)AIVIDEO_CLAUDE})
upload_cmd=("$py" -m aivideo.upload);   [[ -n "${AIVIDEO_UPLOAD:-}" ]] && upload_cmd=(${(z)AIVIDEO_UPLOAD})
gates_cmd=("$py" -m aivideo.gates);     [[ -n "${AIVIDEO_GATES:-}" ]] && gates_cmd=(${(z)AIVIDEO_GATES})
git_cmd=(git);                          [[ -n "${AIVIDEO_GIT:-}" ]] && git_cmd=(${(z)AIVIDEO_GIT})
make_cmd=("$root/make-episode.sh");     [[ -n "${AIVIDEO_MAKE:-}" ]] && make_cmd=(${(z)AIVIDEO_MAKE})
push_cmd=(git push origin main);        [[ -n "${AIVIDEO_PUSH:-}" ]] && push_cmd=(${(z)AIVIDEO_PUSH})
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

# Chỉ chạy trên main, cây sạch ngoài episodes/ và video/src/episodes/ (BA chốt theo TEST-LEAD).
branch=$(cd "$root" && "${git_cmd[@]}" rev-parse --abbrev-ref HEAD 2>> "$logf") \
  || stop "CAN_NGUOI_DUNG: không đọc được nhánh git"
[[ "$branch" == main ]] || stop "CAN_NGUOI_DUNG: checkout đang ở nhánh $branch, không phải main"
dirty=$(cd "$root" && "${git_cmd[@]}" status --porcelain -- . ':(exclude)episodes' \
    ':(exclude)video/src/episodes' 2>> "$logf") || stop "CAN_NGUOI_DUNG: không đọc được git status"
[[ -z "$dirty" ]] || { log "thay đổi chưa commit: ${dirty//$'\n'/; }"; stop "CAN_NGUOI_DUNG: cây làm việc có thay đổi chưa commit ngoài episodes/"; }

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
lines=("${(@f)result}")
[[ "$result" != *CAN_NGUOI_DUNG* ]] || stop "${${(M)lines:#*CAN_NGUOI_DUNG*}[1]}"
last="${lines[-1]}"
[[ "$last" =~ '^SLUG: ([a-z0-9]+(-[a-z0-9]+)*)$' ]] || stop "dòng cuối không phải SLUG: <slug>"
slug="${match[1]}"
log "tập $slug"

mp4="$root/out/episodes/$slug/$slug.mp4"

# Commit trong máy chỉ file của tập (D25): gate3 chặn khi sổ chưa commit.
ep_paths=("episodes/$slug" "video/src/episodes/$slug" "episodes/index.json")
commit_ep() { # $1 = lời commit
  local p st changed=()
  for p in "${ep_paths[@]}"; do
    st=$(cd "$root" && "${git_cmd[@]}" status --porcelain -- "$p" 2>> "$logf") || return 1
    [[ -n "$st" ]] && changed+=("$p")
  done
  (( ${#changed} )) || return 0
  ( cd "$root" && "${git_cmd[@]}" add -- "${changed[@]}" \
      && "${git_cmd[@]}" commit -q -m "$1" -- "${changed[@]}" ) >> "$logf" 2>&1
}
commit_ep "[tap] $slug: nội dung tập trước Cổng 3" || stop "commit file của tập $slug lỗi"

( cd "$root/audio" && PYTHONPATH="$PWD/src" "${gates_cmd[@]}" gate3 "$slug" --video "$mp4" ) >> "$logf" 2>&1 \
  || stop "Cổng 3 không đạt cho $slug"

( cd "$root/audio" && PYTHONPATH="$PWD/src" "${upload_cmd[@]}" "$slug" ) >> "$logf" 2>&1
code=$?
commit_ep "[tap] $slug: sổ tập sau khi đăng" || log "commit sổ sau khi đăng lỗi"
(( code != 3 )) || stop "CAN_NGUOI_DUNG: upload $slug báo video có thể bị khoá"
(( code == 0 )) || stop "upload $slug thoát mã $code"
log "XONG: đã đăng $slug"

# Push lỗi chỉ ghi log, video vẫn tính là đã đăng (D25).
( cd "$root" && "${push_cmd[@]}" ) >> "$logf" 2>&1 || log "push lỗi (video đã đăng): ${push_cmd[*]}"

# Shorts (đề mục 14, D28, D33): có shorts.json thì render rồi đăng từng phần, sau video dài.
if [[ -f "$root/episodes/$slug/shorts.json" ]]; then
  parts=$("$py" -c 'import json,sys; print(len(json.load(open(sys.argv[1], encoding="utf-8"))["shorts"]))' "$root/episodes/$slug/shorts.json" 2>> "$logf") || stop "không đọc được episodes/$slug/shorts.json"
  for n in {1..$parts}; do
    if [[ ! -s "$root/out/episodes/$slug/$slug-short-$n.mp4" ]]; then
      "${make_cmd[@]}" "$slug" --short "$n" >> "$logf" 2>&1 || stop "render Short phần $n của $slug lỗi (video dài đã đăng)"
    fi
    ( cd "$root/audio" && PYTHONPATH="$PWD/src" "${upload_cmd[@]}" "$slug" --short "$n" ) >> "$logf" 2>&1
    code=$?
    commit_ep "[tap] $slug: sổ tập sau khi đăng Short phần $n" || log "commit sổ sau khi đăng Short lỗi"
    (( code != 3 )) || stop "CAN_NGUOI_DUNG: upload Short phần $n của $slug báo video có thể bị khoá"
    (( code == 0 )) || stop "upload Short phần $n của $slug thoát mã $code (video dài đã đăng)"
    log "XONG: đã đăng Short phần $n/$parts của $slug"
  done
  ( cd "$root" && "${push_cmd[@]}" ) >> "$logf" 2>&1 || log "push lỗi (Short đã đăng): ${push_cmd[*]}"
fi
