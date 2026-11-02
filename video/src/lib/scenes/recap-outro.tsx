import React from "react";
import { useCurrentFrame } from "remotion";
import { beatStartIn, ease, useTheme } from "../hooks";
import { Stage } from "../theme";
import type { SceneProps } from "../types";

export const RecapOutro: React.FC<SceneProps> = ({ scene }) => {
  const theme = useTheme();
  const frame = useCurrentFrame();
  const points = Array.isArray(scene.props.points) ? (scene.props.points as string[]) : [];
  const next = typeof scene.props.next === "string" ? scene.props.next : "";
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
        const size = [...p].length > 50 ? 40 : 48;
        return (
          <g key={i} opacity={a} transform={`translate(${(1 - a) * 50} 0)`}>
            <circle cx={300} cy={y - 14} r={30} fill={theme.ok} />
            <polyline points={`286,${y - 14} 296,${y - 4} 316,${y - 28}`} fill="none" stroke={theme.bg} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" />
            <text x={360} y={y} fontSize={size} fontWeight={700} fill={theme.fg}>
              {p}
            </text>
          </g>
        );
      })}
      {next !== "" && (
        <text x={960} y={760} fontSize={40} fill={theme.muted} textAnchor="middle" opacity={ease((frame - appearAt(points.length)) / 16)}>
          {next}
        </text>
      )}
    </Stage>
  );
};
