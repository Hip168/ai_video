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
