import React from "react";
import { useCurrentFrame } from "remotion";
import { useTheme } from "../../lib/hooks";
import { Stage } from "../../lib/theme";
import { monoStyle, TextBlock } from "../../lib/b-kit";
import type { SceneProps } from "../../lib/types";
import { Arrow, at, cellSize, CX, Digits, p, W } from "./common";

const SUM = "0.30000000000000004";
/** Chuỗi 0,1 thật sự máy cất (đúng như lời). */
const EXACT = "0,1000000000000000055511151231257827021181583404541015625";

/**
 * Chữ số có nghĩa. mode "giu-tron": 0.30000000000000004 với 15 chữ số đầu được giữ trọn, chữ số 4 ở vị trí thứ 17;
 * mode "chinh-xac": gõ 0.1, máy cất con số dài.
 */
export const ChuSoCoNghia: React.FC<SceneProps> = ({ scene }) => {
  const theme = useTheme();
  const f = useCurrentFrame();
  const mode = String(scene.props.mode ?? "giu-tron");

  if (mode === "giu-tron") {
    const chars = [...SUM];
    const first = 2; // chữ số có nghĩa đầu tiên (số 3) ở chỉ số 2
    const cell = cellSize(chars.length, W - 400, 84);
    const x0 = CX - (chars.length * cell) / 2;
    const xs = (i: number) => x0 + i * cell;
    const Y = 400;
    const fs = cell / 0.62;
    const keep = p(f, at(scene, 0));
    const out = p(f, at(scene, 0) + 30);
    const four = p(f, at(scene, 1));
    const pulse = four > 0 ? 0.6 + 0.4 * Math.abs(Math.sin((f - at(scene, 1)) / 7)) : 0;
    const band = (from: number, to: number, color: string, op: number) => (
      <rect x={xs(from) + 2} y={Y - fs * 0.95} width={(to - from + 1) * cell - 4} height={fs * 1.25} rx={14} fill={color} opacity={op} />
    );
    return (
      <Stage>
        {band(first, first + 14, theme.ok, 0.25 * keep)}
        {band(first + 15, first + 16, theme.warn, 0.3 * out)}
        <rect x={xs(first + 16) + 2} y={Y - fs * 0.95} width={cell - 4} height={fs * 1.25} rx={14} fill={theme.accent2} opacity={pulse} />
        <Digits text={SUM} cx={CX} y={Y} cell={cell} style={() => ({ fill: theme.fg, opacity: 1 })} />
        <g style={monoStyle}>
          {chars.slice(first).map((_, k) => (
            <text key={k} x={xs(first + k) + cell / 2} y={Y - fs - 20} fontSize={30} fontWeight={700} fill={theme.muted} textAnchor="middle" opacity={keep}>
              {String(k + 1)}
            </text>
          ))}
        </g>
        <TextBlock text="giữ trọn 15 chữ số có nghĩa" x={(xs(first) + xs(first + 15)) / 2} y={Y + 110} width={900} fontSize={44} fill={theme.ok} opacity={keep} />
        <TextBlock text="từ chữ số thứ 16" x={xs(first + 16)} y={Y - fs - 80} width={520} fontSize={40} fill={theme.warn} opacity={out} />
        <Arrow x1={xs(first + 16) + cell / 2} y1={Y + 290} x2={xs(first + 16) + cell / 2} y2={Y + 50} color={theme.accent2} opacity={four} />
        <TextBlock text="chữ số có nghĩa thứ 17" x={xs(first + 16) - 120} y={Y + 370} width={700} fontSize={48} fill={theme.accent2} opacity={four} anchor="middle" />
      </Stage>
    );
  }

  // chinh-xac
  const head = p(f, at(scene, 0));
  const ask = p(f, at(scene, 0) + 20);
  const t1 = at(scene, 1);
  const split = EXACT.indexOf("555");
  const line1 = EXACT.slice(0, split);
  const line2 = EXACT.slice(split);
  const cell = cellSize(line2.length, W - 320, 64);
  const x0 = CX - (line2.length * cell) / 2;
  const n = f < t1 ? 0 : Math.floor((f - t1) * 1.5);
  const s1 = line1.slice(0, Math.min(line1.length, n));
  const s2 = line2.slice(0, Math.max(0, n - line1.length));
  return (
    <Stage>
      <g style={monoStyle} opacity={head}>
        <text x={CX - 80} y={250} fontSize={130} fontWeight={700} fill={theme.fg} textAnchor="end">
          0.1
        </text>
        <text x={CX + 20} y={250} fontSize={130} fontWeight={700} fill={theme.accent2} textAnchor="start" opacity={ask}>
          ?
        </text>
      </g>
      <Digits text={s1} cx={x0 + (s1.length * cell) / 2} y={480} cell={cell} style={() => ({ fill: theme.fg, opacity: 1 })} />
      <Digits text={s2} cx={x0 + (s2.length * cell) / 2} y={620} cell={cell} style={() => ({ fill: theme.accent2, opacity: 1 })} />
    </Stage>
  );
};
