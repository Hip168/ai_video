import React from "react";
import { useCurrentFrame } from "remotion";
import { useTheme } from "../../lib/hooks";
import { Stage } from "../../lib/theme";
import type { SceneProps } from "../../lib/types";
import { Arrow, at, ChapterTag, ClockFace, clamp01, lerp, modeOf, p, Txt, useGeom } from "./common";

/**
 * Tinh thể thạch anh trong đồng hồ.
 * - `rung`: beat 0 đồng hồ đeo tay (kim giây chạy) và kính lúp còn dấu hỏi; beat 1 trong kính lúp hiện mảnh thạch anh; beat 2 mảnh đá rung, 32.768 lần mỗi giây.
 * - `chia-doi`: beat 0 32.768 = 2 mũ 15, chuỗi 15 tầng chia đôi; beat 1 nhịp chạy qua 15 tầng, còn 1 nhịp mỗi giây.
 * props: `chapterLabel` (nhãn chương nhỏ ở góc, dùng khi cảnh mở đầu chương và một Short).
 */
export const ThachAnh: React.FC<SceneProps> = ({ scene }) => {
  const mode = modeOf(scene.props, "rung");
  const label = typeof scene.props.chapterLabel === "string" ? scene.props.chapterLabel : "";
  return (
    <Stage>
      {mode === "chia-doi" ? <ChiaDoi scene={scene} /> : <Rung scene={scene} />}
      {label !== "" && <ChapterTag text={label} />}
    </Stage>
  );
};

/** Âm thoa thạch anh, tâm (x, y), cỡ k (1 = cao khoảng 340). `d` độ lệch hai nhánh khi rung. */
const Fork: React.FC<{ x: number; y: number; k: number; d: number; fill: string; line: string }> = ({ x, y, k, d, fill, line }) => (
  <g transform={`translate(${x} ${y}) scale(${k})`}>
    <rect x={-22} y={70} width={44} height={100} rx={8} fill={fill} stroke={line} strokeWidth={4} />
    <path d="M-72 80 Q-72 40 -40 40 H40 Q72 40 72 80 Z" fill={fill} stroke={line} strokeWidth={4} />
    <rect x={-72 - d} y={-170} width={38} height={250} rx={10} fill={fill} stroke={line} strokeWidth={4} />
    <rect x={34 + d} y={-170} width={38} height={250} rx={10} fill={fill} stroke={line} strokeWidth={4} />
  </g>
);

const Rung: React.FC<SceneProps> = ({ scene }) => {
  const t = useTheme();
  const f = useCurrentFrame();
  const { sq } = useGeom();
  const t1 = at(scene, 1);
  const t2 = at(scene, 2);
  const a1 = p(f, t1, 18);
  const a2 = p(f, t2, 14);
  const sec = Math.floor(f / 30) % 60;
  const wx = sq ? 175 : 500;
  const wy = sq ? 300 : 420;
  const wr = sq ? 130 : 210;
  const mx = sq ? 580 : 1330;
  const my = sq ? 360 : 380;
  const mr = sq ? 210 : 290;
  const amp = a2 * (sq ? 10 : 14) * Math.sin(f * 2.4);
  return (
    <g>
      {/* dây đeo và vỏ đồng hồ */}
      <rect x={wx - wr * 0.5} y={wy - wr * 1.75} width={wr} height={wr * 3.5} rx={30} fill={t.panel} stroke={t.muted} strokeWidth={4} />
      <circle cx={wx} cy={wy} r={wr + 22} fill={t.muted} />
      <rect x={wx + wr + 14} y={wy - 22} width={30} height={44} rx={8} fill={t.muted} />
      <ClockFace cx={wx} cy={wy} r={wr} hours={10 + 9 / 60} sec={sec} ring={t.fg} face={t.bg} hand={t.fg} secHand={t.accent2} />
      <Txt text="Đồng hồ đeo tay" x={wx} y={sq ? 560 : 770} w={sq ? 380 : 600} s={sq ? 38 : 48} fill={t.fg} />
      {/* kính lúp: mảnh thạch anh bên trong */}
      <g>
        <line x1={wx + wr * 0.4} y1={wy - wr * 0.3} x2={mx - mr * 0.92} y2={my - mr * 0.35} stroke={t.accent} strokeWidth={4} strokeDasharray="10 10" />
        <line x1={wx + wr * 0.4} y1={wy + wr * 0.3} x2={mx - mr * 0.92} y2={my + mr * 0.35} stroke={t.accent} strokeWidth={4} strokeDasharray="10 10" />
        <circle cx={wx + wr * 0.4} cy={wy} r={wr * 0.3} fill="none" stroke={t.accent} strokeWidth={5} />
        <circle cx={mx} cy={my} r={mr} fill={t.panel} stroke={t.accent} strokeWidth={8} />
        <g opacity={1 - a1}>
          <text x={mx} y={my + (sq ? 40 : 56)} fontSize={sq ? 120 : 160} fontWeight={700} fill={t.muted} textAnchor="middle">
            ?
          </text>
        </g>
        <g opacity={a1}>
        <Fork x={mx} y={my + 6} k={(mr / 300) * 0.95} d={amp} fill="#cfd8e8" line={t.bg} />
        {a2 > 0 &&
          [-1, 1].map((sgn) => (
            <path
              key={sgn}
              d={`M${mx + sgn * mr * 0.42} ${my - mr * 0.5} q${sgn * 22} ${mr * 0.25} 0 ${mr * 0.5}`}
              fill="none"
              stroke={t.accent2}
              strokeWidth={5}
              opacity={a2 * (0.5 + 0.5 * Math.abs(Math.sin(f * 0.6)))}
            />
          ))}
        <Txt text="tinh thể thạch anh" x={mx} y={my + mr + (sq ? 56 : 66)} w={sq ? 460 : 640} s={sq ? 36 : 46} fill={t.accent} />
        </g>
      </g>
      <g opacity={a2}>
        <rect x={sq ? 40 : 980} y={sq ? 690 : 20} width={sq ? 760 : 700} height={sq ? 110 : 110} rx={24} fill={t.accent2} />
        <Txt text="32.768 lần mỗi giây" x={sq ? 420 : 1330} y={sq ? 764 : 94} w={sq ? 720 : 660} s={sq ? 56 : 64} fill={t.bg} />
      </g>
    </g>
  );
};

const ChiaDoi: React.FC<SceneProps> = ({ scene }) => {
  const t = useTheme();
  const f = useCurrentFrame();
  const { sq } = useGeom();
  const t1 = at(scene, 1);
  const N = 15;
  const run = (f - t1 - 10) / 8; // mỗi tầng 8 frame
  const lit = clamp01(run / N) * N;
  const done = p(f, t1 + 10 + N * 8, 12);
  // vị trí tầng
  const pos = (i: number): { x: number; y: number } => {
    if (!sq) return { x: 400 + i * 80, y: 460 };
    const row = Math.floor(i / 5);
    const col = row % 2 === 0 ? i % 5 : 4 - (i % 5);
    return { x: 140 + col * 140, y: 300 + row * 112 };
  };
  const bw = sq ? 110 : 66;
  const bh = sq ? 84 : 90;
  const left = sq ? { x: 420, y: 205, w: 420, h: 90 } : { x: 190, y: 460, w: 280, h: 150 };
  const right = sq ? { x: 420, y: 760, w: 560, h: 100 } : { x: 1730, y: 460, w: 300, h: 150 };
  const k = Math.min(N, Math.floor(lit));
  return (
    <g>
      <text x={sq ? 420 : 960} y={sq ? 110 : 230} fontSize={sq ? 72 : 96} fontWeight={700} fill={t.accent2} textAnchor="middle">
        32.768 = 2
        <tspan dy={sq ? -30 : -40} fontSize={sq ? 44 : 60}>
          15
        </tspan>
      </text>
      {/* hộp vào */}
      <rect x={left.x - left.w / 2} y={left.y - left.h / 2} width={left.w} height={left.h} rx={20} fill={t.accent} />
      <Txt text="32.768 nhịp" x={left.x} y={left.y + (sq ? 14 : -4)} w={left.w - 30} s={sq ? 44 : 44} fill={t.bg} />
      {!sq && <Txt text="mỗi giây" x={left.x} y={left.y + 46} w={left.w - 30} s={36} fill={t.bg} weight={400} />}
      {/* 15 tầng chia đôi */}
      {Array.from({ length: N }, (_, i) => {
        const c = pos(i);
        const on = lit > i;
        const glow = on ? clamp01(lit - i) : 0;
        const nx = i < N - 1 ? pos(i + 1) : null;
        return (
          <g key={i}>
            {nx && <line x1={c.x} y1={c.y} x2={nx.x} y2={nx.y} stroke={on ? t.accent2 : t.muted} strokeWidth={5} opacity={0.8} />}
            <rect x={c.x - bw / 2} y={c.y - bh / 2} width={bw} height={bh} rx={14} fill={on ? t.accent2 : t.panel} stroke={on ? t.accent2 : t.muted} strokeWidth={4} opacity={0.6 + 0.4 * glow} />
            <text x={c.x} y={c.y + (sq ? 13 : 12)} fontSize={sq ? 38 : 32} fontWeight={700} fill={on ? t.bg : t.fg} textAnchor="middle">
              ÷2
            </text>
          </g>
        );
      })}
      {!sq && <Arrow x1={left.x + left.w / 2 + 6} y1={460} x2={pos(0).x - bw / 2 - 6} y2={460} color={t.muted} w={5} head={16} />}
      {!sq && <Arrow x1={pos(N - 1).x + bw / 2 + 6} y1={460} x2={right.x - right.w / 2 - 6} y2={460} color={done > 0 ? t.ok : t.muted} w={5} head={16} />}
      {sq && <Arrow x1={420} y1={250} x2={pos(0).x} y2={pos(0).y - bh / 2 - 4} color={t.muted} w={5} head={16} />}
      {sq && <Arrow x1={pos(N - 1).x} y1={pos(N - 1).y + bh / 2 + 4} x2={pos(N - 1).x} y2={right.y - right.h / 2 - 4} color={done > 0 ? t.ok : t.muted} w={5} head={16} />}
      {/* hộp ra */}
      <rect x={right.x - right.w / 2} y={right.y - right.h / 2} width={right.w} height={right.h} rx={20} fill={done > 0 ? t.ok : t.panel} stroke={t.ok} strokeWidth={5} />
      <Txt text={sq ? "1 nhịp mỗi giây" : "1 nhịp"} x={right.x} y={right.y + (sq ? 16 : -4)} w={right.w - 30} s={sq ? 46 : 44} fill={done > 0 ? t.bg : t.ok} />
      {!sq && <Txt text="mỗi giây" x={right.x} y={right.y + 46} w={right.w - 30} s={36} fill={done > 0 ? t.bg : t.ok} weight={400} />}
      {/* đếm tầng */}
      <g opacity={p(f, t1, 12)}>
        <Txt text={`chia đôi: ${k}/15 lần`} x={sq ? 420 : 960} y={sq ? 652 : 660} w={sq ? 600 : 900} s={sq ? 40 : 56} fill={t.fg} />
      </g>
      {!sq && (
        <g opacity={lerp(1, 0.6, p(f, t1, 12))}>
          <Txt text="mạch điện chỉ việc chia đôi liên tiếp" x={960} y={780} w={1500} s={40} fill={t.muted} weight={400} />
        </g>
      )}
    </g>
  );
};
