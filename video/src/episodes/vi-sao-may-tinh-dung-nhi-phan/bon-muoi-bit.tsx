import React from "react";
import { useCurrentFrame } from "remotion";
import { useTheme } from "../../lib/hooks";
import { Stage } from "../../lib/theme";
import { TextBlock } from "../../lib/b-kit";
import type { SceneProps } from "../../lib/types";
import { at, p } from "./common";

const N = 10;
const GW = 160;
const GAP = 12;
const X0 = (1920 - (N * GW + (N - 1) * GAP)) / 2;
const Y = 330;
const H = 110;

/** Mười chữ số thập phân, mỗi chữ số mã bằng bốn bit: ít nhất 40 bit. Beat 0 mười ô, beat 1 ba bit chưa đủ, beat 2 mỗi ô bốn bit, beat 3 tổng. */
export const BonMuoiBit: React.FC<SceneProps> = ({ scene }) => {
  const theme = useTheme();
  const f = useCurrentFrame();
  const three = p(f, at(scene, 1));
  const split = p(f, at(scene, 2), 18);
  // Chữ cũ tắt hẳn rồi chữ mới mới hiện, không chồng lên nhau.
  const threeOut = p(f, at(scene, 2), 8);
  const four = p(f, at(scene, 2) + 8, 10);
  const fourOut = p(f, at(scene, 3), 8);
  const total = p(f, at(scene, 3) + 8, 10);
  return (
    <Stage>
      <TextBlock text="Mười chữ số thập phân" x={960} y={150} width={1600} fontSize={60} fill={theme.fg} opacity={p(f, at(scene, 0))} />
      {Array.from({ length: N }, (_, i) => {
        const a = p(f, at(scene, 0) + i * 4, 12);
        const x = X0 + i * (GW + GAP);
        return (
          <g key={i} opacity={a} transform={`translate(0 ${(1 - a) * 24})`}>
            <rect x={x} y={Y} width={GW} height={H} rx={16} fill={theme.panel} stroke={theme.accent} strokeWidth={4} opacity={1 - split} />
            {Array.from({ length: 4 }, (_, k) => {
              const cw = (GW - 5 * 6) / 4;
              const b = p(f, at(scene, 2) + i * 3 + k * 2, 10);
              return <rect key={k} x={x + 6 + k * (cw + 6)} y={Y + 6} width={cw} height={H - 12} rx={8} fill={theme.accent} opacity={b * 0.85} />;
            })}
          </g>
        );
      })}
      <g opacity={three * (1 - threeOut)}>
        <TextBlock text="3 bit: 8 kiểu" x={560} y={600} width={600} fontSize={56} fill={theme.fg} />
        <TextBlock text="<" x={960} y={600} width={120} fontSize={64} fill={theme.warn} />
        <TextBlock text="1 chữ số: 10 khả năng" x={1360} y={600} width={600} fontSize={56} fill={theme.fg} />
        <TextBlock text="Chưa đủ" x={960} y={720} width={600} fontSize={64} fill={theme.warn} />
      </g>
      <TextBlock text="Mỗi chữ số 4 bit" x={960} y={600} width={1200} fontSize={60} fill={theme.accent} opacity={four * (1 - fourOut)} />
      <g opacity={total}>
        <path d={`M${X0} ${Y + H + 40} v24 H${1920 - X0} v-24`} fill="none" stroke={theme.accent2} strokeWidth={6} strokeLinejoin="round" />
        <TextBlock text="Ít nhất 40 bit" x={960} y={640} width={1200} fontSize={96} fill={theme.accent2} />
      </g>
    </Stage>
  );
};
