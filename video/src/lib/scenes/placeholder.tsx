import React from "react";
import { useTheme } from "../hooks";
import { Stage } from "../theme";
import type { SceneProps } from "../types";

/** Cảnh giữ chỗ cho loại chưa làm (đề mục 7, 8 sẽ thay). */
export const Placeholder: React.FC<SceneProps & { type: string }> = ({ scene, type }) => {
  const theme = useTheme();
  return (
    <Stage>
      <rect x={360} y={300} width={1200} height={230} rx={24} fill={theme.panel} stroke={theme.warn} strokeWidth={6} strokeDasharray="24 16" />
      <text x={960} y={400} fontSize={56} fontWeight={700} fill={theme.fg} textAnchor="middle">
        Chưa làm: {type}
      </text>
      <text x={960} y={470} fontSize={36} fill={theme.muted} textAnchor="middle">
        cảnh {scene.id}
      </text>
    </Stage>
  );
};
