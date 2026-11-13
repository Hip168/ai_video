import React from "react";
import { useCurrentFrame } from "remotion";
import { useTheme } from "../../lib/hooks";
import { Stage } from "../../lib/theme";
import { TextBlock } from "../../lib/b-kit";
import type { SceneProps } from "../../lib/types";
import { at, clamp01, lerp, p, useGeom } from "./common";

/**
 * Ném đá lia thia: hình ảnh cho điểm thấp nhất của quỹ đạo.
 * Beat 0: viên đá lướt sát mặt nước rồi bay lên lại. Beat 1: ném cao quá thì bay vèo qua, thấp quá thì cắm xuống nước.
 * Beat 2: chỗ đường bay gần mặt nhất là điểm thấp nhất của quỹ đạo.
 */
export const LiaThia: React.FC<SceneProps> = ({ scene }) => {
  const theme = useTheme();
  const f = useCurrentFrame();
  const { W, sq } = useGeom();
  const t1 = at(scene, 1);
  const t2 = at(scene, 2);
  const ys = sq ? 610 : 640;
  const xa = sq ? 60 : 180;
  const xb = sq ? W - 40 : 1760;
  const xm = (xa + xb) / 2;
  const ha = sq ? 330 : 400;
  const scaleH = sq ? 0.8 : 1;

  const yOf = (hmin: number) => (x: number) => {
    const a = (ha - hmin) / ((xa - xm) * (xa - xm));
    return ys - (hmin + a * (x - xm) * (x - xm));
  };
  const mid = yOf(70 * scaleH);
  const high = yOf(250 * scaleH);
  const low = yOf(-140 * scaleH);
  // x nơi đường thấp chạm nước
  const a = (ha + 140 * scaleH) / ((xa - xm) * (xa - xm));
  const xHit = xm - Math.sqrt((140 * scaleH) / a);

  const N = 60;
  const path = (fn: (x: number) => number, x1: number) =>
    Array.from({ length: N + 1 }, (_, i) => lerp(xa, x1, i / N))
      .map((x) => `${x},${fn(x)}`)
      .join(" ");

  const loop = 75;
  const u = (((f % loop) + loop) % loop) / loop;
  const stone = (fn: (x: number) => number, x1: number, uu: number) => {
    const x = lerp(xa, x1, uu);
    return { x, y: fn(x) };
  };
  const sm = stone(mid, xb, u);
  const b1 = p(f, t1, 14);
  const u1 = clamp01(((f - t1) % loop) / loop);
  const sh = stone(high, xb, u1);
  const uLow = clamp01(((f - t1) % loop) / (loop * 0.55));
  const sl = stone(low, xHit, uLow);
  const splash = uLow >= 1 ? clamp01((((f - t1) % loop) - loop * 0.55) / 14) : 0;
  const b2 = p(f, t2, 14);
  const fs = sq ? 32 : 42;

  return (
    <Stage>
      {/* Mặt nước (gợn sóng chạy theo frame) */}
      <rect x={0} y={ys} width={W} height={sq ? 840 - ys : 830 - ys} fill={theme.accent} opacity={0.18} />
      <path
        d={Array.from({ length: 49 }, (_, i) => {
          const x = (i / 48) * W;
          return `${i === 0 ? "M" : "L"}${x} ${ys + 6 * Math.sin(i * 0.9 + f * 0.15)}`;
        }).join(" ")}
        fill="none"
        stroke={theme.accent}
        strokeWidth={5}
      />
      <TextBlock text="Hòn đá ném lia thia trên mặt nước" x={W / 2} y={sq ? 70 : 100} width={W - 80} fontSize={sq ? 38 : 54} maxLines={2} fill={theme.fg} />
      <circle cx={xa} cy={ys - ha} r={sq ? 14 : 18} fill={theme.muted} />

      {/* Đường vừa đủ */}
      <polyline points={path(mid, xb)} fill="none" stroke={b2 > 0 ? theme.ok : theme.fg} strokeWidth={b2 > 0 ? 7 : 5} strokeDasharray={b2 > 0 ? undefined : "14 10"} />
      <circle cx={sm.x} cy={sm.y} r={sq ? 14 : 18} fill={theme.fg} />

      {/* Cao quá / thấp quá */}
      <g opacity={b1 * (1 - 0.6 * b2)}>
        <polyline points={path(high, xb)} fill="none" stroke={theme.accent2} strokeWidth={5} strokeDasharray="14 10" />
        <circle cx={sh.x} cy={sh.y} r={sq ? 12 : 16} fill={theme.accent2} />
        <TextBlock text="cao quá: bay vèo qua" x={xm} y={high(xm) - 70} width={sq ? 600 : 700} fontSize={fs} fill={theme.accent2} />
        <polyline points={path(low, xHit)} fill="none" stroke={theme.warn} strokeWidth={5} strokeDasharray="14 10" />
        {uLow < 1 && <circle cx={sl.x} cy={sl.y} r={sq ? 12 : 16} fill={theme.warn} />}
        {splash > 0 && (
          <g opacity={1 - splash}>
            {[-1, -0.4, 0.4, 1].map((d, i) => (
              <line key={i} x1={xHit} y1={ys} x2={xHit + d * 40 * splash} y2={ys - 50 * splash * (1 - Math.abs(d) * 0.3)} stroke={theme.warn} strokeWidth={5} strokeLinecap="round" />
            ))}
          </g>
        )}
        <TextBlock text="thấp quá: cắm xuống nước" x={xHit + (sq ? 20 : 30)} y={ys + (sq ? 150 : 80)} width={sq ? 520 : 640} fontSize={fs} fill={theme.warn} anchor="start" />
      </g>

      {/* Điểm thấp nhất */}
      <g opacity={b2}>
        <line x1={xm} y1={mid(xm) + 14} x2={xm} y2={ys - 6} stroke={theme.ok} strokeWidth={5} strokeDasharray="8 6" />
        <circle cx={xm} cy={mid(xm)} r={sq ? 14 : 18} fill="none" stroke={theme.ok} strokeWidth={6} />
        <TextBlock
          text="điểm thấp nhất của quỹ đạo"
          x={xm}
          y={sq ? ys + 80 : mid(xm) - 120}
          width={sq ? 600 : 800}
          fontSize={sq ? 36 : 48}
          fill={theme.ok}
        />
      </g>
    </Stage>
  );
};
