import React from "react";
import { useCurrentFrame } from "remotion";
import { useTheme } from "../../lib/hooks";
import { Stage } from "../../lib/theme";
import type { SceneProps } from "../../lib/types";
import { dct, generation, idct, once, qtable, toYCC } from "./anh";
import { at, modeOf, p, Txt, useGeom } from "./common";
import { PixelImage } from "./pixel";

const QY = [16, 11, 10, 16, 24, 40, 51, 61, 12, 12, 14, 19, 26, 58, 60, 55, 14, 13, 16, 24, 40, 57, 69, 56, 14, 17, 22, 29, 51, 87, 80, 62, 18, 22, 37, 56, 68, 109, 103, 77, 24, 35, 55, 64, 81, 104, 113, 92, 49, 64, 78, 87, 103, 121, 120, 101, 72, 92, 95, 98, 112, 100, 103, 99];

/** Khuôn hoa văn (u, v): ô 8×8 giá trị -1..1. */
function basis(u: number, v: number): number[] {
  const out: number[] = [];
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) out.push(Math.cos(((2 * x + 1) * u * Math.PI) / 16) * Math.cos(((2 * y + 1) * v * Math.PI) / 16));
  return out;
}

/** Vẽ một ô 8×8 từ giá trị (đen..trắng). `lo`, `hi` là khoảng giá trị. */
const Block8: React.FC<{ vals: number[]; x: number; y: number; s: number; lo: number; hi: number; stroke?: string }> = ({ vals, x, y, s, lo, hi, stroke }) => {
  const c = s / 8;
  return (
    <g>
      {vals.map((v, i) => {
        const g = Math.round(Math.min(1, Math.max(0, (v - lo) / (hi - lo))) * 255);
        return <rect key={i} x={x + (i % 8) * c} y={y + Math.floor(i / 8) * c} width={c + 0.5} height={c + 0.5} fill={`rgb(${g},${g},${g})`} />;
      })}
      {stroke && <rect x={x} y={y} width={s} height={s} fill="none" stroke={stroke} strokeWidth={3} />}
    </g>
  );
};

/** Một ô 8×8 độ sáng thật của ảnh tự vẽ (mép mái nhà), trừ 128. */
function realBlock(): number[] {
  const { y } = toYCC(generation(0));
  const w = 64;
  const out: number[] = [];
  for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) out.push(y[(16 + j) * w + (8 + i)] - 128);
  return out;
}

/**
 * Ô 8×8 và các khuôn hoa văn (phép biến đổi cosin rời rạc), làm tròn thô, lưới lệch.
 * - `khuon`: beat 0 các khuôn trơn, sọc to, sọc li ti; beat 1 mỗi khuôn đậm nhạt bao nhiêu, chồng lại thành ô; beat 2 số đầu ứng với khuôn trơn: độ sáng trung bình.
 * - `luoi64`: đủ 64 khuôn hoa văn của phép biến đổi cosin rời rạc (hiện đủ ngay frame 0).
 * - `luong-tu`: beat 0 bảng 64 con số của một ô thật, chia cho mức làm tròn rồi làm tròn: nhiều giá trị dồn về một số;
 *               beat 1 con số của khuôn sọc li ti thành không; beat 2 ảnh nén mạnh: mất nét, trời nổi ô vuông.
 * - `lech`: beat 0 lưới ô 8×8 lần sau lệch so với lưới lần trước; beat 1 ảnh bị cắt, các ô chia lại theo lưới mới.
 */
export const OTam: React.FC<SceneProps> = ({ scene }) => {
  const mode = modeOf(scene.props, "khuon");
  return (
    <Stage>
      {mode === "luoi64" ? <Luoi64 /> : mode === "luong-tu" ? <LuongTu scene={scene} /> : mode === "lech" ? <Lech scene={scene} /> : <Khuon scene={scene} />}
    </Stage>
  );
};

const Khuon: React.FC<SceneProps> = ({ scene }) => {
  const t = useTheme();
  const f = useCurrentFrame();
  const { sq } = useGeom();
  const t1 = at(scene, 1);
  const t2 = at(scene, 2);
  const a1 = p(f, t1, 14);
  const a2 = p(f, t2, 14);
  const blk = realBlock();
  const co = dct(blk);
  const pats: { u: number; v: number; name: string }[] = [
    { u: 0, v: 0, name: "khuôn trơn" },
    { u: 0, v: 1, name: "sọc to" },
    { u: 1, v: 0, name: "sọc to" },
    { u: 7, v: 7, name: "sọc li ti" },
  ];
  const S = sq ? 150 : 230;
  const gap = sq ? 46 : 90;
  const x0 = sq ? 30 : 110;
  const y0 = sq ? 50 : 70;
  const maxC = Math.max(...pats.map((q) => Math.abs(co[q.v * 8 + q.u])));
  return (
    <g>
      {pats.map((q, i) => {
        const x = x0 + i * (S + gap);
        const c = co[q.v * 8 + q.u];
        const hl = i === 0 && a2 > 0;
        return (
          <g key={i}>
            <Block8 vals={basis(q.u, q.v)} x={x} y={y0} s={S} lo={-1} hi={1} stroke={hl ? t.accent2 : t.muted} />
            <Txt text={q.name} x={x + S / 2} y={y0 + S + (sq ? 40 : 50)} w={S + gap} s={sq ? 30 : 38} fill={hl ? t.accent2 : t.fg} />
            {i < pats.length - 1 && (
              <text x={x + S + gap / 2} y={y0 + S / 2 + 16} fontSize={sq ? 40 : 56} fontWeight={700} fill={t.muted} textAnchor="middle" opacity={a1}>
                +
              </text>
            )}
            <g opacity={a1}>
              <rect x={x} y={y0 + S + (sq ? 70 : 90)} width={S * (Math.abs(c) / maxC)} height={sq ? 26 : 34} rx={8} fill={hl ? t.accent2 : t.accent} />
              <Txt text={`${Math.round(c)}`} x={x + S / 2} y={y0 + S + (sq ? 140 : 170)} w={S} s={sq ? 32 : 40} fill={hl ? t.accent2 : t.fg} />
            </g>
          </g>
        );
      })}
      <g opacity={1 - a1}>
        <Txt text="một bộ khuôn hoa văn có sẵn" x={sq ? 420 : 760} y={sq ? 330 : 420} w={sq ? 780 : 1300} s={sq ? 38 : 48} fill={t.fg} />
      </g>
      <g opacity={a1}>
        <Txt text="mỗi khuôn đậm hay nhạt bao nhiêu, rồi chồng lên nhau" x={sq ? 420 : 760} y={sq ? 420 : 560} w={sq ? 780 : 1300} s={sq ? 32 : 42} fill={t.fg} lines={2} />
        <Block8 vals={idct(co)} x={sq ? 330 : 1500} y={sq ? 490 : 70} s={sq ? 180 : 300} lo={-128} hi={127} stroke={t.ok} />
        <Txt text="= ô 64 điểm" x={sq ? 420 : 1650} y={sq ? 710 : 430} w={320} s={sq ? 32 : 42} fill={t.ok} />
      </g>
      <g opacity={a2}>
        <Txt text="số đầu: độ sáng trung bình của cả ô" x={sq ? 420 : 760} y={sq ? 790 : 680} w={sq ? 780 : 1300} s={sq ? 34 : 44} fill={t.accent2} />
      </g>
    </g>
  );
};

const Luoi64: React.FC = () => {
  const t = useTheme();
  const { sq } = useGeom();
  const G = sq ? { x: 140, y: 20, s: 560 } : { x: 160, y: 60, s: 700 };
  const c = G.s / 8;
  return (
    <g>
      {Array.from({ length: 64 }, (_, i) => {
        const u = i % 8;
        const v = Math.floor(i / 8);
        return <Block8 key={i} vals={basis(u, v)} x={G.x + u * c + 3} y={G.y + v * c + 3} s={c - 6} lo={-1} hi={1} />;
      })}
      {sq ? (
        <g>
          <Txt text="Phép toán ở lõi ảnh JPEG" x={420} y={640} w={780} s={42} fill={t.fg} />
          <Txt text="từng bị chê là quá đơn giản" x={420} y={700} w={780} s={40} fill={t.warn} />
        </g>
      ) : (
        <g>
          <Txt text="Phép toán ở lõi ảnh JPEG" x={1020} y={300} w={800} s={56} fill={t.fg} anchor="start" />
          <Txt text="từng bị chê là quá đơn giản" x={1020} y={390} w={800} s={50} fill={t.warn} anchor="start" />
          <Txt text="64 khuôn hoa văn của một ô 8×8" x={1020} y={480} w={800} s={38} fill={t.muted} anchor="start" weight={400} />
        </g>
      )}
    </g>
  );
};

const LuongTu: React.FC<SceneProps> = ({ scene }) => {
  const t = useTheme();
  const f = useCurrentFrame();
  const { sq } = useGeom();
  const t1 = at(scene, 1);
  const t2 = at(scene, 2);
  const a2 = p(f, t2, 16);
  const co = dct(realBlock()).map((v) => Math.round(v));
  const tab = qtable(QY, 50);
  const qv = co.map((v, i) => Math.round(v / tab[i]));
  const done = p(f, 20, 14);
  const cell = sq ? 90 : 64;
  const T = sq ? { x: 60, y: 30 } : { x: 110, y: 50 };
  const fine = (i: number) => (i % 8) + Math.floor(i / 8) >= 5;
  const hiFine = p(f, t1, 12);
  return (
    <g>
      <g opacity={sq ? 1 - a2 : 1}>
        {co.map((v, i) => {
          const x = T.x + (i % 8) * cell;
          const y = T.y + Math.floor(i / 8) * cell;
          const val = done >= 1 ? qv[i] : v;
          const zero = done >= 1 && val === 0;
          return (
            <g key={i}>
              <rect x={x + 2} y={y + 2} width={cell - 4} height={cell - 4} rx={6} fill={zero && fine(i) && hiFine > 0 ? t.warn : t.panel} opacity={zero && fine(i) ? 0.35 + 0.5 * hiFine : 1} />
              <text x={x + cell / 2} y={y + cell / 2 + (sq ? 11 : 9)} fontSize={sq ? 30 : 24} fontWeight={700} fill={zero ? t.muted : t.fg} textAnchor="middle">
                {val}
              </text>
            </g>
          );
        })}
        {!sq && (
          <g>
            <Txt text="64 con số của một ô" x={T.x + 4 * cell} y={T.y + 8 * cell + 50} w={540} s={38} fill={t.fg} />
            <Txt text="chia cho mức làm tròn, rồi làm tròn" x={T.x + 4 * cell} y={T.y + 8 * cell + 100} w={560} s={36} fill={t.accent2} />
          </g>
        )}
      </g>
      {!sq && (
        <g opacity={hiFine * (1 - a2)}>
          <Txt text="khuôn sọc li ti: làm tròn về không, biến mất" x={1340} y={250} w={760} s={46} fill={t.warn} lines={2} />
          <Txt text="nhiều giá trị khác nhau dồn về cùng một số" x={1340} y={450} w={760} s={40} fill={t.fg} lines={2} />
        </g>
      )}
      <g opacity={a2}>
        <PixelImage im={generation(0)} x={sq ? 40 : 700} y={sq ? 40 : 60} size={sq ? 370 : 540} sx={20} sy={0} sw={40} sh={30} stroke={t.ok} />
        <PixelImage im={once(8)} x={sq ? 430 : 1280} y={sq ? 40 : 60} size={sq ? 370 : 540} sx={20} sy={0} sw={40} sh={30} stroke={t.warn} />
        <Txt text="ảnh gốc" x={sq ? 225 : 970} y={sq ? 360 : 520} w={360} s={sq ? 32 : 40} fill={t.ok} />
        <Txt text="nén mạnh" x={sq ? 615 : 1550} y={sq ? 360 : 520} w={360} s={sq ? 32 : 40} fill={t.warn} />
        <Txt text="mất nét, trời nổi lên từng ô vuông" x={sq ? 420 : 1260} y={sq ? 440 : 620} w={sq ? 780 : 1100} s={sq ? 36 : 46} fill={t.fg} />
      </g>
    </g>
  );
};

const Lech: React.FC<SceneProps> = ({ scene }) => {
  const t = useTheme();
  const f = useCurrentFrame();
  const { sq } = useGeom();
  const t1 = at(scene, 1);
  const a0 = p(f, 10, 14);
  const a1 = p(f, t1, 16);
  const im = generation(1);
  const S = sq ? 720 : 960;
  const x0 = sq ? 60 : 110;
  const y0 = sq ? 30 : 60;
  const c = S / 64;
  const h = c * 48;
  const off = { x: 3, y: 2 };
  const grid = (ox: number, oy: number, color: string, dash: boolean, op: number) => (
    <g opacity={op}>
      {Array.from({ length: 10 }, (_, i) => {
        const X = x0 + (i * 8 - ox) * c;
        return X >= x0 && X <= x0 + S ? <line key={`v${i}`} x1={X} y1={y0} x2={X} y2={y0 + h} stroke={color} strokeWidth={dash ? 3 : 4} strokeDasharray={dash ? "8 6" : undefined} /> : null;
      })}
      {Array.from({ length: 8 }, (_, i) => {
        const Y = y0 + (i * 8 - oy) * c;
        return Y >= y0 && Y <= y0 + h ? <line key={`h${i}`} x1={x0} y1={Y} x2={x0 + S} y2={Y} stroke={color} strokeWidth={dash ? 3 : 4} strokeDasharray={dash ? "8 6" : undefined} /> : null;
      })}
    </g>
  );
  return (
    <g>
      <PixelImage im={im} x={x0} y={y0} size={S} />
      {grid(0, 0, t.fg, true, 0.9)}
      {grid(off.x, off.y, t.accent2, false, a0)}
      <g opacity={a1}>
        <rect x={x0} y={y0} width={off.x * c} height={h} fill={t.bg} opacity={0.85} />
        <rect x={x0} y={y0} width={S} height={off.y * c} fill={t.bg} opacity={0.85} />
        <Txt text="cắt bớt" x={x0 + off.x * c + 70} y={y0 + off.y * c - 10} w={180} s={sq ? 30 : 36} fill={t.warn} />
      </g>
      {sq ? (
        <g>
          <Txt text="lưới lần trước (nét đứt) và lưới lần sau lệch nhau" x={420} y={620} w={780} s={32} fill={t.fg} lines={2} />
          <g opacity={a1}>
            <Txt text="các ô chia lại theo lưới mới, lần lưu mới làm tròn tiếp" x={420} y={730} w={780} s={32} fill={t.accent2} lines={2} />
          </g>
        </g>
      ) : (
        <g>
          <Txt text="lưới lần trước" x={1490} y={180} w={600} s={42} fill={t.fg} />
          <Txt text="(nét đứt)" x={1490} y={232} w={600} s={36} fill={t.muted} weight={400} />
          <Txt text="lưới lần sau lệch đi" x={1490} y={330} w={600} s={42} fill={t.accent2} opacity={a0} />
          <g opacity={a1}>
            <Txt text="ảnh bị cắt: các ô chia lại theo lưới mới, lần lưu mới phải làm tròn tiếp" x={1490} y={480} w={600} s={38} fill={t.warn} lines={3} />
          </g>
        </g>
      )}
    </g>
  );
};
