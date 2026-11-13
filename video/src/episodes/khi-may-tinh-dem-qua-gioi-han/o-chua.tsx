import React from "react";
import { useCurrentFrame } from "remotion";
import { useTheme } from "../../lib/hooks";
import { Stage } from "../../lib/theme";
import { TextBlock } from "../../lib/b-kit";
import type { SceneProps } from "../../lib/types";
import { at, p, useGeom } from "./common";

/** Một ô chứa nhiều bit: hình chữ nhật chia vạch theo số bit. */
const Reg: React.FC<{ x: number; y: number; w: number; h: number; n: number; stroke: string; fill: string; line: string; opacity?: number; shimmer: number }> = ({
  x,
  y,
  w,
  h,
  n,
  stroke,
  fill,
  line,
  opacity = 1,
  shimmer,
}) => {
  const cw = w / n;
  return (
    <g opacity={opacity}>
      <rect x={x} y={y} width={w} height={h} rx={10} fill={fill} stroke={stroke} strokeWidth={5} />
      {Array.from({ length: n - 1 }, (_, i) => (
        <line key={i} x1={x + (i + 1) * cw} y1={y + 6} x2={x + (i + 1) * cw} y2={y + h - 6} stroke={line} strokeWidth={2} opacity={0.5} />
      ))}
      {/* Vệt sáng chạy dọc ô cho có chuyển động */}
      <rect x={x + ((shimmer % 1) * (w - cw))} y={y + 4} width={cw} height={h - 8} fill={stroke} opacity={0.35} />
    </g>
  );
};

/** Ariane 5: số dấu phẩy động 64 bit (beat 0) đổi sang số nguyên có dấu 16 bit (beat 1); con số ấy là biến BH, độ lệch ngang (beat 2). */
export const OChua: React.FC<SceneProps> = ({ scene }) => {
  const theme = useTheme();
  const f = useCurrentFrame();
  const { W, H, CX, sq } = useGeom();
  const t1 = at(scene, 1);
  const t2 = at(scene, 2);
  const m = sq ? 40 : 160;
  const wBig = W - 2 * m;
  const h = sq ? 76 : 96;
  const yBig = H * (sq ? 0.2 : 0.2);
  const wSmall = wBig / 4;
  const ySmall = H * (sq ? 0.62 : 0.62);
  const xSmall = CX - wSmall / 2;
  const a1 = p(f, t1, 16);
  const a2 = p(f, t2, 16);
  const fsL = sq ? 36 : 48;
  // Mũi tên "đổi" từ ô lớn xuống ô nhỏ, vẽ dần.
  const arrowLen = (ySmall - 20 - (yBig + h + 20)) * p(f, t1 + 8, 20);
  const valW = wBig * 0.46;
  return (
    <Stage>
      <TextBlock text="Số dấu phẩy động 64 bit" x={m} y={yBig - 30} width={wBig} fontSize={fsL} fill={theme.fg} anchor="start" />
      <Reg x={m} y={yBig} w={wBig} h={h} n={64} stroke={theme.accent} fill={theme.panel} line={theme.muted} shimmer={f / 90} />
      {/* Con số BH nằm gọn trong ô 64 bit */}
      <g opacity={a2}>
        <rect x={m + 8} y={yBig + 8} width={valW * a2} height={h - 16} rx={8} fill={theme.accent2} opacity={0.85} />
        <TextBlock text="BH" x={m + 30} y={yBig + h / 2 + (sq ? 12 : 16)} width={200} fontSize={sq ? 36 : 46} fill={theme.bg} anchor="start" />
        <TextBlock text="BH: độ lệch ngang của tên lửa" x={m + wBig} y={yBig + h + (sq ? 50 : 60)} width={wBig * (sq ? 1 : 0.6)} fontSize={sq ? 34 : 42} fill={theme.accent2} anchor="end" weight={400} />
      </g>
      <g opacity={a1}>
        <line x1={CX} y1={yBig + h + (sq ? 80 : 90)} x2={CX} y2={yBig + h + (sq ? 80 : 90) + Math.max(0, arrowLen - (sq ? 60 : 70))} stroke={theme.fg} strokeWidth={8} strokeLinecap="round" />
        <TextBlock text="đổi" x={CX + 30} y={(yBig + h + ySmall) / 2 + (sq ? 30 : 30)} width={200} fontSize={sq ? 36 : 44} fill={theme.fg} anchor="start" weight={400} />
        <polygon points={`${CX - 22},${ySmall - 34} ${CX + 22},${ySmall - 34} ${CX},${ySmall - 8}`} fill={theme.fg} opacity={p(f, t1 + 24, 8)} />
        <Reg x={xSmall} y={ySmall} w={wSmall} h={h} n={16} stroke={theme.warn} fill={theme.panel} line={theme.muted} shimmer={f / 60} />
        <TextBlock text="Số nguyên có dấu 16 bit" x={CX} y={ySmall + h + (sq ? 56 : 66)} width={W - 80} fontSize={fsL} fill={theme.warn} />
      </g>
    </Stage>
  );
};
