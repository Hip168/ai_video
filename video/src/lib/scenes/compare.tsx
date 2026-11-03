import React from "react";
import { useCurrentFrame } from "remotion";
import { useTheme } from "../hooks";
import { Stage } from "../theme";
import type { SceneProps } from "../types";
import { appearAt, Cross, prog, T, Tick } from "./a-common";

const COL_A = 1280;
const COL_B = 1620;
const AREA_TOP = 250;
const AREA_H = 560;

interface Row {
  label: string;
  a: boolean;
  b: boolean;
}

export const Compare: React.FC<SceneProps> = ({ scene }) => {
  const theme = useTheme();
  const frame = useCurrentFrame();
  const titleA = String(scene.props.titleA ?? "");
  const titleB = String(scene.props.titleB ?? "");
  const rows = (Array.isArray(scene.props.rows) ? scene.props.rows : []) as Row[];
  const head = prog(frame, 0, 14);
  const pitch = Math.min(150, AREA_H / Math.max(rows.length, 1));
  const rowY = (i: number): number => AREA_TOP + pitch * (i + 0.5);
  const lineEnd = AREA_TOP + pitch * rows.length;
  return (
    <Stage>
      <T x={COL_A} y={150} text={titleA} size={50} width={310} maxLines={2} fill={theme.accent} opacity={head} lh={1.15} valign="middle" />
      <T x={COL_B} y={150} text={titleB} size={50} width={310} maxLines={2} fill={theme.accent2} opacity={head} lh={1.15} valign="middle" />
      <line x1={COL_A - 170} y1={AREA_TOP - 10} x2={COL_A - 170} y2={lineEnd} stroke={theme.muted} strokeWidth={3} opacity={0.5 * head} />
      <line x1={(COL_A + COL_B) / 2} y1={AREA_TOP - 10} x2={(COL_A + COL_B) / 2} y2={lineEnd} stroke={theme.muted} strokeWidth={3} opacity={0.35 * head} />
      {rows.map((row, i) => {
        const at = appearAt(scene, i);
        const a = prog(frame, at, 12);
        const cy = rowY(i);
        const mark = (ok: boolean, cx: number, delay: number) => {
          const p = prog(frame, at + delay, 14);
          return ok ? (
            <Tick cx={cx} cy={cy} r={32} p={p} color={theme.ok} ink={theme.bg} />
          ) : (
            <Cross cx={cx} cy={cy} r={32} p={p} color={theme.warn} ink={theme.bg} />
          );
        };
        return (
          <g key={i}>
            <rect x={100} y={cy - pitch / 2 + 8} width={1720} height={pitch - 16} rx={20} fill={theme.panel} opacity={a} transform={`translate(${(1 - a) * -40} 0)`} />
            <T x={140} y={cy} text={row.label} size={40} width={1000} maxLines={2} fill={theme.fg} anchor="start" lh={1.1} valign="middle" opacity={a} />
            {mark(row.a, COL_A, 6)}
            {mark(row.b, COL_B, 14)}
          </g>
        );
      })}
    </Stage>
  );
};
