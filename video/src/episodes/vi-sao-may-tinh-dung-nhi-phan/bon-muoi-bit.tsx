import React from "react";
import { useCurrentFrame } from "remotion";
import { useTheme } from "../../lib/hooks";
import { Stage, useBox } from "../../lib/theme";
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
  const total = p(f, at(scene, 3));
  if (useBox().layout === "square") {
    // Khung vuông (Short): mười ô thành hai hàng năm ô; các dòng so sánh xếp dọc.
    const gw = 140;
    const x0 = (840 - (5 * gw + 4 * GAP)) / 2;
    const rowY = (i: number) => 190 + Math.floor(i / 5) * (H + 24);
    const bottom = rowY(N - 1) + H;
    return (
      <Stage>
        <TextBlock text="Mười chữ số thập phân" x={420} y={110} width={780} fontSize={52} fill={theme.fg} opacity={p(f, at(scene, 0))} />
        {Array.from({ length: N }, (_, i) => {
          const a = p(f, at(scene, 0) + i * 4, 12);
          const x = x0 + (i % 5) * (gw + GAP);
          const y = rowY(i);
          return (
            <g key={i} opacity={a} transform={`translate(0 ${(1 - a) * 24})`}>
              <rect x={x} y={y} width={gw} height={H} rx={16} fill={theme.panel} stroke={theme.accent} strokeWidth={4} opacity={1 - split} />
              {Array.from({ length: 4 }, (_, k) => {
                const cw = (gw - 5 * 6) / 4;
                const b = p(f, at(scene, 2) + i * 3 + k * 2, 10);
                return <rect key={k} x={x + 6 + k * (cw + 6)} y={y + 6} width={cw} height={H - 12} rx={8} fill={theme.accent} opacity={b * 0.85} />;
              })}
            </g>
          );
        })}
        <g opacity={three * (1 - split)}>
          <TextBlock text="3 bit: 8 kiểu" x={420} y={bottom + 90} width={760} fontSize={48} fill={theme.fg} />
          <TextBlock text="<" x={420} y={bottom + 160} width={120} fontSize={56} fill={theme.warn} />
          <TextBlock text="1 chữ số: 10 khả năng" x={420} y={bottom + 230} width={760} fontSize={48} fill={theme.fg} />
          <TextBlock text="Chưa đủ" x={420} y={bottom + 330} width={600} fontSize={56} fill={theme.warn} />
        </g>
        <TextBlock text="Mỗi chữ số 4 bit" x={420} y={bottom + 160} width={760} fontSize={56} fill={theme.accent} opacity={split * (1 - total)} />
        <g opacity={total}>
          <path d={`M${x0} ${bottom + 30} v24 H${840 - x0} v-24`} fill="none" stroke={theme.accent2} strokeWidth={6} strokeLinejoin="round" />
          <TextBlock text="Ít nhất 40 bit" x={420} y={bottom + 190} width={760} fontSize={88} fill={theme.accent2} />
        </g>
      </Stage>
    );
  }
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
      <g opacity={three * (1 - split)}>
        <TextBlock text="3 bit: 8 kiểu" x={560} y={600} width={600} fontSize={56} fill={theme.fg} />
        <TextBlock text="<" x={960} y={600} width={120} fontSize={64} fill={theme.warn} />
        <TextBlock text="1 chữ số: 10 khả năng" x={1360} y={600} width={600} fontSize={56} fill={theme.fg} />
        <TextBlock text="Chưa đủ" x={960} y={720} width={600} fontSize={64} fill={theme.warn} />
      </g>
      <TextBlock text="Mỗi chữ số 4 bit" x={960} y={600} width={1200} fontSize={60} fill={theme.accent} opacity={split * (1 - total)} />
      <g opacity={total}>
        <path d={`M${X0} ${Y + H + 40} v24 H${1920 - X0} v-24`} fill="none" stroke={theme.accent2} strokeWidth={6} strokeLinejoin="round" />
        <TextBlock text="Ít nhất 40 bit" x={960} y={640} width={1200} fontSize={96} fill={theme.accent2} />
      </g>
    </Stage>
  );
};
