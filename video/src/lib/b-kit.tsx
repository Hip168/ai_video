import React, { useMemo } from "react";
import { beatStartIn, clamp01, ease } from "./hooks";
import { fitText } from "./text";
import { assertShortText, useBox } from "./theme";
import { MONO_FAMILY } from "./fonts";
import type { Scene2 } from "../timeline2";

// Tiện ích dùng chung cho 9 cảnh nhóm B (đề mục 8). Mọi hàm là hàm thuần của frame.

/** Mép dưới của hình chính (D10). */
export const SAFE_BOTTOM = 830;

/** Frame (tương đối cảnh) mà mục i trong n mục bắt đầu hiện: theo beat thứ i (chỉ số vượt thì lấy beat cuối); cảnh không beat thì rải đều trong 70% thời lượng. */
export function itemStart(scene: Scene2, i: number, n: number): number {
  if (scene.beats.length > 0) return beatStartIn(scene, i);
  return Math.round((i * scene.durationFrames * 0.7) / Math.max(1, n));
}

/** Tiến độ 0..1 (làm mượt) của mục i, dài `dur` frame kể từ lúc bắt đầu. */
export function itemProgress(frame: number, scene: Scene2, i: number, n: number, dur = 14): number {
  return ease((frame - itemStart(scene, i, n)) / dur);
}

/** Số mục (trong n) đã bắt đầu tại `frame`. */
export function startedCount(frame: number, scene: Scene2, n: number): number {
  let c = 0;
  for (let i = 0; i < n; i++) if (frame >= itemStart(scene, i, n)) c++;
  return c;
}

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** Khối chữ qua fitText: ngắt dòng, giảm cỡ, cắt "…" nếu cần. `y` là đường cơ sở dòng đầu. */
export const TextBlock: React.FC<{
  text: string;
  x: number;
  y: number;
  width: number;
  fontSize: number;
  maxLines?: number;
  fill: string;
  anchor?: "start" | "middle" | "end";
  weight?: 400 | 700;
  opacity?: number;
  lineHeight?: number;
  /** Ngưỡng cỡ chữ ở layout `square` (mặc định ngưỡng chữ thường). */
  minPx?: number;
}> = ({ text, x, y, width, fontSize, maxLines = 1, fill, anchor = "middle", weight = 700, opacity = 1, lineHeight = 1.25, minPx }) => {
  const fit = useMemo(() => fitText({ text, fontSize, width, maxLines }), [text, fontSize, width, maxLines]);
  assertShortText(useBox(), fit.fontSize, text, minPx);
  return (
    <g opacity={opacity}>
      {fit.lines.map((l, i) => (
        <text key={i} x={x} y={y + i * fit.fontSize * lineHeight} fontSize={fit.fontSize} fontWeight={weight} fill={fill} textAnchor={anchor}>
          {l}
        </text>
      ))}
    </g>
  );
};

/** Cỡ chữ đơn cách vừa dòng dài nhất (mỗi ký tự rộng 0,6 em). */
export const MONO_EM = 0.6;
export function fitMono(lines: string[], width: number, maxSize: number, minSize = 14): { size: number; charW: number; cols: number } {
  const longest = Math.max(1, ...lines.map((l) => [...l].length));
  const size = Math.max(minSize, Math.min(maxSize, Math.floor(width / (longest * MONO_EM))));
  const charW = size * MONO_EM;
  return { size, charW, cols: Math.max(1, Math.floor(width / charW)) };
}

/** Cắt dòng quá `cols` ký tự bằng "…". */
export function clipLine(line: string, cols: number): string {
  const ch = [...line];
  return ch.length <= cols ? line : `${ch.slice(0, Math.max(0, cols - 1)).join("")}…`;
}

/** Chữ mã: tắt ligature để "==", "===", "!=" hiện đúng từng ký tự. */
export const monoStyle: React.CSSProperties = {
  fontFamily: `${MONO_FAMILY}, monospace`,
  fontVariantLigatures: "none",
  fontFeatureSettings: '"liga" 0, "calt" 0',
};

/** Điểm tại tỉ lệ u (0..1) dọc đường gấp khúc. */
export function pointAlong(pts: { x: number; y: number }[], u: number): { x: number; y: number } {
  if (pts.length === 1) return pts[0];
  const seg: number[] = [];
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    const d = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    seg.push(d);
    total += d;
  }
  let want = clamp01(u) * total;
  for (let i = 0; i < seg.length; i++) {
    if (want <= seg[i] || i === seg.length - 1) {
      const t = seg[i] === 0 ? 0 : Math.min(1, want / seg[i]);
      return { x: lerp(pts[i].x, pts[i + 1].x, t), y: lerp(pts[i].y, pts[i + 1].y, t) };
    }
    want -= seg[i];
  }
  return pts[pts.length - 1];
}
