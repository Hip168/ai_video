import React, { useMemo } from "react";
import { useCurrentFrame } from "remotion";
import { ease, useTheme } from "../hooks";
import { assertShortText, Stage, useBox } from "../theme";
import { fitText } from "../text";
import type { SceneProps } from "../types";

/** Lề trái, phải tối thiểu của chữ ở khung ngang (vùng an toàn chữ). */
export const CHAPTER_SIDE_MARGIN = 96;
/** Bề rộng khả dụng của chữ: bên phải số (x từ 780, lề phải CHAPTER_SIDE_MARGIN) hoặc căn giữa. */
export const CHAPTER_WIDTH_WITH_NUMBER = 1920 - 780 - CHAPTER_SIDE_MARGIN;
export const CHAPTER_WIDTH_CENTERED = 1600;

export const ChapterTitle: React.FC<SceneProps> = ({ scene }) => {
  const theme = useTheme();
  const frame = useCurrentFrame();
  const title = String(scene.props.title ?? "");
  const number = typeof scene.props.number === "number" ? scene.props.number : null;
  const subtitle = typeof scene.props.subtitle === "string" ? scene.props.subtitle : "";
  const hasNum = number !== null;
  // Khung vuông (Short): số ở trên, chữ căn giữa bên dưới.
  const box = useBox();
  const sq = box.layout === "square";
  const width = sq ? 760 : hasNum ? CHAPTER_WIDTH_WITH_NUMBER : CHAPTER_WIDTH_CENTERED;
  const baseSize = sq ? (title.length <= 24 ? 84 : 64) : title.length <= 24 ? 100 : 76;
  const { lines, fontSize: size } = useMemo(
    () => fitText({ text: title, fontSize: baseSize, width, maxLines: 2 }),
    [title, baseSize, width],
  );
  const sub = useMemo(() => fitText({ text: subtitle, fontSize: sq ? 44 : 42, width, maxLines: 2 }), [subtitle, width, sq]);
  const subLines = sub.lines;
  assertShortText(box, size, title);
  if (subtitle !== "") assertShortText(box, sub.fontSize, subtitle);
  const left = hasNum && !sq; // chữ bên phải số (khung ngang)
  const cx = sq ? 420 : 960;
  const x0 = left ? 780 : cx;
  const anchor = left ? "start" : "middle";
  const a = ease(frame / 18);
  const line = ease((frame - 6) / 24);
  const lineH = size * 1.25;
  const top = (sq ? (hasNum ? 520 : 400) : 400) - ((lines.length - 1) * lineH) / 2;
  const underY = top + (lines.length - 1) * lineH + 40;
  return (
    <Stage>
      {hasNum && (
        <g opacity={a} transform={sq ? `translate(0 ${(1 - a) * -40})` : `translate(${(1 - a) * -60} 0)`}>
          <circle cx={sq ? 420 : 470} cy={sq ? 230 : 415} r={sq ? 130 : 190} fill={theme.panel} stroke={theme.accent} strokeWidth={8} />
          <text x={sq ? 420 : 470} y={sq ? 230 + 48 : 415 + 70} fontSize={sq ? 140 : 200} fontWeight={700} fill={theme.accent} textAnchor="middle">
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
        x1={left ? x0 : cx - 260 * line}
        y1={underY}
        x2={left ? x0 + 520 * line : cx + 260 * line}
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
