import React from "react";
import { useCurrentFrame } from "remotion";
import { useTheme } from "../../lib/hooks";
import { Stage } from "../../lib/theme";
import type { SceneProps } from "../../lib/types";
import { Arrow, at, Chip, Laptop, p, Txt, useGeom } from "./common";

/** Các dòng trong sổ: chỉ dùng mốc đã nói trong lời của tập. */
const ROWS: { place: string; year: string; off: string }[] = [
  { place: "Sài Gòn", year: "1911", off: "UTC+7" },
  { place: "Sài Gòn", year: "1942", off: "UTC+8" },
  { place: "Sài Gòn", year: "1959", off: "UTC+8" },
  { place: "Sài Gòn", year: "1975", off: "UTC+7" },
  { place: "Samoa", year: "2011", off: "UTC+13" },
];

/**
 * Cuốn sổ múi giờ dùng chung.
 * Beat 0: cuốn sổ mở, mỗi dòng là một lần đổi giờ của một nơi; máy tính tra sổ.
 * Beat 1: IANA phát hành, sổ ghi lịch sử giờ địa phương của nhiều nơi trên thế giới.
 */
export const SoMuiGio: React.FC<SceneProps> = ({ scene }) => {
  const t = useTheme();
  const f = useCurrentFrame();
  const { sq } = useGeom();
  const t1 = at(scene, 1);
  const a1 = p(f, t1, 16);
  const hot = Math.floor(f / 26) % ROWS.length;
  const B = sq ? { x: 20, y: 40, w: 800, h: 520 } : { x: 120, y: 60, w: 1160, h: 700 };
  const rowH = sq ? 70 : 96;
  const fs = sq ? 34 : 44;
  const firstY = B.y + (sq ? 150 : 190);
  return (
    <Stage>
      <g>
        {/* sổ mở */}
        <rect x={B.x} y={B.y} width={B.w} height={B.h} rx={26} fill={t.fg} />
        <rect x={B.x + 14} y={B.y + 14} width={B.w - 28} height={B.h - 28} rx={18} fill="#f4f1e8" />
        <line x1={B.x + B.w / 2} y1={B.y + 20} x2={B.x + B.w / 2} y2={B.y + B.h - 20} stroke="#c9c2ae" strokeWidth={4} opacity={sq ? 0 : 1} />
        <Txt text="Cơ sở dữ liệu múi giờ" x={B.x + B.w / 2} y={B.y + (sq ? 76 : 100)} w={B.w - 80} s={sq ? 42 : 52} fill="#1d2b52" />
        {ROWS.map((r, i) => {
          const y = firstY + i * rowH;
          const isHot = i === hot;
          return (
            <g key={i}>
              {isHot && <rect x={B.x + 40} y={y - fs * 1.05} width={B.w - 80} height={rowH - 10} rx={12} fill={t.accent2} opacity={0.35} />}
              <Txt text={r.place} x={B.x + 70} y={y} w={sq ? 260 : 420} s={fs} fill="#1d2b52" anchor="start" />
              <Txt text={r.year} x={B.x + (sq ? 400 : 620)} y={y} w={sq ? 160 : 220} s={fs} fill="#1d2b52" anchor="middle" weight={400} />
              <Txt text={r.off} x={B.x + B.w - 70} y={y} w={sq ? 220 : 300} s={fs} fill="#2a5bd7" anchor="end" />
              <line x1={B.x + 50} y1={y + (sq ? 20 : 26)} x2={B.x + B.w - 50} y2={y + (sq ? 20 : 26)} stroke="#c9c2ae" strokeWidth={2} />
            </g>
          );
        })}
        {!sq && (
          <g>
            <Arrow x1={B.x + B.w + 30} y1={420} x2={1500} y2={420} color={t.accent} w={6} head={22} />
            <Txt text="tra sổ" x={1400} y={390} w={220} s={40} fill={t.accent} />
            <Laptop x={1680} y={410} w={300} fill={t.panel} line={t.muted} screen={t.bg} />
            <Txt text="máy tính" x={1680} y={570} w={360} s={40} fill={t.fg} />
          </g>
        )}
      </g>
      <g opacity={a1} transform={`translate(0 ${(1 - a1) * 24})`}>
        <Chip x={sq ? 40 : 1430} y={sq ? 600 : 80} w={sq ? 360 : 400} h={sq ? 76 : 84} text="IANA phát hành" s={sq ? 40 : 44} fill={t.accent} color={t.bg} />
        <Txt
          text="lịch sử giờ địa phương của nhiều nơi trên thế giới"
          x={sq ? 420 : 1630}
          y={sq ? 730 : 680}
          w={sq ? 780 : 560}
          s={sq ? 38 : 40}
          fill={t.fg}
          lines={2}
        />
      </g>
    </Stage>
  );
};
