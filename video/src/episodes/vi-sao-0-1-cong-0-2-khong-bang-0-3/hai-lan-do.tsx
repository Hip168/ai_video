import React from "react";
import { useCurrentFrame } from "remotion";
import { useTheme } from "../../lib/hooks";
import { Stage } from "../../lib/theme";
import { TextBlock } from "../../lib/b-kit";
import type { SceneProps } from "../../lib/types";
import { Arrow, at, CX, p } from "./common";

const Y = 400;
const T1 = CX - 300;
const T2 = CX + 260;
const D = 110; // độ lệch vẽ (px)

/** Ra-đa so hai lần đo: cùng lệch thì khoảng cách giữa hai lần đo vẫn đúng (bù trừ); một lần qua đoạn mã mới thì hết bù trừ. */
export const HaiLanDo: React.FC<SceneProps> = ({ scene }) => {
  const theme = useTheme();
  const f = useCurrentFrame();
  const t0 = at(scene, 0);
  const t1 = at(scene, 1);
  const a0 = p(f, t0);
  const shifted = p(f, t0 + 30, 18);
  const fix = p(f, t1 + 10, 20);
  const d1 = D * shifted;
  const d2 = D * shifted * (1 - fix);
  const M1 = T1 + d1;
  const M2 = T2 + d2;
  const gapColor = fix < 0.5 ? theme.ok : theme.warn;
  const bracket = (x1: number, x2: number, y: number, color: string, op: number) => (
    <path d={`M${x1} ${y - 18} L${x1} ${y} L${x2} ${y} L${x2} ${y - 18}`} fill="none" stroke={color} strokeWidth={6} opacity={op} />
  );
  const mark = (x: number, label: string) => (
    <g>
      <line x1={x} y1={Y - 50} x2={x} y2={Y + 50} stroke={theme.fg} strokeWidth={6} strokeLinecap="round" />
      <TextBlock text={label} x={x} y={Y - 90} width={360} fontSize={42} fill={theme.fg} />
    </g>
  );
  return (
    <Stage>
      <g opacity={a0}>
        <line x1={CX - 700} y1={Y} x2={CX + 700} y2={Y} stroke={theme.muted} strokeWidth={5} strokeLinecap="round" />
        {mark(T1, "lần đo 1")}
        {mark(T2, "lần đo 2")}
      </g>
      <g opacity={shifted}>
        <circle cx={M1} cy={Y} r={22} fill={theme.accent2} />
        <circle cx={M2} cy={Y} r={22} fill={theme.accent2} />
        {d1 > 24 && <Arrow x1={T1 + 8} y1={Y + 80} x2={M1} y2={Y + 80} color={theme.accent2} width={5} />}
        {d2 > 24 && <Arrow x1={T2 + 8} y1={Y + 80} x2={M2} y2={Y + 80} color={theme.accent2} width={5} />}
        {bracket(M1, M2, Y + 200, gapColor, 1)}
        {bracket(T1, T2, Y + 260, theme.muted, 0.8)}
      </g>
      <TextBlock text="độ lệch tự bù trừ" x={CX} y={Y + 370} width={1000} fontSize={56} fill={theme.ok} opacity={shifted * (1 - p(f, t1 + 10, 8))} />
      <g opacity={fix}>
        <rect x={T2 - 180} y={Y - 230} width={360} height={74} rx={37} fill={theme.accent} />
        <TextBlock text="đoạn mã mới" x={T2} y={Y - 180} width={330} fontSize={38} fill={theme.bg} />
        <TextBlock text="không còn triệt tiêu" x={CX} y={Y + 370} width={1000} fontSize={56} fill={theme.warn} opacity={p(f, t1 + 20, 12)} />
      </g>
    </Stage>
  );
};
