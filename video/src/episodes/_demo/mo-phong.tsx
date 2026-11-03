import React from "react";
import { useBeat, useSpring, useTheme } from "../../lib/hooks";
import { Stage } from "../../lib/theme";
import type { SceneProps } from "../../lib/types";

/** Cảnh riêng mẫu cho `custom:mo-phong` của timeline2.sample.json: công tắc bật tắt. */
export const MoPhong: React.FC<SceneProps> = ({ scene }) => {
  const theme = useTheme();
  const t = useBeat(scene, 0);
  const on = t >= 30;
  const p = useSpring(t, 0);
  return (
    <Stage>
      <line x1={420} y1={415} x2={760} y2={415} stroke={theme.muted} strokeWidth={10} strokeLinecap="round" />
      <line x1={1160} y1={415} x2={1500} y2={415} stroke={on ? theme.accent2 : theme.muted} strokeWidth={10} strokeLinecap="round" />
      <circle cx={760} cy={415} r={16} fill={theme.fg} />
      <circle cx={1160} cy={415} r={16} fill={theme.fg} />
      <line x1={760} y1={415} x2={on ? 1160 : 1100} y2={on ? 415 : 300} stroke={theme.accent} strokeWidth={12} strokeLinecap="round" opacity={p} />
      <circle cx={1640} cy={415} r={70} fill={on ? theme.accent2 : theme.panel} stroke={theme.accent2} strokeWidth={6} />
      <text x={960} y={620} fontSize={60} fontWeight={700} fill={theme.fg} textAnchor="middle">
        {on ? "1 — đóng" : "0 — hở"}
      </text>
    </Stage>
  );
};
