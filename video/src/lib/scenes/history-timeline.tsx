import React from "react";
import { useCurrentFrame } from "remotion";
import { useTheme } from "../hooks";
import { Stage } from "../theme";
import type { SceneProps } from "../types";
import { appearAt, prog, T } from "./a-common";

interface Ev {
  year: string;
  title: string;
  detail?: string;
}

const LINE_Y = 300;
const X_L = 230;
const X_R = 1690;

/** Sự kiện i hiện ở beat i; đường thời gian vẽ nối tới sự kiện đó. */
export const HistoryTimeline: React.FC<SceneProps> = ({ scene }) => {
  const theme = useTheme();
  const frame = useCurrentFrame();
  const events = (Array.isArray(scene.props.events) ? scene.props.events : []) as Ev[];
  const n = events.length;
  const spacing = n > 1 ? (X_R - X_L) / (n - 1) : 0;
  const colW = Math.min(360, spacing - 20);
  const xs = events.map((_, i) => X_L + i * spacing);
  // Độ dài đường đã vẽ: tới nút i khi frame đạt appearAt(i).
  let lineX = X_L;
  events.forEach((_, i) => {
    if (i === 0) return;
    const t = prog(frame, appearAt(scene, i) - 10, 14);
    lineX = Math.max(lineX, xs[i - 1] + (xs[i] - xs[i - 1]) * t);
  });
  return (
    <Stage>
      <line x1={X_L} y1={LINE_Y} x2={X_R} y2={LINE_Y} stroke={theme.muted} strokeWidth={6} opacity={0.35} strokeLinecap="round" />
      <line x1={X_L} y1={LINE_Y} x2={lineX} y2={LINE_Y} stroke={theme.accent} strokeWidth={6} strokeLinecap="round" />
      {events.map((ev, i) => {
        const a = prog(frame, appearAt(scene, i), 14);
        const x = xs[i];
        return (
          <g key={i} opacity={a} transform={`translate(0 ${(1 - a) * 30})`}>
            <T x={x} y={LINE_Y - 56} text={ev.year} size={64} width={colW} maxLines={1} fill={theme.accent2} />
            <circle cx={x} cy={LINE_Y} r={20 * (0.5 + 0.5 * a)} fill={theme.accent} stroke={theme.bg} strokeWidth={6} />
            <T x={x} y={LINE_Y + 100} text={ev.title} size={44} width={colW} maxLines={3} fill={theme.fg} lh={1.2} />
            {ev.detail ? <T x={x} y={LINE_Y + 290} text={ev.detail} size={32} width={colW} maxLines={4} fill={theme.muted} lh={1.3} /> : null}
          </g>
        );
      })}
    </Stage>
  );
};
