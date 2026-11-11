import React from "react";
import { useCurrentFrame } from "remotion";
import { useSpring, useTheme } from "../../lib/hooks";
import { Stage } from "../../lib/theme";
import { fitText } from "../../lib/text";
import type { SceneProps } from "../../lib/types";

/** Cảnh demo nhẹ cho mọi `custom:*` của tập `_template`: tên cảnh và chữ beat đang chạy (neo theo beat). */
export const CanhMau: React.FC<SceneProps> = ({ scene }) => {
  const theme = useTheme();
  const frame = useCurrentFrame();
  const abs = scene.startFrame + frame;
  const beat = [...scene.beats].reverse().find((b) => b.startFrame <= abs);
  const t = beat ? abs - beat.startFrame : 0;
  const p = useSpring(t, 0);
  const name = scene.type.replace(/^custom:/, "");
  const title = fitText({ text: name, fontSize: 72, width: 1500, maxLines: 1 });
  const body = fitText({ text: beat?.text ?? "", fontSize: 56, width: 1500, maxLines: 3 });
  return (
    <Stage>
      <rect x={160} y={150} width={1600} height={520} rx={24} fill={theme.panel} stroke={theme.accent} strokeWidth={4} opacity={p} />
      <text x={960} y={260} fontSize={title.fontSize} fontWeight={700} fill={theme.accent2} textAnchor="middle">
        {title.lines[0]}
      </text>
      {body.lines.map((l, i) => (
        <text key={i} x={960} y={400 + i * (body.fontSize * 1.25)} fontSize={body.fontSize} fontWeight={700} fill={theme.fg} textAnchor="middle" opacity={p}>
          {l}
        </text>
      ))}
    </Stage>
  );
};
