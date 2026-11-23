# Quy trình chuẩn (24/11/2026)

Luồng chính chỉ điều phối; mỗi khâu là một agent mới; người làm ≠ người kiểm [LUAT/chung.md §1]. Trước khi bắt đầu: đọc `ai_video/.team/tiep-theo.md` [memory tam-dung-2026-11-04].
Mỗi bước đăng/hẹn giờ có CHECKLIST. Agent làm bước đó phải dán checklist vào báo cáo, đánh dấu từng dòng đối chiếu với `LUAT/con-bit.md` hoặc `LUAT/buck.md`. Thiếu một dòng thì không đăng [owner 24/11].

## A. Con Bit (`~/Documents/ai_video`, chi tiết lệnh: `episodes/PLAYBOOK.md`)
Chuẩn bị: `cd audio && export PYTHONPATH=$PWD/src && G() { .venv/bin/python -m aivideo.gates "$@"; }`. Render cần `REMOTION_BROWSER_EXECUTABLE=~/.cache/aivideo/chrome-headless-shell/chrome-headless-shell` [PLAYBOOK §2, tiep-theo].

1. **Ý tưởng:** mục đầu `episodes/queue.json`, hoặc researcher tự chọn (không trùng `episodes/index.json`; trend theo con-bit §1). Đặt `slug`, mỗi tập một worktree/nhánh [PLAYBOOK].
2. **Research:** researcher → `outline.md`, `sources.md`, `claims.json`; `G ledger add <slug> --stage research --role researcher`; `G ledger handoff <slug> research` [PLAYBOOK khâu 1].
3. **Cổng 1 fact:** `G prepare-factcheck <slug> --role ../episodes/roles/fact-checker.md` → fact-checker (prompt.txt nguyên văn) → `G verdict`, `G ledger add --stage fact-1`, `G apply-factcheck`, `G gate1`; commit `ledger.json` [PLAYBOOK khâu 2].
4. **Kịch bản:** scriptwriter → `script.json` (9–11 phút, hook 15 s, từ Anh nói nghĩa Việt) → script-editor (`--stage bien-tap`) → fact-checker lượt 2 (`prepare-factcheck --with-lines`, `--stage fact-2`) [PLAYBOOK khâu 3–5].
5. **Cổng 2:** `G gate2 <slug>` (ghi hash lời). Từ đây không sửa lời [PLAYBOOK khâu 6].
6. **Cảnh + lint:** scene-director; `.venv/bin/python -m aivideo.episode build <slug> --engine fake`; `G ledger run <slug> --stage lint` [PLAYBOOK khâu 7].
7. **Giọng:** voice-producer dựng VieNeu Thiện Minh; lint lại; `G ledger run <slug> --stage phat-am` phải `DAT` [PLAYBOOK khâu 8, D40].
8. **Render:** `../make-episode.sh <slug>` (outro D38 tự gắn khi `meta.outro: true`); `G ledger run <slug> --stage ky-thuat` [PLAYBOOK khâu 9].
9. **QC:** agent qc độc lập → `handoff/qc.json` → `G verdict`, `G ledger add --stage qc --artifact <MP4>` [PLAYBOOK khâu 10].
10. **Shorts (3 cái):** viết `episodes/<slug>/shorts.json` (3 mục, 30–45 s, tiêu đề khẳng định có số, khoá `tiktok:{title,intro,question,tags}`) → `.venv/bin/python -m aivideo.shorts export <slug>` (Short YouTube + TikTok phần 1–3 + thẻ kết D42). Bản TikTok mới: tắt nhạc nền [D43, con-bit §5 §11].
11. **Bản Facebook:** `.venv/bin/python -m aivideo.facebook export <slug> --all` → `out/facebook/<slug>/` [D41].
12. **Đóng gói:** packager → `publish.json` + `thumbnail.png` (2–3 phương án tiêu đề/ảnh bìa cho Test & Compare) → `G ledger add --stage dong-goi` → `G gate3 <slug> --video <MP4>` [PLAYBOOK khâu 11–12].
13. **YouTube hẹn giờ** (CHECKLIST Y): video dài `.venv/bin/python -m aivideo.upload <slug> --privacy private --publish-at <ISO, thứ Bảy 19:30 +07:00>`; Short sau khi video dài có ID, 19:30 các ngày sau, private + publishAt. `upload --short` chưa nhận `--publish-at`: lô tập 6–8 dùng script tạm gọi API; việc DEV là thêm cờ này. Commit `ledger.json` [D24, D43, audio/src/aivideo/upload.py].
14. **Drive:** `rclone copyto` lên `gdrive:Chuyen Cua Nhung Con Bit/<nn> <slug>/` (`video-dai.mp4`, `chapters.txt`, `thumbnail.png`, `youtube-shorts/`, `facebook/`, `tiktok/` mp4 + txt + bìa) → `rclone check` khớp → xoá bản máy [chung §3].
15. **Caption FB/TikTok:** viết `out/facebook-page/caption-cho-dang/cb<n>-long.txt`, `cb<n>-s<k>.txt`; caption TikTok viết lại theo khuôn D43 (không dùng nguyên file `shorts export` sinh). Thêm dòng vào `HANG-CHO-*.md`, `out/lich-dang-2026-11.md` và thư mục MANIFEST cho agent Brave [D43, con-bit §7].
16. **FB/TikTok hẹn giờ** (CHECKLIST F, T): agent Brave (một agent một lúc, ≤3 bài một lô) tải file từ Drive về tạm → hẹn trên Business Suite / TikTok Studio → kiểm mục Đã lên lịch → xoá file tạm → về Antigravity IDE [chung §2 §5].
17. **Sau khi lên:** gắn "Video liên quan" cho 3 Short; bật Test & Compare video dài; thêm tập vào link-in-bio (`cd ~/Documents/conbit-link && python3 update-episodes.py`, commit; `vercel --prod --yes` do chủ kênh chạy hoặc cho phép) [D33, tiep-theo].
18. **Ghi sổ:** `DA-DANG.md`, `DA-DANG-TIKTOK.md`, `.team/tiep-theo.md`; PR tập theo công tắc GitHub; dọn worktree, `/tmp/qc*`, `remotion-*` [chung §3 §4].

## B. Follow the Buck (`~/Documents/AI_VIDEO_FLOW_STORY/.worktrees/kenh-my-bible`)
Tập ở `channels/us-econ/episodes/<nn>-<slug>/`, cảnh ở `video/src/channels/us-econ/ep<nn>-<slug>/`, file ra ở `out/us-econ/<nn>-<slug>/` [cây thư mục ep14].

1. **Ý tưởng:** câu hỏi người Mỹ gõ tìm; khác kiểu 3 tập gần nhất; viết 3 truy vấn phải thắng [buck §2].
2. **Research:** `research.md`, kiểm số bằng script tự viết trong tập (`verify_numbers.py`, `filing_check.py`) chạy được lại [ep14].
3. **Kịch bản:** `script.json` (beats `b001…`, `title`, `thumbnail_text`, `shorts`), `short-hooks.json` (beats `h001…h003`). Fact-check độc lập; sửa theo phát hiện [ep14 commit 2ebcccc].
4. **Giọng:** `python -m usecon_tts build --script-json channels/us-econ/episodes/<slug>/script.json --out-dir <out>` (Chatterbox, `--pause 0.5 --paragraph-pause 1.0`, WER 0) [bible §12].
5. **Cảnh + test:** composition dài nhận prop `platform`; Short không import Outro; viết `video/tests/us-econ-ep<nn>.test.ts` theo mẫu ep14 (tiêu đề, ảnh bìa ≤4 từ, AI/not-advice, không logo, không "this year") [us-econ-ep14.test.ts].
6. **Render:** video dài + outro (`channels/us-econ/outro/add_outro.py`, `ytpub srt`), 3 Short qua `build_short.py`, ảnh bìa `Thumbnail.tsx` [bible §13, ep14].
7. **QC độc lập:** agent khác viết `qc-ep<nn>.md` (khung hình, Short, số liệu, mô tả); FAIL thì trả người làm [qc-ep14.md].
8. **Đóng gói:** `publish.json` (dài) + `short-0k/publish.json` (`FULL_VIDEO_URL` tạm) [ep14].
9. **YouTube hẹn giờ** (CHECKLIST Y): `cd channels/us-econ/publish && .venv/bin/python -m ytpub upload <thư mục tập>` ở private + publishAt thứ Bảy 15:00Z; điền URL vào 3 `short-0k/publish.json`; upload Short private + publishAt theo buck §8; commit `youtube.json`. `ytpub` chưa có cờ publishAt: lô ep9–14 hẹn bằng script tạm; việc DEV là thêm cờ [youtube.json ep9–14, publish/src/ytpub/cli.py].
10. **Bản Facebook:** `python3 channels/us-econ/outro/export_facebook.py out/us-econ/<slug> <Composition> <music.ogg> <outro start frame>` → `<checkout chính>/out/follow-the-buck-facebook/<slug>.mp4` [bible §13].
11. **Drive:** `gdrive:Follow the Buck/<nn> <slug>/` (video dài, Short, bản FB, thumbnail, srt) → `rclone check` → xoá bản máy (giữ `cache/` nếu còn khả năng sửa số) [chung §3, memory us-econ-channel].
12. **Caption FB + hẹn giờ** (CHECKLIST F): `ai_video/out/facebook-page/caption-cho-dang/buck<n>-long.txt`, `buck<n>-s<k>.txt`, hàng chờ, MANIFEST → agent Brave hẹn trên Business Suite page Follow the Buck [D43, buck §7].
13. **Sau khi lên:** Video liên quan cho 3 Short (ghi `out/follow-the-buck-shorts/GAN-VIDEO-LIEN-QUAN.md`), Test & Compare video dài, `Previous episodes` ở tập sau [buck §5, memory video-moi-chuan-tang-view].
14. **Ghi sổ:** `DA-DANG.md`, `lich-dang`, commit đúng đường dẫn, dọn `cache/`, `video-silent.mp4`, `mix.wav`, `/tmp/qc-*` [chung §3].

## C. CHECKLIST (dán vào báo cáo, mỗi dòng ✔ hoặc ✘ + lý do)
**Y. YouTube (mỗi video dài / Short)**
- [ ] Đúng kênh (`channelId` của token = kênh của tập); không nhầm Con Bit ↔ Buck.
- [ ] Tiêu đề đúng luật kênh (độ dài; dài: dạng câu/khuôn; Short: khẳng định có số, đuôi `#Shorts`); mọi số có claim/nguồn.
- [ ] Mô tả đủ: tóm tắt, mục lục (dài), nguồn, link video dài (Short), hashtag (`#conbit<n>` cho Con Bit), dòng AI (Buck: + not advice).
- [ ] Ảnh bìa ≤4 từ, không lặp tiêu đề (Buck: không số, không tên hãng), 1280×720.
- [ ] Short 30–45 s, móc giây đầu, outro đúng luật kênh.
- [ ] `private` + `publishAt` đúng giờ luật (Con Bit 19:30 +07; Buck 15:00Z / 20:00Z); video dài trước mọi Short.
- [ ] Không trùng ngày giờ với bài khác cùng kênh (≤1 Short/ngày).

**F. Facebook (mỗi bài)**
- [ ] Đúng page (Con Bit = bitstory168, Buck = followthebuck168), đúng file bản Facebook (có outro FB với video Con Bit và video dài Buck; Reel Buck không outro).
- [ ] Caption theo mẫu kênh, có link YouTube, dòng AI, hashtag đúng.
- [ ] Giờ đúng luật, SAU YouTube cùng nội dung; page ≤3 bài/ngày, cách 15–20 phút.
- [ ] Hẹn giờ, không "Đăng ngay"; thấy bài trong "Đã lên lịch"; ghi `DA-DANG.md` "đã hẹn giờ".

**T. TikTok (chỉ Con Bit)**
- [ ] Tài khoản @chuyencuanhungconbit (không phải @battle.gun5).
- [ ] Chỉ Short phần 1–3; file có thẻ kết D42; âm thanh chỉ giọng hoặc nhạc thư viện thương mại TikTok.
- [ ] Caption khuôn D43: dòng 1 `#conbit<n> <tiêu đề>` (n = tập nguồn), không "(Phần k/N)"; dòng AI; dòng theo dõi/link ở bio; câu hỏi là dòng chữ cuối; 3–4 hashtag; không URL, không nhắc YouTube, không xin like.
- [ ] Nhãn "Nội dung do AI tạo" bật, Mọi người xem, ảnh bìa tải lên.
- [ ] 18:00, SAU Short YouTube cùng nội dung, ≤1 bài/ngày, trong 10 ngày tới; hẹn giờ, không "Đăng ngay"; ghi `DA-DANG-TIKTOK.md`.
