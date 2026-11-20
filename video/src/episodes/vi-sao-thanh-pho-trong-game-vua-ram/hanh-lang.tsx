import React from "react";
import { useCurrentFrame } from "remotion";
import { useTheme } from "../../lib/hooks";
import { Stage } from "../../lib/theme";
import type { SceneProps } from "../../lib/types";
import { at, cityBlocks, clamp01, p, Txt, useGeom } from "./common";

/** Điểm tại tỉ lệ u dọc đường gấp khúc. */
function along(pts: { x: number; y: number }[], u: number): { x: number; y: number } {
  const seg: number[] = [];
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    const d = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    seg.push(d);
    total += d;
  }
  let need = clamp01(u) * total;
  for (let i = 0; i < seg.length; i++) {
    if (need <= seg[i]) {
      const k = seg[i] === 0 ? 0 : need / seg[i];
      return { x: pts[i].x + (pts[i + 1].x - pts[i].x) * k, y: pts[i].y + (pts[i + 1].y - pts[i].y) * k };
    }
    need -= seg[i];
  }
  return pts[pts.length - 1];
}

/**
 * Hành lang ngoằn ngoèo giấu thời gian nạp (c016).
 * Beat 0: hai khu nhiều chi tiết, nối bằng cầu thang dài, thang máy, hành lang ngoằn ngoèo.
 * Beat 1: người chơi đi qua hành lang; khu cũ bị bỏ khỏi bộ nhớ, khu mới được nạp; khoảng 30 giây.
 */
export const HanhLang: React.FC<SceneProps> = ({ scene }) => {
  const t = useTheme();
  const f = useCurrentFrame();
  const { sq } = useGeom();
  const t1 = at(scene, 1);
  const walk = clamp01((f - t1) / Math.max(30, scene.durationFrames - t1 - 10));
  const A = sq ? { x: 30, y: 30, w: 260, h: 220 } : { x: 110, y: 160, w: 400, h: 400 };
  const Bz = sq ? { x: 550, y: 390, w: 260, h: 220 } : { x: 1410, y: 160, w: 400, h: 400 };
  const path = sq
    ? [
        { x: 290, y: 140 },
        { x: 400, y: 140 },
        { x: 400, y: 240 },
        { x: 300, y: 240 },
        { x: 300, y: 340 },
        { x: 450, y: 340 },
        { x: 450, y: 430 },
        { x: 550, y: 500 },
      ]
    : [
        { x: 510, y: 360 },
        { x: 640, y: 360 },
        { x: 640, y: 200 },
        { x: 820, y: 200 },
        { x: 820, y: 560 },
        { x: 1000, y: 560 },
        { x: 1000, y: 200 },
        { x: 1180, y: 200 },
        { x: 1180, y: 520 },
        { x: 1300, y: 520 },
        { x: 1300, y: 360 },
        { x: 1410, y: 360 },
      ];
  const d = path.map((q, i) => `${i === 0 ? "M" : "L"}${q.x} ${q.y}`).join(" ");
  const pl = along(path, walk);
  const oldGone = p(f, t1 + 10, 40);
  const newIn = walk;
  const zone = (Z: { x: number; y: number; w: number; h: number }, state: number, seed: number) => {
    const bl = cityBlocks(4, 4, seed);
    const c = Z.w / 4;
    return (
      <g>
        <rect x={Z.x} y={Z.y} width={Z.w} height={Z.h} rx={18} fill="none" stroke={t.muted} strokeWidth={3} strokeDasharray="10 8" />
        <g opacity={state}>
          <rect x={Z.x} y={Z.y} width={Z.w} height={Z.h} rx={18} fill={t.panel} />
          {bl.map((b, i) => (
            <rect key={i} x={Z.x + b.c * c + 8} y={Z.y + b.r * (Z.h / 4) + 8} width={c - 16} height={Z.h / 4 - 16} rx={5} fill={t.accent} opacity={0.35 + 0.6 * b.h} />
          ))}
        </g>
      </g>
    );
  };
  return (
    <Stage>
      {zone(A, 1 - oldGone, 5)}
      {zone(Bz, newIn, 9)}
      <Txt text="khu nhiều chi tiết" x={A.x + A.w / 2} y={sq ? A.y + A.h + 40 : A.y - 30} w={sq ? 280 : 420} s={sq ? 30 : 40} fill={t.fg} />
      <Txt text="khu nhiều chi tiết" x={Bz.x + Bz.w / 2} y={sq ? Bz.y - 18 : Bz.y - 30} w={sq ? 280 : 420} s={sq ? 30 : 40} fill={t.fg} />
      <path d={d} fill="none" stroke={t.accent2} strokeWidth={sq ? 22 : 30} strokeLinejoin="round" opacity={0.35} />
      <path d={d} fill="none" stroke={t.accent2} strokeWidth={4} strokeDasharray="12 10" strokeLinejoin="round" />
      <Txt text="cầu thang dài, thang máy, hành lang ngoằn ngoèo" x={sq ? 420 : 960} y={sq ? 706 : 700} w={sq ? 760 : 1300} s={sq ? 32 : 42} fill={t.accent2} lines={sq ? 2 : 1} />
      {f >= t1 && <circle cx={pl.x} cy={pl.y} r={sq ? 14 : 18} fill={t.warn} stroke={t.fg} strokeWidth={4} />}
      <g opacity={p(f, t1, 12)}>
        <Txt text="bỏ dữ liệu cũ" x={A.x + A.w / 2} y={sq ? A.y + A.h / 2 + 12 : A.y + A.h + 60} w={sq ? 250 : 400} s={sq ? 30 : 38} fill={t.muted} />
        <Txt text="có khoảng 30 giây để nạp khu mới" x={sq ? 420 : 960} y={sq ? 810 : 770} w={sq ? 760 : 1200} s={sq ? 34 : 44} fill={t.ok} />
        <rect x={Bz.x} y={sq ? Bz.y + Bz.h + 14 : Bz.y + Bz.h + 30} width={Bz.w * newIn} height={sq ? 14 : 18} rx={7} fill={t.ok} />
      </g>
    </Stage>
  );
};
