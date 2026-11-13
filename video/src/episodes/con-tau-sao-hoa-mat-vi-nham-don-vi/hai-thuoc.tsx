import React from "react";
import { useCurrentFrame } from "remotion";
import { useTheme } from "../../lib/hooks";
import { Stage } from "../../lib/theme";
import { TextBlock } from "../../lib/b-kit";
import type { SceneProps } from "../../lib/types";
import { at, clamp01, lerp, p, Ship, useGeom } from "./common";

const RATIO = 4.45;

/** Thước kẻ ngang: vạch cách đều `step` px từ x0 tới x1. */
const Ruler: React.FC<{ x0: number; x1: number; y: number; step: number; color: string; tall: number }> = ({ x0, x1, y, step, color, tall }) => {
  const ticks: number[] = [];
  for (let x = x0; x <= x1 + 0.5; x += step) ticks.push(x);
  return (
    <g>
      <line x1={x0} y1={y} x2={x1} y2={y} stroke={color} strokeWidth={4} />
      {ticks.map((x, i) => (
        <line key={i} x1={x} y1={y} x2={x} y2={y + tall} stroke={color} strokeWidth={4} />
      ))}
    </g>
  );
};

/**
 * Thước to bị đọc bằng thước nhỏ.
 * Beat 0: cú phụt thật đo bằng thước to (pound-force × giây); cùng con số đọc bằng thước nhỏ (niu-tơn × giây) thành vạch ngắn hơn.
 * Beat 1: mỗi cú phụt bị tính yếu đi 4,45 lần. Beat 2: tàu thật lệch xa dần tàu trên giấy.
 */
export const HaiThuoc: React.FC<SceneProps> = ({ scene }) => {
  const theme = useTheme();
  const f = useCurrentFrame();
  const { W, sq } = useGeom();
  const t1 = at(scene, 1);
  const t2 = at(scene, 2);
  const x0 = sq ? 40 : 220;
  const x1 = sq ? W - 40 : 1700;
  const small = sq ? 40 : 80;
  const big = small * RATIO;
  const n = 2; // số vạch của con số (minh hoạ, không ghi số)
  const yA = sq ? 170 : 190;
  const yB = sq ? 360 : 380;
  const barH = sq ? 36 : 44;
  const fsL = sq ? 32 : 40;

  const aP = clamp01((f - 4) / 24);
  const bP = clamp01((f - 34) / 14);
  const ratioP = p(f, t1, 14);
  const pathP = clamp01((f - t2) / 60);
  const shimmer = 0.75 + 0.25 * Math.sin(f * 0.18);

  // Quỹ đạo: tàu trên giấy (thẳng) và tàu thật (lệch dần qua từng cú phụt).
  const py0 = sq ? 640 : 670;
  const pxa = sq ? 60 : 240;
  const pxb = sq ? W - 120 : 1560;
  const kicks = 6;
  const realY = (u: number) => {
    // bậc nhỏ mỗi cú phụt, làm mượt giữa các bậc
    const k = u * kicks;
    const whole = Math.floor(k);
    const frac = k - whole;
    return py0 + (whole + Math.min(1, frac * 4)) * (sq ? 12 : 12);
  };
  const N = 40;
  const pts = Array.from({ length: N + 1 }, (_, i) => i / N).filter((u) => u <= pathP + 1e-6);
  const head = pathP;
  const xs = (u: number) => lerp(pxa, pxb, u);

  return (
    <Stage>
      {/* Thước to */}
      <TextBlock text="Thước to: pound-force × giây" x={x0} y={yA - (sq ? 74 : 88)} width={x1 - x0} fontSize={fsL} fill={theme.accent2} anchor="start" />
      <Ruler x0={x0} x1={x1} y={yA} step={big} color={theme.accent2} tall={sq ? 26 : 32} />
      <rect x={x0} y={yA - barH - 8} width={big * n * aP} height={barH} rx={10} fill={theme.accent2} opacity={shimmer} />
      {/* Thước nhỏ */}
      <TextBlock text="Thước nhỏ: niu-tơn × giây" x={x0} y={yB - (sq ? 74 : 88)} width={x1 - x0} fontSize={fsL} fill={theme.accent} anchor="start" />
      <Ruler x0={x0} x1={x1} y={yB} step={small} color={theme.accent} tall={sq ? 18 : 22} />
      <rect x={x0} y={yB - barH - 8} width={small * n * bP} height={barH} rx={10} fill={theme.accent} opacity={bP > 0 ? shimmer : 0} />
      <g opacity={bP}>
        <TextBlock text="cùng con số, đọc bằng thước nhỏ" x={x0} y={yB + (sq ? 70 : 80)} width={x1 - x0} fontSize={sq ? 30 : 38} fill={theme.fg} anchor="start" weight={400} />
      </g>
      {/* Beat 1: yếu đi 4,45 lần */}
      <g opacity={ratioP}>
        <line x1={x0 + small * n} y1={yB - barH / 2 - 8} x2={x0 + big * n} y2={yB - barH / 2 - 8} stroke={theme.warn} strokeWidth={5} strokeDasharray="12 10" strokeDashoffset={-f} />
        <line x1={x0 + big * n} y1={yA - 8} x2={x0 + big * n} y2={yB - barH / 2 - 8} stroke={theme.warn} strokeWidth={4} strokeDasharray="8 8" />
        <TextBlock
          text="Mỗi cú phụt bị tính yếu đi 4,45 lần"
          x={W / 2}
          y={yB + (sq ? 150 : 160)}
          width={W - 80}
          fontSize={sq ? 38 : 50}
          maxLines={2}
          fill={theme.warn}
        />
      </g>
      {/* Beat 2: tàu thật và tàu trên giấy */}
      <g opacity={p(f, t2, 12)}>
        <line x1={pxa} y1={py0} x2={xs(head)} y2={py0} stroke={theme.muted} strokeWidth={5} strokeDasharray="14 10" />
        <polyline points={pts.map((u) => `${xs(u)},${realY(u)}`).join(" ")} fill="none" stroke={theme.fg} strokeWidth={5} />
        <Ship x={xs(head)} y={py0} s={sq ? 26 : 34} body={theme.panel} panel={theme.panel} line={theme.muted} />
        <Ship x={xs(head)} y={realY(head)} s={sq ? 26 : 34} body={theme.fg} panel={theme.accent} line={theme.bg} />
        <TextBlock text="tàu trên giấy" x={pxa} y={py0 - (sq ? 30 : 36)} width={400} fontSize={sq ? 30 : 38} fill={theme.muted} anchor="start" weight={400} />
        <TextBlock text="tàu thật" x={pxa} y={py0 + (sq ? 110 : 112)} width={400} fontSize={sq ? 30 : 38} fill={theme.fg} anchor="start" weight={400} />
      </g>
    </Stage>
  );
};
