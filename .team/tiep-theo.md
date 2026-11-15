# Trạng thái hiện tại (cập nhật 2026-11-11), đọc file này trước khi chạy tiếp

MỤC TIÊU HIỆN TẠI (người dùng chốt 2026-11-11): làm tới khi 1 video lên kênh thì DỪNG. Tiết kiệm token: không mở đề mục mới, đề mục 14 tạm dừng. Đội tự đẩy lên GitHub. Chỉ hỏi người dùng ở các điểm dừng trong `autonomy.md`.

## Đã vào main
Các đề mục 5, 6, 7, 8, 9, 11 và task [12-5] (PR #67). Kênh và quyền đều đã xong:
- `.team/kenh.json`: kênh Dao Le, `UC1aPohYcigcmBGPl7OlQaEw`, `@DaoLe-e4g`, đã xác minh số điện thoại.
- OAuth: project `aivideo-upload-514316`, trạng thái In production. File `~/.config/aivideo/youtube/{client_secret,token}.json`, quyền 600. Đã gọi thử, trả về đúng kênh.
- Trang chính sách: https://hip168.github.io/aivideo-policy/ (repo `Hip168/aivideo-policy`, toan-quyen).
- GitHub: `toan-quyen`. Các lệnh `gh`/push đã cho phép trong `.claude/settings.local.json`.
- MCP `mac-control` đã đăng ký cho dự án. Bộ phân quyền chặn thao tác trên trang đồng ý OAuth.

## MỞ LẠI (người dùng, 2026-11-15) — trạng thái cuối ngày
- Tập 2: đủ 6 Short (4 Cn3M_p-Qocw, 5 SyMgHdJpsy0, 6 OS1AeT5_bGE có outro). Video liên quan đã gắn Short 1–5 cả hai tập; Short 6 (OS1AeT5_bGE) người dùng tự gắn.
- Tập 3 `khi-may-tinh-dem-qua-gioi-han`: ĐÃ ĐĂNG https://youtu.be/PMxx3oFLU98 (VieNeu Thiện Minh, PR #85), Drive 03.
  - Short 1–3 ĐÃ ĐĂNG công khai 15/11: 1 nJW8Yy94E0I, 2 hCydIFV2mss, 3 DVUv6wR5YxY (có outro). Tiêu đề sửa theo QC ở PR #90, ledger PR #91.
  - Short 4–6 CHỜ ĐĂNG ngày sau (không dồn): `cd .worktrees/27-shorts-tap3/audio && PYTHONPATH=$PWD/src .venv/bin/python -m aivideo.upload khi-may-tinh-dem-qua-gioi-han --short <4|5|6> --privacy public`. Đăng xong ghi ledger (PR), gắn video liên quan. KHÔNG xoá worktree 27-shorts-tap3 trước khi đăng xong. Nhánh 27 đã squash vào main nhiều lần: trước PR ledger tiếp theo, `git merge origin/main` (xung đột add/add thì lấy bản main).
  - Drive 03 đã đủ: youtube-shorts/phan-1..6.mp4, tiktok/phan-1..3 (mp4, txt, bia-phan-k.png). TikTok 1–3 người dùng tự đăng (caption D35 ở out/tiktok-dang/).
  - Caption TikTok tập 1–3 trong out/tiktok-dang/ đã sửa theo D35 (mở bằng #conbit<n>, phần 3 ghi "Các phần còn lại và bản đầy đủ: link ở bio nha.", không nhắc YouTube). Bản caption tập 1–2 trên Drive là bản sinh tự động cũ, khác bản trong out/tiktok-dang/.
- Tập 4 Mars Climate Orbiter: dựng lại bằng VieNeu (D40), xử lý "pound" (phatam), rồi render/qc/gate3/đăng.
- Việc DEV tồn: (a) outro dọc: tên kênh lấn dải phải ~50 px, thu ≤ 900 px trước Shorts tập 3; (b) `tiktok_caption()` trong audio/src/aivideo/shorts.py theo mẫu mới ở out/tiktok-dang/; (c) gate3 không băm lại handoff/qc.json so với findings_sha256; (d) prepare-factcheck --with-lines lấy `text` thay vì `spoken`; (e) phatam pick cứng engine korva; (f) Remotion mặc định chết "Target closed" — cần REMOTION_BROWSER_EXECUTABLE=~/.cache/aivideo/chrome-headless-shell/chrome-headless-shell (cả aivideo.outro.render_video); (g) script.json tập 3 meta.voice còn ghi hoang_nam/1.25; (h) zsh không tách từ `$G` trong PLAYBOOK.
- 5 MINOR tập 3 người dùng đã chấp nhận (phụ đề nhanh, s75 đứng 6 s, s21b nhãn đè, phụ đề ngắt "Ariane | 5", chip Rust nhỏ): sửa cho tập sau.
- TikTok tập 1–2: caption kiểu mới ở out/tiktok-dang/, người dùng tự đăng.
- GitHub Actions hết phút tới 01/12: kiểm local rồi merge. PR tập video đội tự merge (người dùng chốt 15/11).

## (cũ) TẠM GIỮ (người dùng, 2026-11-14 sáng)
Người dùng dặn "hold dự án này lại". KHÔNG tự chạy tiếp, chờ người dùng mở lại. Người dùng sẽ tự lấy file TikTok trên Drive (`Chuyen Cua Nhung Con Bit/<nn> <slug>/tiktok/`) để đăng. Khi mở lại thì làm tiếp từ mục "Đang chờ" bên dưới.

## Đang chờ (cập nhật 2026-11-14 ~05:40, phiên đêm dừng lúc 06:00)
- YouTube chặn tải lên với lỗi HTTP 400 "exceeded the number of videos they may upload" (khoảng 03:00 ngày 14/11). Hạn mức thường mở lại sau khoảng 24 giờ, tức khoảng 03:00 ngày 15/11.
  - Short tập 2: đã đăng phần 1–3 (N31vhiVd6f0, a7dVn7Vn29c, N7vt5qheGQ8). Phần 4–6 CHƯA đăng.
    - Người dùng chốt 2026-11-14: Short 6 tập 2 phải RENDER LẠI CÓ OUTRO (like & sub) trước khi đăng (ngoại lệ D38). Short 3 tập 2 đã đăng thì giữ nguyên. Không tải bản phan-6 cũ trên Drive lên, mà thay bằng bản mới.
    - File nằm ở `.worktrees/19-shorts-tap2/out/...`. KHÔNG xoá worktree này trước khi đăng xong.
    - Lệnh: `cd .worktrees/19-shorts-tap2/audio && PYTHONPATH=$PWD/src .venv/bin/python -m aivideo.upload vi-sao-0-1-cong-0-2-khong-bang-0-3 --short <4|5|6> --privacy public`
- GIỌNG MỚI (D40): từ tập 3 dùng VieNeu giọng `thien_minh`. Tập 3 và tập 4 phải dựng lại giọng trước khi render. Việc đầu tiên khi mở lại: DEV cài vieneu vào `audio/.venv` và kiểm engine với giọng `thien_minh`.
- Tập 3 `khi-may-tinh-dem-qua-gioi-han`:
  - Đã chốt Cổng 2. Phát âm, lint, đóng gói (publish.json, thumbnail, #conbit3) đều đạt.
  - qc vòng 1 SỬA. Cảnh vòng 2 đã sửa và commit. Khung 0 đã sửa ở PR #82.
  - Việc tiếp:
    1. `./make-episode.sh khi-may-tinh-dem-qua-gioi-han` (khoảng 45 phút, có outro).
    2. `ledger run --stage ky-thuat`.
    3. qc vòng 2.
    4. `gate3`.
    5. Đăng public khi hạn mức YouTube mở lại.
    6. Chạy lại tập 3 qua `shorts` (6 phần, outro ở phần 3 và 6) và xuất TikTok 1–3.
    7. Tải lên Drive.
- Tập 4 `con-tau-sao-hoa-mat-vi-nham-don-vi` (Mars Climate Orbiter):
  - Cổng 2 đạt (hash 310292ed…). Cảnh vòng 1 xong, lint với engine fake đạt.
  - Giọng korva đã dựng: dài 719,4 s, lint đạt, cảnh dài nhất 18,6 s. `phatam check` VẪN TRƯỢT 10 chỗ "pound" ở b022, b023, b024, b030, b082.
    - Việc tiếp: scriptwriter đổi `spoken` "pound lực" thành "pound-force" (pick đạt 0,322), hoặc chỉ nói nghĩa tiếng Việt.
    - Báo DEV hai lỗi của phatam: (1) "pound-force" trong text và "pound" trong spoken chồng lên nhau ở `_forced_text`/`find_occurrences`; (2) chữ Việt có gạch nối như "ki-lô-mét" bị coi là tiếng Anh. Lexicon tập 4 `{"80 km": "tám mươi ki lô mét"}` chỉ để lách lỗi (2), sửa phatam xong thì xem lại.
    - Sau đó dựng lại giọng và chạy lại các bước: `ledger run --stage phat-am`, `ledger run --stage lint`.
  - (cũ) voice-producer đang dựng giọng korva. Nếu bị ngắt giữa chừng thì chạy lại build korva (đã có cache), rồi chạy `phatam check`, `ledger run --stage phat-am`, `ledger run --stage lint`.
  - Sau đó: render, qc, packager (#conbit4), gate3, đăng.
- Trang link-in-bio: https://chuyenconbit.vercel.app. Thêm tập mới bằng `cd ~/Documents/conbit-link && python3 update-episodes.py`, commit, rồi `vercel --prod --yes`. Bước deploy người dùng phải tự chạy hoặc tự cho phép.
- TikTok: người dùng tự đăng. Đội chỉ xuất file kèm caption lên Drive (D39).
- Hạn mức Claude tuần: khoảng 76–77% lúc 05:30. Hạn mức làm mới vào tối 15/11. Đo bằng `~/.claude/studio/usage7d.py`.

## MỞ LẠI (người dùng, 2026-11-13)
Kênh có 55 lượt xem và 3 người đăng ký. Người dùng dặn: "tiếp tục tạo video đăng lên đi, công khai luôn cx được, cả short cả thật".
- Đăng công khai cả video dài lẫn Shorts. Dự án truyện (Studio) tạm giữ nguyên ở `~/.claude/studio/TIEP-THEO.md`.
- Đang chạy:
  - Tập 2: khâu `canh` (scene-director vòng 1).
  - Đề mục 14 Shorts: DEV làm tiếp trên nhánh `14-shorts`, gồm Shorts cả tập 1 và xuất TikTok phần 1–3.
  - Deployer: PR cho `15-sua-ton` và PR #72.

## TẠM GIỮ CẢ DỰ ÁN (người dùng, 2026-11-12)
Người dùng chuyển trọng tâm sang kênh truyện, dự án `/Users/leminhdao168/Documents/AI_VIDEO_FLOW_STORY`. Dự án đó dùng đội Studio ở `~/.claude/studio`. Dự án này đứng ở các điểm sau:
- Tập 2 `vi-sao-0-1-cong-0-2-khong-bang-0-3`: đã qua Cổng 2 (commit 733e21d). Bước tiếp là khâu `canh`.
- Đề mục 14 Shorts: code dở, commit WIP trên nhánh `14-shorts`, chưa có PR.
- PR #72 (docs D31–D32): đang mở, CI job video treo khi rerun, chưa merge. Nhánh 15-sua-ton chưa có PR.

## Đang làm (2026-11-12)
- Đã vào main: PR #68 (10), #69 (13), #70, #71. CI main xanh. Runner GitHub đôi khi thiếu đĩa: rerun `--failed` 1 lần. [13-4] chạy theo lịch: chưa làm.
- **VIDEO ĐẦU CÔNG KHAI** (2026-11-12): https://youtu.be/Dcb-Cy-V2HM. Kênh đã đổi tên thành "Chuyện Của Những Con Bit" và dùng ảnh đại diện con chip (D31). `firstVideoApproved=true`: từ tập 2 đăng Công khai luôn.
- Đang chạy: đề mục 15 sửa lỗi tồn (worktree `15-sua-ton`), tập 2 ở khâu researcher, đề mục 14 Shorts (DEV đang viết giao diện để BA duyệt).
- Trang chính sách `aivideo-policy` vẫn ghi tên cũ "Dao Le", cần sửa.
- Lỗi nhỏ (đề mục 15 đang sửa): sc42 (`bon-muoi-bit`) chữ chồng nhau khi crossfade, khoảng 0,5 s, ở 7:23. Khung biểu đồ "flow": nhãn nằm lệch lên trên.

## Luật đã chốt cần nhớ
- Không còn DEV-LEAD. Chỉ có một TEST-LEAD: gọi một lần rồi dùng SendMessage.
- Review có phát hiện thì sửa luôn.
- Không dùng claude.ai hay Claude in Chrome.
- Dùng mac-control xong thì quay về terminal.
- Hook `team guard` xét theo thư mục hiện tại: lệnh có chữ push phải chạy trong repo đúng.
- Checkout chính có 2 file chưa commit của phiên khác: `video/tests/helpers/render.ts`, `.team/locks/2.sha256`. Không đụng.
- Khởi động lại phiên thì agent đang chạy bị huỷ, không resume được. Kiểm worktree và commit thật rồi giao agent mới.
