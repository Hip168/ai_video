# Quyết định

## D1. Cấu trúc repo
`audio/` (Python, đề mục 1) · `content/` (kịch bản, đề mục 1) · `video/` (Remotion, đề mục 2) · `out/` (sản phẩm, không commit) · `.team/contract/` (hợp đồng chung).
Lý do: hai đề mục chạy song song không đụng file của nhau. Nguồn: người dùng chốt làm song song; BA chọn bố cục để gộp hai thiết kế độc lập.

## D2. Quan hệ giữa các đề mục
- **1 ↔ 2:** dùng chung `timeline.json`. Đã chốt: BA cố định hợp đồng trước, hai bên làm song song (lời người dùng, 2026-10-31). Hợp đồng: `.team/features/0-hop-dong-timeline.md`. File mẫu: `.team/contract/timeline.sample.json`.
- **3 phụ thuộc 1 và 2:** chỉ bắt đầu sau khi cả hai đã merge.

## D3. Đồng bộ phụ đề theo nhịp, không theo từ
Cả KorvaTTS và VieNeu không có mốc thời gian theo từ (theo tài liệu, chưa chạy thử). Mỗi nhịp tổng hợp riêng, đo độ dài bằng số mẫu, cộng dồn ra mốc thời gian. Nhờ vậy không trôi thời gian.

## D4. Phát âm tách khỏi chữ hiển thị
Bảng phát âm chỉ tác động lên chuỗi gửi vào TTS. Phụ đề luôn hiện chữ gốc.

## D5. Loudness
-16 LUFS, true peak ≤ -1,5 dBTP, dung sai ±1 LU. Chuẩn hóa sau khi ghép, `linear=true` để không đổi độ dài.

## D6. Render offline
Font cục bộ, không dùng `@remotion/google-fonts`. Trình duyệt headless tải một lần bằng `npx remotion browser ensure`.

## D7. CI thuộc bước `/ci`
Các đề mục không tự viết `.github/workflows/`. CI cần chạy `pytest -m "not real"`, Vitest và render vài khung hình với âm thanh giả.

## D8. Thứ tự cảnh
`phone → dns → packets → wifi → hops → server → receiver`. DNS đứng trước `packets` vì điện thoại cần biết địa chỉ trước khi gửi. Đây là sửa đổi của BA so với thứ tự trong prompt gửi kiến trúc sư; người dùng duyệt qua kịch bản ở Pha 4d.

## D9. Giao diện xem agent (ngoài dự án)
Đã dùng Vibecraft để xem đội, rồi gỡ hẳn theo yêu cầu người dùng (2026-10-31). Không còn thuộc dự án.

## D10. Vùng an toàn và khe hở hợp đồng (BA chốt, 2026-10-31, từ duyệt của TEST-LEAD)
- Hình chính vẽ trong `y < 830`, tức chừa 250 px đáy, vì phụ đề 2 dòng cao tới y=836. Thay cho mốc 200 px cũ.
- `durationFrames` ≥ 1; `text` chỉ có khoảng trắng bị coi là rỗng (`0-hop-dong-timeline.md`).
- Bên đề mục 1: `compare` có `lexicon_path`, tên file bỏ dấu, `number_to_words` chỉ cam kết 0–99, `pause_ms` là số nguyên ≥ 0, `validate_timeline` kiểm luật 1-8, luật 9 kiểm ở bước build.
- `build` validate trước khi ghi `timeline.json`; timeline hỏng thì không ghi file.
- Luật 10 là mô tả, không có kiểm tra riêng trong `validate_timeline`. `startFrame` của cảnh bằng beat đầu (trừ cảnh đầu) được kiểm ở test build.
- Luật 2 và 7 đổi trước khi hợp đồng được phát hành nên `version` giữ 1.

## D11. Cơ cấu Lead (người dùng chốt, 2026-10-31)
Có `dev-lead` và một TEST-LEAD (CONVENTIONS §0c). `deploy-lead`, `ops-lead` đã bỏ sau khi chạy thử. Áp dụng từ các việc mới; đề mục 1 và 2 đang chạy dở vẫn đi nốt, `dev-lead` kiểm trước khi sang DEPLOY.

## D12. Giọng đọc (người dùng chốt sau khi nghe, 2026-10-31)
KorvaTTS, giọng `hoang_nam`, giữ nguyên từ tiếng Anh. Chỉ `router` và `packet` cần sửa cách đọc bằng chính giọng này; `DNS`, `Wi-Fi`, `IP` giữ nguyên. Không ghép giọng tiếng Anh. Người dùng nghe 7 mẫu mỗi từ và chọn: `router` đọc "râu tơ" (mẫu 3), `packet` giữ nguyên. `lexicon.json` chỉ còn `router`. Tốc độ `--speed 1.25` (2631 frame, 87,7 giây): người dùng xem bản có giọng và nhắn "ok" ngày 2026-10-31. `lexicon.json` là dữ liệu sửa được: test chỉ kiểm dạng, không ghim từ nào.

## D13. Đề mục 3 (BA chốt, 2026-10-31)
`make-video.sh` chỉ chạy trên Mac, không tự cài, chỉ truyền qua `REMOTION_BROWSER_EXECUTABLE`. Hợp đồng đầu ra tối thiểu ghi ở `features/3-ghep-video.md`.

## D14. Chống mất hình khi render (người dùng chốt, 2026-11-01)
Chrome bỏ vẽ phần tử khi render nhiều luồng, nên render một luồng, đặt trong `remotion.config.ts`. Bản dọc vẫn đôi khi mất hình 1 khung ở một luồng, nguyên nhân chưa rõ (TEST-LEAD đo 3/7 lần). Người dùng chọn: `make-video.sh` đo MP4 sau render, có khung mất hình thì tự render lại tối đa vài lần, vẫn lỗi thì báo lỗi.

## D15. Không mở khoá, chạy song song với v1 (BA chốt, 2026-11-03)
Pipeline tập dài là file mới: `timeline2.ts`, `Episode.tsx`, `lib/`, `episode.py`, `make-episode.sh`. Không sửa `timeline.ts`, `scenes/index.ts`, `Video.tsx`, `audio.py`, `make-video.sh`, `content/*`, `remotion.config.ts`, `kit.tsx`. Được sửa nhỏ, chỉ thêm: `Root.tsx`, `package.json`, `tsconfig.json`, `.gitignore`. Tập không ghi vào `video/public/timeline.json` và `video/public/audio/narration.wav`, vì `test_compare.py` ghim hai file đó; mọi thứ của tập nằm ở `out/episodes/<slug>/`. Mã trong `video/src` không chứa `http(s)://` (`fonts.test.ts` quét). Không commit wav, mp3, mp4 (CI cấm).

## D16. Cảnh: catalog dữ liệu cộng cảnh riêng từng tập (BA chốt, 2026-11-03)
18 loại cảnh theo dữ liệu trong `video/src/lib/scenes/`, cộng `custom:<tên>` ở `video/src/episodes/<slug>/`. Lint chặn lặp khuôn, lý do: chính sách "inauthentic content" của YouTube xét theo kênh. Số ngưỡng ở `features/6-khung-v2.md`.

## D17. Âm thanh tập: trộn bằng FFmpeg (BA chốt, 2026-11-03)
Ducking `sidechaincompress`, chuẩn hoá hai lượt giữ chuẩn D5: đo bằng ebur128 rồi áp `volume` cố định, gain = `min(-16 - LUFS, -1,5 - TP)`. Không dùng `loudnorm` ở lượt 2, vì nội dung có khoảng lặng làm nó rơi sang chế độ động và méo chênh mức giữa các SFX (DEV-9 đo, 2026-11-03). Render hình `muted`, đổi nhạc không phải render lại.
Nguồn: nhạc từ YouTube Audio Library lọc "Attribution not required" (trang Help ghi không bị Content ID claim), chỉ có sau khi tạo kênh; trước đó dùng Tallbeard CC0. SFX sinh bằng code (numpy) cộng Kenney CC0. Không dùng nhạc AI, `@remotion/sfx`, Freesound API, Pixabay tải hàng loạt. Mỗi file nhạc lưu kèm URL nguồn, giấy phép, ngày tải, sha256 trong `assets/audio/manifest.json`; file nằm ngoài git.

## D18. Render theo đoạn (BA chốt, 2026-11-03)
`video/scripts/render-episode.ts`: chia đoạn khoảng 1800 frame ở biên cảnh, `concurrency: 1` tường minh trong mỗi tiến trình (D14), `muted`, resume bằng hash đoạn, ghép `-c copy`, trộn tiếng sau. Số tiến trình và cách kiểm mất hình chốt theo số đo OPS, ghi ở `stack.md`. Chặn chạy nếu đĩa trống dưới 6 GB.

## D19. Nhánh `4-khung-doc` tạm dừng (BA chốt, 2026-11-03)
Không merge, không lấy file. Giữ nhánh và worktree. Lý do: kênh dài là ngang, nhánh chưa qua duyệt và khoá, render tập dài dùng cờ riêng. `framecheck.py` viết mới theo ý `diff_frames` trong `videocheck.py`.

## D20. Đội sản xuất (người dùng yêu cầu, BA thiết kế, 2026-11-03)
Chi tiết ở `.team/doi-san-xuat.md`. Người làm không tự duyệt, người tìm lỗi không tự sửa. Ba cổng cứng: kiểm chứng fact, chốt kịch bản, đăng bài. QC là vai thường, không phải Lead, nên luật "chỉ 2 Lead, một TEST-LEAD" (D11) giữ nguyên; code pipeline vẫn đi DEV-LEAD → TEST-LEAD.
Tập không dùng `team lock`: file khoá chỉ người dùng mở được, nên kịch bản khoá sẽ chặn đường sửa tự động. Thay bằng chuỗi hash trong sổ tập.
Học ý từ `claude-code-my-workflow`, `superpowers`, `content-foundry`, `cc-sdd` (MIT). Viết lại, không chép. `OpenMontage` (AGPL) chỉ học ý tưởng. Bản clone ở `~/Documents/ai_video_refs/`, không cài, không chạy.

## D21. Đăng qua YouTube Studio (BA chốt, 2026-11-03)
Dùng Claude in Chrome trên Chrome thật của người dùng, không dùng tool đăng trên GitHub. Lý do: tài liệu `videos.insert` (cập nhật 2026-10-15) ghi không còn khoá private, bài Help vẫn ghi có khoá, hai nguồn chính thức mâu thuẫn; OAuth ở Testing hết hạn sau 7 ngày. Studio không vướng cả hai. Có thể thử API sau, bằng clip ngắn, nếu đăng tay qua trình duyệt quá chậm.
Công bố nội dung tổng hợp: chọn "Không", vì sơ đồ hoạt hình không trông thực và không rơi vào bốn trường hợp bắt buộc. Đây là suy luận, Google không nêu đích danh TTS. Mô tả video ghi một dòng rằng giọng đọc do AI tạo.
Quyền đã có: sau khi người dùng duyệt video đầu, publisher được đăng Công khai không hỏi, ở đúng kênh đã ghi trong `.team/kenh.json`.

## D22. Sổ fact (BA chốt, 2026-11-03)
`episodes/<slug>/claims.json` là sổ fact. Dùng JSON, không thêm phụ thuộc YAML. Mỗi con số, tên, năm trong lời đọc phải trỏ về một claim có nguồn.

## D23. Trình duyệt render và kiểm mất hình (BA chốt theo yêu cầu người dùng và số đo OPS, 2026-11-03)
Người dùng hỏi dùng `chrome-headless-shell` thay Google Chrome. Chốt: dùng, đặt ở `~/.cache/aivideo/chrome-headless-shell/`, không sửa `remotion.config.ts`. Chi tiết ở `stack.md`.
D14 cần sửa: `videocheck.py` so hai lần render không đủ, vì a1 và a2 giống hệt từng byte mà cùng mất frame 1315, và `out/video.mp4` cũng mất frame này. Hai lần render cùng dải có thể cùng lỗi; hai phiên khác nhau lại lệch chữ, gây báo giả. Kiểm tập dài không dựa vào so hai lần cùng dải: quét đột biến trên từng video (`framecheck.py`), đối chiếu thêm một lần render với ranh giới đoạn khác. Headless mới có 5 lần sạch, chưa đủ kết luận hết mất hình. Nhánh 4 và `make-video.sh` tạm giữ nguyên (D19).

## D24. Đăng qua YouTube Data API, chạy theo lịch bằng launchd (BA chốt theo yêu cầu người dùng, 2026-11-10)
Người dùng yêu cầu máy tự tạo video và tự đăng YouTube, không cần người ngồi trước máy. D21 bị thay thế ở phần cách đăng, vì hai lý do:
- Điều khoản YouTube (bản 2023-12-15) cấm truy cập dịch vụ bằng phương tiện tự động nếu không có cho phép bằng văn bản. Tự động hoá Studio qua trình duyệt rơi vào điều này và có thể làm mất kênh.
- Revision history của YouTube Data API, mục 2026-11-02 (trang cập nhật 2026-11-03), ghi video tải lên từ project chưa xác minh không còn bị khoá ở chế độ private. Bài Help 7300965 vẫn ghi câu cũ, nên tập đầu tải lên ở private rồi kiểm xem có bị khoá không.

Chốt:
- Đăng bằng một script Python thuần, dùng `google-api-python-client`. Claude không tự gọi API.
- Các lệnh gọi: `videos.insert`, rồi đợi `processingStatus`, rồi `thumbnails.set`, rồi `captions.insert`. Chương đưa vào mô tả.
- Quota: upload 100 lần/ngày; phụ đề cộng thumbnail tốn khoảng 450 trên 10.000 đơn vị chung mỗi ngày.
- OAuth client kiểu Desktop, consent screen để "In production", vì chế độ Testing làm token hết hạn sau 7 ngày. Ứng dụng dưới 100 người dùng không cần verification.
- Token và `client_secret` để ngoài repo, ở `~/.config/aivideo/`, quyền file 600.
- `containsSyntheticMedia` vẫn để `false` như D21, mô tả ghi một dòng rằng giọng đọc do AI tạo.
- Chạy theo lịch bằng LaunchAgent `StartCalendarInterval`, không dùng cron. Script chạy dưới `caffeinate -i -s`, gọi `claude -p` với `--permission-mode dontAsk --permission-prompts none`. Không dùng `--bare` (vì cần `.claude/agents`), không dùng `bypassPermissions`. Quyền chạy cho bằng một allowlist hẹp do người dùng tự thêm vào cài đặt.
- Đăng nhập Claude khi chạy không người: `claude setup-token`, đặt `CLAUDE_CODE_OAUTH_TOKEN`. Máy tự thức trước giờ chạy bằng `pmset repeat wakeorpoweron`. Máy phải cắm sạc và mở nắp.
- Cổng nào không đạt hoặc gặp `CẦN NGƯỜI DÙNG` thì lượt đó dừng, không đăng, ghi log và để lại tin cho người dùng.
- Từ video thứ hai đăng Công khai sau khi người dùng duyệt video đầu (giữ nguyên D21).
Nguồn: developers.google.com/youtube/v3 (revision_history, videos/insert, determine_quota_cost; 2026-11-03), developers.google.com/identity/protocols/oauth2 (2026-10-29), code.claude.com/docs/en/headless và /permissions (2026-11-10).

## D25. Luồng của lượt chạy theo lịch (BA chốt, 2026-11-10, theo đề xuất DEV-13)
- Claude (`claude -p`) chạy theo PLAYBOOK tới hết khâu 12 rồi in dòng cuối `SLUG: <slug>`. Sau đó `run-daily.sh` tự chạy `gate3` (không tin lời Claude). Cổng đạt thì mới chạy `upload`. Kết quả JSON có chữ `CAN_NGUOI_DUNG` thì dừng.
- `upload` ghi mục `dang` vào sổ, `note` là URL `https://www.youtube.com/watch?v=<id>`, ghi ngay sau khi insert. Chạy lại mà gặp mục này thì không insert lần nữa. Thumbnail và phụ đề cũng không đặt lại nếu đã xong: sổ phải ghi đủ từng bước để biết bước nào đã xong.
- Các chặn thêm trong `upload` đều giữ: đặt `public` khi `firstVideoApproved` chưa là true; có `--publish-at` mà privacy không phải `private`; `containsSyntheticMedia` khác false.
- Tập đầu tải lên ở `unlisted` (Không công khai), giữ như D21. Lý do: Cổng 3, có test khoá của đề mục 11, chỉ nhận `unlisted` khi `firstVideoApproved` chưa là true. Video bị khoá thì `upload` thấy `privacyStatus` trả về là `private` thay vì `unlisted`, nên báo `CAN_NGUOI_DUNG`. Người dùng xem và nhắn ok thì các video sau mới đặt `public`. (Sửa ngày 2026-11-10, trước đó dòng này ghi `private`.)
- Sổ tập và file của tập: mục 6b yêu cầu `gate3` chặn khi sổ chưa commit. Vì vậy `run-daily.sh` commit trong máy riêng các đường dẫn `episodes/<slug>/` trước khi chạy `gate3`. Sau khi đăng xong thì push lên `main`, chỉ gồm các đường dẫn đó. Đây là nội dung tập, không phải code, nên không cần PR. Push lỗi thì chỉ ghi log, video vẫn tính là đã đăng.
- Lỗi `HttpError` của Google được bắt riêng: in thông báo rõ ràng, thoát 1, không in traceback.
- Mẫu plist đặt `PATH` có thư mục chứa `claude`, `uv` và `node`.

## D26. Đề mục 10: tiêu chí đóng trình duyệt, thứ tự kiểm và ghép (BA chốt, 2026-11-11, theo TEST-LEAD và review)
- Tiêu chí "đóng trong `finally`" chuyển thành tiêu chí về kết quả: sau khi chạy, dù chạy thành công, lỗi, SIGINT hay `close()` hỏng, không còn tiến trình `chrome-headless-shell` mồ côi, và manifest đã được ghi. Hợp đồng có thêm một điểm móc cho test: biến `AIVIDEO_FAIL_CLOSE=throw|hang` làm `close()` ném lỗi hoặc treo, để kiểm được đường diệt dự phòng (diệt theo nhóm tiến trình). Trước đây sổ test ghi "BA chốt: đột biến tương đương", nhưng không có nguồn; câu đó bỏ.
- Thứ tự bước 6 và 7: ghép (6), rồi `framecheck verify` (7). Nếu bước 7 render lại đoạn nào thì phải ghép lại và chạy lại `assemble verify`. `clean` chỉ chạy sau khi lượt kiểm cuối cùng đạt. Không bao giờ để MP4 cuối giữ đoạn cũ.
- `assemble verify` chạy thêm `framecheck scan` trên MP4 cuối, để bắt khung chỉ còn nền. Check khung đen giữ nguyên và chỉ bắt khung đen. Ghi vào file giao diện §3.
- Tiêu chí "`_template` ngắt giữa chừng rồi chạy lại" giữ nguyên: test phải dùng `_template`, không thay bằng timeline tĩnh.

## D27. [12-5] chấp nhận giới hạn fitText (BA chốt, 2026-11-11)
Lint `flow` tính cỡ chữ theo `flowSizes`, chưa tính phần `fitText` co thêm khi nhãn nút dài. BA chấp nhận giới hạn này. Lý do: lỗi này lộ ra ở bước `qc` khi xem khung hình. Muốn chặn thì phải đo chữ thật, sẽ làm ở đề mục riêng nếu `qc` gặp.
- Bổ sung D25 (BA chốt 2026-11-11, theo review đề mục 13):
  - Luôn insert ở `private`. Đặt xong thumbnail và phụ đề thì mới `set_privacy` sang giá trị mong muốn. Sau đó đọc lại `privacyStatus`: nếu vẫn `private` thì coi là video bị khoá và trả mã 3. Cách này tránh để video công khai khi còn thiếu ảnh bìa hoặc phụ đề.
  - Chống đăng trùng: gắn mốc `aivideo:<slug>` vào `tags`. Khi sổ chưa có `videoId`, trước khi insert, tra playlist uploads của kênh tìm mốc này. Nếu thấy thì dùng lại `videoId` đó và ghi sổ. Có `videoId` là in ra stderr ngay, trước khi ghi sổ. Mọi phép tính có thể lỗi (hash MP4…) làm trước khi insert.
  - `run-daily.sh` commit và push đủ file của tập: `episodes/<slug>/`, `video/src/episodes/<slug>/`, `episodes/index.json` nếu có thay đổi. Không commit file nào khác.

## D28. YouTube Shorts dọc từ tập dài (người dùng yêu cầu, BA chốt, 2026-11-11)
Người dùng muốn có thêm Shorts dọc, xem trên điện thoại vẫn chuẩn như video quay dọc thật. Chốt:
- Không cắt từ MP4 ngang. Render lại từ chính timeline của tập, khung 1080×1920, 30 fps.
- Bố cục dọc: tiêu đề ngắn ở trên; giữa là vùng vuông 1080×1080 cho cảnh; phụ đề to ở dưới, chừa vùng nút bấm của YouTube Shorts. Mỗi loại cảnh trong 18 loại có thêm biến thể vuông. Không thu nhỏ cảnh ngang để nhét vào.
- Mỗi tập ra 2 Shorts, mỗi Short dưới 60 giây. Lấy đoạn trọn ý: có móc mở đầu và có câu kết. Lời đọc lấy nguyên từ kịch bản đã qua Cổng 2. Nếu cần câu mở hay câu kết mới thì câu đó phải qua lại Cổng 1 và Cổng 2.
- Mô tả của Short có link về video dài. Short đăng ngay trong cùng lượt chạy, sau video dài, bằng cùng `upload.py` (người dùng chốt 2026-11-11: "đẩy cả bản chuẩn cả bản short song song"). Short đầu tiên cũng để Không công khai và chờ người dùng duyệt cùng video dài đầu tiên.
- Dùng lại phần đã làm ở nhánh `4-khung-doc` (D19 tạm dừng) làm nền bố cục dọc.
- Làm song song với đề mục 10 và 13, ngay từ bây giờ (người dùng chốt 2026-11-11). Tập đầu ra cả bản dài lẫn 2 Shorts.

## D29. Độ dài tập đầu 12:01 (BA chốt, 2026-11-11)
Đề mục 12 ghi độ dài từ 9:30 đến 12:00. Giọng thật của tập `vi-sao-may-tinh-dung-nhi-phan` dài 721,4 giây, vượt mốc 1,4 giây. Không có cổng nào trong code kiểm độ dài. Chấp nhận, vì mục đích là video khoảng 10 phút, còn sửa lời sau Cổng 2 thì phải chạy lại cả ba cổng. Người dùng chọn không nghe trước tên riêng, xem luôn ở video đầu (Không công khai).

## D30. Bộ dò mất hình: xác nhận bằng vùng liền khối (BA chốt, 2026-11-11)
Tập đầu bị `find_dips` báo 40 khung "mất hình", nhưng xem từng khung thì tất cả đều là chuyển động hoặc fade hợp lệ:
- viền thẻ mảnh bị răng cưa khi thu nhỏ;
- fade vượt qua ngưỡng xám 80;
- số đếm chạy;
- crossfade chữ.

Chốt lại: `find_dips` chỉ còn là bước lọc ứng viên. Một khung chỉ bị báo khi thoả cả hai điều kiện sau, đo bằng `region_size` sẵn có:
- `region_size(f[i-1], f[i]) >= MIN_REGION`: mất một vùng liền khối;
- `region_size(f[i-1], f[i+k]) < MIN_REGION`: hình hồi lại như cũ.

Test khoá của bộ dò giữ nguyên và phải xanh. Chấp nhận nhược điểm: sẽ bỏ sót mất hình xảy ra đúng lúc cảnh đang chuyển động, vì QC xem khung bằng mắt vẫn còn.

## D31. Tên kênh, ảnh đại diện, việc tiếp theo (người dùng chốt, 2026-11-12)
- Tên kênh: "Chuyện Của Những Con Bit". Ảnh đại diện: hình con chip, PNG 800x800 ở `assets/brand/`. Người dùng tự đổi cả hai trong Studio vì API không cho đổi. Đổi xong thì chuyển video đầu sang Công khai và đặt `firstVideoApproved: true`.
- Việc làm tiếp: sửa lỗi còn tồn (chữ chồng nhau ở sc42, khung flow, CI lỗi vì đĩa runner), làm tập 2, mở lại đề mục 14 Shorts.
