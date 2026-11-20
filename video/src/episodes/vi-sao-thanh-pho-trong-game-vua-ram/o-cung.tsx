import React from "react";
import { useCurrentFrame } from "remotion";
import { useTheme } from "../../lib/hooks";
import { Stage } from "../../lib/theme";
import type { SceneProps } from "../../lib/types";
import { at, clamp01, lerp, p, Txt, useGeom } from "./common";

/** Các mẩu dữ liệu rải rác trên mặt đĩa: (bán kính tương đối, góc độ). */
const PIECES: [number, number][] = [
  [0.82, 20],
  [0.45, 140],
  [0.68, 250],
  [0.35, 320],
  [0.9, 95],
  [0.55, 200],
];

/**
 * Ổ cứng quay đi tìm dữ liệu rải rác.
 * Beat 0: đầu đọc nhảy từ mẩu này sang mẩu khác; vạch "đi tìm" dài hơn hẳn vạch "đọc".
 * Beat 1: nạp 1 GB mất khoảng 20 giây.
 */
export const OCung: React.FC<SceneProps> = ({ scene }) => {
  const t = useTheme();
  const f = useCurrentFrame();
  const { sq } = useGeom();
  const t1 = at(scene, 1);
  const a1 = p(f, t1, 14);
  const cx = sq ? 300 : 520;
  const cy = sq ? 300 : 410;
  const R = sq ? 250 : 340;
  const rot = f * 6; // đĩa quay
  // đầu đọc: mỗi mẩu 36 frame, 26 frame đi tìm, 10 frame đọc
  const per = 36;
  const k = Math.floor(f / per) % PIECES.length;
  const ph = (f % per) / per;
  const from = PIECES[(k + PIECES.length - 1) % PIECES.length];
  const to = PIECES[k];
  const seek = clamp01(ph / 0.72);
  const reading = ph >= 0.72;
  const rr = lerp(from[0], to[0], seek) * R;
  // tay đọc gắn ở góc dưới phải, quay quanh trục để đầu đọc tới bán kính rr
  const pivot = { x: cx + R * 0.95, y: cy + R * 0.95 };
  const base = Math.atan2(pivot.y - cy, pivot.x - cx) - 0.9;
  const head = { x: cx + rr * Math.cos(base), y: cy + rr * Math.sin(base) };
  const seekTotal = Math.min(1, f / 220);
  const barW = sq ? 300 : 640;
  return (
    <Stage>
      <circle cx={cx} cy={cy} r={R} fill={t.panel} stroke={t.muted} strokeWidth={5} />
      {[0.3, 0.45, 0.6, 0.75, 0.9].map((q) => (
        <circle key={q} cx={cx} cy={cy} r={R * q} fill="none" stroke={t.muted} strokeWidth={2} opacity={0.4} />
      ))}
      <g transform={`rotate(${rot} ${cx} ${cy})`}>
        {PIECES.map(([q, a], i) => {
          const r0 = q * R;
          const a0 = (a * Math.PI) / 180;
          const a1r = a0 + 0.35;
          return (
            <path
              key={i}
              d={`M${cx + r0 * Math.cos(a0)} ${cy + r0 * Math.sin(a0)} A${r0} ${r0} 0 0 1 ${cx + r0 * Math.cos(a1r)} ${cy + r0 * Math.sin(a1r)}`}
              fill="none"
              stroke={i === k && reading ? t.ok : t.accent2}
              strokeWidth={14}
              strokeLinecap="round"
            />
          );
        })}
      </g>
      <circle cx={cx} cy={cy} r={R * 0.12} fill={t.bg} stroke={t.muted} strokeWidth={4} />
      <line x1={pivot.x} y1={pivot.y} x2={head.x} y2={head.y} stroke={t.fg} strokeWidth={10} strokeLinecap="round" />
      <circle cx={pivot.x} cy={pivot.y} r={18} fill={t.fg} />
      <circle cx={head.x} cy={head.y} r={12} fill={reading ? t.ok : t.warn} />
      {!sq && <Txt text="đầu đọc" x={pivot.x} y={pivot.y + 54} w={200} s={36} fill={t.muted} />}
      {/* thời gian: đi tìm và đọc */}
      <g>
        <Txt text={reading ? "đang đọc" : "đang đi tìm"} x={sq ? 640 : 1440} y={sq ? 120 : 150} w={sq ? 300 : 600} s={sq ? 36 : 52} fill={reading ? t.ok : t.warn} />
        <Txt text="đi tìm" x={sq ? 60 : 1120} y={sq ? 640 : 300} w={sq ? 200 : 200} s={sq ? 32 : 40} fill={t.warn} anchor="start" />
        <rect x={sq ? 200 : 1260} y={sq ? 614 : 270} width={barW * 0.72 * seekTotal} height={sq ? 36 : 44} rx={10} fill={t.warn} />
        <Txt text="đọc" x={sq ? 60 : 1120} y={sq ? 700 : 380} w={sq ? 200 : 200} s={sq ? 32 : 40} fill={t.ok} anchor="start" />
        <rect x={sq ? 200 : 1260} y={sq ? 674 : 350} width={barW * 0.28 * seekTotal} height={sq ? 36 : 44} rx={10} fill={t.ok} />
        {!sq && <Txt text="phần lớn thời gian chỉ lo đi tìm" x={1440} y={470} w={620} s={38} fill={t.fg} weight={400} />}
      </g>
      <g opacity={a1}>
        <rect x={sq ? 40 : 1130} y={sq ? 734 : 560} width={sq ? 760 : 620} height={sq ? 90 : 130} rx={22} fill={t.accent2} />
        <Txt text="nạp 1 GB: khoảng 20 giây" x={sq ? 420 : 1440} y={sq ? 792 : 642} w={sq ? 720 : 580} s={sq ? 42 : 50} fill={t.bg} />
      </g>
    </Stage>
  );
};
