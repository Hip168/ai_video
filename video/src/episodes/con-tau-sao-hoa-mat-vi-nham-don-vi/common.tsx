import React from "react";
import { beatStartIn, clamp01, ease } from "../../lib/hooks";
import { useBox } from "../../lib/theme";
import type { Scene2 } from "../../timeline2";

// Tiện ích chung cho cảnh riêng của tập "con-tau-sao-hoa-mat-vi-nham-don-vi". Mọi hàm là hàm thuần của frame.
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

/** Kích thước khung đang vẽ. */
export function useGeom(): { W: number; H: number; CX: number; sq: boolean } {
  const b = useBox();
  return { W: b.w, H: b.h, CX: b.w / 2, sq: b.layout === "square" };
}

/** Chuỗi chế độ trong props (mặc định `def`). */
export function modeOf(props: Record<string, unknown>, def: string): string {
  return typeof props.mode === "string" && props.mode !== "" ? props.mode : def;
}

/**
 * Con tàu (sơ đồ): thân hộp, một tấm pin mặt trời chìa ra một bên, ăng-ten đĩa.
 * Tâm (x, y), cỡ `s` (bề rộng thân), góc `rot` độ.
 */
export const Ship: React.FC<{ x: number; y: number; s: number; rot?: number; body: string; panel: string; line: string; opacity?: number }> = ({
  x,
  y,
  s,
  rot = 0,
  body,
  panel,
  line,
  opacity = 1,
}) => (
  <g transform={`translate(${x} ${y}) rotate(${rot})`} opacity={opacity}>
    <line x1={s * 0.5} y1={0} x2={s * 0.75} y2={0} stroke={line} strokeWidth={Math.max(2, s * 0.06)} />
    <rect x={s * 0.75} y={-s * 0.32} width={s * 1.5} height={s * 0.64} rx={s * 0.06} fill={panel} stroke={line} strokeWidth={Math.max(2, s * 0.04)} />
    {[1, 2].map((k) => (
      <line key={k} x1={s * 0.75 + (k * s * 1.5) / 3} y1={-s * 0.32} x2={s * 0.75 + (k * s * 1.5) / 3} y2={s * 0.32} stroke={line} strokeWidth={Math.max(1.5, s * 0.03)} opacity={0.7} />
    ))}
    <rect x={-s * 0.5} y={-s * 0.5} width={s} height={s} rx={s * 0.12} fill={body} stroke={line} strokeWidth={Math.max(2, s * 0.05)} />
    <path d={`M${-s * 0.5} ${-s * 0.25} A ${s * 0.45} ${s * 0.45} 0 0 0 ${-s * 0.5} ${s * 0.25}`} fill="none" stroke={line} strokeWidth={Math.max(2, s * 0.06)} />
  </g>
);

/** Sao Hỏa: đĩa tròn có vài vệt tối (không mờ, không gradient ngoài). */
export const Mars: React.FC<{ cx: number; cy: number; r: number; fill?: string; spot?: string }> = ({ cx, cy, r, fill = "#c1440e", spot = "#8a2f0a" }) => (
  <g>
    <circle cx={cx} cy={cy} r={r} fill={fill} />
    <ellipse cx={cx - r * 0.3} cy={cy - r * 0.25} rx={r * 0.28} ry={r * 0.12} fill={spot} opacity={0.7} />
    <ellipse cx={cx + r * 0.25} cy={cy + r * 0.2} rx={r * 0.36} ry={r * 0.1} fill={spot} opacity={0.6} />
    <ellipse cx={cx + r * 0.05} cy={cy + r * 0.55} rx={r * 0.22} ry={r * 0.08} fill={spot} opacity={0.5} />
  </g>
);

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

/** Hộp có tiêu đề (dùng cho các đội, các phần mềm). */
export const Card: React.FC<{ x: number; y: number; w: number; h: number; fill: string; stroke: string; sw?: number; opacity?: number; children?: React.ReactNode }> = ({
  x,
  y,
  w,
  h,
  fill,
  stroke,
  sw = 5,
  opacity = 1,
  children,
}) => (
  <g opacity={opacity}>
    <rect x={x} y={y} width={w} height={h} rx={24} fill={fill} stroke={stroke} strokeWidth={sw} />
    {children}
  </g>
);
