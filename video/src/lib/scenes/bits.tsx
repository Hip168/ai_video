import React from "react";
import { useCurrentFrame } from "remotion";
import { ease, useTheme } from "../hooks";
import { Stage } from "../theme";
import { itemStart, TextBlock } from "../b-kit";
import type { SceneProps } from "../types";

/** Dãy bit: ô vào ở beat đầu, mỗi beat sau bật thêm một bit 1 (từ bit cao xuống thấp), tổng cộng dồn bên dưới. */
export const Bits: React.FC<SceneProps> = ({ scene }) => {
  const theme = useTheme();
  const frame = useCurrentFrame();
  const value = typeof scene.props.value === "number" ? Math.max(0, Math.floor(scene.props.value)) : 0;
  const wantW = typeof scene.props.width === "number" ? Math.min(16, Math.max(4, Math.floor(scene.props.width))) : 8;
  // Số bit hiển thị = max(width, độ dài bit của value): không bao giờ hiện số khác value.
  const width = Math.max(wantW, value === 0 ? 1 : Math.floor(Math.log2(value)) + 1);
  if (width > 16) throw new Error(`bits: value ${value} cần ${width} bit, vượt 16 bit tối đa của cảnh`);
  const label = typeof scene.props.label === "string" ? scene.props.label : "";
  const cell = Math.min(150, Math.floor(1720 / width) - 12);
  const gap = Math.min(12, cell * 0.1);
  const total = width * cell + (width - 1) * gap;
  const x0 = (1920 - total) / 2;
  const yCell = 300;
  const bitsHigh: number[] = []; // vị trí (0 = bit cao nhất) của các bit 1
  for (let i = 0; i < width; i++) if ((value >> (width - 1 - i)) & 1) bitsHigh.push(i);
  const m = bitsHigh.length + 1; // mục 0: ô hiện ra; mục k: bật bit 1 thứ k
  const onAt = new Map<number, number>();
  bitsHigh.forEach((pos, k) => onAt.set(pos, itemStart(scene, k + 1, m)));
  let sum = 0;
  const parts: string[] = [];
  for (const pos of bitsHigh) {
    if (frame >= (onAt.get(pos) ?? Infinity)) {
      sum += 2 ** (width - 1 - pos);
      parts.push(String(2 ** (width - 1 - pos)));
    }
  }
  const formula = parts.length === 0 ? "0" : parts.join(" + ");
  const fs = Math.min(60, cell * 0.55);
  return (
    <Stage>
      {label !== "" && <TextBlock text={label} x={960} y={110} width={1600} fontSize={52} fill={theme.fg} />}
      {Array.from({ length: width }, (_, i) => {
        const x = x0 + i * (cell + gap);
        const a = ease((frame - itemStart(scene, 0, m) - i * 2) / 12);
        const t = onAt.get(i);
        const on = t !== undefined && frame >= t;
        const flip = t === undefined ? 0 : ease((frame - t) / 10);
        const weight = 2 ** (width - 1 - i);
        return (
          <g key={i} opacity={a} transform={`translate(0 ${(1 - a) * 30})`}>
            <rect x={x} y={yCell} width={cell} height={cell} rx={cell * 0.14} fill={on ? theme.accent : theme.panel} stroke={on ? theme.accent2 : theme.muted} strokeWidth={on ? 6 : 4} transform={on ? `translate(${x + cell / 2} ${yCell + cell / 2}) scale(${1 + 0.08 * Math.sin(Math.PI * flip)}) translate(${-(x + cell / 2)} ${-(yCell + cell / 2)})` : undefined} />
            <TextBlock text={on ? "1" : "0"} x={x + cell / 2} y={yCell + cell / 2 + fs * 0.35} width={cell - 16} fontSize={fs} fill={on ? theme.bg : theme.muted} />
            <TextBlock text={String(weight)} x={x + cell / 2} y={yCell + cell + 50} width={cell} fontSize={Math.min(36, cell * 0.3)} fill={on ? theme.accent2 : theme.muted} weight={400} />
          </g>
        );
      })}
      <TextBlock text={formula} x={960} y={yCell + cell + 150} width={1700} fontSize={48} maxLines={2} fill={theme.fg} weight={400} />
      <TextBlock text={`= ${sum}`} x={960} y={yCell + cell + (width > 8 ? 310 : 240)} width={800} fontSize={88} fill={theme.accent2} opacity={sum > 0 || bitsHigh.length === 0 ? 1 : 0.4} />
    </Stage>
  );
};
