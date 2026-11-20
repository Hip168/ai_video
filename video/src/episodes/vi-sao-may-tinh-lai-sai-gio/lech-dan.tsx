import React from "react";
import { useCurrentFrame } from "remotion";
import { useTheme } from "../../lib/hooks";
import { Stage } from "../../lib/theme";
import type { SceneProps } from "../../lib/types";
import { at, ClockFace, clamp01, lerp, p, Txt, useGeom } from "./common";

/**
 * Đá rung lệch thì đồng hồ trôi dần.
 * Beat 0: hai đồng hồ (đá chuẩn, đá lệch) chạy cạnh nhau qua từng ngày, kim của chiếc lệch trôi xa dần (phóng đại).
 * Beat 1: hai sóng rung đặt chồng: một sóng lệch 0,1 Hz, tức chênh một phần mười nhịp mỗi giây, lệch pha dần.
 */
export const LechDan: React.FC<SceneProps> = ({ scene }) => {
  const t = useTheme();
  const f = useCurrentFrame();
  const { sq } = useGeom();
  const t1 = at(scene, 1);
  const a1 = p(f, t1, 16);
  const drift = clamp01(f / 420) * 0.12; // giờ lệch (phóng đại để thấy được)
  const base = 10 + 9 / 60 + (f % 24) / 24 / 60;
  const c1 = sq ? { x: 210, y: 210 } : { x: 330, y: 330 };
  const c2 = sq ? { x: 630, y: 210 } : { x: 790, y: 330 };
  const r = sq ? 150 : 185;
  // sóng
  const wx0 = sq ? 40 : 1060;
  const wx1 = sq ? 800 : 1860;
  const wyA = sq ? 560 : 260;
  const wyB = sq ? 720 : 520;
  const amp = sq ? 40 : 60;
  const cyc = sq ? 7 : 8;
  const shift = Math.max(0, f - t1) * 0.03;
  const wave = (y: number, ph: number, k: number) => {
    const pts: string[] = [];
    const n = 160;
    for (let i = 0; i <= n; i++) {
      const u = i / n;
      const x = lerp(wx0, wx1, u * k);
      pts.push(`${x.toFixed(1)},${(y - Math.sin(u * cyc * Math.PI * 2 + ph) * amp).toFixed(1)}`);
    }
    return pts.join(" ");
  };
  const draw = a1;
  return (
    <Stage>
      <g>
        <ClockFace cx={c1.x} cy={c1.y} r={r} hours={base} ring={t.ok} face={t.panel} hand={t.fg} />
        <ClockFace cx={c2.x} cy={c2.y} r={r} hours={base + drift} ring={t.warn} face={t.panel} hand={t.fg} />
        <Txt text="Đá rung chuẩn" x={c1.x} y={c1.y + r + (sq ? 50 : 60)} w={sq ? 400 : 440} s={sq ? 36 : 42} fill={t.ok} />
        <Txt text="Đá rung lệch" x={c2.x} y={c2.y + r + (sq ? 50 : 60)} w={sq ? 400 : 440} s={sq ? 36 : 42} fill={t.warn} />
        {/* lịch lật từng ngày */}
        <g transform={`translate(${sq ? 420 : 560} ${sq ? 220 : 680})`}>
          <rect x={sq ? -56 : -150} y={sq ? -50 : -55} width={sq ? 112 : 300} height={sq ? 100 : 110} rx={16} fill={t.bg} stroke={t.accent2} strokeWidth={4} />
          <rect x={sq ? -56 : -150} y={sq ? -50 : -55} width={sq ? 112 : 300} height={sq ? 26 : 30} rx={10} fill={t.accent2} />
          <Txt text={sq ? "ngày" : "ngày qua ngày"} x={0} y={sq ? 34 : 40} w={sq ? 104 : 280} s={sq ? 30 : 40} fill={t.fg} />
        </g>
        {!sq && <Txt text="lệch một chút thôi là đồng hồ trôi dần" x={560} y={800} w={980} s={38} fill={t.muted} weight={400} />}
      </g>
      <g opacity={a1}>
        <rect x={wx0 - 20} y={wyA - amp - 70} width={wx1 - wx0 + 40} height={wyB - wyA + 2 * amp + 120} rx={24} fill={t.panel} opacity={0.6} />
        <Txt text="đá chuẩn" x={wx0} y={wyA - amp - 20} w={400} s={sq ? 32 : 36} fill={t.ok} anchor="start" />
        <polyline points={wave(wyA, 0, draw)} fill="none" stroke={t.ok} strokeWidth={5} />
        <Txt text="đá lệch 0,1 Hz" x={wx0} y={wyB - amp - 20} w={500} s={sq ? 32 : 36} fill={t.warn} anchor="start" />
        <polyline points={wave(wyB, shift, draw)} fill="none" stroke={t.warn} strokeWidth={5} />
      </g>
      <g opacity={p(f, t1 + 30, 16)}>
        <Txt
          text="chênh một phần mười nhịp mỗi giây"
          x={sq ? 420 : 1460}
          y={sq ? 820 : 760}
          w={sq ? 790 : 820}
          s={sq ? 34 : 40}
          fill={t.accent2}
        />
      </g>
    </Stage>
  );
};
