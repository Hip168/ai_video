import React from "react";
import { useCurrentFrame } from "remotion";
import { useTheme } from "../../lib/hooks";
import { Stage } from "../../lib/theme";
import { TextBlock } from "../../lib/b-kit";
import type { SceneProps } from "../../lib/types";
import { at, Mono, p, useGeom } from "./common";

const BITS = 8;
const STEP = 12; // frame mỗi cột

/**
 * Cộng 1 vào 8 ô toàn số 1, từng cột từ phải sang trái như cộng trên giấy.
 * Beat 0: hai hàng số. Beat 1: nhớ lan sang trái qua 7 cột. Beat 2: cột cuối, phần nhớ không còn ô, rơi ra ngoài.
 */
export const CongBit: React.FC<SceneProps> = ({ scene }) => {
  const theme = useTheme();
  const f = useCurrentFrame();
  const { W, H, CX, sq } = useGeom();
  const t1 = at(scene, 1);
  const t2 = at(scene, 2);
  const cell = Math.min(130, (W - 120) / 10);
  const x0 = CX - (10 * cell) / 2; // cột 0: dấu "+" và ô thừa; cột 1..8: các bit; cột 9: lề
  const colX = (c: number) => x0 + c * cell + cell / 2;
  const fs = Math.max(sq ? 44 : 0, cell * 0.62);
  const fsC = Math.max(30, cell * 0.36);
  const yC = H * (sq ? 0.2 : 0.16); // hàng nhớ
  const yA = H * (sq ? 0.33 : 0.33);
  const yB = H * (sq ? 0.47 : 0.49);
  const yL = H * (sq ? 0.53 : 0.56);
  const yR = H * (sq ? 0.65 : 0.7);

  // Thời điểm cột i (0 = bit cao nhất) được cộng: cột phải nhất trước.
  const doneAt = (i: number): number => {
    const s = BITS - 1 - i; // bước thứ s
    return s < BITS - 1 ? t1 + 10 + s * STEP : t2 + 10;
  };
  const fall = p(f, t2 + 24, 30);
  const over = p(f, t2 + 10, 10);
  return (
    <Stage>
      <TextBlock text="Máy chỉ cộng từng bit, có nhớ thì nhớ sang ô bên cạnh" x={CX} y={H * (sq ? 0.08 : 0.07)} width={W - 80} fontSize={sq ? 34 : 44} maxLines={sq ? 2 : 1} fill={theme.fg} weight={400} opacity={p(f, t1, 14)} />
      {Array.from({ length: BITS }, (_, i) => {
        const x = colX(i + 1);
        const done = f >= doneAt(i);
        const hl = done && f < doneAt(i) + STEP;
        return (
          <g key={i}>
            <rect x={x - cell * 0.44} y={yA - cell * 0.62} width={cell * 0.88} height={cell * 0.8} rx={10} fill={theme.panel} stroke={theme.accent} strokeWidth={3} />
            <Mono x={x} y={yA} size={fs} fill={theme.fg} text="1" />
            <Mono x={x} y={yB} size={fs} fill={theme.muted} text={i === BITS - 1 ? "1" : "0"} />
            <rect x={x - cell * 0.44} y={yR - cell * 0.62} width={cell * 0.88} height={cell * 0.8} rx={10} fill={hl ? theme.accent2 : theme.panel} opacity={hl ? 0.35 : 1} stroke={theme.accent} strokeWidth={3} />
            {done && <Mono x={x} y={yR} size={fs} fill={theme.accent2} text="0" opacity={p(f, doneAt(i), 8)} />}
            {/* Nhớ 1 sang cột bên trái (trừ cột cuối) */}
            {i > 0 && f >= doneAt(i) && <Mono x={colX(i)} y={yC} size={fsC} fill={theme.accent2} text="1" opacity={p(f, doneAt(i), 8)} />}
          </g>
        );
      })}
      <Mono x={colX(0)} y={yB} size={fs} fill={theme.muted} text="+" />
      <line x1={colX(0) - cell * 0.4} y1={yL} x2={colX(BITS) + cell * 0.45} y2={yL} stroke={theme.fg} strokeWidth={5} />
      {/* Ô thứ chín không có: phần nhớ rơi ra ngoài */}
      <g opacity={over}>
        <rect x={colX(0) - cell * 0.44} y={yR - cell * 0.62} width={cell * 0.88} height={cell * 0.8} rx={10} fill="none" stroke={theme.warn} strokeWidth={4} strokeDasharray="12 8" />
        <Mono x={colX(0)} y={yR + fall * H * 0.22} size={fs} fill={theme.warn} text="1" opacity={1 - 0.8 * fall} />
      </g>
      <TextBlock text="Phần nhớ không còn chỗ, rơi ra ngoài" x={CX} y={H * (sq ? 0.93 : 0.94)} width={W - 80} fontSize={sq ? 36 : 48} fill={theme.warn} opacity={p(f, t2 + 20, 14)} />
    </Stage>
  );
};
