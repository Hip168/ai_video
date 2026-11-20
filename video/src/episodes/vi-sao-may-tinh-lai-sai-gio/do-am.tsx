import React from "react";
import { useCurrentFrame } from "remotion";
import { useTheme } from "../../lib/hooks";
import { Stage } from "../../lib/theme";
import type { SceneProps } from "../../lib/types";
import { at, clamp01, lerp, p, Txt, useGeom } from "./common";

/**
 * Đồng hồ lùi một giây làm phép đo ra số âm (c031, c038).
 * Beat 0: không có chỗ cho giây thứ 60; kim "bây giờ" chạy trên trục giờ đồng hồ, tới nửa đêm thì bị đặt lùi lại một giây.
 *         Lần đọc 1 trước lúc lùi, lần đọc 2 sau lúc lùi.
 * Beat 1: lần 2 nhỏ hơn lần 1: lần 2 trừ lần 1 ra số âm.
 */
export const DoAm: React.FC<SceneProps> = ({ scene }) => {
  const t = useTheme();
  const f = useCurrentFrame();
  const { sq } = useGeom();
  const t1 = at(scene, 1);
  const a1 = p(f, t1, 14);
  const ax0 = sq ? 50 : 160;
  const ax1 = sq ? 790 : 1760;
  const ay = sq ? 300 : 330;
  const X = (u: number) => lerp(ax0, ax1, u);
  const uA = 0.32; // đầu giây cuối ngày
  const uB = 0.68; // nửa đêm
  const speed = 0.36 / 75; // một giây đồng hồ = 75 frame
  const J = Math.max(70, Math.min(150, t1 - 40)); // frame bị đặt lùi
  const u0 = uB - speed * J;
  const now = f < J ? u0 + speed * f : uA + speed * (f - J);
  const jumped = f >= J;
  const fJump = p(f, J, 10);
  const r1 = uB - 0.06;
  const r2 = uA + 0.12;
  const r1On = now >= r1 || jumped;
  const r2On = jumped && now >= r2;
  const flag = (u: number, label: string, color: string, up: boolean, on: boolean, deep = 0) => (
    <g transform={`translate(0 ${deep})`}>
    <g opacity={on ? 1 : 0}>
      <line x1={X(u)} y1={ay - deep} x2={X(u)} y2={ay + (up ? -1 : 1) * (sq ? 110 : 120)} stroke={color} strokeWidth={5} />
      <rect x={X(u) - (sq ? 100 : 120)} y={up ? ay - (sq ? 170 : 186) : ay + (sq ? 106 : 116)} width={sq ? 200 : 240} height={sq ? 64 : 70} rx={14} fill={color} />
      <Txt text={label} x={X(u)} y={up ? ay - (sq ? 126 : 140) : ay + (sq ? 150 : 162)} w={sq ? 190 : 230} s={sq ? 34 : 40} fill={t.bg} />
    </g>
    </g>
  );
  return (
    <Stage>
      <g>
        <Txt text="Không có chỗ cho giây thứ 60" x={sq ? 420 : 960} y={sq ? 64 : 76} w={sq ? 790 : 1500} s={sq ? 44 : 56} fill={t.fg} />
        {!sq && <Txt text="giờ đồng hồ trong máy" x={ax0} y={ay - 34} w={500} s={36} fill={t.muted} anchor="start" weight={400} />}
        <line x1={ax0} y1={ay} x2={ax1} y2={ay} stroke={t.muted} strokeWidth={6} strokeLinecap="round" />
        {[uA, uB].map((u, i) => (
          <g key={i}>
            <line x1={X(u)} y1={ay - 18} x2={X(u)} y2={ay + 18} stroke={t.fg} strokeWidth={5} />
          </g>
        ))}
        <rect x={X(uA)} y={ay - 10} width={X(uB) - X(uA)} height={20} fill={t.accent} opacity={0.25} />
        <Txt text="giây cuối ngày" x={(X(uA) + X(uB)) / 2} y={ay - (sq ? 30 : 34)} w={X(uB) - X(uA)} s={sq ? 30 : 36} fill={t.accent} />
        <Txt text="nửa đêm" x={X(uB) + (sq ? 70 : 90)} y={ay + (sq ? 56 : 60)} w={sq ? 200 : 260} s={sq ? 30 : 36} fill={t.fg} />
        {/* mũi tên lùi */}
        <g opacity={fJump}>
          <path d={`M${X(uB)} ${ay - 24} Q${(X(uA) + X(uB)) / 2} ${ay - (sq ? 150 : 190)} ${X(uA) + 16} ${ay - 30}`} fill="none" stroke={t.warn} strokeWidth={6} />
          <polygon points={`${X(uA) + 6},${ay - 22} ${X(uA) + 36},${ay - 30} ${X(uA) + 18},${ay - 52}`} fill={t.warn} />
          <Txt text="đặt lùi lại một giây" x={(X(uA) + X(uB)) / 2} y={ay - (sq ? 162 : 206)} w={sq ? 460 : 600} s={sq ? 34 : 42} fill={t.warn} />
        </g>
        {flag(r1, "lần đọc 1", t.accent2, false, r1On)}
        {flag(r2, "lần đọc 2", t.ok, false, r2On, sq ? 76 : 0)}
        {/* kim bây giờ */}
        <g transform={`translate(${X(clamp01(now))} ${ay})`}>
          <circle r={18} fill={t.fg} stroke={t.bg} strokeWidth={4} />
        </g>
      </g>
      <g opacity={a1} transform={`translate(0 ${(1 - a1) * 24})`}>
        <rect x={sq ? 40 : 460} y={sq ? 560 : 590} width={sq ? 760 : 1000} height={sq ? 240 : 200} rx={24} fill={t.panel} stroke={t.warn} strokeWidth={5} />
        <Txt text="lần 2 − lần 1" x={sq ? 420 : 760} y={sq ? 640 : 708} w={sq ? 700 : 520} s={sq ? 50 : 60} fill={t.fg} />
        <Txt text="= số âm" x={sq ? 420 : 1200} y={sq ? 740 : 708} w={sq ? 700 : 420} s={sq ? 60 : 68} fill={t.warn} />
      </g>
    </Stage>
  );
};
