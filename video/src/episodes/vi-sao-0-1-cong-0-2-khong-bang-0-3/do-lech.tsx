import React from "react";
import { useCurrentFrame } from "remotion";
import { clamp01, useTheme } from "../../lib/hooks";
import { Stage, useBox } from "../../lib/theme";
import { TextBlock } from "../../lib/b-kit";
import type { SceneProps } from "../../lib/types";
import { at, CX, p } from "./common";

// Trục: giờ chạy 0..110 trên trục ngang, độ lệch 0..0,38 giây trên trục dọc (tuyến tính).
// Khung vuông (Short, 840x840): trục nhỏ lại, nhãn mốc 100 giờ đặt ở góc trên bên trái, phía trên đường lệch.
const WIDE = { OX: CX - 600, OY: 720, AW: 1200, AH: 560 };
const SQUARE = { OX: 90, OY: 640, AW: 660, AH: 480 };
const HMAX = 110;
const DMAX = 0.38;
const RATE = 0.3433 / 100; // giây lệch mỗi giờ chạy, theo mốc 100 giờ

/** Độ lệch đồng hồ tăng theo giờ chạy: mốc 8 giờ (0,0275 giây) và 100 giờ (0,3433 giây). */
export const DoLech: React.FC<SceneProps> = ({ scene }) => {
  const theme = useTheme();
  const f = useCurrentFrame();
  const sq = useBox().layout === "square";
  const { OX, OY, AW, AH } = sq ? SQUARE : WIDE;
  const hx = (h: number): number => OX + (AW * h) / HMAX;
  const dy = (d: number): number => OY - (AH * d) / DMAX;
  const lab = sq
    ? { x: 130, anchor: "start" as const, y: 230, sub: 280, dash: OY, fs: 44, fsSub: 36 }
    : { x: hx(100) + 20, anchor: "end" as const, y: OY - 140, sub: OY - 80, dash: OY - 200, fs: 48, fsSub: 40 };
  const t0 = at(scene, 0);
  const t1 = at(scene, 1);
  const t2 = at(scene, 2);
  const axes = p(f, t0);
  // Đường lệch vẽ dần, chạm mốc 100 giờ đúng lúc beat 2 bắt đầu.
  const h = 100 * clamp01((f - t0) / Math.max(1, t2 - t0));
  const m8 = h >= 8 ? p(f, t1) : 0;
  const m100 = p(f, t2);
  return (
    <Stage>
      <g opacity={axes}>
        <line x1={OX} y1={OY} x2={OX + AW + 30} y2={OY} stroke={theme.muted} strokeWidth={5} strokeLinecap="round" />
        <line x1={OX} y1={OY} x2={OX} y2={OY - AH - 30} stroke={theme.muted} strokeWidth={5} strokeLinecap="round" />
        <TextBlock text="giờ chạy" x={OX + AW + 30} y={OY + 60} width={360} fontSize={40} fill={theme.muted} anchor="end" weight={400} />
        <TextBlock text="độ lệch" x={OX + 20} y={OY - AH - 10} width={360} fontSize={40} fill={theme.muted} anchor="start" weight={400} />
      </g>
      <line x1={hx(0)} y1={dy(0)} x2={hx(h)} y2={dy(h * RATE)} stroke={theme.accent} strokeWidth={8} strokeLinecap="round" opacity={axes} />
      <g opacity={m8}>
        <circle cx={hx(8)} cy={dy(8 * RATE)} r={16} fill={theme.accent2} />
        <line x1={hx(8)} y1={dy(8 * RATE)} x2={hx(8)} y2={OY + 20} stroke={theme.accent2} strokeWidth={3} strokeDasharray="8 8" />
        <TextBlock text="8 giờ: 0,0275 giây" x={hx(8) - 20} y={OY + 70} width={600} fontSize={44} fill={theme.accent2} anchor="start" />
      </g>
      <g opacity={m100}>
        <circle cx={hx(100)} cy={dy(0.3433)} r={20} fill={theme.warn} />
        <line x1={hx(100)} y1={dy(0.3433)} x2={hx(100)} y2={lab.dash} stroke={theme.warn} strokeWidth={3} strokeDasharray="8 8" />
        <TextBlock text="100 giờ: 0,3433 giây" x={lab.x} y={lab.y} width={640} fontSize={lab.fs} fill={theme.warn} anchor={lab.anchor} />
        <TextBlock text="khoảng một phần ba giây" x={lab.x} y={lab.sub} width={640} fontSize={lab.fsSub} fill={theme.fg} anchor={lab.anchor} weight={400} />
      </g>
    </Stage>
  );
};
