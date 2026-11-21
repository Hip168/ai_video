import React from "react";
import { useCurrentFrame } from "remotion";
import { useTheme } from "../hooks";
import { Stage, useBox } from "../theme";
import type { SceneProps } from "../types";
import { appearAt, Cross, prog, T, Tick } from "./a-common";

/** Hình học theo khung: `wide` giữ đúng số cũ; `square` (Short) 840x840. */
const WIDE = { colA: 1280, colB: 1620, top: 250, h: 560, titleY: 150, titleW: 310, titleSize: 50, divX: 1280 - 170, rowX: 100, rowW: 1720, labelX: 140, labelW: 1000, labelSize: 40, labelLines: 2, r: 32, pitch: 150 };
const SQUARE = { colA: 515, colB: 705, top: 210, h: 600, titleY: 110, titleW: 180, titleSize: 32, divX: 425, rowX: 41, rowW: 758, labelX: 60, labelW: 355, labelSize: 40, labelLines: 2, r: 28, pitch: 180 }; // hàng cao hơn: nhãn 3 dòng không tràn hộp; hàng x 41..799 để lề Short (hộp 984 tại x 48) >= 96 px

interface Row {
  label: string;
  a: boolean;
  b: boolean;
}

export const Compare: React.FC<SceneProps> = ({ scene }) => {
  const theme = useTheme();
  const frame = useCurrentFrame();
  const G = useBox().layout === "square" ? SQUARE : WIDE;
  const COL_A = G.colA;
  const COL_B = G.colB;
  const AREA_TOP = G.top;
  const AREA_H = G.h;
  const titleA = String(scene.props.titleA ?? "");
  const titleB = String(scene.props.titleB ?? "");
  const rows = (Array.isArray(scene.props.rows) ? scene.props.rows : []) as Row[];
  const head = prog(frame, 0, 14);
  const pitch = Math.min(G.pitch, AREA_H / Math.max(rows.length, 1));
  const rowY = (i: number): number => AREA_TOP + pitch * (i + 0.5);
  const lineEnd = AREA_TOP + pitch * rows.length;
  return (
    <Stage>
      <T x={COL_A} y={G.titleY} text={titleA} size={G.titleSize} width={G.titleW} maxLines={G === SQUARE ? 3 : 2} fill={theme.accent} opacity={head} lh={1.15} valign="middle" />
      <T x={COL_B} y={G.titleY} text={titleB} size={G.titleSize} width={G.titleW} maxLines={G === SQUARE ? 3 : 2} fill={theme.accent2} opacity={head} lh={1.15} valign="middle" />
      <line x1={G.divX} y1={AREA_TOP - 10} x2={G.divX} y2={lineEnd} stroke={theme.muted} strokeWidth={3} opacity={0.5 * head} />
      <line x1={(COL_A + COL_B) / 2} y1={AREA_TOP - 10} x2={(COL_A + COL_B) / 2} y2={lineEnd} stroke={theme.muted} strokeWidth={3} opacity={0.35 * head} />
      {rows.map((row, i) => {
        const at = appearAt(scene, i);
        const a = prog(frame, at, 12);
        const cy = rowY(i);
        const mark = (ok: boolean, cx: number, delay: number) => {
          const p = prog(frame, at + delay, 14);
          return ok ? (
            <Tick cx={cx} cy={cy} r={G.r} p={p} color={theme.ok} ink={theme.bg} />
          ) : (
            <Cross cx={cx} cy={cy} r={G.r} p={p} color={theme.warn} ink={theme.bg} />
          );
        };
        return (
          <g key={i}>
            <rect x={G.rowX} y={cy - pitch / 2 + 8} width={G.rowW} height={pitch - 16} rx={20} fill={theme.panel} opacity={a} transform={`translate(${(1 - a) * -40} 0)`} />
            <T x={G.labelX} y={cy} text={row.label} size={G.labelSize} width={G.labelW} maxLines={G === SQUARE && rows.length <= 4 ? 3 : G.labelLines} fill={theme.fg} anchor="start" lh={1.1} valign="middle" opacity={a} />
            {mark(row.a, COL_A, 6)}
            {mark(row.b, COL_B, 14)}
          </g>
        );
      })}
    </Stage>
  );
};
