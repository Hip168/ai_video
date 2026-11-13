import React from "react";
import { useCurrentFrame } from "remotion";
import { useTheme } from "../../lib/hooks";
import { Stage, useBox } from "../../lib/theme";
import { monoStyle, TextBlock } from "../../lib/b-kit";
import type { SceneProps } from "../../lib/types";
import { at, cellSize, p, W } from "./common";

const BITS = 24;
/** Phần sau dấu phẩy của 1/10 trong hệ hai: 0,0001100110011... */
const STREAM = `000${"1100".repeat(9)}`;

/** Thanh ghi 24 bit; dãy nhị phân của 0,1 chảy vào, phần thừa bên phải bị cắt cụt và rơi mất. */
export const CatBit: React.FC<SceneProps> = ({ scene }) => {
  const theme = useTheme();
  const f = useCurrentFrame();
  // Khung vuông (Short, 840x840): cùng hình, ô nhỏ lại (chữ số vẫn ≥ 30 px).
  const sq = useBox().layout === "square";
  const BW = sq ? 840 : W;
  const cx = BW / 2;
  const cell = cellSize(BITS + 4, sq ? 800 : W - 300, 60);
  const x0 = cx - (BITS * cell) / 2 - cell; // chừa chỗ bên phải cho phần thừa
  const xEnd = x0 + BITS * cell;
  const Y = 360;
  const BH = sq ? 72 : 96;
  const t0 = at(scene, 0);
  const t1 = at(scene, 1);
  const fill = f < t1 ? 0 : Math.min(STREAM.length, Math.floor((f - t1) / 1.5));
  const cutAt = t1 + Math.ceil(STREAM.length * 1.5) + 6;
  const cut = p(f, cutAt, 10);
  const fall = p(f, cutAt + 12, 24);
  const fs = cell / 0.62;
  return (
    <Stage>
      <TextBlock text="thanh ghi: 24 bit" x={cx} y={190} width={sq ? 780 : 1200} fontSize={60} fill={theme.fg} opacity={p(f, t0)} />
      {Array.from({ length: BITS }, (_, i) => (
        <rect key={i} x={x0 + i * cell + 3} y={Y - BH / 2} width={cell - 6} height={BH} rx={10} fill={theme.panel} stroke={theme.accent} strokeWidth={3} opacity={p(f, t0 + i * 2, 10)} />
      ))}
      <g style={monoStyle}>
        {[...STREAM.slice(0, fill)].map((c, i) => {
          const inside = i < BITS;
          const y = inside ? Y + fs * 0.33 : Y + fs * 0.33 + 260 * fall + (i - BITS) * 18 * fall;
          const x = x0 + i * cell + cell / 2;
          if (!inside && x > BW - 20) return null;
          return (
            <text key={i} x={x} y={y} fontSize={fs} fontWeight={700} fill={inside ? (c === "1" ? theme.accent2 : theme.fg) : theme.warn} textAnchor="middle" opacity={inside ? 1 : 1 - 0.8 * fall}>
              {c}
            </text>
          );
        })}
      </g>
      <g opacity={cut}>
        <line x1={xEnd + 4} y1={Y - BH} x2={xEnd + 4} y2={Y + BH} stroke={theme.warn} strokeWidth={6} strokeDasharray="16 10" />
        <TextBlock text="bị cắt cụt" x={xEnd - 10} y={Y + BH + 90} width={520} fontSize={52} fill={theme.warn} anchor="end" />
      </g>
      <TextBlock text="0,1 trong hệ hai" x={x0} y={Y + BH + 90} width={600} fontSize={44} fill={theme.muted} anchor="start" weight={400} opacity={p(f, t1)} />
    </Stage>
  );
};
