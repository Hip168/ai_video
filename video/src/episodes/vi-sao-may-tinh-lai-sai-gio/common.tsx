import React from "react";
import { beatStartIn, clamp01, ease, useTheme } from "../../lib/hooks";
import { monoStyle, TextBlock } from "../../lib/b-kit";
import { useBox } from "../../lib/theme";
import type { Scene2 } from "../../timeline2";

// Tiện ích chung cho cảnh riêng của tập "vi-sao-may-tinh-lai-sai-gio". Mọi hàm là hàm thuần của frame.
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

/** Nhãn chương nhỏ ở góc trên trái (thay cho thẻ chương câm khi chương mở đầu một Short). */
export const ChapterTag: React.FC<{ text: string }> = ({ text }) => {
  const t = useTheme();
  const { sq } = useGeom();
  const w = sq ? 220 : 240;
  const h = sq ? 52 : 56;
  return <Chip x={sq ? 16 : 40} y={sq ? 12 : 24} w={w} h={h} text={text} s={sq ? 32 : 34} fill={t.panel} stroke={t.accent2} color={t.accent2} />;
};

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

/** Mặt đồng hồ kim. Góc tính theo giờ thập phân `hours` (0..12) và giây `sec` (0..60). */
export const ClockFace: React.FC<{ cx: number; cy: number; r: number; hours: number; sec?: number; ring: string; face: string; hand: string; secHand?: string; opacity?: number }> = ({
  cx,
  cy,
  r,
  hours,
  sec,
  ring,
  face,
  hand,
  secHand,
  opacity = 1,
}) => {
  const hAng = ((hours % 12) / 12) * 360;
  const mAng = ((hours * 60) % 60) / 60 * 360;
  const ticks = Array.from({ length: 12 }, (_, i) => i);
  const hp = (ang: number, len: number) => ({ x: cx + Math.sin((ang * Math.PI) / 180) * len, y: cy - Math.cos((ang * Math.PI) / 180) * len });
  const hh = hp(hAng, r * 0.5);
  const mm = hp(mAng, r * 0.78);
  return (
    <g opacity={opacity}>
      <circle cx={cx} cy={cy} r={r} fill={face} stroke={ring} strokeWidth={Math.max(5, r * 0.07)} />
      {ticks.map((i) => {
        const a = hp(i * 30, r * 0.86);
        const b = hp(i * 30, r * (i % 3 === 0 ? 0.7 : 0.78));
        return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={hand} strokeWidth={i % 3 === 0 ? 6 : 3} strokeLinecap="round" opacity={0.8} />;
      })}
      <line x1={cx} y1={cy} x2={hh.x} y2={hh.y} stroke={hand} strokeWidth={Math.max(6, r * 0.07)} strokeLinecap="round" />
      <line x1={cx} y1={cy} x2={mm.x} y2={mm.y} stroke={hand} strokeWidth={Math.max(4, r * 0.045)} strokeLinecap="round" />
      {sec !== undefined && (() => {
        const ss = hp((sec / 60) * 360, r * 0.84);
        return <line x1={cx} y1={cy} x2={ss.x} y2={ss.y} stroke={secHand ?? ring} strokeWidth={3} strokeLinecap="round" />;
      })()}
      <circle cx={cx} cy={cy} r={Math.max(6, r * 0.06)} fill={hand} />
    </g>
  );
};

/** Máy chủ (tủ có 3 ngăn đèn). Tâm (x, y), rộng w. */
export const ServerBox: React.FC<{ x: number; y: number; w: number; fill: string; line: string; led: string; on?: number }> = ({ x, y, w, fill, line, led, on = 1 }) => {
  const h = w * 1.2;
  const rows = [0, 1, 2];
  return (
    <g>
      <rect x={x - w / 2} y={y - h / 2} width={w} height={h} rx={14} fill={fill} stroke={line} strokeWidth={5} />
      {rows.map((i) => {
        const ry = y - h / 2 + 18 + i * ((h - 36) / 3);
        const rh = (h - 36) / 3 - 12;
        return (
          <g key={i}>
            <rect x={x - w / 2 + 16} y={ry} width={w - 32} height={rh} rx={8} fill="none" stroke={line} strokeWidth={3} opacity={0.7} />
            <circle cx={x + w / 2 - 36} cy={ry + rh / 2} r={7} fill={led} opacity={0.3 + 0.7 * on} />
            <line x1={x - w / 2 + 34} y1={ry + rh / 2} x2={x + w / 2 - 66} y2={ry + rh / 2} stroke={line} strokeWidth={4} opacity={0.5} />
          </g>
        );
      })}
    </g>
  );
};

/** Máy tính xách tay đơn giản. Tâm màn hình (x, y), rộng w. `children` vẽ trong màn hình (toạ độ tuyệt đối). */
export const Laptop: React.FC<{ x: number; y: number; w: number; fill: string; line: string; screen: string; children?: React.ReactNode }> = ({ x, y, w, fill, line, screen, children }) => {
  const h = w * 0.62;
  return (
    <g>
      <rect x={x - w / 2} y={y - h / 2} width={w} height={h} rx={14} fill={fill} stroke={line} strokeWidth={5} />
      <rect x={x - w / 2 + 16} y={y - h / 2 + 16} width={w - 32} height={h - 32} rx={6} fill={screen} />
      <path d={`M${x - w / 2 - 40} ${y + h / 2 + 4} H${x + w / 2 + 40} L${x + w / 2 + 10} ${y + h / 2 + 30} H${x - w / 2 - 10} Z`} fill={fill} stroke={line} strokeWidth={5} strokeLinejoin="round" />
      {children}
    </g>
  );
};
