import React from "react";
import { useCurrentFrame } from "remotion";
import { ease, useTheme } from "../hooks";
import { Stage } from "../theme";
import { wrapLines } from "../text";
import type { SceneProps } from "../types";

export const ChapterTitle: React.FC<SceneProps> = ({ scene }) => {
  const theme = useTheme();
  const frame = useCurrentFrame();
  const title = String(scene.props.title ?? "");
  const number = typeof scene.props.number === "number" ? scene.props.number : null;
  const subtitle = typeof scene.props.subtitle === "string" ? scene.props.subtitle : "";
  const hasNum = number !== null;
  const size = title.length <= 24 ? 100 : 76;
  const lines = wrapLines(title, Math.floor((hasNum ? 1050 : 1600) / (size * 0.56)));
  const x0 = hasNum ? 780 : 960;
  const anchor = hasNum ? "start" : "middle";
  const a = ease(frame / 18);
  const line = ease((frame - 6) / 24);
  const lineH = size * 1.25;
  const top = 400 - ((lines.length - 1) * lineH) / 2;
  const underY = top + (lines.length - 1) * lineH + 40;
  return (
    <Stage>
      {hasNum && (
        <g opacity={a} transform={`translate(${(1 - a) * -60} 0)`}>
          <circle cx={470} cy={415} r={190} fill={theme.panel} stroke={theme.accent} strokeWidth={8} />
          <text x={470} y={415 + 70} fontSize={200} fontWeight={700} fill={theme.accent} textAnchor="middle">
            {String(number).padStart(2, "0")}
          </text>
        </g>
      )}
      {lines.map((l, i) => (
        <text
          key={i}
          x={x0}
          y={top + i * lineH}
          fontSize={size}
          fontWeight={700}
          fill={theme.fg}
          textAnchor={anchor}
          opacity={ease((frame - 4 - i * 6) / 16)}
        >
          {l}
        </text>
      ))}
      <line
        x1={hasNum ? x0 : 960 - 260 * line}
        y1={underY}
        x2={hasNum ? x0 + 520 * line : 960 + 260 * line}
        y2={underY}
        stroke={theme.accent2}
        strokeWidth={8}
        strokeLinecap="round"
      />
      {subtitle !== "" && (
        <text x={x0} y={underY + 70} fontSize={42} fill={theme.muted} textAnchor={anchor} opacity={ease((frame - 20) / 16)}>
          {subtitle}
        </text>
      )}
    </Stage>
  );
};
