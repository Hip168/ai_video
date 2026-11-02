# Font

Be Vietnam Pro, weight 400 và 700, ba tập con (latin, latin-ext, vietnamese) dạng woff2.

- Nguồn: gói npm `@fontsource/be-vietnam-pro` 5.3.0 (`npm pack`, tải 2026-10-31), bản dựng từ https://github.com/bettergui/BeVietnamPro
- Giấy phép: SIL Open Font License 1.1 (OFL-1.1). Toàn văn: `OFL.txt` (file LICENSE trong gói npm).
- Phạm vi chữ (unicode-range) của từng tập con nằm trong `src/font.ts`, lấy từ CSS của gói.
- Dùng cục bộ qua `staticFile`, không gọi mạng khi render.

## JetBrains Mono (font đơn cách, cho cảnh code, terminal, bits)

JetBrains Mono, weight 400 và 700, ba tập con (latin, latin-ext, vietnamese) dạng woff2, tên `jetbrains-mono-<tập-con>-<weight>-normal.woff2`.

- Nguồn: gói npm `@fontsource/jetbrains-mono` 5.3.0 (`npm pack`, tải 2026-11-03), bản dựng từ https://github.com/JetBrains/JetBrainsMono
- Giấy phép: SIL Open Font License 1.1 (OFL-1.1). Toàn văn: `OFL-JetBrainsMono.txt` (file LICENSE trong gói npm).
- Phạm vi chữ (unicode-range) giống Be Vietnam Pro, nằm trong `src/lib/fonts.ts`.
- Nạp bằng `loadMonoFonts()` trong `src/lib/fonts.ts`, cục bộ qua `staticFile`, không gọi mạng khi render.
