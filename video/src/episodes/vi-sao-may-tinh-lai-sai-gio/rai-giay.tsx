import React from "react";
import { useCurrentFrame } from "remotion";
import { useTheme } from "../../lib/hooks";
import { Stage } from "../../lib/theme";
import type { SceneProps } from "../../lib/types";
import { at, Chip, lerp, p, Txt, useGeom } from "./common";

/**
 * Rải giây nhuận (c033).
 * Beat 0: hàng trên chèn đột ngột thêm ô :60; hàng dưới (Google, từ 2008) không thêm ô mà kéo mỗi ô giây dài ra một chút
 *         để cuối hàng khớp với hàng trên (độ dài phóng đại để thấy được).
 * Beat 1: rải trong 24 giờ, mỗi giây dài hơn giây chuẩn khoảng 11,6 micro giây.
 */
export const RaiGiay: React.FC<SceneProps> = ({ scene }) => {
  const t = useTheme();
  const f = useCurrentFrame();
  const { sq } = useGeom();
  const t1 = at(scene, 1);
  const a1 = p(f, t1, 16);
  const stretch = p(f, 36, 70);
  const n = 10;
  const x0 = sq ? 40 : 520;
  const unit = sq ? 69 : 110; // một giây chuẩn
  const gap = sq ? 6 : 10;
  const total = (n + 1) * unit; // hàng trên: n ô + ô :60
  const wB = lerp(unit, total / n, stretch);
  const yA = sq ? 200 : 170;
  const yB = sq ? 440 : 420;
  const h = sq ? 90 : 110;
  const lblS = sq ? 36 : 44;
  return (
    <Stage>
      <g>
        <Txt text="Chèn đột ngột" x={sq ? x0 : x0 - 40} y={sq ? yA - 26 : yA + h / 2 + 14} w={sq ? 500 : 460} s={lblS} fill={t.warn} anchor={sq ? "start" : "end"} />
        {Array.from({ length: n + 1 }, (_, i) => {
          const extra = i === n;
          return (
            <g key={i}>
              <rect x={x0 + i * unit} y={yA - (extra ? 16 : 0)} width={unit - gap} height={h} rx={10} fill={extra ? t.warn : t.accent} opacity={extra ? 1 : 0.8} />
              {extra && (
                <text x={x0 + i * unit + (unit - gap) / 2} y={yA - 16 + h / 2 + 12} fontSize={sq ? 30 : 36} fontWeight={700} fill={t.bg} textAnchor="middle">
                  :60
                </text>
              )}
            </g>
          );
        })}
        <Txt text="Rải ra · Google, từ 2008" x={sq ? x0 : x0 - 40} y={sq ? yB - 26 : yB + h / 2 + 14} w={sq ? 760 : 470} s={lblS} fill={t.ok} anchor={sq ? "start" : "end"} lines={sq ? 1 : 2} />
        {Array.from({ length: n }, (_, i) => (
          <rect key={i} x={x0 + i * wB} y={yB} width={wB - gap} height={h} rx={10} fill={t.ok} opacity={0.8} />
        ))}
        <line x1={x0 + total - gap / 2} y1={yA - 40} x2={x0 + total - gap / 2} y2={yB + h + 30} stroke={t.fg} strokeWidth={3} strokeDasharray="10 10" opacity={stretch} />
        <g opacity={stretch}>
          <Txt text="mỗi giây dài thêm một chút, không có ô :60" x={sq ? 420 : x0 + total / 2} y={yB + h + (sq ? 60 : 70)} w={sq ? 790 : total} s={sq ? 32 : 40} fill={t.fg} weight={400} />
        </g>
      </g>
      <g opacity={a1} transform={`translate(0 ${(1 - a1) * 24})`}>
        <path d={`M${x0} ${sq ? 640 : 690} v-20 H${x0 + total - gap} v20`} fill="none" stroke={t.accent2} strokeWidth={5} opacity={sq ? 0 : 1} />
        <Txt text="rải trong 24 giờ" x={sq ? 420 : x0 + total / 2} y={sq ? 660 : 740} w={sq ? 760 : 700} s={sq ? 40 : 48} fill={t.accent2} />
        {sq && <Chip x={30} y={700} w={780} h={100} text="mỗi giây dài thêm khoảng 11,6 micro giây" s={36} fill={t.accent2} color={t.bg} />}
        {!sq && (
          <g>
            <rect x={60} y={660} width={380} height={120} rx={22} fill={t.accent2} />
            <Txt text="mỗi giây dài thêm" x={250} y={708} w={350} s={36} fill={t.bg} />
            <Txt text="khoảng 11,6 micro giây" x={250} y={754} w={350} s={36} fill={t.bg} />
          </g>
        )}
      </g>
    </Stage>
  );
};
