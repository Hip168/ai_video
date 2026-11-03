import React from "react";
import { useCurrentFrame } from "remotion";
import { beatStartIn, ease, useTheme } from "../hooks";
import { Stage } from "../theme";
import { fitText, MIN_MARGIN } from "../text";
import type { SceneProps } from "../types";

/** Chữ điểm bắt đầu ở x=360, lề phải MIN_MARGIN. */
export const RECAP_POINT_WIDTH = 1920 - 360 - MIN_MARGIN;
export const RECAP_NEXT_WIDTH = 1700;

export const RecapOutro: React.FC<SceneProps> = ({ scene }) => {
  const theme = useTheme();
  const frame = useCurrentFrame();
  const points = Array.isArray(scene.props.points) ? (scene.props.points as string[]) : [];
  const next = typeof scene.props.next === "string" ? scene.props.next : "";
  const nextFit = fitText({ text: next, fontSize: 36, width: RECAP_NEXT_WIDTH, maxLines: 2 });
  const nb = scene.beats.length;
  const appearAt = (i: number): number =>
    nb === 0 ? 10 + i * 20 : beatStartIn(scene, i) + (i >= nb ? (i - nb + 1) * 10 : 0);
  return (
    <Stage>
      <text x={960} y={130} fontSize={64} fontWeight={700} fill={theme.accent2} textAnchor="middle" opacity={ease(frame / 14)}>
        Tóm lại
      </text>
      {points.map((p, i) => {
        const a = ease((frame - appearAt(i)) / 14);
        const y = 240 + i * 100;
        const fit = fitText({ text: p, fontSize: 48, width: RECAP_POINT_WIDTH, maxLines: 2 });
        const size = fit.fontSize;
        const pl = fit.lines;
        const dy = pl.length > 1 ? -(pl.length - 1) * size * 0.5 : 0;
        return (
          <g key={i} opacity={a} transform={`translate(${(1 - a) * 50} 0)`}>
            <circle cx={300} cy={y - 14} r={30} fill={theme.ok} />
            <polyline points={`286,${y - 14} 296,${y - 4} 316,${y - 28}`} fill="none" stroke={theme.bg} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" />
            {pl.map((l, k) => (
              <text key={k} x={360} y={y + dy + k * size * 1.1} fontSize={size} fontWeight={700} fill={theme.fg}>
                {l}
              </text>
            ))}
          </g>
        );
      })}
      {nextFit.lines.map((l, k) => (
        <text key={k} x={960} y={760 + k * nextFit.fontSize * 1.2} fontSize={nextFit.fontSize} fill={theme.muted} textAnchor="middle" opacity={ease((frame - appearAt(points.length)) / 16)}>
          {l}
        </text>
      ))}
    </Stage>
  );
};
