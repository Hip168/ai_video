import React from "react";
import { beatStartIn, clamp01, ease } from "../../lib/hooks";
import { monoStyle } from "../../lib/b-kit";
import { useBox } from "../../lib/theme";
import type { Scene2 } from "../../timeline2";

// Tiện ích chung cho cảnh riêng của tập "khi-may-tinh-dem-qua-gioi-han". Mọi hàm là hàm thuần của frame.
// Bố cục tính theo khung (W, H) của `useBox()`: `wide` 1920x830, `square` 840x840 (Short).

/** Frame (tương đối cảnh) bắt đầu beat i; chỉ số vượt thì lấy beat cuối cộng thêm 12 frame mỗi bậc. */
export function at(scene: Scene2, i: number): number {
  if (scene.beats.length === 0) return i * 40;
  return beatStartIn(scene, Math.min(i, scene.beats.length - 1)) + (i >= scene.beats.length ? (i - scene.beats.length + 1) * 12 : 0);
}

/** Frame (tương đối cảnh) kết thúc beat i: đầu beat sau, hoặc hết cảnh. */
export function endOf(scene: Scene2, i: number): number {
  return i + 1 < scene.beats.length ? beatStartIn(scene, i + 1) : scene.durationFrames;
}

/** Tiến độ 0..1 (làm mượt) từ frame `from`, dài `len` frame. */
export const p = (frame: number, from: number, len = 14): number => ease((frame - from) / len);

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export { clamp01 };

/** Kích thước khung đang vẽ. */
export function useGeom(): { W: number; H: number; CX: number; sq: boolean } {
  const b = useBox();
  return { W: b.w, H: b.h, CX: b.w / 2, sq: b.layout === "square" };
}

/** Viết số nguyên có dấu chấm ngăn nghìn, dấu trừ là "−". */
export function fmtInt(v: number): string {
  const s = Math.abs(Math.round(v)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return v < 0 ? `−${s}` : s;
}

/** Chữ đơn cách thô (không co chữ). Dùng cho chữ số; cỡ chữ do nơi gọi đảm bảo ≥ 30 px ở khung vuông. */
export const Mono: React.FC<{ x: number; y: number; size: number; fill: string; text: string; anchor?: "start" | "middle" | "end"; opacity?: number }> = ({
  x,
  y,
  size,
  fill,
  text,
  anchor = "middle",
  opacity = 1,
}) => (
  <text x={x} y={y} fontSize={size} fontWeight={700} fill={fill} textAnchor={anchor} opacity={opacity} style={monoStyle}>
    {text}
  </text>
);

/** Đường cung trên vòng tròn tâm (cx, cy), góc độ tính từ đỉnh, theo chiều kim đồng hồ. */
export function arcPath(cx: number, cy: number, r: number, a0: number, a1: number): string {
  const pt = (a: number) => {
    const t = ((a - 90) * Math.PI) / 180;
    return [cx + r * Math.cos(t), cy + r * Math.sin(t)];
  };
  const [x0, y0] = pt(a0);
  const [x1, y1] = pt(a1);
  const large = Math.abs(a1 - a0) > 180 ? 1 : 0;
  return `M${x0} ${y0} A${r} ${r} 0 ${large} 1 ${x1} ${y1}`;
}

/** Toạ độ điểm trên vòng tròn ở góc `a` độ (0 ở đỉnh, chiều kim đồng hồ). */
export function onCircle(cx: number, cy: number, r: number, a: number): { x: number; y: number } {
  const t = ((a - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(t), y: cy + r * Math.sin(t) };
}
