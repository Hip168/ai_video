import React from "react";
import { useCurrentFrame } from "remotion";
import { useTheme } from "../../lib/hooks";
import { Stage } from "../../lib/theme";
import type { SceneProps } from "../../lib/types";
import { at, Chip, Human, modeOf, p, Txt, useGeom, WarpWord } from "./common";

/**
 * Sách báo cũ đã quét.
 * - `trang`: beat 0 trang giấy ố vàng, một chữ nhoè mực máy đọc không ra; beat 1 ý tưởng tên reCAPTCHA.
 * - `kho`: beat 0 kho sách chữ in mờ, mỗi người gõ hộ một chữ trong vài giây; beat 1 hàng triệu người cùng gõ: sau một năm, hơn 17.600 cuốn sách.
 */
export const SachQuet: React.FC<SceneProps> = ({ scene }) => {
  const mode = modeOf(scene.props, "trang");
  return <Stage>{mode === "kho" ? <Kho scene={scene} /> : <Trang scene={scene} />}</Stage>;
};

const Lines: React.FC<{ x: number; y: number; w: number; rows: number; gap: number; skip?: [number, number] }> = ({ x, y, w, rows, gap, skip }) => (
  <g>
    {Array.from({ length: rows }, (_, r) => {
      const ww = w * (r % 3 === 2 ? 0.7 : 1);
      if (skip && skip[0] === r) {
        return (
          <g key={r}>
            <rect x={x} y={y + r * gap} width={Math.max(0, skip[1] - x - 20)} height={gap * 0.35} rx={3} fill="#8a7a5c" opacity={0.6} />
            <rect x={skip[1] + 240} y={y + r * gap} width={Math.max(0, x + ww - skip[1] - 240)} height={gap * 0.35} rx={3} fill="#8a7a5c" opacity={0.6} />
          </g>
        );
      }
      return <rect key={r} x={x} y={y + r * gap} width={ww} height={gap * 0.35} rx={3} fill="#8a7a5c" opacity={0.6} />;
    })}
  </g>
);

const Trang: React.FC<SceneProps> = ({ scene }) => {
  const t = useTheme();
  const f = useCurrentFrame();
  const { sq } = useGeom();
  const t1 = at(scene, 1);
  const P = sq ? { x: 120, y: 30, w: 600, h: 560 } : { x: 200, y: 50, w: 880, h: 720 };
  const wordX = P.x + P.w * 0.45;
  const wordY = P.y + P.h * 0.48;
  const gap = sq ? 46 : 58;
  const row = Math.round((wordY - (P.y + 60)) / gap);
  return (
    <g>
      <rect x={P.x} y={P.y} width={P.w} height={P.h} rx={8} fill="#e9dcb8" />
      <rect x={P.x} y={P.y} width={P.w} height={P.h} rx={8} fill="#b89a5a" opacity={0.18} />
      <Lines x={P.x + 50} y={P.y + 60} w={P.w - 100} rows={Math.floor((P.h - 100) / gap)} gap={gap} skip={[row, wordX - 100]} />
      <WarpWord text="harbour" cx={wordX + 20} cy={P.y + 60 + row * gap} s={sq ? 40 : 52} fill="#2b2118" noise="transparent" smudge={1} seed={13} />
      <rect x={wordX - 110} y={P.y + 60 + row * gap - (sq ? 40 : 52)} width={sq ? 260 : 300} height={sq ? 80 : 104} rx={10} fill="none" stroke={t.warn} strokeWidth={5} />
      <Txt text="máy đọc không ra" x={sq ? 420 : 1440} y={sq ? 660 : 300} w={sq ? 700 : 640} s={sq ? 36 : 48} fill={t.warn} />
      <Txt text="sách báo cũ đã quét, giấy ố vàng" x={sq ? 420 : 1440} y={sq ? 720 : 380} w={sq ? 760 : 640} s={sq ? 30 : 38} fill={t.muted} weight={400} lines={2} />
      <g opacity={p(f, t1, 14)}>
        <Chip x={sq ? 250 : 1240} y={sq ? 750 : 520} w={sq ? 340 : 400} h={sq ? 70 : 90} text="reCAPTCHA" s={sq ? 36 : 48} fill={t.accent} color={t.bg} />
      </g>
    </g>
  );
};

const Kho: React.FC<SceneProps> = ({ scene }) => {
  const t = useTheme();
  const f = useCurrentFrame();
  const { sq } = useGeom();
  const t1 = at(scene, 1);
  const a1 = p(f, t1, 14);
  const shelfY = sq ? [60, 170, 280] : [60, 190, 320];
  const bw = sq ? 34 : 48;
  const nBooks = sq ? 20 : 20;
  const x0 = sq ? 60 : 160;
  const cols = ["#8e5a3c", "#3c6e8e", "#6b8e3c", "#8e3c5a", "#5a3c8e"];
  const peopleN = Math.round((sq ? 4 : 6) + a1 * (sq ? 10 : 16));
  return (
    <g>
      {shelfY.map((y, r) => (
        <g key={r}>
          {Array.from({ length: nBooks }, (_, i) => (
            <rect key={i} x={x0 + i * (bw + 2)} y={y} width={bw} height={sq ? 96 : 116} rx={4} fill={cols[(i + r) % 5]} opacity={0.85} />
          ))}
          <rect x={x0 - 10} y={y + (sq ? 96 : 116)} width={nBooks * (bw + 2) + 20} height={8} fill={t.muted} />
        </g>
      ))}
      <g>
        {Array.from({ length: peopleN }, (_, i) => {
          const per = sq ? 7 : 8;
          const x = x0 + 40 + (i % per) * (sq ? 100 : 140);
          const y = (sq ? 470 : 540) + Math.floor(i / per) * (sq ? 90 : 110);
          const tick = (f + i * 7) % 40 < 20;
          return (
            <g key={i}>
              <Human x={x} y={y} s={sq ? 60 : 80} fill={t.panel} line={t.fg} />
              {tick && <rect x={x + (sq ? 22 : 30)} y={y - (sq ? 40 : 52)} width={sq ? 34 : 44} height={sq ? 20 : 26} rx={4} fill={t.accent2} />}
            </g>
          );
        })}
      </g>
      {!sq && <Txt text="mỗi người gõ hộ một chữ, mất vài giây" x={1500} y={150} w={560} s={40} fill={t.fg} lines={2} />}
      <g opacity={a1}>
        <rect x={sq ? 50 : 1230} y={sq ? 720 : 300} width={sq ? 740 : 560} height={sq ? 100 : 200} rx={22} fill={t.accent2} />
        <Txt text="sau một năm: hơn 17.600 cuốn sách" x={sq ? 420 : 1510} y={sq ? 784 : 384} w={sq ? 700 : 520} s={sq ? 36 : 46} fill={t.bg} lines={2} />
      </g>
    </g>
  );
};
