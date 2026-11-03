/** Hệ số bề rộng ký tự trung bình (em) của Be Vietnam Pro đậm, dùng cho mọi chỗ ngắt dòng. */
export const CHAR_EM = 0.62;

/** Số ký tự tối đa mỗi dòng để chữ cỡ `fontSize` px vừa bề rộng `widthPx`. Tối thiểu 1. */
export function maxCharsPerLine(widthPx: number, fontSize: number): number {
  return Math.max(1, Math.floor(widthPx / (fontSize * CHAR_EM)));
}

/** Ngắt dòng theo số ký tự tối đa mỗi dòng (ngắt ở khoảng trắng). Hàm thuần. */
export function wrapLines(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/).filter((w) => w !== "");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur === "" ? w : `${cur} ${w}`;
    if ([...next].length > maxChars && cur !== "") {
      lines.push(cur);
      cur = w;
    } else cur = next;
  }
  if (cur !== "") lines.push(cur);
  return lines;
}
