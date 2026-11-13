import React from "react";
import { beatStartIn, ease } from "../../lib/hooks";
import { monoStyle } from "../../lib/b-kit";
import type { Scene2 } from "../../timeline2";

// Tiện ích chung cho cảnh riêng của tập "vi-sao-0-1-cong-0-2-khong-bang-0-3". Mọi hàm là hàm thuần của frame.
// Bố cục tính theo khung (W, H, CX) thay vì số cứng, để sau này dễ làm biến thể khung vuông.

export const W = 1920;
/** Mép dưới vùng hình chính (phụ đề nằm dưới). */
export const H = 830;
export const CX = W / 2;

/** Frame (tương đối cảnh) bắt đầu beat i; chỉ số vượt thì lấy beat cuối cộng thêm 12 frame mỗi bậc. */
export function at(scene: Scene2, i: number): number {
  if (scene.beats.length === 0) return i * 40;
  return beatStartIn(scene, Math.min(i, scene.beats.length - 1)) + (i >= scene.beats.length ? (i - scene.beats.length + 1) * 12 : 0);
}

/** Tiến độ 0..1 (làm mượt) từ frame `from`, dài `len` frame. */
export const p = (frame: number, from: number, len = 14): number => ease((frame - from) / len);

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** Cỡ ô chữ đơn cách để `n` ký tự vừa `width`, tối đa `max`. */
export const cellSize = (n: number, width: number, max: number): number => Math.min(max, width / Math.max(1, n));

/** Một hàng ký tự đơn cách, mỗi ký tự trong một ô rộng `cell`, căn giữa tại `cx`. `style(i)` trả màu, độ mờ, nền ô. */
export const Digits: React.FC<{
  text: string;
  cx: number;
  y: number;
  cell: number;
  style: (i: number) => { fill: string; opacity: number; box?: string; boxOpacity?: number };
}> = ({ text, cx, y, cell, style }) => {
  const chars = [...text];
  const x0 = cx - (chars.length * cell) / 2;
  const fs = cell / 0.62;
  return (
    <g style={monoStyle}>
      {chars.map((c, i) => {
        const s = style(i);
        if (s.opacity <= 0) return null;
        return (
          <g key={i} opacity={s.opacity}>
            {s.box && <rect x={x0 + i * cell + 2} y={y - fs * 0.86} width={cell - 4} height={fs * 1.08} rx={8} fill={s.box} opacity={s.boxOpacity ?? 1} />}
            <text x={x0 + i * cell + cell / 2} y={y} fontSize={fs} fontWeight={700} fill={s.fill} textAnchor="middle">
              {c}
            </text>
          </g>
        );
      })}
    </g>
  );
};

/** Mũi tên ngang/dọc đơn giản từ (x1,y1) tới (x2,y2). */
export const Arrow: React.FC<{ x1: number; y1: number; x2: number; y2: number; color: string; width?: number; opacity?: number }> = ({
  x1,
  y1,
  x2,
  y2,
  color,
  width = 6,
  opacity = 1,
}) => {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const hl = 22;
  const p1 = `${x2 - hl * Math.cos(a - 0.45)},${y2 - hl * Math.sin(a - 0.45)}`;
  const p2 = `${x2 - hl * Math.cos(a + 0.45)},${y2 - hl * Math.sin(a + 0.45)}`;
  return (
    <g opacity={opacity}>
      <line x1={x1} y1={y1} x2={x2 - (hl / 2) * Math.cos(a)} y2={y2 - (hl / 2) * Math.sin(a)} stroke={color} strokeWidth={width} strokeLinecap="round" />
      <polygon points={`${x2},${y2} ${p1} ${p2}`} fill={color} />
    </g>
  );
};
