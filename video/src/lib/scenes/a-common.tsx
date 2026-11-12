import React, { useMemo } from "react";
import type { Scene2 } from "../../timeline2";
import { beatStartIn, clamp01, ease } from "../hooks";
import { fitText } from "../text";
import { assertShortText, useBox } from "../theme";

/** Hết vùng hình chính (D10). */
export const MAIN_END = 830;

/**
 * Frame (tương đối cảnh) mà phần tử thứ i hiện ra: neo vào beat thứ i.
 * Thiếu beat thì phần tử dư hiện nối tiếp mỗi 10 frame sau beat cuối; cảnh không beat thì 10 + i*20.
 */
export function appearAt(scene: Scene2, i: number): number {
  const nb = scene.beats.length;
  return nb === 0 ? 10 + i * 20 : beatStartIn(scene, i) + (i >= nb ? (i - nb + 1) * 10 : 0);
}

/** Tiến độ 0..1 (làm mượt) của một đoạn bắt đầu tại `at`, dài `len` frame. */
export const prog = (frame: number, at: number, len = 14): number => ease((frame - at) / len);

export const easeOutCubic = (v: number): number => 1 - Math.pow(1 - clamp01(v), 3);

/** Định dạng số kiểu Việt: nghìn cách nhau dấu chấm, thập phân dấu phẩy. */
export function fmtNum(v: number, decimals = 0): string {
  const s = Math.abs(v).toFixed(decimals);
  const [int, dec] = s.split(".");
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const neg = v < 0 && Number(s) !== 0 ? "-" : "";
  return `${neg}${grouped}${dec ? `,${dec}` : ""}`;
}

export interface TProps {
  x: number;
  y: number;
  text: string;
  size: number;
  width: number;
  maxLines: number;
  fill: string;
  anchor?: "start" | "middle" | "end";
  weight?: number;
  lh?: number;
  /** top: y là dòng đầu; middle: khối căn giữa quanh y; bottom: y là dòng cuối. */
  valign?: "top" | "middle" | "bottom";
  opacity?: number;
}

/** Chữ nhiều dòng, luôn qua fitText (đo thật, giảm tới 70%, cắt "…"). */
export const T: React.FC<TProps> = ({
  x,
  y,
  text,
  size,
  width,
  maxLines,
  fill,
  anchor = "middle",
  weight = 700,
  lh = 1.25,
  valign = "top",
  opacity = 1,
}) => {
  const r = useMemo(() => fitText({ text, fontSize: size, width, maxLines }), [text, size, width, maxLines]);
  assertShortText(useBox(), r.fontSize, text);
  const n = r.lines.length;
  const step = r.fontSize * lh;
  const first =
    valign === "top" ? y : valign === "bottom" ? y - (n - 1) * step : y - ((n - 1) * step) / 2 + r.fontSize * 0.35;
  return (
    <g opacity={opacity}>
      {r.lines.map((l, i) => (
        <text key={i} x={x} y={first + i * step} fontSize={r.fontSize} fontWeight={weight} fill={fill} textAnchor={anchor}>
          {l}
        </text>
      ))}
    </g>
  );
};

/** Dấu tick vẽ dần (p 0..1) trong vòng tròn tô màu. */
export const Tick: React.FC<{ cx: number; cy: number; r: number; p: number; color: string; ink: string }> = ({ cx, cy, r, p, color, ink }) => (
  <g opacity={clamp01(p * 3)}>
    <circle cx={cx} cy={cy} r={r * (0.6 + 0.4 * p)} fill={color} />
    <path
      d={`M${cx - r * 0.42} ${cy + r * 0.02} L${cx - r * 0.1} ${cy + r * 0.36} L${cx + r * 0.46} ${cy - r * 0.36}`}
      fill="none"
      stroke={ink}
      strokeWidth={r * 0.26}
      strokeLinecap="round"
      strokeLinejoin="round"
      pathLength={1}
      strokeDasharray={1}
      strokeDashoffset={1 - clamp01(p * 1.4 - 0.2)}
    />
  </g>
);

/** Dấu chéo vẽ dần trong vòng tròn tô màu. */
export const Cross: React.FC<{ cx: number; cy: number; r: number; p: number; color: string; ink: string }> = ({ cx, cy, r, p, color, ink }) => {
  const d = r * 0.36;
  const q = clamp01(p * 1.4 - 0.2);
  return (
    <g opacity={clamp01(p * 3)}>
      <circle cx={cx} cy={cy} r={r * (0.6 + 0.4 * p)} fill={color} />
      <path d={`M${cx - d} ${cy - d} L${cx + d} ${cy + d}`} stroke={ink} strokeWidth={r * 0.26} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - clamp01(q * 2)} />
      <path d={`M${cx + d} ${cy - d} L${cx - d} ${cy + d}`} stroke={ink} strokeWidth={r * 0.26} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - clamp01(q * 2 - 1)} />
    </g>
  );
};
