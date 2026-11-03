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

// ---- Đo bề rộng thật (@remotion/layout-utils) ----
import { measureText } from "@remotion/layout-utils";
import { FONT_FAMILY } from "../font";

/** Lề tối thiểu (px) trong bảng nền và trong khung 1920. */
export const MIN_MARGIN = 40;

/** Cỡ chữ nhỏ nhất so với cỡ gốc trước khi cắt "…". */
export const MIN_FONT_SCALE = 0.7;

export type MeasureWidth = (text: string, fontSize: number) => number;

/** Đo bằng DOM khi có (đã nạp font); ngoài trình duyệt thì ước theo CHAR_EM. */
export const measureWidth: MeasureWidth = (text, fontSize) => {
  if (typeof document === "undefined") return [...text].length * fontSize * CHAR_EM;
  return measureText({ text, fontFamily: `${FONT_FAMILY}, sans-serif`, fontSize, fontWeight: 700 }).width;
};

export interface FitResult {
  lines: string[];
  fontSize: number;
  /** true nếu phải cắt bằng "…" (đã console.warn). */
  truncated: boolean;
}

export interface FitOptions {
  text: string;
  fontSize: number;
  /** Bề rộng khả dụng (px), đã trừ lề. */
  width: number;
  maxLines: number;
  minScale?: number;
  measure?: MeasureWidth;
}

function wrapMeasured(words: string[], size: number, width: number, measure: MeasureWidth) {
  const lines: string[] = [];
  let cur = "";
  let overflowWord = false;
  for (const w of words) {
    if (measure(w, size) > width) overflowWord = true;
    const next = cur === "" ? w : `${cur} ${w}`;
    if (cur !== "" && measure(next, size) > width) {
      lines.push(cur);
      cur = w;
    } else cur = next;
  }
  if (cur !== "") lines.push(cur);
  return { lines, overflowWord };
}

function ellipsize(line: string, size: number, width: number, measure: MeasureWidth): string {
  if (measure(line, size) <= width) return line;
  const chars = [...line];
  while (chars.length > 0 && measure(`${chars.join("").trimEnd()}…`, size) > width) chars.pop();
  return `${chars.join("").trimEnd()}…`;
}

/**
 * Ngắt dòng theo bề rộng đo được: tối đa `maxLines` dòng; không vừa thì giảm cỡ
 * từng bước 5% tới `minScale` × cỡ gốc; vẫn không vừa thì cắt có "…" và console.warn.
 */
export function fitText(o: FitOptions): FitResult {
  const measure = o.measure ?? measureWidth;
  const minScale = o.minScale ?? MIN_FONT_SCALE;
  const words = o.text.split(/\s+/).filter((w) => w !== "");
  const minSize = Math.floor(o.fontSize * minScale);
  let size = o.fontSize;
  for (;;) {
    const { lines, overflowWord } = wrapMeasured(words, size, o.width, measure);
    if (lines.length <= o.maxLines && !overflowWord) return { lines, fontSize: size, truncated: false };
    if (size <= minSize) {
      const kept = lines.slice(0, o.maxLines - 1);
      kept.push(lines.slice(o.maxLines - 1).join(" "));
      const out = kept.filter((l) => l !== "").map((l) => ellipsize(l, size, o.width, measure));
      console.warn(`text-fit: cắt chữ vì không vừa ${o.maxLines} dòng ở cỡ ${size}px: "${o.text}"`);
      return { lines: out, fontSize: size, truncated: true };
    }
    size = Math.max(minSize, Math.floor(size - o.fontSize * 0.05));
  }
}

/** Dạng gọi tiện cho test: fitBlock(text, { baseSize, width, maxLines, measure? }). */
export function fitBlock(
  text: string,
  o: { baseSize: number; width: number; maxLines: number; minScale?: number; measure?: MeasureWidth },
): FitResult {
  return fitText({ text, fontSize: o.baseSize, width: o.width, maxLines: o.maxLines, minScale: o.minScale, measure: o.measure });
}
