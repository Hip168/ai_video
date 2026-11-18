import React from "react";
import { beatStartIn, clamp01, ease, useTheme } from "../../lib/hooks";
import { monoStyle, TextBlock } from "../../lib/b-kit";
import { useBox } from "../../lib/theme";
import type { Scene2 } from "../../timeline2";

// Tiện ích chung cho cảnh riêng của tập "vi-sao-chu-viet-bi-loi-font". Mọi hàm là hàm thuần của frame.
// Bố cục tính theo khung (W, H) của `useBox()`: `wide` 1920x830, `square` 840x840 (Short).

/** Frame (tương đối cảnh) bắt đầu beat i; chỉ số vượt thì lấy beat cuối cộng thêm 12 frame mỗi bậc. */
export function at(scene: Scene2, i: number): number {
  if (scene.beats.length === 0) return i * 40;
  return beatStartIn(scene, Math.min(i, scene.beats.length - 1)) + (i >= scene.beats.length ? (i - scene.beats.length + 1) * 12 : 0);
}

/** Tiến độ 0..1 (làm mượt) từ frame `from`, dài `len` frame. */
export const p = (frame: number, from: number, len = 14): number => ease((frame - from) / len);

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export { clamp01, ease };

export function useGeom(): { W: number; H: number; sq: boolean } {
  const b = useBox();
  return { W: b.w, H: b.h, sq: b.layout === "square" };
}

export function modeOf(props: Record<string, unknown>, def: string): string {
  return typeof props.mode === "string" && props.mode !== "" ? props.mode : def;
}

/** Màu trộn: dùng độ mờ thay vì màu mới (không blur). */
export const FONT_STACK_MONO = monoStyle;

/** Một ô nhớ (byte) hiện chữ đơn cách ở giữa. `s` là cỡ chữ. */
export const Cell: React.FC<{
  x: number;
  y: number;
  w: number;
  h: number;
  text: string;
  s: number;
  fill: string;
  stroke: string;
  color: string;
  sw?: number;
  opacity?: number;
  dashed?: boolean;
  rx?: number;
}> = ({ x, y, w, h, text, s, fill, stroke, color, sw = 4, opacity = 1, dashed = false, rx = 12 }) => (
  <g opacity={opacity}>
    <rect x={x} y={y} width={w} height={h} rx={rx} fill={fill} stroke={stroke} strokeWidth={sw} strokeDasharray={dashed ? "10 8" : undefined} />
    <text x={x + w / 2} y={y + h / 2 + s * 0.36} fontSize={s} fontWeight={700} fill={color} textAnchor="middle" style={monoStyle}>
      {text}
    </text>
  </g>
);

/** Dòng chú thích phía dưới cảnh (tối đa 2 dòng). */
export const Caption: React.FC<{ text: string; fill: string; opacity?: number; y?: number; maxLines?: number }> = ({ text, fill, opacity = 1, y, maxLines = 2 }) => {
  const { W, sq } = useGeom();
  return (
    <TextBlock text={text} x={W / 2} y={y ?? (sq ? 750 : 765)} width={W - 80} fontSize={sq ? 38 : 52} maxLines={maxLines} fill={fill} opacity={opacity} />
  );
};

/**
 * Tay giơ ngón cái (biểu tượng 👍), vẽ bằng SVG, không dựa vào phông. Tâm (x, y), cỡ `s` (chiều cao khoảng s).
 */
export const ThumbsUp: React.FC<{ x: number; y: number; s: number; opacity?: number }> = ({ x, y, s, opacity = 1 }) => {
  const k = s / 100;
  return (
    <g transform={`translate(${x - 50 * k} ${y - 50 * k}) scale(${k})`} opacity={opacity}>
      {/* cổ tay áo */}
      <rect x={4} y={44} width={20} height={48} rx={5} fill="#3b6fd8" stroke="#1d2b52" strokeWidth={4} />
      {/* bàn tay nắm */}
      <path d="M28 46 L44 46 L58 14 Q61 6 69 8 Q78 11 75 22 L70 40 L88 40 Q98 41 97 51 Q97 54 95 56 Q99 60 96 66 Q94 69 92 70 Q95 75 91 80 Q89 83 85 84 Q86 90 78 91 L40 91 Q28 91 28 80 Z" fill="#ffcc4d" stroke="#1d2b52" strokeWidth={4} strokeLinejoin="round" />
      {/* nếp ngón */}
      <path d="M62 56 H92 M60 68 H90 M58 79 H84" fill="none" stroke="#1d2b52" strokeWidth={3} strokeLinecap="round" opacity={0.55} />
    </g>
  );
};

/** Người đơn giản (đầu, vai) cầm một cuốn sách ở trước ngực. Tâm đáy (x, y), cỡ s = chiều cao. */
export const Person: React.FC<{ x: number; y: number; s: number; fill: string; line: string; book: string; bookLine: string }> = ({ x, y, s, fill, line, book, bookLine }) => (
  <g transform={`translate(${x} ${y})`}>
    <path d={`M${-s * 0.42} 0 Q${-s * 0.42} ${-s * 0.5} 0 ${-s * 0.52} Q${s * 0.42} ${-s * 0.5} ${s * 0.42} 0 Z`} fill={fill} stroke={line} strokeWidth={4} />
    <circle cx={0} cy={-s * 0.74} r={s * 0.2} fill={fill} stroke={line} strokeWidth={4} />
    <rect x={-s * 0.22} y={-s * 0.4} width={s * 0.44} height={s * 0.3} rx={6} fill={book} stroke={bookLine} strokeWidth={4} />
    <line x1={0} y1={-s * 0.4} x2={0} y2={-s * 0.1} stroke={bookLine} strokeWidth={3} />
  </g>
);

/** Nút nhỏ có chữ (chip). Rộng theo `w`, chữ qua TextBlock nên không tràn. */
export const Chip: React.FC<{ x: number; y: number; w: number; h: number; text: string; s: number; fill: string; stroke: string; color: string; opacity?: number; sw?: number }> = ({
  x,
  y,
  w,
  h,
  text,
  s,
  fill,
  stroke,
  color,
  opacity = 1,
  sw = 4,
}) => (
  <g opacity={opacity}>
    <rect x={x} y={y} width={w} height={h} rx={h / 2.4} fill={fill} stroke={stroke} strokeWidth={sw} />
    <TextBlock text={text} x={x + w / 2} y={y + h / 2 + s * 0.36} width={w - 24} fontSize={s} fill={color} />
  </g>
);

/** Hook chung lấy màu theme (viết gọn). */
export function useColors() {
  const t = useTheme();
  return t;
}

/** Mũi tên thẳng từ (x1,y1) tới (x2,y2), đầu tam giác. */
export const Arrow: React.FC<{ x1: number; y1: number; x2: number; y2: number; color: string; w?: number; head?: number; opacity?: number }> = ({
  x1,
  y1,
  x2,
  y2,
  color,
  w = 6,
  head = 20,
  opacity = 1,
}) => {
  const ang = Math.atan2(y2 - y1, x2 - x1);
  const bx = x2 - Math.cos(ang) * head * 0.8;
  const by = y2 - Math.sin(ang) * head * 0.8;
  return (
    <g opacity={opacity}>
      <line x1={x1} y1={y1} x2={bx} y2={by} stroke={color} strokeWidth={w} strokeLinecap="round" />
      <polygon points={`0,0 ${-head},${-head * 0.55} ${-head},${head * 0.55}`} fill={color} transform={`translate(${x2} ${y2}) rotate(${(ang * 180) / Math.PI})`} />
    </g>
  );
};
