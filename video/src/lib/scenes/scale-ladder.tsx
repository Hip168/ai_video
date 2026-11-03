import React from "react";
import { useCurrentFrame } from "remotion";
import { ease, useTheme } from "../hooks";
import { Stage } from "../theme";
import { itemStart, lerp, startedCount, TextBlock } from "../b-kit";
import type { SceneProps } from "../types";

interface RungIn {
  label: string;
  value: string;
  power: number;
}

const TOP = 60;
const AREA = 700;
const X0 = 560;
const MAXW = 1240;

/** Bậc thang cỡ lớn: rung 0 ở dưới cùng, mỗi beat leo thêm một bậc. Độ dài thanh theo mũ 10 (thang log). */
export const ScaleLadder: React.FC<SceneProps> = ({ scene }) => {
  const theme = useTheme();
  const frame = useCurrentFrame();
  const rungs = (Array.isArray(scene.props.rungs) ? scene.props.rungs : []) as RungIn[];
  const n = rungs.length;
  const pw = rungs.map((r) => (typeof r.power === "number" ? r.power : 0));
  const lo = Math.min(...pw, 0);
  const hi = Math.max(...pw, lo + 1);
  const gap = 16;
  const h = Math.min(100, (AREA - gap * (n - 1)) / Math.max(1, n));
  const fs = Math.min(40, h * 0.42);
  const rowY = (i: number) => TOP + (n - 1 - i) * (h + gap);
  const cur = Math.max(0, startedCount(frame, scene, n) - 1);
  // Mốc leo: nằm giữa bậc đang tới và bậc kế, trượt theo frame.
  const prevAt = itemStart(scene, cur, n);
  const markFrom = rowY(Math.max(0, cur - 1)) + h / 2;
  const markTo = rowY(cur) + h / 2;
  const markY = cur === 0 ? markTo : lerp(markFrom, markTo, ease((frame - prevAt) / 16));
  return (
    <Stage>
      <line x1={X0 - 36} y1={TOP} x2={X0 - 36} y2={TOP + AREA} stroke={theme.muted} strokeWidth={4} opacity={0.6} />
      {rungs.map((r, i) => {
        const a = ease((frame - itemStart(scene, i, n)) / 16);
        const y = rowY(i);
        const wFinal = (0.3 + 0.7 * ((pw[i] - lo) / (hi - lo))) * MAXW;
        const w = wFinal * a;
        const isCur = i === cur;
        const vw = r.value.length * fs * 0.85 * 0.6; // độ rộng chữ giá trị ước lượng
        return (
          <g key={i} opacity={Math.min(1, a * 1.5)}>
            <TextBlock text={r.label} x={X0 - 64} y={y + h / 2 + fs * 0.35} width={440} fontSize={fs} maxLines={2} fill={isCur ? theme.accent2 : theme.fg} anchor="end" lineHeight={1.05} />
            <rect x={X0} y={y} width={w} height={h} rx={16} fill={isCur ? theme.accent : theme.panel} stroke={theme.accent} strokeWidth={4} />
            {a > 0.6 && (w >= vw + 48
              ? <TextBlock text={r.value} x={X0 + w - 24} y={y + h / 2 + fs * 0.35} width={w - 48} fontSize={fs * 0.85} fill={isCur ? theme.bg : theme.fg} anchor="end" />
              : <TextBlock text={r.value} x={X0 + w + 24} y={y + h / 2 + fs * 0.35} width={Math.min(vw + 8, 1880 - (X0 + w + 24))} fontSize={fs * 0.85} fill={theme.fg} anchor="start" />)}
          </g>
        );
      })}
      <polygon points={`${X0 - 36},${markY} ${X0 - 12},${markY - 16} ${X0 - 12},${markY + 16}`} fill={theme.accent2} />
    </Stage>
  );
};
