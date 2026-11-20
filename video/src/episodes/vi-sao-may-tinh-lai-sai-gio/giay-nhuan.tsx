import React from "react";
import { useCurrentFrame } from "remotion";
import { useTheme } from "../../lib/hooks";
import { Stage } from "../../lib/theme";
import type { SceneProps } from "../../lib/types";
import { at, monoStyle, p, Txt, useGeom } from "./common";

/**
 * Giây nhuận 23:59:60.
 * Beat 0: đồng hồ chuẩn hiện 23:59:60, trông như lỗi (hiện đủ ngay frame 0).
 * Dưới đồng hồ: phút cuối ngày vẽ thành các ô giây 00..59, thêm ô :60 nhấp nháy (hiện từ frame 0).
 * Beat 1: ô :60 sáng hẳn, chú thích: giây được chèn thêm, phút cuối ngày có 61 giây.
 */
export const GiayNhuan: React.FC<SceneProps> = ({ scene }) => {
  const t = useTheme();
  const f = useCurrentFrame();
  const { sq } = useGeom();
  const t1 = at(scene, 1);
  const a1 = p(f, t1, 12);
  const blink = 0.75 + 0.25 * Math.cos(f * 0.25);
  const P = sq ? { x: 30, y: 40, w: 780, h: 250, s: 150, ty: 215 } : { x: 300, y: 50, w: 1160, h: 330, s: 210, ty: 296 };
  const cx = P.x + P.w / 2;
  const cells = Array.from({ length: 61 }, (_, i) => i);
  const geom = (i: number) => {
    if (sq) {
      const c = i % 11;
      const r = Math.floor(i / 11);
      return { x: 57 + c * 66, y: 360 + r * 66, w: 56, h: 56 };
    }
    return { x: 120 + i * 27.5, y: 560, w: 22, h: 80 };
  };
  return (
    <Stage>
      <g>
        <rect x={P.x} y={P.y} width={P.w} height={P.h} rx={30} fill="#05070d" stroke={t.muted} strokeWidth={5} />
        <text x={cx} y={P.ty} fontSize={P.s} fontWeight={700} textAnchor="middle" style={monoStyle}>
          <tspan fill={t.ok}>23:59:</tspan>
          <tspan fill={t.warn} opacity={blink}>
            60
          </tspan>
        </text>
        {!sq && <Txt text="trông như lỗi?" x={P.x + P.w + 30} y={P.y + 120} w={260} s={44} fill={t.warn} anchor="start" lines={2} />}
        {!sq && <Txt text="đồng hồ chuẩn của thế giới" x={cx} y={P.y + P.h + 60} w={1200} s={40} fill={t.muted} weight={400} />}
      </g>
      <g>
        {!sq && (
          <g opacity={a1}>
            <Txt text="phút cuối ngày dài thêm một giây: 61 giây" x={960} y={530} w={1600} s={44} fill={t.fg} />
          </g>
        )}
        {cells.map((i) => {
          const g = geom(i);
          const extra = i === 60;
          return (
            <g key={i}>
              <rect x={g.x} y={g.y} width={g.w} height={g.h} rx={sq ? 10 : 6} fill={extra ? t.warn : t.accent} opacity={extra ? Math.max(a1, 0.35 + 0.4 * blink * (1 - a1)) : 0.85} stroke={extra ? t.warn : "none"} strokeWidth={3} />
              {sq && (i === 0 || i === 59 || i === 60) && (
                <text x={g.x + g.w / 2} y={g.y + g.h / 2 + 11} fontSize={30} fontWeight={700} fill={t.bg} textAnchor="middle">
                  {String(i).padStart(2, "0")}
                </text>
              )}
            </g>
          );
        })}
        {!sq &&
          [0, 60].map((i) => {
            const g = geom(i);
            return (
              <text key={i} x={g.x + g.w / 2} y={g.y + g.h + 44} fontSize={34} fontWeight={700} fill={i === 60 ? t.warn : t.muted} textAnchor="middle">
                {String(i).padStart(2, "0")}
              </text>
            );
          })}
        <g opacity={p(f, t1 + 20, 12)}>
          <Txt text="giây :60 được chèn thêm" x={sq ? 420 : 1460} y={sq ? 812 : 750} w={sq ? 780 : 760} s={sq ? 40 : 48} fill={t.warn} />
        </g>
      </g>
    </Stage>
  );
};
