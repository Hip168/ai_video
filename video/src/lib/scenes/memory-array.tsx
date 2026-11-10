import React from "react";
import { useCurrentFrame } from "remotion";
import { ease, useTheme } from "../hooks";
import { Stage } from "../theme";
import { itemStart, lerp, TextBlock } from "../b-kit";
import type { SceneProps } from "../types";

/** Mảng trong bộ nhớ: ô, chỉ số, địa chỉ (base + i * size); mỗi beat sau đó con trỏ nhảy tới một chỉ số trong `access`. */
export const MemoryArray: React.FC<SceneProps> = ({ scene }) => {
  const theme = useTheme();
  const frame = useCurrentFrame();
  const cells = (Array.isArray(scene.props.cells) ? scene.props.cells : []).map(String);
  const n = cells.length;
  const name = typeof scene.props.name === "string" ? scene.props.name : "";
  const base = typeof scene.props.base === "number" ? scene.props.base : 4096;
  const size = typeof scene.props.size === "number" && scene.props.size >= 1 ? Math.floor(scene.props.size) : 4;
  const access = (Array.isArray(scene.props.access) ? scene.props.access : [])
    .filter((v): v is number => typeof v === "number")
    .map((v) => Math.min(n - 1, Math.max(0, Math.floor(v))));
  const m = access.length + 1;
  const cell = Math.min(170, Math.floor(1760 / Math.max(1, n)));
  const total = n * cell;
  const x0 = (1920 - total) / 2;
  const yCell = 330;
  const ch = cell * 0.85;
  const hex = (v: number) => `0x${v.toString(16).toUpperCase().padStart(4, "0")}`;
  // Chỉ số của con trỏ: nội suy giữa hai lần truy cập liên tiếp.
  const started = access.map((_, k) => itemStart(scene, k + 1, m));
  let k = -1;
  for (let j = 0; j < access.length; j++) if (frame >= started[j]) k = j;
  const from = k > 0 ? access[k - 1] : k === 0 ? access[0] : 0;
  const to = k >= 0 ? access[k] : 0;
  const move = k <= 0 ? 1 : ease((frame - started[k]) / 16);
  const ptr = lerp(from, to, move);
  const px = x0 + (ptr + 0.5) * cell;
  const settled = k >= 0 && move >= 1;
  return (
    <Stage>
      {name !== "" && <TextBlock text={name} x={960} y={90} width={1400} fontSize={56} fill={theme.fg} />}
      {cells.map((v, i) => {
        const x = x0 + i * cell;
        const a = ease((frame - itemStart(scene, 0, m) - i * 3) / 12);
        const hot = settled && i === to;
        return (
          <g key={i} opacity={a} transform={`translate(0 ${(1 - a) * 30})`}>
            <TextBlock text={hex(base + i * size)} x={x + cell / 2} y={yCell - 24} width={cell - 8} fontSize={Math.min(30, cell * 0.2)} fill={theme.muted} weight={400} />
            <rect x={x + 3} y={yCell} width={cell - 6} height={ch} rx={12} fill={hot ? theme.accent2 : theme.panel} stroke={hot ? theme.accent2 : theme.accent} strokeWidth={5} />
            <TextBlock text={v} x={x + cell / 2} y={yCell + ch / 2 + Math.min(52, cell * 0.34) * 0.35} width={cell - 24} fontSize={Math.min(52, cell * 0.34)} fill={hot ? theme.bg : theme.fg} />
            <TextBlock text={`[${i}]`} x={x + cell / 2} y={yCell + ch + 48} width={cell - 8} fontSize={Math.min(34, cell * 0.22)} fill={hot ? theme.accent2 : theme.muted} />
          </g>
        );
      })}
      {k >= 0 && (
        <g>
          <polygon points={`${px},${yCell - 70} ${px - 22},${yCell - 110} ${px + 22},${yCell - 110}`} fill={theme.accent2} />
          <line x1={px} y1={yCell - 110} x2={px} y2={yCell - 190} stroke={theme.accent2} strokeWidth={8} strokeLinecap="round" />
        </g>
      )}
      {settled && (
        <TextBlock text={`${hex(base + to * size)} = ${base} + ${to} × ${size}`} x={960} y={yCell + ch + 170} width={1600} fontSize={52} fill={theme.accent2} />
      )}
    </Stage>
  );
};
