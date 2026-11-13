import React from "react";
import { useCurrentFrame } from "remotion";
import { useTheme } from "../../lib/hooks";
import { Stage } from "../../lib/theme";
import { TextBlock } from "../../lib/b-kit";
import type { SceneProps } from "../../lib/types";
import { at, ease, lerp, p, Ship, useGeom } from "./common";

/**
 * Độ cao bay qua Sao Hỏa theo các ước tính trong tuần cuối.
 * Beat 0: các ước tính cho thấy độ cao tụt dần từ 226 km. Beat 1: khoảng một giờ trước giờ đốt: có thể chỉ còn 110 km.
 * Beat 2: vẫn trên mức 80 km cần nhớ: có vẻ an toàn.
 */
export const DoCao: React.FC<SceneProps> = ({ scene }) => {
  const theme = useTheme();
  const f = useCurrentFrame();
  const { W, sq } = useGeom();
  const t1 = at(scene, 1);
  const t2 = at(scene, 2);
  const ys = sq ? 740 : 760;
  const yTop = sq ? 210 : 200;
  const maxKm = 260;
  const yOf = (km: number) => ys - ((ys - yTop) * km) / maxKm;
  const ax = sq ? 150 : 300;
  const px0 = sq ? 290 : 760;
  const px1 = sq ? W - 30 : 1820;
  const fs = sq ? 32 : 40;

  // Ước tính hiện tại (km): tụt dần trong beat 0, xuống 110 ở beat 1. Không ghi số giữa chừng.
  const est = f < t1 ? lerp(226, 165, ease(f / Math.max(20, t1))) : lerp(165, 110, ease((f - t1) / 24));
  const show110 = p(f, t1 + 18, 12);
  const safe = p(f, t2, 14);

  // Đường bay qua hành tinh: điểm thấp nhất = ước tính hiện tại.
  const xm = (px0 + px1) / 2;
  const span = (px1 - px0) / 2;
  const hTop = 250;
  const yPath = (x: number) => {
    const u = (x - xm) / span;
    return yOf(est + (hTop - est) * u * u);
  };
  const N = 50;
  const pts = Array.from({ length: N + 1 }, (_, i) => lerp(px0, px1, i / N)).map((x) => `${x},${yPath(x)}`).join(" ");
  const loop = 90;
  const uu = (((f % loop) + loop) % loop) / loop;
  const sx = lerp(px0, px1, uu);

  const lineAt = (km: number, color: string, dashed: boolean, x1 = px1) => (
    <line x1={ax} y1={yOf(km)} x2={x1} y2={yOf(km)} stroke={color} strokeWidth={4} strokeDasharray={dashed ? "14 10" : undefined} />
  );
  return (
    <Stage>
      <TextBlock text={sq ? "Ước tính độ cao cứ tụt dần" : "Độ cao khi bay qua Sao Hỏa: ước tính cứ tụt dần"} x={W / 2} y={sq ? 70 : 100} width={W - 80} fontSize={sq ? 36 : 52} maxLines={2} fill={theme.fg} />
      {/* Vùng dưới 80 km: khí quyển quá dày */}
      <rect x={ax} y={yOf(80)} width={px1 - ax} height={ys - yOf(80)} fill={theme.warn} opacity={0.16} />
      {/* Mặt Sao Hỏa */}
      <rect x={ax} y={ys} width={px1 - ax} height={sq ? 840 - ys : 830 - ys} fill="#c1440e" opacity={0.85} />
      {/* Trục độ cao */}
      <line x1={ax} y1={ys} x2={ax} y2={yTop - 20} stroke={theme.fg} strokeWidth={5} />
      <polygon points={`${ax},${yTop - 40} ${ax - 11},${yTop - 20} ${ax + 11},${yTop - 20}`} fill={theme.fg} />
      <TextBlock text="độ cao" x={ax + 20} y={yTop - 14} width={240} fontSize={fs} fill={theme.fg} anchor="start" weight={400} />
      {lineAt(226, theme.muted, true)}
      <TextBlock text="226 km" x={ax - 16} y={yOf(226) + 14} width={sq ? 140 : 220} fontSize={fs} fill={theme.muted} anchor="end" />
      <TextBlock text="kế hoạch" x={ax + 20} y={yOf(226) + (sq ? 44 : -14)} width={300} fontSize={sq ? 30 : 36} fill={theme.muted} anchor="start" weight={400} />
      {lineAt(80, theme.warn, false)}
      <TextBlock text="80 km" x={ax - 16} y={yOf(80) + 14} width={sq ? 140 : 220} fontSize={fs} fill={theme.warn} anchor="end" />
      <TextBlock text="mức thấp nhất tàu chịu được" x={px1} y={yOf(80) + (sq ? 40 : 46)} width={sq ? 520 : 700} fontSize={sq ? 30 : 36} fill={theme.warn} anchor="end" weight={400} />
      {/* Đường bay và tàu */}
      <polyline points={pts} fill="none" stroke={theme.accent} strokeWidth={5} />
      <Ship x={sx} y={yPath(sx)} s={sq ? 24 : 32} body={theme.fg} panel={theme.accent} line={theme.bg} />
      {/* Vạch ước tính trên trục */}
      <line x1={ax - 26} y1={yOf(est)} x2={ax + 26} y2={yOf(est)} stroke={theme.accent2} strokeWidth={8} />
      <line x1={ax} y1={yOf(est)} x2={xm} y2={yOf(est)} stroke={theme.accent2} strokeWidth={3} strokeDasharray="6 8" />
      <g opacity={show110}>
        <TextBlock text="110 km" x={ax - 16} y={yOf(110) + 14} width={sq ? 140 : 220} fontSize={fs} fill={theme.accent2} anchor="end" />
        <TextBlock text="ước tính mới nhất" x={xm} y={yOf(110) + (sq ? 50 : 56)} width={sq ? 420 : 520} fontSize={sq ? 30 : 36} fill={theme.accent2} weight={400} />
      </g>
      <g opacity={safe}>
        <TextBlock text="Vẫn trên mức 80 km: có vẻ an toàn" x={sq ? (ax + px1) / 2 : (ax + px1) / 2} y={sq ? 705 : 180} width={sq ? px1 - ax - 20 : 1200} fontSize={sq ? 32 : 46} fill={theme.ok} />
      </g>
    </Stage>
  );
};
