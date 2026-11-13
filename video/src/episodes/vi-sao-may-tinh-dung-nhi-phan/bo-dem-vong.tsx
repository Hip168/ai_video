import React from "react";
import { useCurrentFrame } from "remotion";
import { useTheme } from "../../lib/hooks";
import { Stage, useBox } from "../../lib/theme";
import { TextBlock } from "../../lib/b-kit";
import type { SceneProps } from "../../lib/types";
import { at, lerp, p } from "./common";

const CX_WIDE = 960;
const CY_WIDE = 430;
const R = 240;
const STEP = 18; // frame mỗi bước sáng

/** Bóng đèn chân không: bầu kính, sợi đốt, chân. `glow` 0..1. */
const Tube: React.FC<{ x: number; y: number; s: number; glow: number; glass: string; hot: string; line: string }> = ({ x, y, s, glow, glass, hot, line }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <rect x={-34} y={-70} width={68} height={120} rx={34} fill={glass} stroke={line} strokeWidth={5} />
    <rect x={-34} y={-70} width={68} height={120} rx={34} fill={hot} opacity={0.55 * glow} />
    <path d="M-14 30 V-20 L0 -36 L14 -20 V30" fill="none" stroke={glow > 0.5 ? hot : line} strokeWidth={5} strokeLinejoin="round" />
    <rect x={-30} y={50} width={60} height={22} rx={5} fill={line} />
    {[-18, 0, 18].map((d) => (
      <line key={d} x1={d} y1={72} x2={d} y2={92} stroke={line} strokeWidth={5} strokeLinecap="round" />
    ))}
  </g>
);

/** ENIAC: một bóng đèn chân không (beat 0); mười bóng xếp thành vòng (beat 1); mười vị trí ứng chữ số 0 đến 9, vị trí sáng chạy quanh vòng (beat 2). */
export const BoDemVong: React.FC<SceneProps> = ({ scene }) => {
  const theme = useTheme();
  const f = useCurrentFrame();
  // Khung vuông (Short): cùng hình, đặt giữa hộp 840x840.
  const sq = useBox().layout === "square";
  const CX = sq ? 420 : CX_WIDE;
  const CY = sq ? 420 : CY_WIDE;
  const one = p(f, at(scene, 0));
  const ring = p(f, at(scene, 1), 24);
  const digits = p(f, at(scene, 2));
  const lit = f >= at(scene, 2) ? Math.floor((f - at(scene, 2)) / STEP) % 10 : -1;
  return (
    <Stage>
      {Array.from({ length: 10 }, (_, k) => {
        const ang = -Math.PI / 2 + (k * 2 * Math.PI) / 10;
        const tx = CX + R * Math.cos(ang);
        const ty = CY + R * Math.sin(ang);
        // Bóng 0 là bóng lớn ở giữa lúc đầu, rồi về vị trí trên vòng.
        const x = k === 0 ? lerp(CX, tx, ring) : tx;
        const y = k === 0 ? lerp(CY, ty, ring) : ty;
        const s = k === 0 ? lerp(2.2, 0.75, ring) : 0.75;
        const op = k === 0 ? one : ring;
        const on = k === lit;
        const lx = CX + (R + 95) * Math.cos(ang);
        const ly = CY + (R + 95) * Math.sin(ang);
        return (
          <g key={k} opacity={op}>
            <Tube x={x} y={y} s={s} glow={k === 0 && ring < 0.5 ? 1 : on ? 1 : 0} glass={theme.panel} hot={theme.accent2} line={theme.fg} />
            <TextBlock text={String(k)} x={lx} y={ly + 20} width={90} fontSize={56} fill={on ? theme.accent2 : theme.fg} opacity={digits} />
          </g>
        );
      })}
      <TextBlock text="Bóng đèn chân không" x={CX} y={CY + 250} width={sq ? 760 : 1000} fontSize={60} fill={theme.fg} opacity={one * (1 - ring)} />
      <TextBlock text="Bộ đếm vòng" x={CX} y={CY - 10} width={420} fontSize={52} fill={theme.accent} opacity={ring} />
      <TextBlock text="một chữ số" x={CX} y={CY + 55} width={420} fontSize={40} fill={theme.muted} opacity={digits} weight={400} />
    </Stage>
  );
};
