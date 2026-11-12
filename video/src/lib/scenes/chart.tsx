import React from "react";
import { useCurrentFrame } from "remotion";
import { clamp01, useTheme } from "../hooks";
import { Stage, useBox } from "../theme";
import type { SceneProps } from "../types";
import { appearAt, easeOutCubic, fmtNum, prog, T } from "./a-common";

interface Pt {
  label: string;
  value: number;
}

/** Hình học theo khung: `wide` giữ đúng số cũ; `square` (Short) 840x840. */
const WIDE = { left: 160, right: 1760, top: 220, bottom: 680, cx: 960, titleY: 110, titleSize: 52, titleW: 1500, titleLines: 1, valSize: 34, labelY: 775, labelSize: 34, labelLines: 1, barMax: 160 };
const SQUARE = { left: 40, right: 800, top: 230, bottom: 640, cx: 420, titleY: 80, titleSize: 44, titleW: 760, titleLines: 2, valSize: 32, labelY: 700, labelSize: 32, labelLines: 2, barMax: 130 };

/** Điểm/cột i hiện ở beat i. Cột mọc lên, đường nối dần tới điểm mới. */
export const Chart: React.FC<SceneProps> = ({ scene }) => {
  const theme = useTheme();
  const frame = useCurrentFrame();
  const G = useBox().layout === "square" ? SQUARE : WIDE;
  const LEFT = G.left;
  const RIGHT = G.right;
  const TOP = G.top;
  const BOTTOM = G.bottom;
  const p = scene.props;
  const kind = p.kind === "line" ? "line" : "bar";
  const title = typeof p.title === "string" ? p.title : "";
  const unit = typeof p.unit === "string" ? p.unit : "";
  const decimals = typeof p.decimals === "number" ? p.decimals : 0;
  const hi = typeof p.highlight === "number" ? p.highlight : -1;
  const data = (Array.isArray(p.data) ? p.data : []) as Pt[];
  const n = Math.max(1, data.length);
  const slot = (RIGHT - LEFT) / n;
  const vmax = Math.max(0, ...data.map((d) => d.value));
  const vmin = Math.min(0, ...data.map((d) => d.value));
  const span = vmax - vmin || 1;
  const yOf = (v: number): number => BOTTOM - ((v - vmin) / span) * (BOTTOM - TOP);
  const zeroY = yOf(0);
  const cx = (i: number): number => LEFT + (i + 0.5) * slot;
  const head = prog(frame, 0, 14);
  const colorOf = (i: number): string => (i === hi ? theme.accent2 : theme.accent);

  const lineParts: React.ReactNode[] = [];
  if (kind === "line") {
    for (let i = 1; i < data.length; i++) {
      const t = prog(frame, appearAt(scene, i) - 6, 14);
      if (t <= 0) continue;
      const x1 = cx(i - 1);
      const y1 = yOf(data[i - 1].value);
      lineParts.push(
        <line key={i} x1={x1} y1={y1} x2={x1 + (cx(i) - x1) * t} y2={y1 + (yOf(data[i].value) - y1) * t} stroke={theme.accent} strokeWidth={8} strokeLinecap="round" />,
      );
    }
  }
  return (
    <Stage>
      {title !== "" && <T x={G.cx} y={G.titleY} text={title} size={G.titleSize} width={G.titleW} maxLines={G.titleLines} fill={theme.fg} opacity={head} />}
      {[0.25, 0.5, 0.75, 1].map((g) => (
        <line key={g} x1={LEFT} y1={BOTTOM - g * (BOTTOM - TOP)} x2={RIGHT} y2={BOTTOM - g * (BOTTOM - TOP)} stroke={theme.muted} strokeWidth={2} opacity={0.25 * head} />
      ))}
      <line x1={LEFT} y1={zeroY} x2={RIGHT} y2={zeroY} stroke={theme.muted} strokeWidth={4} opacity={head} />
      {lineParts}
      {data.map((d, i) => {
        const at = appearAt(scene, i);
        const g = easeOutCubic((frame - at) / 22);
        const a = clamp01((frame - at) / 8);
        const w = Math.min(G.barMax, slot * 0.6);
        const y = yOf(d.value);
        const valY = d.value >= 0 ? yOf(d.value * g) - 16 : yOf(d.value * g) + 44;
        return (
          <g key={i}>
            {kind === "bar" ? (
              <rect x={cx(i) - w / 2} y={Math.min(zeroY, zeroY + (y - zeroY) * g)} width={w} height={Math.abs(y - zeroY) * g} rx={8} fill={colorOf(i)} />
            ) : (
              <circle cx={cx(i)} cy={y} r={14 * g} fill={colorOf(i)} stroke={theme.bg} strokeWidth={4} />
            )}
            <T
              x={cx(i)}
              y={kind === "line" ? yOf(d.value) - 28 : valY}
              text={`${fmtNum(d.value * (kind === "bar" ? g : 1), decimals)}${unit}`}
              size={G.valSize}
              width={slot - 10}
              maxLines={1}
              fill={theme.fg}
              opacity={a}
            />
            <T x={cx(i)} y={G.labelY} text={d.label} size={G.labelSize} width={slot - 10} maxLines={G.labelLines} fill={theme.muted} opacity={head} />
          </g>
        );
      })}
    </Stage>
  );
};
