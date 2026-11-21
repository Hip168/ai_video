import React from "react";
import { useCurrentFrame } from "remotion";
import { useTheme } from "../../lib/hooks";
import { Stage } from "../../lib/theme";
import type { SceneProps } from "../../lib/types";
import { Arrow, at, lerp, modeOf, p, Txt, useGeom } from "./common";

const PIX = ["#e76f51", "#f4a261", "#e9c46a", "#2a9d8f", "#f4a261", "#e9c46a", "#2a9d8f", "#264653", "#e9c46a", "#2a9d8f", "#264653", "#e76f51", "#2a9d8f", "#264653", "#e76f51", "#f4a261"];

/**
 * Nén hai lớp.
 * - `khoi`: beat 0 một khối 4×4 điểm ảnh, phần cứng đồ họa tự giải mã; beat 1 ảnh 4 byte mỗi điểm: 64 byte; BC1: 8 byte, nhỏ đi tám lần.
 * - `chip`: beat 0 con chip có một bộ phận chỉ làm một việc: giải nén (hiện đủ ngay frame 0).
 * - `pheu`: beat 0 vào hơn 5 GB dữ liệu nén mỗi giây; beat 1 ra thường 8 đến 9 GB mỗi giây; beat 2 tới 22 GB mỗi giây.
 */
export const Nen: React.FC<SceneProps> = ({ scene }) => {
  const mode = modeOf(scene.props, "khoi");
  return <Stage>{mode === "chip" ? <Chip scene={scene} /> : mode === "pheu" ? <Pheu scene={scene} /> : <Khoi scene={scene} />}</Stage>;
};

const Khoi: React.FC<SceneProps> = ({ scene }) => {
  const t = useTheme();
  const f = useCurrentFrame();
  const { sq } = useGeom();
  const t1 = at(scene, 1);
  const a1 = p(f, t1, 16);
  const g = sq ? { x: 60, y: 60, c: 64 } : { x: 160, y: 120, c: 110 };
  const barX = sq ? 380 : 900;
  const full = sq ? 400 : 860;
  return (
    <g>
      {PIX.map((c, i) => (
        <rect key={i} x={g.x + (i % 4) * g.c} y={g.y + Math.floor(i / 4) * g.c} width={g.c - 6} height={g.c - 6} rx={6} fill={c} />
      ))}
      <Txt text="khối 4×4 = 16 điểm ảnh" x={sq ? 420 : g.x + 2 * g.c} y={sq ? 370 : g.y + 4 * g.c + 60} w={sq ? 760 : 560} s={sq ? 36 : 44} fill={t.fg} />
      <Txt text="phần cứng đồ họa tự giải mã được" x={sq ? 420 : g.x + 2 * g.c} y={sq ? 420 : g.y + 4 * g.c + 120} w={sq ? 760 : 620} s={sq ? 32 : 38} fill={t.muted} weight={400} lines={sq ? 1 : 2} />
      <g opacity={a1}>
        <Txt text="4 byte mỗi điểm: 64 byte" x={barX} y={sq ? 130 : 230} w={sq ? 420 : 860} s={sq ? 32 : 44} fill={t.fg} anchor="start" />
        <rect x={barX} y={sq ? 150 : 260} width={full * p(f, t1 + 4, 20)} height={sq ? 50 : 70} rx={10} fill={t.warn} />
        <Txt text="BC1: 8 byte" x={barX} y={sq ? 250 : 430} w={sq ? 420 : 860} s={sq ? 32 : 44} fill={t.fg} anchor="start" />
        <rect x={barX} y={sq ? 270 : 460} width={(full / 8) * p(f, t1 + 14, 12)} height={sq ? 50 : 70} rx={10} fill={t.ok} />
        <rect x={sq ? 40 : barX} y={sq ? 470 : 600} width={sq ? 760 : 700} height={sq ? 100 : 110} rx={22} fill={t.accent2} />
        <Txt text="nhỏ đi tám lần" x={sq ? 420 : barX + 350} y={sq ? 534 : 672} w={sq ? 720 : 660} s={sq ? 48 : 56} fill={t.bg} />
      </g>
    </g>
  );
};

/** Con chip: hình vuông có chân, lưới khối bên trong. */
const Chip: React.FC<SceneProps> = () => {
  const t = useTheme();
  const f = useCurrentFrame();
  const { sq } = useGeom();
  const C = sq ? { x: 170, y: 40, s: 500 } : { x: 160, y: 80, s: 620 };
  const n = 4;
  const cell = (C.s - 80) / n;
  const pulse = 0.75 + 0.25 * Math.sin(f * 0.2);
  const hl = { c: 2, r: 1 };
  return (
    <g>
      {Array.from({ length: 12 }, (_, i) => {
        const k = 40 + ((C.s - 80) / 11) * i;
        return (
          <g key={i} stroke={t.muted} strokeWidth={8}>
            <line x1={C.x + k} y1={C.y - 26} x2={C.x + k} y2={C.y} />
            <line x1={C.x + k} y1={C.y + C.s} x2={C.x + k} y2={C.y + C.s + 26} />
            <line x1={C.x - 26} y1={C.y + k} x2={C.x} y2={C.y + k} />
            <line x1={C.x + C.s} y1={C.y + k} x2={C.x + C.s + 26} y2={C.y + k} />
          </g>
        );
      })}
      <rect x={C.x} y={C.y} width={C.s} height={C.s} rx={24} fill={t.panel} stroke={t.muted} strokeWidth={6} />
      {Array.from({ length: n * n }, (_, i) => {
        const c = i % n;
        const r = Math.floor(i / n);
        const on = c === hl.c && r === hl.r;
        return <rect key={i} x={C.x + 40 + c * cell + 6} y={C.y + 40 + r * cell + 6} width={cell - 12} height={cell - 12} rx={10} fill={on ? t.accent2 : t.bg} opacity={on ? pulse : 0.8} />;
      })}
      {sq ? (
        <g>
          <Arrow x1={C.x + 40 + (hl.c + 0.5) * cell} y1={C.y + C.s + 60} x2={C.x + 40 + (hl.c + 0.5) * cell} y2={C.y + 40 + (hl.r + 1) * cell} color={t.accent2} w={5} head={18} />
          <Txt text="bộ giải nén" x={420} y={C.y + C.s + 110} w={600} s={46} fill={t.accent2} />
          <Txt text="chỉ làm đúng một việc: giải nén" x={420} y={C.y + C.s + 170} w={760} s={36} fill={t.fg} />
        </g>
      ) : (
        <g>
          <Arrow x1={1100} y1={C.y + 40 + (hl.r + 0.5) * cell} x2={C.x + 40 + (hl.c + 1) * cell + 10} y2={C.y + 40 + (hl.r + 0.5) * cell} color={t.accent2} w={6} head={22} />
          <Txt text="bộ giải nén" x={1120} y={C.y + 40 + (hl.r + 0.5) * cell + 20} w={700} s={64} fill={t.accent2} anchor="start" />
          <Txt text="một bộ phận trong chip của PS5" x={1120} y={C.y + 40 + (hl.r + 0.5) * cell + 100} w={700} s={40} fill={t.fg} anchor="start" />
          <Txt text="chỉ làm đúng một việc: giải nén" x={1120} y={C.y + 40 + (hl.r + 0.5) * cell + 160} w={700} s={40} fill={t.fg} anchor="start" />
        </g>
      )}
    </g>
  );
};

const Pheu: React.FC<SceneProps> = ({ scene }) => {
  const t = useTheme();
  const f = useCurrentFrame();
  const { sq } = useGeom();
  const t1 = at(scene, 1);
  const t2 = at(scene, 2);
  const a1 = p(f, t1, 14);
  const a2 = p(f, t2, 14);
  const B = sq ? { x: 300, y: 250, w: 240, h: 200 } : { x: 760, y: 230, w: 400, h: 300 };
  const inY = B.y + B.h / 2;
  const inH = sq ? 50 : 70;
  const outH = lerp(sq ? 90 : 130, sq ? 170 : 250, a2);
  const inX0 = sq ? 60 : 120;
  const outX1 = sq ? 780 : 1800;
  const dots = (x0: number, x1: number, h: number, n: number, color: string, speed: number, op: number) =>
    Array.from({ length: n }, (_, i) => {
      const u = ((f * speed) / (x1 - x0) + i / n) % 1;
      const row = (i * 7) % 5;
      return <rect key={i} x={x0 + u * (x1 - x0) - 8} y={inY - h / 2 + 8 + (row * (h - 16)) / 5} width={16} height={(h - 16) / 5 - 4} rx={3} fill={color} opacity={op} />;
    });
  return (
    <g>
      <rect x={inX0} y={inY - inH / 2} width={B.x - inX0} height={inH} rx={10} fill={t.panel} />
      {dots(inX0, B.x, inH, 12, t.accent, 3, 1)}
      <rect x={B.x + B.w} y={inY - outH / 2} width={outX1 - B.x - B.w} height={outH} rx={10} fill={t.panel} opacity={a1} />
      {a1 > 0 && dots(B.x + B.w, outX1, outH, a2 > 0 ? 40 : 22, t.ok, a2 > 0 ? 12 : 6, a1)}
      <rect x={B.x} y={B.y} width={B.w} height={B.h} rx={24} fill={t.accent2} />
      <Txt text="bộ giải nén" x={B.x + B.w / 2} y={B.y + B.h / 2 + 14} w={B.w - 20} s={sq ? 34 : 46} fill={t.bg} />
      <Txt text="Vào: hơn 5 GB dữ liệu nén mỗi giây" x={sq ? 420 : 440} y={sq ? 90 : 130} w={sq ? 700 : 660} s={sq ? 34 : 42} fill={t.accent} lines={2} />
      <g opacity={a1}>
        <Txt text="Ra: thường 8 đến 9 GB mỗi giây" x={sq ? 420 : 1480} y={sq ? 600 : 130} w={sq ? 700 : 620} s={sq ? 36 : 44} fill={t.ok} lines={2} />
      </g>
      <g opacity={a2}>
        <rect x={sq ? 60 : 1160} y={sq ? 680 : 620} width={sq ? 720 : 660} height={sq ? 110 : 120} rx={22} fill={t.warn} />
        <Txt text="nén đặc biệt tốt: tới 22 GB mỗi giây" x={sq ? 420 : 1490} y={sq ? 746 : 694} w={sq ? 680 : 620} s={sq ? 36 : 42} fill={t.bg} lines={sq ? 1 : 2} />
      </g>
    </g>
  );
};
