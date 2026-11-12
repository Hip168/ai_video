# Đề mục 14: giao diện công khai (BA duyệt, D32; sửa theo D33)

Đường dẫn tính từ gốc repo. `<out>` = `out/episodes/<slug>`, `<sout>` = `<out>/shorts/<n>` (n = số phần, 1..N). Nền: D28, D32, D33, `14-shorts.md`, `10-render-dai-giao-dien.md`.

## 1. Vùng an toàn (nguồn chính thức)
Google Ads Help "About video ad specs" (13547298), mục *Universal safe zones for video ads on YouTube*, hình dọc 1080×1920: lề trên 288, dưới 672, trái 48, phải 192 px. Nguồn: https://support.google.com/google-ads/answer/13547298 (ảnh có số đo: `storage.googleapis.com/support-kms-prod/jbb4hOyc2nGdunbKddqpFAEQpHOQvy582jIR`; mẫu PNG: `services.google.com/fh/files/misc/youtubesafezoneoverlay_vertical_final.png`). Vùng an toàn: `x 48–888`, `y 288–1248` (840×960). BA chốt nguồn này (D32).

## 2. Composition `Short` (`video/src/Short.tsx`, đăng ký trong `Root.tsx`)
1080×1920, 30 fps. Props `{ timeline: Timeline2 | null; clip: { from: string; to: string; hook: string; part: number; total: number } | null; muted?: boolean }`. `clipRange(timeline, clip)` (export trong `Short.tsx`): `start` = đầu cảnh chứa `from`, lùi qua các cảnh không có beat (vd `chapter-title`) đứng ngay trước; `end` = cuối cảnh chứa `to` (không tính). `calculateMetadata`: `validateTimeline2`, `durationInFrames = end − start`. Các phần liên tiếp nối nhau không hở; không bắt buộc phủ hết tập (tập 1: 6 phần theo chương, phủ cả tập). Bên trong: `<Sequence from={−start(from)}>` chạy lại đúng các cảnh của tập (cảnh thấy frame như trong tập dài, chuyển động giữ nguyên), fade 8 frame ở đầu và cuối Short. `Episode`, `Video`, `KitDemo` không đổi.

Bố cục (D32, phương án A, hộp cảnh nằm trọn vùng an toàn):
| Vùng | Toạ độ | Nội dung |
|---|---|---|
| hook | `x 48–888`, `y 150–280` | dòng 1 `Phần k/N` (36 px, `data-testid="short-part"`), dòng 2 `clip.hook` (48 px, 1 dòng, `data-testid="short-hook"`) |
| cảnh | hộp vuông `x 48–888`, `y 288–1128` (840×840) | cảnh ở layout `square` |
| phụ đề | `x 48–888`, `y 1128–1248` | chữ 48 px, tối đa 2 dòng; beat dài tách theo thời gian, dùng lại `splitSubtitleDoc` của nhánh 4 |
| còn lại | | nền theme, hoạ tiết nền được tràn |

D32 thay "hộp 1080" của D28 bằng hộp 840. Cảnh ở layout `square` vẽ theo hệ toạ độ 840×840, 1 đơn vị = 1 px đầu ra.

## 3. Biến thể `square` cho 18 loại cảnh (cách chung)
- Mọi cảnh đã vẽ qua `Stage` (`lib/theme.tsx`, SVG 1920×1080, nội dung trong `y < 830`). Thêm `LayoutContext` + `useBox(): { w, h, layout: "wide" | "square" }` trong `lib/theme.tsx`. `Short` bọc cảnh bằng `<SceneBox layout="square">`; `Episode` không bọc, mặc định `wide` = 1920×830 như cũ.
- `Stage`, `Pattern` lấy `viewBox` từ `useBox()`. Từng file `lib/scenes/*.tsx` thay hằng số khung (1920, 960, 830, độ rộng chữ) bằng giá trị từ `useBox()`; hàm bố cục (`layout-flow`, `layout-tree`, `recap-layout`, `text.ts`) nhận vùng vẽ làm tham số. Không có component riêng cho từng loại, không thu nhỏ khung ngang.
- Ràng buộc: ở `wide` mọi cảnh ra ảnh y hệt trước (test đã khoá của 6, 7, 8 phải xanh nguyên).
- Cảnh riêng của tập (`custom:<tên>`) được dùng trong Short nếu tự đọc `useBox()` và vẽ vừa hộp vuông như cảnh chung; khi đó thêm `<tên>` vào `export const CUSTOM_SQUARE: ReadonlySet<string>` trong `video/src/episodes/registry.ts`. Đề mục này chuyển cả 5 cảnh của `vi-sao-may-tinh-dung-nhi-phan` (`mach-den`, `bite-byte`, `dien-ap`, `bon-muoi-bit`, `bo-dem-vong`; D33 sửa đổi 2); ở `wide` ra ảnh y hệt trước. Cảnh custom không có trong `CUSTOM_SQUARE` mà nằm trong một phần: `validateShorts` và lint `--short` báo lỗi.

## 4. Ngưỡng cỡ chữ khung dọc
Số đo có thật trong repo: `FLOW_MIN_NODE_FONT` 24 px, `FLOW_MIN_LABEL_FONT` 20 px (DEV-12 đo, khung 1080p ngang). Trên điện thoại 19,5:9, một điểm ảnh Short nhỏ hơn điểm ảnh video ngang xem toàn màn hình 1,22 lần (`(19,5/9)·(1080/1920)`). Ngưỡng (D32), tính theo px đầu ra: chữ thường và chữ nút ≥ 30 px, nhãn cạnh ≥ 25 px, phụ đề 48 px. Lint `npm run lint:episode -- <slug> --short <n>` render một still cuối mỗi cảnh trong đoạn; các component chữ (`T`, `TextBlock`, nhãn `flow`) ở layout `square` ném lỗi nêu cảnh và cỡ chữ khi dưới ngưỡng.

## 5. `episodes/<slug>/shorts.json` (D33)
```json
{ "version": 1, "shorts": [
  { "part": 1, "total": 6, "from": "b001", "to": "b014", "title": "Vì sao máy tính chỉ dùng 0 và 1?", "hook": "Vì sao chỉ có 0 và 1?" },
  { "part": 2, "total": 6, "from": "b015", "to": "b030", "title": "…", "hook": "…" } ] }
```
Kiểm (`python -m aivideo.shorts validate <slug>` và `validateShorts` trong `video/src/shorts.ts`, cùng luật): 1 ≤ N ≤ 8 mục; mục thứ i có `part` = i, `total` = N; `from`, `to` là id beat có trong timeline, `from` là beat đầu của cảnh, `to` là beat cuối của cảnh (cắt ở ranh giới cảnh), `to` không đứng trước `from`; các phần theo thứ tự, không chồng nhau; độ dài `clipRange` ≤ 180 s (5400 frame; trên 150 s chỉ cảnh báo); mọi cảnh `custom:<tên>` trong đoạn phải có tên trong `CUSTOM_SQUARE` (chỉ TS kiểm, Python không đọc được mã cảnh); `hook` 1–40 ký tự; `title` không rỗng và `title + " (Phần k/N) #Shorts"` ≤ 100 ký tự. Lời đọc chỉ lấy từ beat có sẵn (đã qua Cổng 2); `hook` là chữ trên màn hình, không đọc. Không viết lời đọc mới (D32).

## 6. Render, ghép, kiểm
- `render-episode.ts` đã có `--layout main|shift` (ranh giới đoạn, `framecheck` dùng). Đặt `--layout short` sẽ trùng nghĩa, nên dùng cờ mới `--short <n>` (D32): composition `Short`, manifest và `segments/`, `segments-shift/` riêng trong `<sout>`; `--layout main|shift` vẫn dùng như cũ bên trong.
- `./make-episode.sh <slug> --short <n>`: chạy sau tập dài. Bước: `tools`, `lint` (§4), `mix` (cắt `mix.wav` theo khung của đoạn, chuẩn hoá lại -16 LUFS bằng hàm của `mix.py`; `assemble clean` đã xoá `mix.wav` thì dựng lại từ `narration.wav`), `render`, `assemble`, `check`. Ra `<out>/<slug>-short-<n>.mp4` và `<sout>/video.srt` (beat của đoạn, thời gian tính lại từ 0). Lệnh không `--short` giữ nguyên 7 bước.
- `assemble concat|mux|verify|clean` và `framecheck verify` thêm `--short <n>`: verify đòi 1080×1920, < 60 s, cùng ngưỡng loudness, đen, mất hình; `framecheck scan/compare` quét vùng hộp cảnh của Short thay cho `y < 830`. Không có cờ thì như cũ.

## 7. Đăng (`upload.py`) và xuất TikTok
`python -m aivideo.upload <slug> --short <n>`: chạy sau khi tập dài đã có `videoId` trong sổ (`recorded_video_id`), thiếu thì lỗi. Tiêu đề = `title + " (Phần k/N) #Shorts"`. Mô tả = `hook` + `Xem bản đầy đủ: <video_url(id dài)>` + (chỉ phần cuối) `Xem tiếp phần còn lại trong bản đầy đủ ở link trên.` + `#Shorts` + "Giọng đọc trong video do AI tạo." Thẻ `aivideo:<slug>:short-<n>` để chạy lại không tải trùng. Khâu sổ riêng: `dang-short-<n>`, `dang-short-<n>-caption`, `dang-short-<n>-privacy`. Không đặt thumbnail. Phụ đề: `<sout>/video.srt`. Quyền mặc định theo `publish.json` của tập; không public khi `firstVideoApproved` chưa true. `run-daily.sh` gọi lần lượt mọi phần sau lệnh đăng video dài.
Link trong mô tả Short không bấm được; vẫn ghi dạng chữ, đạt khi mô tả có link (D32, D33). Người dùng tự đặt "Video liên quan" trong Studio.

Xuất cho TikTok (D33, không API): `python -m aivideo.shorts export <slug> [--parts a-b]` (mặc định `1-3`; số phần lấy theo `shorts.json`) ghi `<out>/tiktok/`: `phan-<k>.mp4` (bản sao của `<slug>-short-<k>.mp4`), `phan-<k>.txt` (caption: tiêu đề kèm "(Phần k/N)", `hook`, link video dài nếu sổ đã có `videoId`, ở phần cuối của dải xuất: dòng mời lên YouTube xem các phần còn lại và bản đầy đủ, "#tinhoc #khoahocmaytinh", dòng giọng AI) và `manifest.json` `{ "slug", "parts": [{ "part", "mp4", "caption" }] }`. Thiếu MP4 của phần nào thì lỗi, mã 1.
