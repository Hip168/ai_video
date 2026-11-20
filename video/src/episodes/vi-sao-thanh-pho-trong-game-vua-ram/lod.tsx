import React from "react";
import { useCurrentFrame } from "remotion";
import { useTheme } from "../../lib/hooks";
import { Stage } from "../../lib/theme";
import type { SceneProps } from "../../lib/types";
import { Arrow, at, ChapterTag, modeOf, p, Txt, useGeom } from "./common";

/**
 * Mức chi tiết và ảnh bề mặt nhiều mức.
 * - `xa-gan`: beat 0 con đường phối cảnh, nhà ở xa chỉ là khối hộp, nhà ở gần có cửa sổ, gờ tường (hiện đủ ngay frame 0);
 *             beat 1 máy chỉ tốn công cho thứ bạn thấy rõ.
 * - `ba-muc`: beat 0 tòa nhà ở gần đủ cửa sổ, gờ tường, chậu cây; beat 1 ở thật xa chỉ còn khối hộp, trên màn hình khó thấy khác biệt.
 * - `mipmap`: beat 0 chuỗi ảnh cùng nội dung, mỗi mức nhỏ đi một nửa chiều rộng và chiều cao; beat 1 vật gần dùng ảnh nét, vật xa dùng ảnh nhỏ.
 * props: `chapterLabel` (chỉ hiện ở khung ngang).
 */
export const Lod: React.FC<SceneProps> = ({ scene }) => {
  const mode = modeOf(scene.props, "xa-gan");
  const label = typeof scene.props.chapterLabel === "string" ? scene.props.chapterLabel : "";
  return (
    <Stage>
      {mode === "ba-muc" ? <BaMuc scene={scene} /> : mode === "mipmap" ? <Mipmap scene={scene} /> : <XaGan scene={scene} />}
      <ChapterTag text={label} />
    </Stage>
  );
};

/** Tòa nhà: đáy giữa (x, y), rộng w, cao h; `lv` 0 khối hộp, 1 vài cửa sổ, 2 đủ cửa sổ, gờ tường, chậu cây. */
const Building: React.FC<{ x: number; y: number; w: number; h: number; lv: number; body: string; win: string; line: string; plant: string }> = ({ x, y, w, h, lv, body, win, line, plant }) => {
  const left = x - w / 2;
  const top = y - h;
  const cols = lv === 2 ? 4 : 2;
  const rows = lv === 2 ? 6 : 3;
  const ww = (w * 0.7) / cols;
  const wh = (h * 0.62) / rows;
  return (
    <g>
      <rect x={left} y={top} width={w} height={h} fill={body} stroke={line} strokeWidth={Math.max(2, w * 0.012)} />
      {lv >= 1 &&
        Array.from({ length: cols * rows }, (_, i) => {
          const c = i % cols;
          const r = Math.floor(i / cols);
          const wx = left + w * 0.15 + c * ((w * 0.7) / cols) + ww * 0.15;
          const wy = top + h * 0.12 + r * ((h * 0.75) / rows);
          return <rect key={i} x={wx} y={wy} width={ww * 0.7} height={wh * 0.75} fill={win} stroke={lv === 2 ? line : "none"} strokeWidth={Math.max(1, w * 0.006)} />;
        })}
      {lv === 2 &&
        Array.from({ length: rows }, (_, r) => {
          const ly = top + h * 0.12 + r * ((h * 0.75) / rows) + wh * 0.82;
          return (
            <g key={r}>
              <rect x={left - w * 0.03} y={ly} width={w * 1.06} height={Math.max(3, h * 0.012)} fill={line} />
              <circle cx={left + w * 0.24} cy={ly - Math.max(4, w * 0.025)} r={Math.max(3, w * 0.03)} fill={plant} />
              <circle cx={left + w * 0.76} cy={ly - Math.max(4, w * 0.025)} r={Math.max(3, w * 0.03)} fill={plant} />
            </g>
          );
        })}
      {lv === 2 && <rect x={left - w * 0.05} y={top - h * 0.04} width={w * 1.1} height={h * 0.04} fill={line} />}
    </g>
  );
};

const XaGan: React.FC<SceneProps> = ({ scene }) => {
  const t = useTheme();
  const f = useCurrentFrame();
  const { sq } = useGeom();
  const t1 = at(scene, 1);
  const vx = sq ? 420 : 960;
  const vy = sq ? 150 : 170;
  const k = sq ? 0.62 : 1;
  const ground = sq ? 640 : 800;
  const ds = [0.08, 0.2, 0.34, 0.5, 0.68, 0.88];
  const move = (f * 0.004) % 0.14;
  const items = ds
    .map((d0) => Math.min(1, d0 + move))
    .flatMap((d) => [-1, 1].map((side) => ({ d, side })))
    .sort((a, b) => a.d - b.d);
  return (
    <g>
      <polygon points={`${vx - 6},${vy} ${vx + 6},${vy} ${vx + 520 * k},${ground} ${vx - 520 * k},${ground}`} fill={t.panel} />
      <line x1={vx} y1={vy} x2={vx} y2={ground} stroke={t.accent2} strokeWidth={4} strokeDasharray="20 18" opacity={0.6} />
      <line x1={sq ? 20 : 100} y1={vy} x2={sq ? 820 : 1820} y2={vy} stroke={t.muted} strokeWidth={2} opacity={0.5} />
      {items.map((it, i) => {
        const d = it.d;
        const h = (sq ? 420 : 560) * d;
        const w = (sq ? 190 : 300) * d;
        const x = vx + it.side * (60 + (sq ? 300 : 560) * d) * (sq ? 0.95 : 1);
        const y = vy + (ground - vy) * d * 0.98;
        const lv = d > 0.6 ? 2 : d > 0.32 ? 1 : 0;
        return <Building key={i} x={x} y={y} w={w} h={h} lv={lv} body={lv === 0 ? t.muted : t.accent} win={t.bg} line={t.fg} plant={t.ok} />;
      })}
      <Txt text="ở xa: vẽ thô" x={sq ? 210 : 560} y={vy - (sq ? 24 : 30)} w={sq ? 360 : 500} s={sq ? 34 : 44} fill={t.muted} />
      <Txt text="ở gần: vẽ nét" x={sq ? 630 : 1360} y={vy - (sq ? 24 : 30)} w={sq ? 360 : 500} s={sq ? 34 : 44} fill={t.accent} />
      <g opacity={p(f, t1, 14)}>
        <rect x={sq ? 30 : 460} y={sq ? 690 : 700} width={sq ? 780 : 1000} height={sq ? 110 : 96} rx={22} fill={t.accent2} />
        <Txt text="máy chỉ tốn công cho thứ bạn thấy rõ" x={sq ? 420 : 960} y={sq ? 742 : 762} w={sq ? 740 : 960} s={sq ? 36 : 46} fill={t.bg} lines={sq ? 2 : 1} />
      </g>
    </g>
  );
};

const BaMuc: React.FC<SceneProps> = ({ scene }) => {
  const t = useTheme();
  const f = useCurrentFrame();
  const { sq } = useGeom();
  const t1 = at(scene, 1);
  const a1 = p(f, t1, 16);
  return (
    <g>
      <Building x={sq ? 220 : 520} y={sq ? 560 : 700} w={sq ? 300 : 440} h={sq ? 460 : 600} lv={2} body={t.accent} win={t.bg} line={t.fg} plant={t.ok} />
      <Txt text="ở gần: cửa sổ, gờ tường, chậu cây" x={sq ? 420 : 520} y={sq ? 630 : 770} w={sq ? 760 : 760} s={sq ? 34 : 42} fill={t.fg} />
      <g opacity={a1}>
        <Building x={sq ? 640 : 1220} y={sq ? 300 : 460} w={sq ? 120 : 200} h={sq ? 170 : 280} lv={0} body={t.muted} win={t.bg} line={t.fg} plant={t.ok} />
        <Txt text="ở thật xa: khối hộp" x={sq ? 640 : 1220} y={sq ? 350 : 520} w={sq ? 300 : 440} s={sq ? 32 : 40} fill={t.muted} />
        {/* trên màn hình: hai bản cùng thu nhỏ */}
        <rect x={sq ? 520 : 1480} y={sq ? 420 : 200} width={sq ? 240 : 320} height={sq ? 140 : 200} rx={14} fill={t.bg} stroke={t.muted} strokeWidth={3} />
        <Building x={sq ? 600 : 1580} y={sq ? 535 : 360} w={sq ? 22 : 34} h={sq ? 32 : 48} lv={2} body={t.accent} win={t.bg} line={t.fg} plant={t.ok} />
        <Building x={sq ? 680 : 1700} y={sq ? 535 : 360} w={sq ? 22 : 34} h={sq ? 32 : 48} lv={0} body={t.accent} win={t.bg} line={t.fg} plant={t.ok} />
        <Txt text="trên màn hình: khó thấy khác biệt" x={sq ? 420 : 1640} y={sq ? 700 : 450} w={sq ? 760 : 380} s={sq ? 34 : 38} fill={t.accent2} lines={2} />
      </g>
    </g>
  );
};

/** Ô ảnh bề mặt tường gạch, cạnh s. */
const Brick: React.FC<{ x: number; y: number; s: number; a: string; b: string; line: string }> = ({ x, y, s, a, b, line }) => {
  const rows = 6;
  const bh = s / rows;
  const bw = s / 3;
  return (
    <g>
      <rect x={x} y={y} width={s} height={s} fill={b} stroke={line} strokeWidth={Math.max(2, s * 0.012)} />
      {Array.from({ length: rows }, (_, r) =>
        Array.from({ length: 4 }, (_, c) => {
          const off = r % 2 === 0 ? 0 : bw / 2;
          const bx = x + c * bw - off;
          const x0 = Math.max(x, bx + s * 0.01);
          const x1 = Math.min(x + s, bx + bw - s * 0.01);
          if (x1 <= x0) return null;
          return <rect key={`${r}-${c}`} x={x0} y={y + r * bh + s * 0.01} width={x1 - x0} height={bh - s * 0.02} fill={a} />;
        }),
      )}
    </g>
  );
};

const Mipmap: React.FC<SceneProps> = ({ scene }) => {
  const t = useTheme();
  const f = useCurrentFrame();
  const { sq } = useGeom();
  const t1 = at(scene, 1);
  const a1 = p(f, t1, 16);
  const s0 = sq ? 300 : 440;
  const x0 = sq ? 40 : 120;
  const y0 = sq ? 40 : 60;
  const sizes = [s0, s0 / 2, s0 / 4, s0 / 8];
  let x = x0;
  const pos = sizes.map((s, i) => {
    const r = { x, y: y0 + s0 - s, s, i };
    x += s + (sq ? 24 : 40);
    return r;
  });
  return (
    <g>
      {pos.map((q) => (
        <g key={q.i} opacity={p(f, q.i * 6, 10)}>
          <Brick x={q.x} y={q.y} s={q.s} a="#b5523b" b="#e8d8c4" line={t.fg} />
        </g>
      ))}
      <Txt text="mỗi mức nhỏ đi một nửa chiều rộng và chiều cao" x={sq ? 420 : 960} y={y0 + s0 + (sq ? 56 : 70)} w={sq ? 760 : 1500} s={sq ? 34 : 46} fill={t.fg} lines={2} />
      <g opacity={a1}>
        <Txt text="vật ở gần: ảnh nét" x={sq ? 210 : x0 + s0 / 2} y={sq ? 560 : 700} w={sq ? 380 : 500} s={sq ? 34 : 44} fill={t.accent} />
        <Arrow x1={sq ? 160 : x0 + s0 / 2} y1={sq ? 520 : 650} x2={x0 + s0 / 2} y2={y0 + s0 + (sq ? 84 : 110)} color={t.accent} w={5} head={18} opacity={sq ? 0 : 1} />
        <Txt text="vật ở xa: ảnh nhỏ" x={sq ? 630 : pos[3].x + pos[3].s / 2 + 120} y={sq ? 560 : 700} w={sq ? 380 : 500} s={sq ? 34 : 44} fill={t.accent2} />
      </g>
      {sq && (
        <g opacity={a1}>
          <rect x={30} y={610} width={780} height={180} rx={20} fill={t.panel} />
          <Brick x={70} y={630} s={140} a="#b5523b" b="#e8d8c4" line={t.fg} />
          <Brick x={600} y={690} s={40} a="#b5523b" b="#e8d8c4" line={t.fg} />
          <Txt text="gần" x={290} y={710} w={200} s={34} fill={t.accent} />
          <Txt text="xa" x={540} y={720} w={120} s={34} fill={t.accent2} />
        </g>
      )}
    </g>
  );
};
