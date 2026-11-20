import React from "react";
import { useCurrentFrame } from "remotion";
import { useTheme } from "../../lib/hooks";
import { Stage } from "../../lib/theme";
import type { SceneProps } from "../../lib/types";
import { at, Chip, p, Txt, useGeom } from "./common";

/**
 * Giờ trong máy là số giây đếm từ một mốc.
 * Beat 0: trục thời gian, cờ "mốc không" bên trái, từng ô một giây xếp dần tới "bây giờ"; ngoặc "số giây đã trôi qua".
 * Beat 1: cờ mốc ghi rõ: 0 giờ UTC ngày 1/1/1970, theo POSIX.
 */
export const BoDem: React.FC<SceneProps> = ({ scene }) => {
  const t = useTheme();
  const f = useCurrentFrame();
  const { sq } = useGeom();
  const t1 = at(scene, 1);
  const a1 = p(f, t1, 16);
  const x0 = sq ? 90 : 260;
  const x1 = sq ? 760 : 1700;
  const ay = sq ? 470 : 400;
  const cell = sq ? 26 : 40;
  const gap = sq ? 6 : 8;
  const n = Math.floor((x1 - x0 - 20) / (cell + gap));
  const filled = Math.min(n, 8 + Math.floor(f / 5));
  const nowX = x0 + 10 + filled * (cell + gap);
  return (
    <Stage>
      <g>
        <Txt text="Thời gian = số giây đã trôi qua kể từ một mốc" x={sq ? 420 : 960} y={sq ? 70 : 90} w={sq ? 790 : 1700} s={sq ? 40 : 54} fill={t.fg} lines={2} />
        <line x1={x0 - 30} y1={ay} x2={x1 + 60} y2={ay} stroke={t.muted} strokeWidth={6} strokeLinecap="round" />
        {Array.from({ length: filled }, (_, i) => {
          const x = x0 + 10 + i * (cell + gap);
          const fresh = i === filled - 1 && filled < n;
          return <rect key={i} x={x} y={ay - cell - 14} width={cell} height={cell} rx={6} fill={fresh ? t.accent2 : t.accent} opacity={0.9} />;
        })}
        {/* ngoặc */}
        <path d={`M${x0 + 10} ${ay - cell - 40} v-24 H${nowX - gap} v24`} fill="none" stroke={t.accent2} strokeWidth={5} />
        <Txt text="số giây đã trôi qua" x={(x0 + nowX) / 2} y={ay - cell - (sq ? 86 : 90)} w={Math.max(sq ? 420 : 520, nowX - x0)} s={sq ? 36 : 44} fill={t.accent2} />
        <Txt text="mỗi ô: 1 giây" x={sq ? 420 : x0 + 40} y={ay + (sq ? 70 : 66)} w={sq ? 400 : 420} s={sq ? 30 : 36} fill={t.muted} weight={400} anchor={sq ? "middle" : "start"} />
        {/* mốc không */}
        <line x1={x0} y1={ay + 20} x2={x0} y2={ay + (sq ? 150 : 150)} stroke={t.warn} strokeWidth={6} />
        <circle cx={x0} cy={ay} r={16} fill={t.warn} />
        <rect x={x0 - 6} y={ay + (sq ? 110 : 110)} width={sq ? 300 : 320} height={sq ? 70 : 76} rx={14} fill={t.warn} />
        <Txt text="Mốc không" x={x0 + (sq ? 144 : 154)} y={ay + (sq ? 158 : 160)} w={sq ? 280 : 300} s={sq ? 40 : 44} fill={t.bg} />
        {/* bây giờ */}
        <g transform={`translate(${nowX} 0)`}>
          <polygon points={`0,${ay + 10} -16,${ay + 40} 16,${ay + 40}`} fill={t.ok} />
          <Txt text="bây giờ" x={0} y={ay + (sq ? 80 : 84)} w={240} s={sq ? 32 : 40} fill={t.ok} />
        </g>
      </g>
      <g opacity={a1} transform={`translate(0 ${(1 - a1) * 30})`}>
        <rect x={x0 - 6} y={ay + (sq ? 200 : 210)} width={sq ? 680 : 900} height={sq ? 130 : 130} rx={20} fill={t.panel} stroke={t.warn} strokeWidth={4} />
        <Txt text="0 giờ UTC, ngày 1/1/1970" x={x0 + 24} y={ay + (sq ? 254 : 266)} w={sq ? 640 : 860} s={sq ? 42 : 54} fill={t.fg} anchor="start" />
        <Txt text="theo chuẩn chung POSIX" x={x0 + 24} y={ay + (sq ? 306 : 318)} w={sq ? 640 : 860} s={sq ? 32 : 36} fill={t.muted} anchor="start" weight={400} />
        {!sq && <Chip x={x0 + 940} y={ay + 236} w={220} h={76} text="POSIX" s={40} fill={t.accent} color={t.bg} />}
      </g>
    </Stage>
  );
};
