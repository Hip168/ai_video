import React from "react";
import { clamp01, ease, useBeat, useSpring, useTheme } from "../hooks";
import { Stage } from "../theme";
import { maxCharsPerLine, wrapLines } from "../text";
import type { SceneProps } from "../types";
import { useCurrentFrame } from "remotion";

/** Bảng nền rộng 1640, trừ lề 60 mỗi bên. */
export const COLD_OPEN_TEXT_WIDTH = 1520;

export const ColdOpen: React.FC<SceneProps> = ({ scene }) => {
  const theme = useTheme();
  const frame = useCurrentFrame();
  const t = useBeat(scene, "hook");
  const hook = String(scene.props.hook ?? "");
  const kicker = typeof scene.props.kicker === "string" ? scene.props.kicker : "";
  const size = hook.length <= 24 ? 120 : hook.length <= 48 ? 92 : 72;
  const lines = wrapLines(hook, maxCharsPerLine(COLD_OPEN_TEXT_WIDTH, size));
  const lineH = size * 1.25;
  const top = 420 - ((lines.length - 1) * lineH) / 2;
  const pulse = (frame % 90) / 90;
  return (
    <Stage>
      <clipPath id="cold-open-clip">
        <rect x={0} y={0} width={1920} height={830} />
      </clipPath>
      <g clipPath="url(#cold-open-clip)">
      {[0, 1, 2].map((i) => {
        const p = (pulse + i / 3) % 1;
        return (
          <circle key={i} cx={960} cy={415} r={160 + p * 520} fill="none" stroke={theme.accent} strokeWidth={4} opacity={0.35 * (1 - p)} />
        );
      })}
      </g>
      <rect x={140} y={top - size} width={1640} height={lines.length * lineH + size * 0.6} rx={28} fill={theme.panel} opacity={0.85 * clamp01(t / 10 + 0.2)} />
      {kicker !== "" && (
        <text x={960} y={top - size - 30} fontSize={40} fontWeight={700} fill={theme.accent2} textAnchor="middle" opacity={useSpring(t, 0)}>
          {kicker}
        </text>
      )}
      {lines.map((line, i) => {
        const p = ease((t - i * 8) / 18);
        return (
          <text
            key={i}
            x={960}
            y={top + i * lineH}
            fontSize={size}
            fontWeight={700}
            fill={i % 2 === 0 ? theme.fg : theme.accent}
            textAnchor="middle"
            opacity={p}
            transform={`translate(0 ${(1 - p) * 40})`}
          >
            {line}
          </text>
        );
      })}
    </Stage>
  );
};
