import React from "react";
import { useCurrentFrame } from "remotion";
import { useTheme } from "../../lib/hooks";
import { Stage } from "../../lib/theme";
import type { SceneProps } from "../../lib/types";
import { Arrow, at, lerp, modeOf, p, Txt, useGeom } from "./common";

/**
 * RAM là mặt bàn làm việc, ổ đĩa là cái kho.
 * - `ban-kho`: beat 0 mặt bàn nhỏ (RAM) và cái kho rộng phía sau (ổ đĩa); beat 1 chỉ vài món đang cần được đưa lên bàn.
 * - `ram-cho`: beat 0 mặt bàn (RAM); beat 1 cần một mẩu dữ liệu thì đi lấy đã quá muộn; beat 2 bàn bày sẵn mọi thứ cho khoảng 30 giây chơi kế tiếp.
 */
export const KhoBan: React.FC<SceneProps> = ({ scene }) => {
  const mode = modeOf(scene.props, "ban-kho");
  return mode === "ram-cho" ? <RamCho scene={scene} /> : <BanKho scene={scene} />;
};

/** Một thùng hàng (một mẩu dữ liệu). */
const Box: React.FC<{ x: number; y: number; s: number; fill: string; line: string; opacity?: number }> = ({ x, y, s, fill, line, opacity = 1 }) => (
  <g opacity={opacity}>
    <rect x={x - s / 2} y={y - s / 2} width={s} height={s} rx={s * 0.12} fill={fill} stroke={line} strokeWidth={3} />
    <line x1={x - s / 2} y1={y - s * 0.12} x2={x + s / 2} y2={y - s * 0.12} stroke={line} strokeWidth={3} opacity={0.6} />
  </g>
);

/** Mặt bàn: mặt trên từ (x, y) rộng w, hai chân. */
const Desk: React.FC<{ x: number; y: number; w: number; fill: string; line: string }> = ({ x, y, w, fill, line }) => (
  <g>
    <rect x={x} y={y} width={w} height={26} rx={8} fill={fill} stroke={line} strokeWidth={4} />
    <rect x={x + 24} y={y + 26} width={20} height={110} fill={fill} stroke={line} strokeWidth={4} />
    <rect x={x + w - 44} y={y + 26} width={20} height={110} fill={fill} stroke={line} strokeWidth={4} />
  </g>
);

const BanKho: React.FC<SceneProps> = ({ scene }) => {
  const t = useTheme();
  const f = useCurrentFrame();
  const { sq } = useGeom();
  const t1 = at(scene, 1);
  const K = sq ? { x: 40, y: 30, w: 760, h: 360, cols: 10, rows: 4 } : { x: 920, y: 50, w: 900, h: 640, cols: 9, rows: 6 };
  const D = sq ? { x: 220, y: 600, w: 400 } : { x: 160, y: 520, w: 560 };
  const bs = sq ? 46 : 64;
  const shelfH = K.h / K.rows;
  const picks = [3, 14, 22];
  const fly = (k: number) => p(f, t1 + 8 + k * 10, 22);
  return (
    <Stage>
      {/* cái kho */}
      <rect x={K.x} y={K.y} width={K.w} height={K.h} rx={20} fill={t.panel} stroke={t.muted} strokeWidth={4} />
      {Array.from({ length: K.rows }, (_, r) => (
        <line key={r} x1={K.x + 16} y1={K.y + (r + 1) * shelfH - 8} x2={K.x + K.w - 16} y2={K.y + (r + 1) * shelfH - 8} stroke={t.muted} strokeWidth={4} />
      ))}
      {Array.from({ length: K.rows * K.cols }, (_, i) => {
        const c = i % K.cols;
        const r = Math.floor(i / K.cols);
        const bx = K.x + 40 + c * ((K.w - 80) / (K.cols - 1));
        const by = K.y + (r + 1) * shelfH - 8 - bs / 2 - 3;
        const k = picks.indexOf(i);
        const moved = k >= 0 ? fly(k) : 0;
        const tx = D.x + D.w * (0.25 + 0.25 * k);
        const ty = D.y - bs / 2 - 2;
        return <Box key={i} x={lerp(bx, tx, moved)} y={lerp(by, ty, moved)} s={bs} fill={k >= 0 && moved > 0 ? t.accent2 : t.accent} line={t.bg} opacity={0.9} />;
      })}
      <Txt text="Ổ đĩa = cái kho" x={K.x + K.w / 2} y={K.y + K.h + (sq ? 50 : 70)} w={K.w} s={sq ? 40 : 50} fill={t.fg} />
      {/* mặt bàn */}
      <Desk x={D.x} y={D.y} w={D.w} fill={t.panel} line={t.accent2} />
      <Txt text="RAM = mặt bàn làm việc" x={D.x + D.w / 2} y={D.y + (sq ? 190 : 200)} w={sq ? 700 : 640} s={sq ? 40 : 50} fill={t.accent2} />
      <g opacity={p(f, t1 + 30, 14)}>
        <Txt text="chỉ những thứ đang cần dùng" x={sq ? 420 : D.x + D.w / 2} y={sq ? 520 : 420} w={sq ? 720 : 640} s={sq ? 36 : 42} fill={t.ok} />
      </g>
    </Stage>
  );
};

/** Đồng hồ cát nhỏ. */
const Hourglass: React.FC<{ x: number; y: number; s: number; sand: number; color: string; line: string }> = ({ x, y, s, sand, color, line }) => (
  <g transform={`translate(${x} ${y})`}>
    <path d={`M${-s * 0.4} ${-s * 0.5} H${s * 0.4} L${s * 0.06} 0 L${s * 0.4} ${s * 0.5} H${-s * 0.4} L${-s * 0.06} 0 Z`} fill="none" stroke={line} strokeWidth={5} strokeLinejoin="round" />
    <path d={`M${-s * 0.32 * (1 - sand)} ${-s * 0.42 + s * 0.36 * sand} H${s * 0.32 * (1 - sand)} L0 ${-s * 0.04} Z`} fill={color} />
    <path d={`M${-s * 0.34} ${s * 0.46} H${s * 0.34} L${s * 0.34 * (1 - sand)} ${s * 0.46 - s * 0.36 * sand} H${-s * 0.34 * (1 - sand)} Z`} fill={color} />
  </g>
);

const RamCho: React.FC<SceneProps> = ({ scene }) => {
  const t = useTheme();
  const f = useCurrentFrame();
  const { sq } = useGeom();
  const t1 = at(scene, 1);
  const t2 = at(scene, 2);
  const a1 = p(f, t1, 12);
  const a2 = p(f, t2, 14);
  const D = sq ? { x: 60, y: 430, w: 500 } : { x: 140, y: 560, w: 760 };
  const bs = sq ? 40 : 56;
  const n = 2 + Math.round(a2 * (sq ? 16 : 20));
  const perRow = sq ? 9 : 10;
  const req = p(f, t1 + 10, 40);
  const disk = sq ? { x: 690, y: 160 } : { x: 1500, y: 280 };
  return (
    <Stage>
      <Desk x={D.x} y={D.y} w={D.w} fill={t.panel} line={t.accent2} />
      <Txt text="RAM = mặt bàn" x={D.x + D.w / 2} y={D.y + (sq ? 180 : 190)} w={sq ? 480 : 600} s={sq ? 40 : 48} fill={t.accent2} />
      {Array.from({ length: n }, (_, i) => {
        const c = i % perRow;
        const r = Math.floor(i / perRow);
        const spare = i >= 2;
        return <Box key={i} x={D.x + 40 + c * ((D.w - 80) / (perRow - 1))} y={D.y - bs / 2 - 2 - r * (bs + 6)} s={bs} fill={spare ? t.muted : t.accent} line={t.bg} opacity={spare ? 0.85 : 1} />;
      })}
      {/* ổ cứng ở xa */}
      <g>
        <rect x={disk.x - (sq ? 90 : 120)} y={disk.y - (sq ? 70 : 90)} width={sq ? 180 : 240} height={sq ? 140 : 180} rx={18} fill={t.panel} stroke={t.muted} strokeWidth={4} />
        <circle cx={disk.x} cy={disk.y} r={sq ? 48 : 64} fill="none" stroke={t.muted} strokeWidth={4} />
        <circle cx={disk.x} cy={disk.y} r={8} fill={t.muted} />
        <Txt text="ổ cứng" x={disk.x} y={disk.y + (sq ? 112 : 140)} w={260} s={sq ? 34 : 40} fill={t.fg} />
      </g>
      <g opacity={a1}>
        <Arrow x1={D.x + D.w * 0.6} y1={D.y - (sq ? 70 : 100)} x2={lerp(D.x + D.w * 0.6, disk.x - (sq ? 100 : 140), req)} y2={lerp(D.y - (sq ? 70 : 100), disk.y + 20, req)} color={t.warn} w={5} head={18} dashed />
        <Txt text="cần một mẩu dữ liệu" x={sq ? 420 : 520} y={sq ? 70 : 150} w={sq ? 560 : 640} s={sq ? 36 : 44} fill={t.fg} />
        <g opacity={p(f, t1 + 50, 10) * (1 - a2)}>
          <Txt text="đi lấy thì đã quá muộn" x={sq ? 420 : 520} y={sq ? 120 : 210} w={sq ? 600 : 640} s={sq ? 38 : 46} fill={t.warn} />
        </g>
      </g>
      <g opacity={a2}>
        <Hourglass x={sq ? 690 : 1180} y={sq ? 520 : 470} s={sq ? 110 : 150} sand={p(f, t2, 120)} color={t.accent2} line={t.fg} />
        <Txt text="khoảng 30 giây chơi kế tiếp" x={sq ? 420 : 1450} y={sq ? 730 : 690} w={sq ? 740 : 700} s={sq ? 36 : 44} fill={t.accent2} />
        <Txt text="bày sẵn, dù chưa chắc đã dùng" x={sq ? 420 : 1450} y={sq ? 790 : 750} w={sq ? 740 : 700} s={sq ? 34 : 40} fill={t.muted} weight={400} />
      </g>
    </Stage>
  );
};
