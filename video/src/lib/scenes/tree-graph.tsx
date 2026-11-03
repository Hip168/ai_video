import React, { useMemo } from "react";
import { useCurrentFrame } from "remotion";
import { ease, useTheme } from "../hooks";
import { Stage } from "../theme";
import { itemStart, TextBlock } from "../b-kit";
import { layoutTree } from "../layout-tree";
import type { SceneProps } from "../types";

export const TreeGraph: React.FC<SceneProps> = ({ scene }) => {
  const theme = useTheme();
  const frame = useCurrentFrame();
  const path = (Array.isArray(scene.props.path) ? scene.props.path : []) as string[];
  const key = JSON.stringify(scene.props.nodes);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const lay = useMemo(() => layoutTree(scene.props), [key]);
  if (lay.boxes.length === 0) return <Stage />;
  const pos = new Map(lay.boxes.map((bx) => [bx.id, bx]));
  const nBeat = lay.depth + 1; // mỗi tầng một beat, rồi một beat cho đường đi
  const pathStart = itemStart(scene, lay.depth, nBeat);
  const onPath = new Map<string, number>();
  path.forEach((id, i) => {
    if (pos.has(id)) onPath.set(id, pathStart + 6 + i * 10);
  });
  const fs = Math.max(22, 32 * lay.scale);
  const w = lay.boxes[0].w;
  const h = lay.boxes[0].h;
  return (
    <Stage>
      {lay.links.map((l) => {
        const a = pos.get(l.from)!;
        const b = pos.get(l.to)!;
        const p = ease((frame - itemStart(scene, b.depth, nBeat)) / 14);
        const hot = onPath.has(l.from) && onPath.has(l.to) && frame >= (onPath.get(l.to) ?? Infinity);
        const my = (a.y + a.h + b.y) / 2;
        return (
          <path
            key={`${l.from}>${l.to}`}
            d={`M ${a.x + a.w / 2} ${a.y + a.h} C ${a.x + a.w / 2} ${my}, ${b.x + b.w / 2} ${my}, ${b.x + b.w / 2} ${b.y}`}
            fill="none"
            stroke={hot ? theme.accent2 : theme.muted}
            strokeWidth={hot ? 8 : 4}
            opacity={p}
          />
        );
      })}
      {lay.boxes.map((q) => {
        const id = q.id;
        const p = ease((frame - itemStart(scene, q.depth, nBeat)) / 14);
        const hot = frame >= (onPath.get(id) ?? Infinity);
        return (
          <g key={id} opacity={p} transform={`translate(0 ${(1 - p) * -30})`}>
            <rect x={q.x} y={q.y} width={w} height={h} rx={16 * lay.scale} fill={hot ? theme.accent2 : theme.panel} stroke={hot ? theme.accent2 : theme.accent} strokeWidth={4} />
            <TextBlock text={q.label} x={q.x + w / 2} y={q.y + h / 2 + fs * 0.35} width={w - 20} fontSize={fs} fill={hot ? theme.bg : theme.fg} />
          </g>
        );
      })}
    </Stage>
  );
};
