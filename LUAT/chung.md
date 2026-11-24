# Luật chung cho cả hai kênh (24/11/2026, sửa theo tranh luận mcp-mien-phi)

## 1. An toàn và quyền
- Hook hay quyền chặn: DỪNG và báo chủ kênh. Không đổi công cụ hay cách viết để đi vòng [memory follow-rules-strictly].
- Ngoại lệ duy nhất đã duyệt: hook `team guard` chặn nhầm vì chữ đường dẫn thư mục khoá trong mô tả PR → viết "Kiểm khoá (bước lock-check của CI): mã 0" [memory follow-rules-strictly].
- Không gõ mật khẩu, mã xác minh, captcha; không bấm đồng ý điều khoản hay OAuth thay chủ kênh. Tới bước đó thì quay về terminal và báo [memory screen-control-return].
- Không làm việc tốn tiền khi chưa hỏi (Claude Pro 20 USD/tháng, không API trả phí, TTS miễn phí) [memory studio-story-pivot, video-channel-just-do-it].
- Tách bạch G3/Ript: không dùng tài sản, dữ liệu, mã, khách hàng, ví dụ của G3/Ript cho hai kênh, và ngược lại [~/.claude/CLAUDE.md].
- Không Artifact, không claude.ai, không Claude in Chrome. Chỉ Claude Code CLI [~/.claude/CLAUDE.md, memory cli-only-no-claude-web].
- Luồng chính chỉ điều phối (nói với chủ kênh, giao việc, đọc trạng thái, ghi `.team/` và `LUAT/`). Mọi việc thực thi giao agent, kể cả việc ngắn [memory delegate-not-do-yourself].
- Người làm và người kiểm là hai agent khác nhau, gọi mới. Không tự duyệt, không tự sửa rồi tự cho qua. Phán quyết do script tính [memory proper-team-no-solo-fix, .team/doi-san-xuat.md].
- Review có phát hiện: giao người làm sửa ngay, không hỏi chủ kênh [memory review-findings-no-ask].
- Mọi lựa chọn sản xuất (lỗi nhỏ, giờ đăng, chọn Short, ledger mã 3) đội tự quyết. Vẫn dừng khi: hook/quyền chặn, mật khẩu/captcha, tốn tiền [memory video-channel-just-do-it 21/11].
- Báo cáo cuối mỗi video có mục "đã dùng gì" [memory video-channel-just-do-it].
- Trend lớn đúng ngách thì làm và xếp lịch sớm (3–7 ngày). Câu mơ hồ kiểu "kệ X" thì hỏi lại một câu trước khi dừng việc [memory trend-topics].
- Server nhà (bảng điện, khung ảnh): không chép, không khởi động lại khi chưa nghe "đưa lên" [memory home-server-deploy-on-request].

## 2. Điều khiển màn hình (Brave, mac-control)
- Chỉ MỘT agent dùng Brave/mac-control tại một thời điểm. Các phiên giành cửa sổ của nhau [memory screen-control-return].
- Xong việc hoặc bị kẹt: quay về một lần bằng `osascript -e 'tell application id "com.google.antigravity-ide" to activate'`. CẤM gọi "Visual Studio Code" hay `com.microsoft.VSCode` [memory screen-control-return].
- Dán chữ qua `pbcopy` + Cmd+V (bộ gõ Telex làm hỏng chữ khi gõ), xong thì xoá clipboard [memory screen-control-return].
- `chrome-devtools`: luôn chạy `--sessionId <số>`, kết thúc bằng `$HOME/.claude/team/bin/chrome-don <số>`. Dùng MCP `mcp__chrome-devtools__*` thì cuối việc chạy `chrome-don` không tham số. Báo cáo ghi dòng kết quả của `chrome-don` [~/.claude/CLAUDE.md].

## 3. File, Drive, dọn rác
- Mọi video xong (dài, Short, bản Facebook, bản TikTok kèm caption `.txt`) đều lên Drive qua rclone [D34, memory upload-gdrive, D43].
  - Con Bit: `gdrive:Chuyen Cua Nhung Con Bit/<nn> <slug>/` gồm `video-dai.mp4`, `youtube-shorts/phan-<k>.mp4`, `facebook/`, `tiktok/phan-<k>.mp4` + `.txt` [memory upload-gdrive].
  - Buck: `gdrive:Follow the Buck/<nn> <slug>/` [memory us-econ-channel].
  - Không đụng thư mục Drive khác (ChienTuyenLive, chamcong-backup…) [memory upload-gdrive].
- Lên Drive, `rclone check` khớp, rồi XOÁ bản trên máy ngay. Còn cần file để hẹn YouTube thì hẹn xong rồi mới xoá [memory cleanup-after-each-part 21/11, 22/11].
- Đến giờ đăng/hẹn FB hoặc TikTok: tải đúng file từ Drive về thư mục tạm, đăng, kiểm bài đã lên, xoá bản tạm [memory cleanup-after-each-part 22/11].
- Xong mỗi phần việc thì dọn: worktree đã merge + nhánh local, `/tmp/qc*`, `$TMPDIR/lo-*`, log render, still, `cache/` WAV, `video-silent.mp4`, `mix.wav`. Sau đợt render: `find $TMPDIR -maxdepth 1 -name 'remotion-*' -mmin +90 -exec rm -rf {} +`. Báo số GB còn trống khi kết thúc phiên [memory cleanup-after-each-part].
- zsh: glob không khớp làm `rm` dừng, nên dùng `setopt nullglob` hoặc `find -delete` [memory cleanup-after-each-part].
- KHÔNG đụng `ai_video/.worktrees/4-khung-doc` và file `/tmp` không thuộc dự án [memory cleanup-after-each-part].
- File chủ kênh phải tự mở thì chép ra thư mục thường (vd `out/`), không đưa đường dẫn trong `.worktrees/` hay thư mục dấu chấm [memory user-files-visible-paths].
- Máy ít chỗ, `~/Documents` bị iCloud đẩy lên mây: chạy test/TTS nặng bằng bản sao venv/npm ci trong `/tmp` khi cần [memory us-econ-channel].

## 4. Git
- `git status` trước, `git add` đúng từng đường dẫn. Không `git add .`, `git add .team`, `git commit -a` [memory commit-explicit-paths].
- Không đụng file lạ của phiên khác. Ở `ai_video` có sẵn hai file như vậy: `.team/locks/2.sha256`, `video/tests/helpers/render.ts` [.team/tiep-theo.md].
- Quyền push/PR/merge theo công tắc `~/.claude/team/bin/team github`. Chỉ chủ kênh đặt. Lệnh có chữ push phải chạy trong đúng repo [memory deploy-may-merge].
- CI GitHub hết phút tới 01/12/2026: kiểm local đúng các bước trong `.github/workflows`, ghi kết quả vào PR, xanh thì merge. Từ 01/12 quay lại chờ CI xanh. Không tự tắt branch protection [memory github-ci-out-of-minutes].
- PR chỉ đổi dữ liệu tập: chạy validate, lint, kiểm khoá, kiểm media. Đủ bộ test chỉ khi có sửa code [memory ci-process-fix-autonomy].
- Lệnh kiểm rồi merge: không nối bằng pipe, kiểm exit code thật trước [memory follow-rules-strictly].
- Sửa quy trình kiểm/CI: đội tự quyết, bắt buộc có test. Sửa chính hook hoặc `ci.yml` thì hỏi trước [memory ci-process-fix-autonomy].

## 5. Cơ chế đăng (cả hai kênh)
- **Thứ tự:** video dài lên YouTube trước mọi Short của tập. Không bao giờ có Short trước video dài [memory long-video-first].
- **Nhịp:** video dài ra mỗi tuần theo lịch, KHÔNG đăng ngay sau QC [D43, thay memory long-video-first].
- **YouTube:** chỉ qua YouTube Data API, tải lên `private` kèm `publishAt` để tự lên đúng giờ. Không mở Studio để đăng [D24, memory dang-ho-fb-tiktok-theo-lich].
- **Facebook:** đội hẹn giờ qua Meta Business Suite trên Brave (lên lịch bài hoặc Reel). Kiểm đúng page trước khi bấm [D43, memory hen-gio-fb-tiktok].
- **TikTok (chỉ Con Bit):** đội hẹn giờ qua TikTok Studio trên Brave, hẹn trước tối đa khoảng 10 ngày [D43, memory hen-gio-fb-tiktok].
- KHÔNG bao giờ bấm "Đăng ngay" trên FB/TikTok. Luôn hẹn giờ theo lịch [owner 24/11].
- FB và TikTok luôn lên SAU YouTube Short cùng nội dung (cùng ngày giờ muộn hơn, hoặc hôm sau) [D43].
- Mọi bài FB/TikTok: bật nhãn nội dung AI, kiểm lại trong mục "Đã lên lịch", ghi vào `out/facebook-page/DA-DANG.md` hoặc `out/tiktok-dang/DA-DANG-TIKTOK.md` với nhãn "đã hẹn giờ" và giờ lên [memory hen-gio-fb-tiktok].
- Mỗi page Facebook tối đa 3 bài mỗi ngày, cách nhau 15–20 phút. TikTok tối đa 1 bài mỗi ngày [D43, memory dang-rai-mang-xa-hoi].
- Mỗi lô hẹn giờ giao một agent Brave nhỏ (≤3 bài) [memory dang-rai-mang-xa-hoi].
- Bài đã hẹn giờ thì không tự sửa tiêu đề/ảnh bìa/caption, trừ khi trưởng kênh mở dòng sửa (EDIT-CAPTION/MANIFEST) hoặc theo dòng dưới [memory video-moi-chuan-tang-view, SKILL tranh-luan bước 6].
- [2026-11-24] Video đã hẹn/đã đăng được sửa tiêu đề, ảnh bìa cho khớp luật mới; sửa qua API, ghi lại trong out/doi-tieu-de-2026-11-24.md [owner 2026-11-24]
- Short: gắn "Video liên quan" về video dài (chỉ làm được trong Studio, không có API). Mô tả Short luôn có link video dài [D32 MỞ-5, D33].
- Video dài: bật Test & Compare (2–3 tiêu đề hoặc ảnh bìa) trong Studio. Short không dùng được [memory video-moi-chuan-tang-view].
- Lịch và hàng chờ đang dùng: `ai_video/out/lich-dang-2026-11.md`, `ai_video/out/facebook-page/caption-cho-dang/HANG-CHO-*.md`, `/tmp/hen-gio2/MANIFEST.md` [D43].

## 6. Hạn mức
- Claude: làm liên tục, dừng khi hạn mức tuần chạm 80%. Đo bằng `python3 -I ~/.claude/studio/usage7d.py <ts mốc>`, mốc ở `~/.claude/studio/usage-baseline.json`. Khoảng 70% thì nhờ chủ kênh xem `/usage`. Tới 80% thì dừng agent, ghi `.team/tiep-theo.md`, báo [memory run-until-weekly-80].
- Không bật job tự chạy (job-scout…) khi chưa hỏi [memory token-cap-60-2026-11-21].
- `agy` (Google AI Pro): tôn trọng bộ chặn (60% cửa sổ 5 giờ, 50% tuần), không gọi agy trong test [memory studio-story-pivot].
- YouTube API: lỗi "exceeded the number of videos they may upload" thì chờ khoảng 24 giờ, không thử dồn [.team/tiep-theo.md 14/11].
- Đăng dồn nhiều video cùng ngày làm video gần như không được phân phối. Rải ra [chien-luoc-kenh §1.3, memory dang-rai-mang-xa-hoi].

## 7. Trạng thái
- Trước khi chạy tiếp: đọc `ai_video/.team/tiep-theo.md`. Cập nhật file đó ở mỗi mốc lớn [memory tam-dung-2026-11-04].
- Khởi động lại phiên thì agent cũ bị huỷ: kiểm worktree và commit thật rồi giao agent mới [.team/tiep-theo.md].

## 8. Công cụ research
- [2026-11-24] Research đề tài dùng yt-dlp CLI chỉ đọc: --dump-json, ytsearch50:, --write-auto-subs --skip-download, --write-comments. Không tải video kênh khác, không dùng cookie, file tạm để ở /tmp/ytr-* và xoá khi xong. Không cài MCP YouTube/TTS/ảnh nào. Nguồn: tranh luận 2026-11-24 mcp-mien-phi
- [2026-11-24] KHÔNG dùng (cả hai kênh): yt-dlp-mcp, transcript-mcp, youtube-mcp-server, edge-tts-mcp, pexels, comfyui, ffmpeg-skill, yutu. Kokoro: Con Bit KHÔNG (không có giọng tiếng Việt), Buck THỬ bằng thư viện trực tiếp, không MCP (xem `buck.md` §9). Nguồn: tranh luận 2026-11-24 mcp-mien-phi
- [2026-11-24] Số Đã xem/Lướt qua (chỉ có trong YouTube Studio): mỗi tuần một agent Brave vào Studio CHỈ ĐỌC lấy số; không sửa gì, không gõ đăng nhập/mật khẩu (gặp màn đăng nhập thì dừng, về terminal, báo); theo luật Brave ở §2 [owner 2026-11-24].
