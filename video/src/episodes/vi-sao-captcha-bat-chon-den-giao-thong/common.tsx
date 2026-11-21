import React from "react";
import { beatStartIn, clamp01, ease, useTheme } from "../../lib/hooks";
import { monoStyle, TextBlock } from "../../lib/b-kit";
import { useBox } from "../../lib/theme";
import type { Scene2 } from "../../timeline2";

// Tiện ích chung cho cảnh riêng của tập "vi-sao-captcha-bat-chon-den-giao-thong". Mọi hàm là hàm thuần của frame.
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


// ---- hình tự vẽ cho tập CAPTCHA (không dùng giao diện thật của Google) ----

export type TileKind = "den" | "xe-dap" | "xe-may" | "vach" | "cay" | "nha";

/** Một ô ảnh đường phố tự vẽ, góc trên trái (x, y), cạnh s. */
export const Tile: React.FC<{ kind: TileKind; x: number; y: number; s: number; sel?: number }> = ({ kind, x, y, s, sel = 0 }) => {
  const k = s / 100;
  const g = (c: React.ReactNode) => <g transform={`translate(${x} ${y}) scale(${k})`}>{c}</g>;
  const sky = <rect x={0} y={0} width={100} height={100} fill="#9fc6e8" />;
  const road = <rect x={0} y={70} width={100} height={30} fill="#5b6270" />;
  const body = (() => {
    switch (kind) {
      case "den":
        return (
          <>
            {sky}
            {road}
            <rect x={46} y={40} width={8} height={40} fill="#2b2f36" />
            <rect x={36} y={8} width={28} height={40} rx={6} fill="#2b2f36" />
            <circle cx={50} cy={17} r={5} fill="#ff5b5b" />
            <circle cx={50} cy={28} r={5} fill="#ffcc4d" />
            <circle cx={50} cy={39} r={5} fill="#52d6a0" />
          </>
        );
      case "xe-dap":
        return (
          <>
            {sky}
            {road}
            <circle cx={30} cy={72} r={13} fill="none" stroke="#1d2b52" strokeWidth={4} />
            <circle cx={70} cy={72} r={13} fill="none" stroke="#1d2b52" strokeWidth={4} />
            <path d="M30 72 L45 52 L62 52 L70 72 M45 52 L52 72 L62 52" fill="none" stroke="#c0392b" strokeWidth={4} strokeLinejoin="round" />
          </>
        );
      case "xe-may":
        return (
          <>
            {sky}
            {road}
            <circle cx={28} cy={76} r={11} fill="#1d2b52" />
            <circle cx={74} cy={76} r={11} fill="#1d2b52" />
            <path d="M22 66 Q40 48 62 56 L80 66 Z" fill="#2a5bd7" />
            <rect x={44} y={46} width={18} height={8} rx={3} fill="#1d2b52" />
          </>
        );
      case "vach":
        return (
          <>
            <rect x={0} y={0} width={100} height={100} fill="#5b6270" />
            {[10, 32, 54, 76].map((v) => (
              <rect key={v} x={v} y={20} width={14} height={60} fill="#f2f2f2" />
            ))}
          </>
        );
      case "cay":
        return (
          <>
            {sky}
            <rect x={0} y={75} width={100} height={25} fill="#6aa84f" />
            <rect x={46} y={50} width={8} height={30} fill="#7a4b2a" />
            <circle cx={50} cy={40} r={22} fill="#2f8f46" />
          </>
        );
      default:
        return (
          <>
            {sky}
            {road}
            <rect x={20} y={30} width={60} height={42} fill="#d9825b" />
            <polygon points="14,32 50,10 86,32" fill="#7a2f2f" />
            <rect x={44} y={50} width={12} height={22} fill="#3a2a20" />
          </>
        );
    }
  })();
  return (
    <g>
      {g(body)}
      {sel > 0 && (
        <g opacity={sel}>
          <rect x={x} y={y} width={s} height={s} fill="#4cc9f0" opacity={0.28} />
          <rect x={x + 3} y={y + 3} width={s - 6} height={s - 6} fill="none" stroke="#4cc9f0" strokeWidth={6} />
          <circle cx={x + s * 0.16} cy={y + s * 0.16} r={s * 0.12} fill="#4cc9f0" />
          <path d={`M${x + s * 0.1} ${y + s * 0.16} l${s * 0.05} ${s * 0.05} l${s * 0.08} -${s * 0.09}`} fill="none" stroke="#0b1220" strokeWidth={Math.max(3, s * 0.03)} strokeLinecap="round" />
        </g>
      )}
    </g>
  );
};

/** Người máy đơn giản (đầu vuông, ăng-ten). Tâm (x, y), cao s. */
export const Robot: React.FC<{ x: number; y: number; s: number; fill: string; line: string }> = ({ x, y, s, fill, line }) => {
  const k = s / 100;
  return (
    <g transform={`translate(${x - 50 * k} ${y - 50 * k}) scale(${k})`}>
      <line x1={50} y1={4} x2={50} y2={18} stroke={line} strokeWidth={5} />
      <circle cx={50} cy={6} r={6} fill={line} />
      <rect x={18} y={18} width={64} height={52} rx={12} fill={fill} stroke={line} strokeWidth={5} />
      <circle cx={38} cy={42} r={7} fill={line} />
      <circle cx={62} cy={42} r={7} fill={line} />
      <rect x={36} y={56} width={28} height={6} rx={3} fill={line} />
      <rect x={28} y={74} width={44} height={22} rx={8} fill={fill} stroke={line} strokeWidth={5} />
    </g>
  );
};

/** Người đơn giản (đầu, vai). Tâm (x, y), cao s. */
export const Human: React.FC<{ x: number; y: number; s: number; fill: string; line: string }> = ({ x, y, s, fill, line }) => {
  const k = s / 100;
  return (
    <g transform={`translate(${x - 50 * k} ${y - 50 * k}) scale(${k})`}>
      <circle cx={50} cy={30} r={22} fill={fill} stroke={line} strokeWidth={5} />
      <path d="M12 98 Q12 58 50 58 Q88 58 88 98 Z" fill={fill} stroke={line} strokeWidth={5} />
    </g>
  );
};

/** Chữ méo tự vẽ: từng ký tự nghiêng, lệch, kèm nét nhiễu. Tâm (cx, cy), cỡ s. */
export const WarpWord: React.FC<{ text: string; cx: number; cy: number; s: number; fill: string; noise: string; seed?: number; smudge?: number }> = ({
  text,
  cx,
  cy,
  s,
  fill,
  noise,
  seed = 3,
  smudge = 0,
}) => {
  const ch = [...text];
  const step = s * 0.62;
  const x0 = cx - (step * (ch.length - 1)) / 2;
  let r = seed;
  const rnd = () => {
    r = (r * 9301 + 49297) % 233280;
    return r / 233280 - 0.5;
  };
  return (
    <g>
      {ch.map((c, i) => {
        const rot = rnd() * 40;
        const dy = rnd() * s * 0.3;
        const sk = rnd() * 30;
        return (
          <text key={i} x={0} y={0} fontSize={s} fontWeight={700} fill={fill} textAnchor="middle" transform={`translate(${x0 + i * step} ${cy + dy + s * 0.35}) rotate(${rot}) skewX(${sk})`} fontFamily="serif">
            {c}
          </text>
        );
      })}
      <path d={`M${x0 - s * 0.5} ${cy + s * 0.1} C${cx - s} ${cy - s * 0.5} ${cx + s} ${cy + s * 0.6} ${x0 + step * (ch.length - 1) + s * 0.5} ${cy - s * 0.1}`} fill="none" stroke={noise} strokeWidth={Math.max(3, s * 0.06)} />
      {smudge > 0 && (
        <g opacity={smudge}>
          {[0, 1, 2, 3, 4].map((i) => (
            <ellipse key={i} cx={x0 + (i * step * (ch.length - 1)) / 4} cy={cy + (i % 2 ? -s * 0.1 : s * 0.15)} rx={s * 0.45} ry={s * 0.3} fill="#4a3b2a" opacity={0.35} />
          ))}
        </g>
      )}
    </g>
  );
};
