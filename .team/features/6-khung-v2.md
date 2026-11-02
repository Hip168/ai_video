# Đề mục 6: Khung Remotion v2

Nhánh `6-khung-v2`. Hợp đồng: `0b-hop-dong-timeline-v2.md`. Luật chung: D15, D16.

## Kiến trúc đã chọn
- Mới: `video/src/timeline2.ts`, `video/src/Episode.tsx`, `video/src/lib/{theme,subtitle,hooks,fonts,registry}.ts(x)`, `video/src/lib/scenes/{cold-open,chapter-title,recap-outro}.tsx`, `video/src/lib/specs/*.ts`, `video/src/episodes/registry.ts`, `video/scripts/lint-episode.ts`.
- Sửa chỉ thêm: `Root.tsx` (Composition `Episode`, timeline qua inputProps), `package.json` (script `lint:episode`, devDependency `tsx`), `tsconfig.json`, `.gitignore`.
- Mỗi loại cảnh gồm `lib/scenes/<type>.tsx` và `lib/specs/<type>.ts`: `propsSpec`, ví dụ, số beat tối thiểu, danh sách cue.
- `registry.ts` có sẵn đủ 18 id, id chưa làm trỏ tới cảnh giữ chỗ, để đề mục 7, 8 chỉ đổi đúng dòng của mình mà không xung đột.
- `custom:<tên>` tra trong `video/src/episodes/registry.ts`.
- Theme: bảng màu, hoạ tiết nền, bộ biểu tượng. Có ít nhất 4 theme.
- Luật cho mọi cảnh: hình chính trong `y < 830` (D10); chuyển động là hàm thuần của frame; cấm `filter: blur`, `feGaussianBlur`, `backdrop-filter`; không chuỗi URL.
- `tsx` là phụ thuộc duy nhất được thêm. Font đơn cách OFL (JetBrains Mono) ở `video/public/fonts/` kèm giấy phép, nạp bằng `lib/fonts.ts`, không sửa `font.ts`.

## Lint chống lặp (`npm run lint:episode -- <slug>`)
- Ít nhất 10 loại cảnh khác nhau. Không quá 9 cảnh cùng loại (tính theo tập 48 cảnh; tập khác co giãn 18,75%). Không 3 cảnh liền nhau cùng loại.
- Ít nhất 3 cảnh `custom`.
- Cảnh đầu `cold-open`, cảnh cuối `recap-outro`.
- `theme` khác tập liền trước trong `episodes/index.json`.
- Chuỗi loại cảnh giống mọi tập cũ dưới 60% (Levenshtein chuẩn hoá).
- Tổng thời lượng ít nhất 9 phút; cảnh dài nhất 20 giây.
- Mọi `props` qua `propsSpec`.

## Task
- [6-1] Validator v2 TypeScript và composition `Episode`.
- [6-2] Ba cảnh cấu trúc, theme, phụ đề, `custom:`.
- [6-3] Lint chống lặp.
- [6-4] Font đơn cách.

## Xong khi
- `npx remotion compositions` liệt kê `Episode`, `Video`, `KitDemo`. `tsc` sạch.
- Mẫu v2 qua validator; mỗi luật có test mẫu sai do TESTER-6 tự viết. Việc khớp với validator Python kiểm ở đề mục 10, bằng timeline do Python sinh ra đi qua validator TypeScript.
- Mỗi cảnh cấu trúc có still không đơn sắc, hình chính trong `y < 830`.
- Lint bắt đúng từng lỗi mẫu. Grep URL và filter trong `video/src/lib` trả 0.
- Test khoá xanh. Test mới chạy được trên CI 2 lõi.
