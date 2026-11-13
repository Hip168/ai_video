import React, { useMemo } from "react";
import { clamp01, ease, useBeat, useSpring, useTheme } from "../hooks";
import { assertShortText, shortMinScale, Stage, useBox } from "../theme";
import { fitText, MIN_MARGIN } from "../text";
import type { SceneProps } from "../types";
import { useCurrentFrame } from "remotion";

/** Bảng nền rộng 1640, trừ lề MIN_MARGIN mỗi bên. */
export const COLD_OPEN_PANEL_WIDTH = 1640;
export const COLD_OPEN_TEXT_WIDTH = COLD_OPEN_PANEL_WIDTH - 2 * MIN_MARGIN;

/** Hình học theo khung: `wide` giữ đúng số cũ; `square` (Short) 840x840. */
const WIDE = { w: 1920, h: 830, cx: 960, cy: 415, ty: 420, panelX: 140, panelW: COLD_OPEN_PANEL_WIDTH, textW: COLD_OPEN_TEXT_WIDTH, sizes: [120, 92, 72], kick: 40, r0: 160, r1: 520 };
const SQUARE = { w: 840, h: 840, cx: 420, cy: 420, ty: 440, panelX: 30, panelW: 780, textW: 780 - 2 * MIN_MARGIN, sizes: [96, 76, 60], kick: 44, r0: 90, r1: 300 };

/**
 * Chuyển động dòng hook thứ `i` ở nhịp `t`: chữ hiện đủ ngay từ frame 0 (không
 * mờ dần, tránh frame đầu tập trống), chỉ trượt nhẹ lên vị trí.
 */
export const hookLineMotion = (t: number, i: number): { opacity: number; dy: number } => ({
  opacity: 1,
  dy: (1 - ease((t - i * 8) / 18)) * 40,
});

export const ColdOpen: React.FC<SceneProps> = ({ scene }) => {
  const theme = useTheme();
  const frame = useCurrentFrame();
  const box = useBox();
  const G = box.layout === "square" ? SQUARE : WIDE;
  const t = useBeat(scene, "hook");
  const hook = String(scene.props.hook ?? "");
  const kicker = typeof scene.props.kicker === "string" ? scene.props.kicker : "";
  const baseSize = hook.length <= 24 ? G.sizes[0] : hook.length <= 48 ? G.sizes[1] : G.sizes[2];
  const minScale = shortMinScale(box, baseSize);
  const { lines, fontSize: size } = useMemo(
    () => fitText({ text: hook, fontSize: baseSize, width: G.textW, maxLines: 3, minScale }),
    [hook, baseSize, G.textW, minScale],
  );
  const kick = useMemo(() => fitText({ text: kicker, fontSize: G.kick, width: G.textW, maxLines: 1 }), [kicker, G.kick, G.textW]);
  assertShortText(box, size, hook);
  if (kicker !== "") assertShortText(box, kick.fontSize, kicker);
  const lineH = size * 1.25;
  const top = G.ty - ((lines.length - 1) * lineH) / 2;
  const pulse = (frame % 90) / 90;
  return (
    <Stage>
      <clipPath id="cold-open-clip">
        <rect x={0} y={0} width={G.w} height={G.h} />
      </clipPath>
      <g clipPath="url(#cold-open-clip)">
      {[0, 1, 2].map((i) => {
        const p = (pulse + i / 3) % 1;
        return (
          <circle key={i} cx={G.cx} cy={G.cy} r={G.r0 + p * G.r1} fill="none" stroke={theme.accent} strokeWidth={4} opacity={0.35 * (1 - p)} />
        );
      })}
      </g>
      <rect x={G.panelX} y={top - size} width={G.panelW} height={lines.length * lineH + size * 0.6} rx={28} fill={theme.panel} opacity={0.85 * clamp01(t / 10 + 0.2)} />
      {kicker !== "" && (
        <text x={G.cx} y={top - size - 30} fontSize={kick.fontSize} fontWeight={700} fill={theme.accent2} textAnchor="middle" opacity={useSpring(t, 0)}>
          {kick.lines[0]}
        </text>
      )}
      {lines.map((line, i) => {
        const m = hookLineMotion(t, i);
        return (
          <text
            key={i}
            x={G.cx}
            y={top + i * lineH}
            fontSize={size}
            fontWeight={700}
            fill={i % 2 === 0 ? theme.fg : theme.accent}
            textAnchor="middle"
            opacity={m.opacity}
            transform={`translate(0 ${m.dy})`}
          >
            {line}
          </text>
        );
      })}
    </Stage>
  );
};
