# Đề mục 14: giao diện công khai (BA duyệt, D32)

Đường dẫn tính từ gốc repo. `<out>` = `out/episodes/<slug>`, `<sout>` = `<out>/shorts/<n>` (n = 1, 2). Nền: D28, D32, `14-shorts.md`, `10-render-dai-giao-dien.md`.

## 1. Vùng an toàn (nguồn chính thức)
Google Ads Help "About video ad specs" (13547298), mục *Universal safe zones for video ads on YouTube*, hình dọc 1080×1920: lề trên 288, dưới 672, trái 48, phải 192 px. Nguồn: https://support.google.com/google-ads/answer/13547298 (ảnh có số đo: `storage.googleapis.com/support-kms-prod/jbb4hOyc2nGdunbKddqpFAEQpHOQvy582jIR`; mẫu PNG: `services.google.com/fh/files/misc/youtubesafezoneoverlay_vertical_final.png`). Vùng an toàn: `x 48–888`, `y 288–1248` (840×960). BA chốt nguồn này (D32).

## 2. Composition `Short` (`video/src/Short.tsx`, đăng ký trong `Root.tsx`)
1080×1920, 30 fps. Props `{ timeline: Timeline2 | null; clip: { from: string; to: string; hook: string } | null; muted?: boolean }`. `calculateMetadata`: `validateTimeline2`, `durationInFrames = end(to) − start(from)` (frame của beat). Bên trong: `<Sequence from={−start(from)}>` chạy lại đúng các cảnh của tập (cảnh thấy frame như trong tập dài, chuyển động giữ nguyên), fade 8 frame ở đầu và cuối Short. `Episode`, `Video`, `KitDemo` không đổi.

Bố cục (D32, phương án A, hộp cảnh nằm trọn vùng an toàn):
| Vùng | Toạ độ | Nội dung |
|---|---|---|
| hook | `x 48–888`, `y 150–280` | `clip.hook`, đậm, 1–2 dòng |
| cảnh | hộp vuông `x 48–888`, `y 288–1128` (840×840) | cảnh ở layout `square` |
| phụ đề | `x 48–888`, `y 1128–1248` | chữ 48 px, tối đa 2 dòng; beat dài tách theo thời gian, dùng lại `splitSubtitleDoc` của nhánh 4 |
| còn lại | | nền theme, hoạ tiết nền được tràn |

D32 thay "hộp 1080" của D28 bằng hộp 840. Cảnh ở layout `square` vẽ theo hệ toạ độ 840×840, 1 đơn vị = 1 px đầu ra.

## 3. Biến thể `square` cho 18 loại cảnh (cách chung)
- Mọi cảnh đã vẽ qua `Stage` (`lib/theme.tsx`, SVG 1920×1080, nội dung trong `y < 830`). Thêm `LayoutContext` + `useBox(): { w, h, layout: "wide" | "square" }` trong `lib/theme.tsx`. `Short` bọc cảnh bằng `<SceneBox layout="square">`; `Episode` không bọc, mặc định `wide` = 1920×830 như cũ.
- `Stage`, `Pattern` lấy `viewBox` từ `useBox()`. Từng file `lib/scenes/*.tsx` thay hằng số khung (1920, 960, 830, độ rộng chữ) bằng giá trị từ `useBox()`; hàm bố cục (`layout-flow`, `layout-tree`, `recap-layout`, `text.ts`) nhận vùng vẽ làm tham số. Không có component riêng cho từng loại, không thu nhỏ khung ngang.
- Ràng buộc: ở `wide` mọi cảnh ra ảnh y hệt trước (test đã khoá của 6, 7, 8 phải xanh nguyên).

## 4. Ngưỡng cỡ chữ khung dọc
Số đo có thật trong repo: `FLOW_MIN_NODE_FONT` 24 px, `FLOW_MIN_LABEL_FONT` 20 px (DEV-12 đo, khung 1080p ngang). Trên điện thoại 19,5:9, một điểm ảnh Short nhỏ hơn điểm ảnh video ngang xem toàn màn hình 1,22 lần (`(19,5/9)·(1080/1920)`). Ngưỡng (D32), tính theo px đầu ra: chữ thường và chữ nút ≥ 30 px, nhãn cạnh ≥ 25 px, phụ đề 48 px. Lint `npm run lint:episode -- <slug> --short <n>` render một still cuối mỗi cảnh trong đoạn; các component chữ (`T`, `TextBlock`, nhãn `flow`) ở layout `square` ném lỗi nêu cảnh và cỡ chữ khi dưới ngưỡng.

## 5. `episodes/<slug>/shorts.json`
```json
{ "version": 1, "shorts": [
  { "id": "short-1", "from": "b012", "to": "b031", "title": "… #Shorts", "hook": "Vì sao chỉ có 0 và 1?" },
  { "id": "short-2", "from": "b120", "to": "b141", "title": "… #Shorts", "hook": "…" } ] }
```
Kiểm (Python `aivideo.shorts validate` và TS cùng luật): đúng 2 mục; `from`, `to` là id beat có trong `script.json`, `from` là beat đầu của một cảnh, `to` không đứng trước `from`; độ dài theo timeline < 60 s; `hook` ≤ 40 ký tự; `title` ≤ 100 ký tự. Lời đọc chỉ lấy từ beat có sẵn (đã qua Cổng 2); `hook` là chữ trên màn hình, không đọc. Không viết lời đọc mới (D32).

## 6. Render, ghép, kiểm
- `render-episode.ts` đã có `--layout main|shift` (ranh giới đoạn, `framecheck` dùng). Đặt `--layout short` sẽ trùng nghĩa, nên dùng cờ mới `--short <n>` (D32): composition `Short`, manifest và `segments/`, `segments-shift/` riêng trong `<sout>`; `--layout main|shift` vẫn dùng như cũ bên trong.
- `./make-episode.sh <slug> --short <n>`: chạy sau tập dài. Bước: `tools`, `lint` (§4), `mix` (cắt `mix.wav` theo khung của đoạn, chuẩn hoá lại -16 LUFS bằng hàm của `mix.py`; `assemble clean` đã xoá `mix.wav` thì dựng lại từ `narration.wav`), `render`, `assemble`, `check`. Ra `<out>/<slug>-short-<n>.mp4` và `<sout>/video.srt` (beat của đoạn, thời gian tính lại từ 0). Lệnh không `--short` giữ nguyên 7 bước.
- `assemble concat|mux|verify|clean` và `framecheck verify` thêm `--short <n>`: verify đòi 1080×1920, < 60 s, cùng ngưỡng loudness, đen, mất hình; `framecheck scan/compare` quét vùng hộp cảnh của Short thay cho `y < 830`. Không có cờ thì như cũ.

## 7. Đăng (`upload.py`)
`python -m aivideo.upload <slug> --short <n>`: chạy sau khi tập dài đã có `videoId` trong sổ (`recorded_video_id`), thiếu thì lỗi. Tiêu đề lấy `title`, thêm ` #Shorts` nếu chưa có. Mô tả = câu dẫn + `Xem bản đầy đủ: <video_url(id dài)>` + `#Shorts` + dòng "Giọng đọc trong video do AI tạo." Thẻ `aivideo:<slug>:short-<n>` để chạy lại không tải trùng. Khâu sổ riêng: `dang-short-<n>`, `dang-short-<n>-caption`, `dang-short-<n>-privacy`. Không đặt thumbnail. Quyền mặc định theo `publish.json` của tập; Short đầu không public khi `firstVideoApproved` chưa true (như video dài). `run-daily.sh` gọi 2 lần sau lệnh đăng video dài.
Link trong mô tả Short không bấm được (từ 2023); vẫn ghi dạng chữ, tiêu chí coi là đạt khi mô tả có link (D32). Nút "video liên quan" chỉ đặt trong Studio, ngoài phạm vi.
