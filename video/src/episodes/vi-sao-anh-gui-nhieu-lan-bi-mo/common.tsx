import React from "react";
import { beatStartIn, clamp01, ease, useTheme } from "../../lib/hooks";
import { monoStyle, TextBlock } from "../../lib/b-kit";
import { useBox } from "../../lib/theme";
import type { Scene2 } from "../../timeline2";

// Tiện ích chung cho cảnh riêng của tập "vi-sao-anh-gui-nhieu-lan-bi-mo". Mọi hàm là hàm thuần của frame.
// Bố cục tính theo khung (W, H) của `useBox()`: `wide` 1920x830, `square` 840x840 (Short).
// Quy ước của tập: phần thuộc beat 0 hiện đủ ngay từ frame 0 (không mờ dần từ trống), để cảnh nào
// đứng đầu một Short cũng có hình ngay khung đầu. Chỉ các beat sau mới có hoạt hình hiện ra.

/** Frame (tương đối cảnh) bắt đầu beat i; chỉ số vượt thì lấy beat cuối cộng thêm 12 frame mỗi bậc. */
export function at(scene: Scene2, i: number): number {
  if (scene.beats.length === 0) return i * 40;
  return beatStartIn(scene, Math.min(i, scene.beats.length - 1)) + (i >= scene.beats.length ? (i - scene.beats.length + 1) * 12 : 0);
}

/** Tiến độ 0..1 (làm mượt) từ frame `from`, dài `len` frame. */
export const p = (frame: number, from: number, len = 14): number => ease((frame - from) / len);

/** Như `p` nhưng beat 0 (from <= 0) luôn trả 1: phần của beat đầu hiện đủ từ frame 0. */
export const pb = (frame: number, from: number, len = 14): number => (from <= 0 ? 1 : p(frame, from, len));

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export { clamp01, ease, monoStyle, TextBlock };

export function useGeom(): { W: number; H: number; sq: boolean } {
  const b = useBox();
  return { W: b.w, H: b.h, sq: b.layout === "square" };
}

export function modeOf(props: Record<string, unknown>, def: string): string {
  return typeof props.mode === "string" && props.mode !== "" ? props.mode : def;
}

/** Chữ một dòng căn giữa/trái/phải đi qua TextBlock (đo, co, không tràn). */
export const Txt: React.FC<{
  text: string;
  x: number;
  y: number;
  w: number;
  s: number;
  fill: string;
  anchor?: "start" | "middle" | "end";
  lines?: number;
  weight?: 400 | 700;
  opacity?: number;
}> = ({ text, x, y, w, s, fill, anchor = "middle", lines = 1, weight = 700, opacity = 1 }) => (
  <TextBlock text={text} x={x} y={y} width={w} fontSize={s} maxLines={lines} fill={fill} anchor={anchor} weight={weight} opacity={opacity} lineHeight={1.2} />
);

/** Chữ đơn cách (số giờ, mã lỗi). Không ngắt dòng: người gọi tự chọn cỡ vừa. */
export const Mono: React.FC<{ text: string; x: number; y: number; s: number; fill: string; anchor?: "start" | "middle" | "end"; opacity?: number }> = ({
  text,
  x,
  y,
  s,
  fill,
  anchor = "middle",
  opacity = 1,
}) => (
  <text x={x} y={y} fontSize={s} fontWeight={700} fill={fill} textAnchor={anchor} opacity={opacity} style={monoStyle}>
    {text}
  </text>
);

/** Nhãn bo tròn có chữ. */
export const Chip: React.FC<{ x: number; y: number; w: number; h: number; text: string; s: number; fill: string; color: string; stroke?: string; opacity?: number }> = ({
  x,
  y,
  w,
  h,
  text,
  s,
  fill,
  color,
  stroke,
  opacity = 1,
}) => (
  <g opacity={opacity}>
    <rect x={x} y={y} width={w} height={h} rx={h / 2.4} fill={fill} stroke={stroke ?? fill} strokeWidth={4} />
    <TextBlock text={text} x={x + w / 2} y={y + h / 2 + s * 0.36} width={w - 28} fontSize={s} fill={color} />
  </g>
);

/** Mũi tên thẳng từ (x1,y1) tới (x2,y2), đầu tam giác. */
export const Arrow: React.FC<{ x1: number; y1: number; x2: number; y2: number; color: string; w?: number; head?: number; opacity?: number; dashed?: boolean }> = ({
  x1,
  y1,
  x2,
  y2,
  color,
  w = 6,
  head = 20,
  opacity = 1,
  dashed = false,
}) => {
  const ang = Math.atan2(y2 - y1, x2 - x1);
  const bx = x2 - Math.cos(ang) * head * 0.8;
  const by = y2 - Math.sin(ang) * head * 0.8;
  return (
    <g opacity={opacity}>
      <line x1={x1} y1={y1} x2={bx} y2={by} stroke={color} strokeWidth={w} strokeLinecap="round" strokeDasharray={dashed ? "14 12" : undefined} />
      <polygon points={`0,0 ${-head},${-head * 0.55} ${-head},${head * 0.55}`} fill={color} transform={`translate(${x2} ${y2}) rotate(${(ang * 180) / Math.PI})`} />
    </g>
  );
};

/** Dấu tích / dấu chéo trong vòng tròn. */
export const Mark: React.FC<{ cx: number; cy: number; r: number; ok: boolean; opacity?: number }> = ({ cx, cy, r, ok, opacity = 1 }) => {
  const t = useTheme();
  return (
    <g opacity={opacity}>
      <circle cx={cx} cy={cy} r={r} fill={ok ? t.ok : t.warn} />
      {ok ? (
        <path d={`M${cx - r * 0.45} ${cy} L${cx - r * 0.1} ${cy + r * 0.38} L${cx + r * 0.5} ${cy - r * 0.38}`} fill="none" stroke={t.bg} strokeWidth={r * 0.22} strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <path d={`M${cx - r * 0.38} ${cy - r * 0.38} L${cx + r * 0.38} ${cy + r * 0.38} M${cx + r * 0.38} ${cy - r * 0.38} L${cx - r * 0.38} ${cy + r * 0.38}`} stroke={t.bg} strokeWidth={r * 0.22} strokeLinecap="round" />
      )}
    </g>
  );
};

