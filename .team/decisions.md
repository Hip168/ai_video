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

## D32. Hợp đồng Shorts (BA chốt, 2026-11-12, theo `14-shorts-giao-dien.md` a21847f)
- MỞ-1: chọn A. Cảnh nằm trong hộp vuông 840 đặt gọn trong vùng an toàn (x 48–888, y 288–1248). Hook nằm ở dải trên. Sửa lại "hộp 1080" của D28.
- MỞ-2: ngưỡng chữ ở khung dọc là 30 px cho chữ thường, 25 px cho nhãn cạnh, 48 px cho phụ đề (hệ số 1,22).
- MỞ-3: không viết lời mới. Short chỉ dùng beat có sẵn, `hook` là chữ trên màn hình, không đọc.
- MỞ-4: thêm cờ mới `--short <n>`, không dùng `--layout short`.
- MỞ-5: từ 2023, link trong mô tả Short không bấm được. Vẫn ghi link video dài vào mô tả dạng chữ. Tiêu chí "có link về video dài" coi là đạt khi mô tả có link. Nút "video liên quan" chỉ đặt được trong Studio, không phải tiêu chí, có thể nhờ người dùng đặt.
- Nguồn vùng an toàn: Google Ads Help 13547298, mục "Universal safe zones". Ghi vào `stack.md`.

## D33. Shorts theo chuỗi phần, kèm TikTok (người dùng chốt 2026-11-12, sửa D28/D32)
- Việc gấp nhất: Shorts cho tập 1. Cắt cả tập thành 5–6 phần liên tiếp, ghi "Phần k/N". `shorts.json` có N mục, N từ 1 đến 8 (bỏ quy định đúng 2 mục). Mỗi phần cắt ở ranh giới cảnh, dài tối đa 180 s (YouTube Shorts cho tối đa 3 phút) và nên dưới 150 s.
- Mô tả mỗi phần có link video dài. Phần cuối có thêm lời mời xem bản đầy đủ. Link trong mô tả và bình luận của Short không bấm được, nên người dùng đặt "Video liên quan" trong Studio để có nút bấm thật.
- TikTok: người dùng tự tạo tài khoản. Đăng tự động qua Content Posting API cần app đã qua duyệt; chưa duyệt thì chỉ đăng được ở chế độ riêng tư. Trước mắt đội xuất file 1080×1920 kèm caption để người dùng tự tải lên, rồi tính tiếp tự động sau. Link video dài để ở bio hoặc caption.
- Sửa D33 (người dùng, 2026-11-12): tập 1 chỉ làm **3 phần**, phủ khoảng **nửa đầu** video (khoảng 6 phút). Phần 3 kết bằng lời mời xem tiếp nửa sau ở video đầy đủ. Không cắt hết cả tập. `shorts.json` vẫn cho N từ 1 đến 8, các phần không cần phủ hết tập.
- Sửa D33 lần 2 (người dùng, 2026-11-12): **YouTube Shorts phủ hết cả tập**, vì Shorts trên YouTube kiếm tiền được. Cắt theo chương thành khoảng 5–6 phần, mỗi phần tối đa 150 s. **TikTok chỉ đăng 3 phần đầu** (nửa đầu tập); phần 3 trên TikTok mời người xem sang YouTube xem hết. Lệnh export TikTok nhận danh sách phần (mặc định 1–3).

## D34. Drive, TikTok tự đăng, căn giữa Shorts (người dùng chốt, 2026-11-14)
- Mọi video làm xong (video dài, YouTube Shorts, TikTok kèm caption) đều tải lên Google Drive của người dùng.
  - Remote rclone `gdrive:`, quyền `drive.file`.
  - Thư mục: `Chuyen Cua Nhung Con Bit/<nn> <slug>/`.
- TikTok:
  - Người dùng tạo tài khoản rồi gửi file cookie (định dạng Netscape). Đặt file ở `~/.config/aivideo/tiktok/cookies.txt`, quyền 600.
  - Đội tự đăng các phần TikTok, rồi đổi ảnh đại diện và tên hiển thị cho giống kênh YouTube.
  - Đề mục 17 viết phần này, dựa trên `live-battle/tu-dang/tiktok_dang.py` (dự án riêng của người dùng).
- Shorts:
  - Người dùng thấy khung cảnh trong Short hơi lệch sang trái và lên trên.
  - Shorts tập 1 giữ nguyên. Từ tập sau, căn cảnh vào giữa hơn nhưng vẫn nằm trong vùng an toàn. Sửa D32 MỞ-1.

## D35. Hashtag riêng cho từng tập trên TikTok (người dùng, 2026-11-14)
- Caption TikTok mở đầu bằng `#conbit<số tập>`, ví dụ `#conbit1`. Dòng hashtag cuối caption cũng có `#conbit<số tập> #conbit`.
- Phần mô tả kênh TikTok ghi: muốn xem thì tìm `#conbit` + số tập.
- Không dùng `#1` trần: hashtag này trùng với hàng triệu video khác trên TikTok, người xem tìm sẽ không ra video của kênh.
- Số tập lấy theo thứ tự đăng trong `episodes/index.json`.
- Lệnh xuất TikTok phải tự sinh dòng này. Đề mục 14 hoặc 17 sửa.
- Sửa D35 (2026-11-14): caption TikTok KHÔNG ghi URL, vì link trong caption không bấm được và dễ bị TikTok giảm phân phối. Thay bằng dòng chữ: `Bản đầy đủ: tìm "Chuyện Của Những Con Bit" trên YouTube`. Mô tả kênh cũng không ghi link. Link bấm được trong mô tả kênh chỉ có khi tài khoản đủ 1.000 người theo dõi, hoặc là tài khoản doanh nghiệp; điều kiện này người dùng tự kiểm trong app.
- Sửa D35 lần 2 (người dùng, 2026-11-14): caption TikTok không nhắc tới YouTube.
  - Thay bằng dòng "Xem bản đầy đủ: link ở bio nhé".
  - Phần cuối thì ghi "Các phần còn lại và bản đầy đủ: link ở bio nha."
  - Link đặt ở bio của kênh TikTok.
- Sửa D35 lần 3 (mẫu người dùng đang đăng, `out/tiktok-dang/`, 2026-11-15): caption gồm các đoạn cách nhau một dòng trống, theo thứ tự:
  - Dòng 1: `#conbit<n> <tiêu đề> (Phần k/N)`.
  - Đoạn mở.
  - "Theo dõi để xem phần tiếp." Phần cuối của dải xuất thì thay bằng "Các phần còn lại và bản đầy đủ: link ở bio nha."
  - Câu hỏi gợi bình luận.
  - "Giọng đọc trong video do AI tạo."
  - Hashtag: `#conbit<n> #conbit <chủ đề> #hoccungtiktok #LearnOnTikTok`.
  - Vẫn không ghi URL, không nhắc YouTube.
  - Chữ riêng cho TikTok đặt ở khoá tuỳ chọn `tiktok: {title, intro, question, tags}` của từng mục `shorts.json`. Thiếu khoá thì dùng `title`, `hook` của mục, bỏ câu hỏi, chủ đề mặc định `#tinhoc #khoahocmaytinh`.

## D36. Tập 3: tách chương 5 làm hai (người dùng chốt, 2026-11-14)
- Script-editor trả lại lỗi "nhịp" ở chương 5 hai lần. Theo luật, lần thứ hai thì sổ ghi `CAN_NGUOI_DUNG`, phải hỏi người dùng.
- Người dùng chọn tách chương 5 thành hai chương: một chương GPS, một chương về sự cố năm 2038 của Unix. Mỗi chương có một hình ảnh cụ thể riêng để người xem nghỉ.

## D37. Khung dọc dùng toàn màn hình (người dùng chốt, 2026-11-14)
- YouTube và TikTok có chế độ xem sạch, ẩn bình luận, mô tả và các nút. Vì vậy Short và TikTok dùng toàn khung 1080×1920 và không thu cảnh vào vùng an toàn nữa.
- Chỉ chừa lề nhỏ quanh mép.
- Quyết định này thay D32 MỞ-1 và phần căn giữa của D34.
- Ngưỡng cỡ chữ ở D32 MỞ-2 giữ nguyên.

## D38. Đoạn kết kêu gọi thích và đăng ký (người dùng chốt, 2026-11-14)
- Từ tập 3, cuối video dài gắn một đoạn kết dùng chung cho mọi tập, mời người xem bấm thích và đăng ký kênh.
- Đoạn kết làm một lần, có hai bản: ngang và dọc.
- YouTube Shorts: phần 3 và phần 6 của mỗi tập cũng gắn đoạn kết này. Nếu tập có ít hơn 6 phần thì gắn ở phần cuối.
- Bản TikTok tạm thời KHÔNG gắn.
- Lời đọc của đoạn kết bằng tiếng Việt ("bấm thích", "đăng ký kênh"), không đọc chữ tiếng Anh. Lời phải qua `phatam check`.

## D39. Dừng đăng TikTok (người dùng chốt, 2026-11-14)
- Không xuất và không đăng TikTok cho các tập từ giờ, cho tới khi người dùng mở lại.
- Chỉ làm video dài và YouTube Shorts.
- Code TikTok (đề mục 17, caption D35) giữ lại trong repo nhưng không chạy.
- Sửa D39 (người dùng nói rõ hơn, 2026-11-14): YouTube do đội làm trọn. TikTok do người dùng tự đăng tay.
  - Đội VẪN xuất file TikTok phần 1–3 kèm caption (D35), tải lên Drive ở thư mục `<nn> <slug>/tiktok/`.
  - Đội KHÔNG chạy `aivideo.tiktok post`.

## D40. Đổi giọng đọc sang VieNeu, giọng Thiên Minh (người dùng chốt sau khi nghe, 2026-11-14)
- Người dùng nghe 5 mẫu trong `out/compare-vieneu/`: korva hoang_nam, cùng 4 giọng VieNeu là hai_dang, mai_anh, thien_minh, truc_ly. Người dùng chọn `vieneu_thien_minh.wav`.
- Áp dụng TỪ TẬP 3 trở đi. Tập 1 và tập 2 giữ giọng korva cũ (D12).
- Tập 3 và tập 4 đã dựng giọng korva rồi: phải dựng lại giọng bằng vieneu/thien_minh. Sau đó chạy lại `phatam check`, các stage `phat-am` và `lint`. Tập 3 đổi lời đọc nên qua lại Cổng 3 như bình thường. Vướng "pound" của tập 4 phải kiểm lại với giọng mới.
- VieNeu không có tham số `speed` (engine ném ValueError khi speed khác 1.0). Độ dài video điều chỉnh bằng `pause_ms`. Kiểm `make-episode.sh` và `episode build` khi dùng `--engine vieneu --voice <id>` với speed 1.0.
- Gói `vieneu` CHƯA cài trong `audio/.venv`: các mẫu được tạo ở một venv tạm, nay đã xoá. Cài qua extra đã ghim (`vieneu==3.8.3`) và kiểm không xung đột với korvatts. Nếu không cài được thì DEV báo lại. Kiểm mã giọng `thien_minh` có trong `VOICES['vieneu']` không; không có thì thêm vào.
- Đoạn outro (D38) dựng lại bằng giọng mới cho thống nhất.
- Mã giọng trong thư viện là "Thiện Minh" (tên hiển thị); `thien_minh` chỉ là tên file mẫu, không thêm bí danh.

## D41. Bản Facebook có đoạn kết riêng (người dùng chốt, 2026-11-17)
- Từ tập mới (tập 5 trở đi), mỗi video dài và mỗi phần Short xuất thêm một bản cho page Facebook "Chuyện Của Những Con Bit" (facebook.com/bitstory168).
- Đoạn kết Facebook giữ bố cục, nền, ảnh kênh, độ dài 6 giây và giọng VieNeu Thiện Minh của đoạn kết YouTube (D38, D40). Lời: "Nếu thấy hay, bấm thích, theo dõi trang và chia sẻ cho bạn bè nhé." Ba nút kiểu Facebook: "Thích" (ngón cái), "Theo dõi" (người + dấu cộng, bấm thành "Đang theo dõi"), "Chia sẻ" (mũi tên), màu xanh Facebook #0866FF. Dưới tên kênh ghi facebook.com/bitstory168. Không có "Đăng ký" hay chuông.
- Mọi phần Short bản Facebook đều gắn đoạn kết (mỗi bài trên page đứng riêng), khác YouTube chỉ phần 3 và 6.
- Cách làm: không render lại tập. Lấy MP4 YouTube, bỏ đoạn kết YouTube ở cuối, nối đoạn kết Facebook bằng FFmpeg (chép luồng hình, nén lại tiếng AAC). Lệnh `python -m aivideo.facebook export <slug> --all`, kết quả ở `out/facebook/<slug>/`.
- Bản YouTube không đổi: `Outro.tsx`, `outro.json` và khoá cache `out/outro/` giữ nguyên; đoạn kết Facebook là composition riêng `OutroFacebookWide/Vertical`, cache riêng `out/outro-facebook/`.
- Đội chỉ xuất file và tải lên Drive; người dùng tự đăng lên Facebook.

## D42. Bản TikTok có thẻ kết chữ "Xem full tại diu tiu bé @bitstory168" (người dùng chốt, 2026-11-17)
- Từ tập 5 trở đi, mỗi phần TikTok (phần 1–3) kết thúc bằng một thẻ chỉ có chữ, ghi đúng nguyên văn: `Xem full tại diu tiu bé @bitstory168`. Tập 1–4 đã đăng TikTok thì không làm lại.
- Tên nền tảng viết lái thành "diu tiu bé" là CỐ Ý: người dùng muốn tránh TikTok kiểm duyệt, bắt duyệt lại hay hạn chế phân phối video khi thấy tên một nền tảng khác. Vì vậy:
  - Không viết tên nền tảng đó bằng chữ thật ở bất cứ đâu trong file TikTok (hình, phụ đề, metadata). Lệnh gắn thẻ xoá toàn bộ metadata của nguồn.
  - Không logo, không biểu tượng nút phát, không màu đỏ đặc trưng của nền tảng đó.
  - Không đọc thành tiếng: thẻ không có giọng, không thêm track tiếng mới; tiếng thẻ chỉ là nhạc nền nhẹ của tập (mức `gainDb` như dưới lời đọc, mờ vào/mờ ra), tập không có nhạc thì im.
- Thẻ dài 2,5 giây (75 frame), nền và phông của kênh (chủ đề `mau-a` như đoạn kết D38), chữ trong hộp an toàn x 48–888, y 220–1400 (chừa dải nút bên phải và dải chữ/nhạc TikTok phủ ở đáy).
- Cách làm: thẻ riêng nối vào cuối, không phủ chữ lên vài giây cuối của phần. Lý do: nối thì hình phần chính chép nguyên luồng (không nén lại), thẻ render một lần rồi cache ở `out/tiktok-endcard/`, giống D41; phủ chữ thì phải nén lại toàn bộ hình mỗi phần và chữ đè lên cảnh/phụ đề cuối.
- Lệnh: `python -m aivideo.shorts export <slug>` tự gắn cho tập số ≥ 5 (số theo `episodes/index.json`); `--no-endcard` để bỏ. Gắn vào một MP4 bất kỳ: `python -m aivideo.tiktok_endcard append <slug> --src <mp4> --out <mp4>`.
- Thay đổi so với D35, D38: D35 (caption) vẫn giữ nguyên: caption không ghi URL, không nhắc tên nền tảng kia, phần cuối vẫn "link ở bio". D42 chỉ thêm lời nhắc trong HÌNH ở cuối video, và cũng viết lái nên không trái tinh thần D35. Câu "Bản TikTok tạm thời KHÔNG gắn" của D38 vẫn đúng với đoạn kết thích/đăng ký; bản TikTok gắn thẻ D42 thay vào chỗ đó.
- Short YouTube, video dài và bản Facebook (D41) không đổi.
