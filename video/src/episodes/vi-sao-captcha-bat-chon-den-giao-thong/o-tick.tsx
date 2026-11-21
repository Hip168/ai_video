import React from "react";
import { useCurrentFrame } from "remotion";
import { useTheme } from "../../lib/hooks";
import { Stage } from "../../lib/theme";
import type { SceneProps } from "../../lib/types";
import { at, Chip, lerp, modeOf, p, Txt, useGeom } from "./common";

/**
 * Ô đánh dấu và điểm rủi ro (vẽ chung chung, không chụp giao diện thật).
 * - `o`: beat 0 ngày 3/12/2014 Google giới thiệu kiểu reCAPTCHA mới; beat 1 thay vì gõ chữ, chỉ cần bấm ô "Tôi không phải người máy".
 * - `diem`: beat 0 ngày 29/10/2018 reCAPTCHA v3 không bao giờ hỏi câu đố; beat 1 chấm một điểm từ 0,0 (rất có thể là máy) tới 1,0 (rất có thể là người).
 */
export const OTick: React.FC<SceneProps> = ({ scene }) => {
  const mode = modeOf(scene.props, "o");
  return <Stage>{mode === "diem" ? <Diem scene={scene} /> : <O scene={scene} />}</Stage>;
};

const O: React.FC<SceneProps> = ({ scene }) => {
  const t = useTheme();
  const f = useCurrentFrame();
  const { sq } = useGeom();
  const t1 = at(scene, 1);
  const tick = p(f, t1 + 20, 12);
  const B = sq ? { x: 60, y: 300, w: 720, h: 200 } : { x: 360, y: 300, w: 1200, h: 260 };
  const c = sq ? 90 : 120;
  const cx = B.x + 50;
  const cy = B.y + (B.h - c) / 2;
  return (
    <g>
      <Chip x={sq ? 220 : 710} y={sq ? 60 : 70} w={sq ? 400 : 500} h={sq ? 80 : 96} text="Ngày 3/12/2014" s={sq ? 40 : 48} fill={t.accent2} color={t.bg} />
      <Txt text="Google giới thiệu một kiểu reCAPTCHA mới" x={sq ? 420 : 960} y={sq ? 210 : 230} w={sq ? 760 : 1400} s={sq ? 32 : 44} fill={t.fg} lines={2} />
      <rect x={B.x} y={B.y} width={B.w} height={B.h} rx={16} fill="#f4f6fa" stroke="#c9d1df" strokeWidth={4} />
      <rect x={cx} y={cy} width={c} height={c} rx={10} fill="#ffffff" stroke="#9aa5bb" strokeWidth={5} />
      <path d={`M${cx + c * 0.18} ${cy + c * 0.52} L${cx + c * 0.42} ${cy + c * 0.76} L${cx + c * 0.86} ${cy + c * 0.24}`} fill="none" stroke="#2fa36b" strokeWidth={c * 0.13} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={c * 1.2} strokeDashoffset={c * 1.2 * (1 - tick)} />
      <Txt text="Tôi không phải người máy" x={cx + c + 40} y={B.y + B.h / 2 + (sq ? 13 : 18)} w={B.w - c - 120} s={sq ? 38 : 52} fill="#1d2b52" anchor="start" />
      <g opacity={p(f, t1, 14)}>
        <Txt text="thay vì gõ chữ, chỉ cần bấm một ô" x={sq ? 420 : 960} y={B.y + B.h + (sq ? 80 : 110)} w={sq ? 760 : 1400} s={sq ? 36 : 48} fill={t.accent} />
      </g>
    </g>
  );
};

const Diem: React.FC<SceneProps> = ({ scene }) => {
  const t = useTheme();
  const f = useCurrentFrame();
  const { sq } = useGeom();
  const t1 = at(scene, 1);
  const a1 = p(f, t1, 14);
  const x0 = sq ? 80 : 260;
  const x1 = sq ? 760 : 1660;
  const y = sq ? 470 : 500;
  const u = 0.5 + 0.42 * Math.sin(Math.max(0, f - t1) * 0.05);
  return (
    <g>
      <Chip x={sq ? 170 : 610} y={sq ? 50 : 60} w={sq ? 500 : 700} h={sq ? 80 : 96} text="reCAPTCHA v3 · 29/10/2018" s={sq ? 36 : 46} fill={t.accent2} color={t.bg} />
      <Txt text="không bao giờ hỏi câu đố" x={sq ? 420 : 960} y={sq ? 220 : 250} w={sq ? 760 : 1200} s={sq ? 40 : 56} fill={t.fg} />
      <g opacity={a1}>
        <defs>
          <linearGradient id="v3-grad" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor={t.warn} />
            <stop offset="1" stopColor={t.ok} />
          </linearGradient>
        </defs>
        <rect x={x0} y={y - 22} width={x1 - x0} height={44} rx={22} fill="url(#v3-grad)" />
        <circle cx={lerp(x0, x1, u)} cy={y} r={sq ? 30 : 36} fill={t.fg} stroke={t.bg} strokeWidth={6} />
        <Txt text="0,0" x={x0} y={y + (sq ? 80 : 90)} w={200} s={sq ? 40 : 48} fill={t.warn} />
        <Txt text="1,0" x={x1} y={y + (sq ? 80 : 90)} w={200} s={sq ? 40 : 48} fill={t.ok} />
        <Txt text="rất có thể là máy" x={sq ? 210 : x0 + 40} y={y + (sq ? 140 : 150)} w={sq ? 360 : 500} s={sq ? 30 : 40} fill={t.warn} anchor={sq ? "middle" : "start"} />
        <Txt text="rất có thể là người" x={sq ? 610 : x1 - 40} y={y + (sq ? 140 : 150)} w={sq ? 360 : 500} s={sq ? 30 : 40} fill={t.ok} anchor={sq ? "middle" : "end"} />
        <Txt text="chỉ chấm cho bạn một điểm" x={sq ? 420 : 960} y={y - (sq ? 80 : 90)} w={sq ? 760 : 1200} s={sq ? 34 : 44} fill={t.accent} />
      </g>
    </g>
  );
};
