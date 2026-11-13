import React from "react";
import { useCurrentFrame } from "remotion";
import { useTheme } from "../../lib/hooks";
import { Stage } from "../../lib/theme";
import { monoStyle, TextBlock } from "../../lib/b-kit";
import type { SceneProps } from "../../lib/types";
import { Arrow, at, CX, p } from "./common";

/** Cách viết khoa học: 1.500 thành 1,5 × 10 mũ 3; phần chữ số và phần số mũ; dấu phẩy dịch theo số mũ; máy dùng cơ số 2. */
export const DauPhayDong: React.FC<SceneProps> = ({ scene }) => {
  const theme = useTheme();
  const f = useCurrentFrame();
  const a0 = p(f, at(scene, 0));
  const a0b = p(f, at(scene, 0) + 24);
  const a1 = p(f, at(scene, 1));
  const t2 = at(scene, 2);
  const a2 = p(f, t2);
  const base2 = p(f, t2 + 75);

  // Hàng trên: "1.500" → "1,5 × 10³"
  const LX = CX - 480;
  const RX = CX + 140;
  const Y = 290;

  // Hàng dưới: dải chữ số 1 5 0 0, dấu phẩy nhảy theo số mũ e = 0..3 (mỗi 22 frame), lặp lại.
  const e = f < t2 ? 0 : Math.floor((f - t2) / 22) % 4;
  const CELL = 110;
  const SX0 = CX + 20;
  const SY = 620;
  const ds = ["1", "5", "0", "0"];
  const commaX = SX0 + (e + 1) * CELL;
  return (
    <Stage>
      <g style={monoStyle} opacity={a0}>
        <text x={LX} y={Y} fontSize={110} fontWeight={700} fill={theme.fg} textAnchor="middle">
          1.500
        </text>
      </g>
      <Arrow x1={LX + 190} y1={Y - 36} x2={RX - 230} y2={Y - 36} color={theme.muted} opacity={a0b} />
      <g style={monoStyle} opacity={a0b}>
        <text x={RX - 200} y={Y} fontSize={110} fontWeight={700} fill={theme.accent} textAnchor="start">
          1,5
        </text>
        <text x={RX + 30} y={Y} fontSize={90} fontWeight={700} fill={theme.fg} textAnchor="start">
          × 10
        </text>
        <text x={RX + 300} y={Y - 60} fontSize={64} fontWeight={700} fill={theme.accent2} textAnchor="start">
          3
        </text>
      </g>
      <g opacity={a1}>
        <path d={`M${RX - 200} ${Y + 30} L${RX - 200} ${Y + 50} L${RX - 10} ${Y + 50} L${RX - 10} ${Y + 30}`} fill="none" stroke={theme.accent} strokeWidth={5} />
        <TextBlock text="các chữ số" x={RX - 105} y={Y + 105} width={360} fontSize={40} fill={theme.accent} />
        <Arrow x1={RX + 420} y1={Y + 60} x2={RX + 340} y2={Y - 70} color={theme.accent2} width={5} />
        <TextBlock text="số mũ: dấu phẩy ở đâu" x={RX + 430} y={Y + 105} width={520} fontSize={40} fill={theme.accent2} />
      </g>
      <g opacity={a2}>
        <TextBlock text="dấu phẩy động" x={CX} y={500} width={900} fontSize={52} fill={theme.accent2} />
        <g style={monoStyle}>
          {ds.map((d, i) => {
            const afterComma = i > e && d === "0";
            return (
              <g key={i}>
                <rect x={SX0 + i * CELL + 6} y={SY - 90} width={CELL - 12} height={120} rx={14} fill={theme.panel} />
                <text x={SX0 + i * CELL + CELL / 2} y={SY} fontSize={96} fontWeight={700} fill={afterComma ? theme.muted : theme.fg} opacity={afterComma ? 0.45 : 1} textAnchor="middle">
                  {d}
                </text>
              </g>
            );
          })}
          {e < 3 && <circle cx={commaX} cy={SY + 10} r={12} fill={theme.accent2} />}
          <text x={CX - 600} y={SY} fontSize={80} fontWeight={700} fill={theme.fg} textAnchor="start">
            1,5 × 10
          </text>
          <text x={CX - 220} y={SY - 50} fontSize={56} fontWeight={700} fill={theme.accent2} textAnchor="start">
            {String(e)}
          </text>
          <text x={CX - 110} y={SY} fontSize={80} fontWeight={700} fill={theme.muted} textAnchor="start">
            =
          </text>
        </g>
      </g>
      <g opacity={base2}>
        <rect x={CX - 260} y={712} width={520} height={90} rx={45} fill={theme.accent} />
        <TextBlock text="máy: cơ số 2" x={CX} y={773} width={480} fontSize={48} fill={theme.bg} />
      </g>
    </Stage>
  );
};
