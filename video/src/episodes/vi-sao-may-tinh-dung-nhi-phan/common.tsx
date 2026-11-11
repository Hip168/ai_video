import React from "react";
import { beatStartIn, clamp01, ease } from "../../lib/hooks";
import type { Scene2 } from "../../timeline2";

// Tiện ích chung cho cảnh riêng của tập "vi-sao-may-tinh-dung-nhi-phan". Mọi hàm là hàm thuần của frame.

/** Frame (tương đối cảnh) bắt đầu beat i; cảnh không beat thì rải đều 40 frame mỗi mục. */
export function at(scene: Scene2, i: number): number {
  if (scene.beats.length === 0) return i * 40;
  return beatStartIn(scene, Math.min(i, scene.beats.length - 1)) + (i >= scene.beats.length ? (i - scene.beats.length + 1) * 12 : 0);
}

/** Tiến độ 0..1 (làm mượt) từ frame `from`, dài `len` frame. */
export const p = (frame: number, from: number, len = 14): number => ease((frame - from) / len);

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** Rung giả lập nhiễu: tổng vài sóng sin, biên độ 1, hàm thuần của (frame, x). */
export function jitter(frame: number, x: number, seed = 0): number {
  return (
    0.5 * Math.sin(frame * 0.21 + x * 0.031 + seed) +
    0.3 * Math.sin(frame * 0.37 + x * 0.087 + seed * 2.1) +
    0.2 * Math.sin(frame * 0.53 + x * 0.19 + seed * 3.7)
  );
}

/** Công tắc dao: hai cực tại (x - half, y) và (x + half, y); `closed` 0..1 (1 là đóng). */
export const Switch: React.FC<{ x: number; y: number; half?: number; closed: number; color: string; dot: string; opacity?: number }> = ({
  x,
  y,
  half = 70,
  closed,
  color,
  dot,
  opacity = 1,
}) => {
  const ang = (-38 * (1 - clamp01(closed)) * Math.PI) / 180;
  const len = 2 * half;
  return (
    <g opacity={opacity}>
      <line x1={x - half} y1={y} x2={x - half + len * Math.cos(ang)} y2={y + len * Math.sin(ang)} stroke={color} strokeWidth={12} strokeLinecap="round" />
      <circle cx={x - half} cy={y} r={14} fill={dot} />
      <circle cx={x + half} cy={y} r={14} fill={dot} />
    </g>
  );
};

/** Bóng đèn: tròn, sáng thì có tia (không blur). `lit` 0..1. */
export const Bulb: React.FC<{ x: number; y: number; r?: number; lit: number; on: string; off: string; stroke: string; opacity?: number }> = ({
  x,
  y,
  r = 70,
  lit,
  on,
  off,
  stroke,
  opacity = 1,
}) => (
  <g opacity={opacity}>
    {Array.from({ length: 8 }, (_, k) => {
      const a = (k * Math.PI) / 4;
      return (
        <line
          key={k}
          x1={x + Math.cos(a) * (r + 18)}
          y1={y + Math.sin(a) * (r + 18)}
          x2={x + Math.cos(a) * (r + 18 + 44 * lit)}
          y2={y + Math.sin(a) * (r + 18 + 44 * lit)}
          stroke={on}
          strokeWidth={8}
          strokeLinecap="round"
          opacity={lit}
        />
      );
    })}
    <circle cx={x} cy={y} r={r} fill={off} stroke={stroke} strokeWidth={6} />
    <circle cx={x} cy={y} r={r} fill={on} opacity={lit} />
    <path d={`M${x - 24} ${y + 10} L${x - 10} ${y - 20} L${x + 4} ${y + 10} L${x + 18} ${y - 20}`} fill="none" stroke={stroke} strokeWidth={5} strokeLinejoin="round" />
  </g>
);

/** Nguồn pin dọc tại x, giữa y. */
export const Battery: React.FC<{ x: number; y: number; color: string; opacity?: number }> = ({ x, y, color, opacity = 1 }) => (
  <g opacity={opacity} stroke={color} strokeLinecap="round">
    <line x1={x - 46} y1={y - 12} x2={x + 46} y2={y - 12} strokeWidth={10} />
    <line x1={x - 24} y1={y + 12} x2={x + 24} y2={y + 12} strokeWidth={10} />
  </g>
);
