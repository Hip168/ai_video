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
Ducking `sidechaincompress`, loudnorm hai lượt, giữ chuẩn D5. Render hình `muted`, đổi nhạc không phải render lại.
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
Quyền đã có: sau khi người dùng duyệt video đầu, publisher được đăng Công khai không hỏi, ở đúng kênh đã ghi trong `.team/kenh.md`.

## D22. Sổ fact (BA chốt, 2026-11-03)
`episodes/<slug>/claims.json` là sổ fact. Dùng JSON, không thêm phụ thuộc YAML. Mỗi con số, tên, năm trong lời đọc phải trỏ về một claim có nguồn.
