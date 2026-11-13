import React from "react";
import { useCurrentFrame } from "remotion";
import { useTheme } from "../../lib/hooks";
import { Stage } from "../../lib/theme";
import { TextBlock } from "../../lib/b-kit";
import type { SceneProps } from "../../lib/types";
import { Arrow, at, clamp01, ease, lerp, p, Ship, useGeom } from "./common";

/** Cung mũi tên quanh (cx, cy) bán kính r, từ góc a0 tới a1 (độ, 0 ở đỉnh, chiều kim đồng hồ dương). */
const ArcArrow: React.FC<{ cx: number; cy: number; r: number; a0: number; a1: number; color: string; w?: number; opacity?: number }> = ({ cx, cy, r, a0, a1, color, w = 6, opacity = 1 }) => {
  const pt = (a: number) => {
    const t = ((a - 90) * Math.PI) / 180;
    return { x: cx + r * Math.cos(t), y: cy + r * Math.sin(t) };
  };
  const s = pt(a0);
  const e = pt(a1);
  const cw = a1 > a0 ? 1 : 0;
  const large = Math.abs(a1 - a0) > 180 ? 1 : 0;
  const dir = a1 > a0 ? 1 : -1;
  const tan = ((a1 - 90) * Math.PI) / 180 + (dir * Math.PI) / 2;
  return (
    <g opacity={opacity}>
      <path d={`M${s.x} ${s.y} A ${r} ${r} 0 ${large} ${cw} ${e.x} ${e.y}`} fill="none" stroke={color} strokeWidth={w} strokeLinecap="round" />
      <polygon points={`0,0 ${-w * 3.2},${-w * 1.8} ${-w * 3.2},${w * 1.8}`} fill={color} transform={`translate(${e.x} ${e.y}) rotate(${(tan * 180) / Math.PI})`} />
    </g>
  );
};

/**
 * Bánh xe phản lực giữ hướng con tàu.
 * Beat 0: bánh quay một chiều, thân tàu xoay chiều ngược lại. Beat 1: nắng đẩy lên tấm pin, tàu bị xoay lệch.
 * Beat 2: bánh xe phải quay nhanh dần để bù; đồng hồ tốc độ bánh tiến dần tới vạch giới hạn.
 */
export const BanhDa: React.FC<SceneProps> = ({ scene }) => {
  const theme = useTheme();
  const f = useCurrentFrame();
  const { W, sq } = useGeom();
  const t1 = Math.max(20, at(scene, 1));
  const t2 = Math.max(t1 + 20, at(scene, 2));
  const s = sq ? 170 : 280;
  const cx = sq ? 330 : 720;
  const cy = sq ? 480 : 470;
  const wr = s * 0.32;

  // Góc thân tàu (độ): A xoay ngược bánh; B nắng đẩy lệch; C bánh nhanh dần, thân về lại và đứng yên.
  const thA = -18 * ease((f - 8) / Math.max(10, t1 - 8));
  const thB = 24 * ease((f - t1) / Math.max(10, t2 - t1));
  const thC = ease((f - t2) / 24);
  const body = f < t1 ? thA : f < t2 ? -18 + thB : lerp(-18 + 24, 0, thC);

  // Tốc độ bánh (độ/frame) và góc bánh (tích phân, dạng đóng).
  const w0 = 7;
  const acc = 0.22;
  const wMax = 30;
  const tc = Math.max(0, f - t2);
  const tcCap = Math.min(tc, (wMax - w0) / acc);
  const omega = w0 + acc * tcCap;
  const startSpin = 8;
  const base = w0 * Math.max(0, Math.min(f, t2) - startSpin);
  const extra = w0 * tc + 0.5 * acc * tcCap * tcCap + (tc - tcCap) * (wMax - w0);
  const wheelAng = base + extra;
  const gauge = clamp01((f < startSpin ? 0 : omega) / 32);

  const sunP = p(f, t1, 14);
  const capP = [1 - p(f, t1, 10), p(f, t1, 10) * (1 - p(f, t2, 10)), p(f, t2, 10)];
  const caps = ["Bánh xe quay một chiều, thân tàu xoay chiều ngược lại", "Nắng đẩy nhẹ lên tấm pin, tàu bị xoay lệch", "Bánh xe phải quay nhanh dần lên để bù lại"];
  const capColor = [theme.fg, theme.accent2, theme.accent];

  // Đồng hồ tốc độ bánh (cột dọc)
  const gx = sq ? 34 : 120;
  const gw = sq ? 40 : 56;
  const gy0 = sq ? 300 : 240;
  const gy1 = sq ? 760 : 760;
  const sunX = sq ? 740 : 1700;
  const sunY = sq ? 210 : 200;
  const panelMid = { x: cx + s * 1.5, y: cy };
  return (
    <Stage>
      {caps.map((c, i) => (
        <TextBlock key={i} text={c} x={W / 2} y={sq ? 70 : 100} width={W - 80} fontSize={sq ? 38 : 56} maxLines={2} fill={capColor[i]} opacity={capP[i]} />
      ))}
      {/* Mặt trời và tia nắng (beat 1) */}
      <g opacity={sunP}>
        <circle cx={sunX} cy={sunY} r={sq ? 40 : 60} fill={theme.accent2} />
        {[0, 1, 2].map((k) => {
          const u = ((f * 0.03 + k / 3) % 1 + 1) % 1;
          const x1 = lerp(sunX - (sq ? 40 : 70), panelMid.x + 30, u);
          const y1 = lerp(sunY + (sq ? 30 : 50), panelMid.y - s * 0.3, u);
          return <Arrow key={k} x1={x1} y1={y1} x2={x1 - (sq ? 40 : 60)} y2={y1 + (sq ? 30 : 45) * ((panelMid.y - sunY) / Math.abs(panelMid.x - sunX + 1))} color={theme.accent2} w={5} head={16} opacity={0.4 + 0.6 * Math.sin(u * Math.PI)} />;
        })}
      </g>
      {/* Thân tàu + bánh xe */}
      <g transform={`rotate(${body} ${cx} ${cy})`}>
        <Ship x={cx} y={cy} s={s} body={theme.panel} panel={theme.accent} line={theme.fg} />
        <circle cx={cx} cy={cy} r={wr} fill={theme.bg} stroke={theme.accent2} strokeWidth={6} />
        <g transform={`rotate(${wheelAng} ${cx} ${cy})`}>
          {[0, 45, 90, 135].map((a) => (
            <line key={a} x1={cx - wr * Math.cos((a * Math.PI) / 180)} y1={cy - wr * Math.sin((a * Math.PI) / 180)} x2={cx + wr * Math.cos((a * Math.PI) / 180)} y2={cy + wr * Math.sin((a * Math.PI) / 180)} stroke={theme.accent2} strokeWidth={5} />
          ))}
          <circle cx={cx + wr * 0.8} cy={cy} r={wr * 0.12} fill={theme.warn} />
        </g>
      </g>
      {/* Mũi tên chiều quay (beat 0) */}
      <g opacity={1 - p(f, t1, 10)}>
        <ArcArrow cx={cx} cy={cy} r={wr + (sq ? 22 : 30)} a0={-30} a1={60} color={theme.accent2} w={sq ? 5 : 6} />
        <ArcArrow cx={cx} cy={cy} r={s * 0.82} a0={200} a1={140} color={theme.fg} w={sq ? 5 : 6} />
        <TextBlock text="bánh xe" x={cx} y={cy - wr - (sq ? 44 : 56)} width={300} fontSize={sq ? 32 : 40} fill={theme.accent2} />
        <TextBlock text="thân tàu" x={cx - s * 0.9} y={cy + s * 0.75} width={300} fontSize={sq ? 32 : 40} fill={theme.fg} />
      </g>
      {/* Đồng hồ tốc độ bánh */}
      <rect x={gx} y={gy0} width={gw} height={gy1 - gy0} rx={12} fill={theme.panel} stroke={theme.muted} strokeWidth={4} />
      <rect x={gx + 6} y={gy1 - 6 - (gy1 - gy0 - 12) * gauge} width={gw - 12} height={(gy1 - gy0 - 12) * gauge} rx={8} fill={gauge > 0.85 ? theme.warn : theme.accent2} />
      <line x1={gx - 10} y1={gy0 + 10} x2={gx + gw + 10} y2={gy0 + 10} stroke={theme.warn} strokeWidth={5} />
      <TextBlock text="giới hạn" x={gx + gw + 16} y={gy0 + 22} width={240} fontSize={sq ? 30 : 36} fill={theme.warn} anchor="start" weight={400} />
      <TextBlock text="tốc độ bánh" x={gx + gw + 16} y={gy1 - 10} width={260} fontSize={sq ? 30 : 36} fill={theme.muted} anchor="start" weight={400} />
    </Stage>
  );
};
