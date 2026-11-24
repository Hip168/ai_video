Phiên làm video Follow the Buck: đọc file này + chung.md + buck.md + flow-chung.md trước khi làm. Không đọc flow của kênh kia.

# Quy trình Follow the Buck (24/11/2026, theo tranh luận mcp-mien-phi)

Worktree `~/Documents/AI_VIDEO_FLOW_STORY/.worktrees/kenh-my-bible`. Tập ở `channels/us-econ/episodes/<nn>-<slug>/`, cảnh ở `video/src/channels/us-econ/ep<nn>-<slug>/`, file ra ở `out/us-econ/<nn>-<slug>/` [cây thư mục ep14]. Nguyên tắc chung, công cụ cho phép, bảng outlier, đo lường và CHECKLIST Y/F: `flow-chung.md` [owner 2026-11-24].

## Nợ DEV (chặn: dòng CHECKLIST tương ứng ✘ tới khi sửa)
- `ytpub upload` chưa có cờ `--publish-at` (`publish/src/ytpub/cli.py`). Tới khi sửa: video dài và Short hẹn bằng script tạm gọi API như lô ep9–14, ghi rõ trong báo cáo [youtube.json ep9–14].
- Test tập (`video/tests/us-econ-ep<nn>.test.ts`) chưa kiểm độ dài video dài 10–15 phút. Tới khi có: người đóng gói đo bằng `ffprobe -v error -show_entries format=duration -of csv=p=0 <mp4>` và ghi số giây vào `qc-ep<nn>.md` [buck §1].

## Các khâu
1. **Đề tài bằng outlier:** researcher chạy yt-dlp CLI chỉ đọc (flow-chung §2) trên kênh đối thủ cùng ngách kinh tế đời thường Mỹ → `channels/us-econ/episodes/<nn>-<slug>/research-outlier.md` (bảng theo flow-chung §3). 2 tập kế: chỉ qua khi có ≥1 video ≥3× trung vị kênh đối thủ đó. Ghi 3 truy vấn video phải thắng; khác kiểu 3 tập gần nhất. Xoá `/tmp/ytr-*` khi xong [buck §2, chung §8].
2. **Research:** `research.md`, kiểm số bằng script tự viết trong tập (`verify_numbers.py`, `filing_check.py`) chạy được lại; số theo kỳ ghi tính tới tháng nào [ep14, buck §10].
3. **Kịch bản:** `script.json` (beats `b001…`, `title`, `thumbnail_text`, `shorts`), độ dài nhắm 12–15 phút cho 2 tập kế (luật THỬ 10–15 phút), `short-hooks.json` (beats `h001…h003`, câu móc dùng giá USD cụ thể của người hoặc chiêu thật). Tiêu đề: câu hỏi kết bằng "?", hoặc khung "How X Got So Bad" / "The Collapse of X" tối đa 1 trong 2 tập. Fact-check độc lập; sửa theo phát hiện [buck §1 §2 §12, ep14 commit 2ebcccc].
4. **Giọng:** `python -m usecon_tts build --script-json channels/us-econ/episodes/<slug>/script.json --out-dir <out>` (Chatterbox, `--pause 0.5 --paragraph-pause 1.0`, WER 0). Kokoro chỉ ở tập THỬ ngoài lịch đã hẹn, thư viện trực tiếp, kèm bản Chatterbox; outro tập THỬ ở `channels/us-econ/outro/kokoro-trial/outro.wav` và `kokoro-trial/facebook/outro.wav`, không ghi đè `outro/outro.wav` dùng chung [bible §12, buck §9].
5. **Cảnh + test:** composition dài nhận prop `platform`; Short không import Outro; viết `video/tests/us-econ-ep<nn>.test.ts` theo mẫu ep14 (tiêu đề, ảnh bìa ≤4 từ, AI/not-advice, không logo, không "this year") [us-econ-ep14.test.ts].
6. **Render:** video dài + outro (`channels/us-econ/outro/add_outro.py`, `ytpub srt`), 3 Short qua `build_short.py`, ảnh bìa `Thumbnail.tsx` [bible §13, ep14].
7. **QC độc lập:** agent khác viết `qc-ep<nn>.md` (khung hình, Short, số liệu, mô tả, độ dài video dài 10–15 phút đo bằng ffprobe); FAIL thì trả người làm [qc-ep14.md, buck §1].
8. **Đóng gói:** `publish.json` (dài) + `short-0k/publish.json` (`FULL_VIDEO_URL` tạm). Bắt buộc 2–3 phương án tiêu đề và 3 ảnh bìa (1 vật + mũi tên giá, không chữ số) cho Test & Compare; tiêu đề ≤60 ký tự đo bằng script; so khuôn với 3 tập gần nhất [buck §2 §4, ep14].
9. **YouTube hẹn giờ** (CHECKLIST Y ở flow-chung §5, dán cho từng video): `cd channels/us-econ/publish && .venv/bin/python -m ytpub upload <thư mục tập>` ở private + publishAt thứ Bảy 15:00Z (xem nợ DEV); điền URL vào 3 `short-0k/publish.json`; upload Short private + publishAt theo buck §8; commit `youtube.json`. Tạo `out/do-luong/buck-<slug>.md` (trong checkout `ai_video`) với các mốc đo [buck §8].
10. **Bản Facebook:** `python3 channels/us-econ/outro/export_facebook.py out/us-econ/<slug> <Composition> <music.ogg> <outro start frame>` → `<checkout chính>/out/follow-the-buck-facebook/<slug>.mp4` [bible §13].
11. **Drive:** `gdrive:Follow the Buck/<nn> <slug>/` (video dài, Short, bản FB, thumbnail, srt) → `rclone check` → xoá bản máy (giữ `cache/` nếu còn khả năng sửa số) [chung §3].
12. **Caption FB + hẹn giờ** (CHECKLIST F): `ai_video/out/facebook-page/caption-cho-dang/buck<n>-long.txt`, `buck<n>-s<k>.txt`, hàng chờ, MANIFEST → agent Brave hẹn trên Business Suite page Follow the Buck [D43, buck §7].
13. **Sau khi lên:** Video liên quan cho 3 Short (ghi `out/follow-the-buck-shorts/GAN-VIDEO-LIEN-QUAN.md`), Test & Compare video dài, `Previous episodes` ở tập sau [buck §5].
14. **Đo lường:** mốc 48 giờ và 7 ngày: điền `out/do-luong/buck-<slug>.md` theo flow-chung §4. Số API lấy bằng `ytpub analytics` (nhánh `kenh-my-dang`, chỉ đọc, đừng gọi `load_creds()`); Đã xem/Lướt qua do agent Brave đọc YouTube Studio mỗi tuần, CHỈ ĐỌC, không sửa, không gõ đăng nhập. Ghi: phút xem, tỉ lệ Đề xuất, view 7 ngày so với trung vị video dài Buck, giữ chân 0:30, Đã xem/Lướt qua và % view US/CA/GB/AU của Short. Dùng cho kỳ xét luật THỬ 2026-12-31 (độ dài, khung suy thoái, câu móc Short ≥30% nước nói tiếng Anh, Kokoro) [buck §1 §2 §9 §12].
15. **Ghi sổ:** `DA-DANG.md`, `lich-dang`, commit đúng đường dẫn, dọn `cache/`, `video-silent.mp4`, `mix.wav`, `/tmp/qc-*`, `/tmp/ytr-*` [chung §3].
