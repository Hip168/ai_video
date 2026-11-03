import React from "react";
import { useCurrentFrame } from "remotion";
import { ease, useTheme } from "../hooks";
import { Stage } from "../theme";
import { fitText, MIN_MARGIN } from "../text";
import type { SceneProps } from "../types";

/** Bề rộng khả dụng của chữ: bên phải số (x từ 780, lề phải MIN_MARGIN) hoặc căn giữa. */
export const CHAPTER_WIDTH_WITH_NUMBER = 1920 - 780 - MIN_MARGIN;
export const CHAPTER_WIDTH_CENTERED = 1600;

export const ChapterTitle: React.FC<SceneProps> = ({ scene }) => {
  const theme = useTheme();
  const frame = useCurrentFrame();
  const title = String(scene.props.title ?? "");
  const number = typeof scene.props.number === "number" ? scene.props.number : null;
  const subtitle = typeof scene.props.subtitle === "string" ? scene.props.subtitle : "";
  const hasNum = number !== null;
  const width = hasNum ? CHAPTER_WIDTH_WITH_NUMBER : CHAPTER_WIDTH_CENTERED;
  const { lines, fontSize: size } = fitText({ text: title, fontSize: title.length <= 24 ? 100 : 76, width, maxLines: 2 });
  const sub = fitText({ text: subtitle, fontSize: 42, width, maxLines: 2 });
  const subLines = sub.lines;
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
      {subLines.map((l, i) => (
        <text key={i} x={x0} y={underY + 70 + i * sub.fontSize * 1.25} fontSize={sub.fontSize} fill={theme.muted} textAnchor={anchor} opacity={ease((frame - 20 - i * 4) / 16)}>
          {l}
        </text>
      ))}
    </Stage>
  );
};
