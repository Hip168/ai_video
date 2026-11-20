import React from "react";
import { useCurrentFrame } from "remotion";
import { useTheme } from "../../lib/hooks";
import { Stage } from "../../lib/theme";
import type { SceneProps } from "../../lib/types";
import { generation } from "./anh";
import { Arrow, at, lerp, modeOf, p, Txt, useGeom } from "./common";
import { PixelImage } from "./pixel";

/**
 * Chụp màn hình rồi gửi lại.
 * - `chup`: beat 0 màn hình điện thoại đang hiện một tấm ảnh trong khung chat; beat 1 ảnh chụp màn hình chép cả vết nén cũ và viền ứng dụng;
 *           beat 2 kích thước theo màn hình, không theo ảnh gốc.
 * - `lem`: beat 0 gửi đi: thu nhỏ, nén thêm, lưới ô mới; beat 1 ảnh chụp tin nhắn toàn chữ nét mảnh, cạnh sắc; beat 2 chữ lem quanh viền (phóng to).
 */
export const ChupManHinh: React.FC<SceneProps> = ({ scene }) => {
  const mode = modeOf(scene.props, "chup");
  return <Stage>{mode === "lem" ? <Lem scene={scene} /> : <Chup scene={scene} />}</Stage>;
};

/** Màn hình điện thoại có khung chat chung chung (không giống ứng dụng nào). Góc trên trái (x, y), rộng w. */
const Phone: React.FC<{ x: number; y: number; w: number }> = ({ x, y, w }) => {
  const t = useTheme();
  const h = w * 1.9;
  const pad = w * 0.05;
  const iw = w - 2 * pad;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={w * 0.1} fill={t.bg} stroke={t.muted} strokeWidth={6} />
      <rect x={x + pad} y={y + pad * 2} width={iw} height={h * 0.08} rx={8} fill={t.panel} />
      <circle cx={x + pad + h * 0.04} cy={y + pad * 2 + h * 0.04} r={h * 0.025} fill={t.accent} />
      <rect x={x + pad + h * 0.08} y={y + pad * 2 + h * 0.03} width={iw * 0.4} height={h * 0.02} rx={4} fill={t.muted} />
      <rect x={x + pad} y={y + h * 0.15} width={iw * 0.6} height={h * 0.05} rx={14} fill={t.panel} />
      <rect x={x + pad + iw * 0.1} y={y + h * 0.23} width={iw * 0.9} height={(iw * 0.9 * 48) / 64 + 16} rx={14} fill={t.accent} opacity={0.35} />
      <PixelImage im={generation(2)} x={x + pad + iw * 0.1 + 8} y={y + h * 0.23 + 8} size={iw * 0.9 - 16} />
      <rect x={x + pad + iw * 0.35} y={y + h * 0.23 + (iw * 0.9 * 48) / 64 + 34} width={iw * 0.65} height={h * 0.05} rx={14} fill={t.accent} opacity={0.6} />
      <rect x={x + pad} y={y + h - pad * 2 - h * 0.07} width={iw} height={h * 0.07} rx={20} fill={t.panel} />
    </g>
  );
};

const Chup: React.FC<SceneProps> = ({ scene }) => {
  const t = useTheme();
  const f = useCurrentFrame();
  const { sq } = useGeom();
  const t1 = at(scene, 1);
  const t2 = at(scene, 2);
  const a1 = p(f, t1, 16);
  const a2 = p(f, t2, 14);
  const P = sq ? { x: 60, y: 30, w: 300 } : { x: 260, y: 40, w: 390 };
  const Q = sq ? { x: 480, y: 30, w: 300 } : { x: 1150, y: 40, w: 390 };
  const ph = P.w * 1.9;
  const flash = f < 24 ? 1 - f / 24 : 0;
  return (
    <g>
      <Phone x={P.x} y={P.y} w={P.w} />
      <rect x={P.x} y={P.y} width={P.w} height={ph} rx={P.w * 0.1} fill="#fff" opacity={flash * 0.6} />
      <Txt text="chụp màn hình" x={P.x + P.w / 2} y={P.y + ph + (sq ? 40 : 46)} w={P.w + 80} s={sq ? 32 : 40} fill={t.fg} />
      <g opacity={a1}>
        <Arrow x1={P.x + P.w + 20} y1={P.y + ph / 2} x2={lerp(P.x + P.w + 20, Q.x - 20, a1)} y2={Q.y + ph / 2} color={t.accent2} w={6} head={22} />
        <g transform={`translate(${Q.x} ${Q.y})`}>
          <Phone x={0} y={0} w={Q.w} />
          <rect x={0} y={0} width={Q.w} height={ph} rx={Q.w * 0.1} fill="none" stroke={t.warn} strokeWidth={6} strokeDasharray="14 10" />
        </g>
        {!sq && (
          <g>
            <Txt text="chép cả viền ứng dụng" x={1600} y={140} w={300} s={36} fill={t.warn} anchor="start" lines={2} />
            <Txt text="và vết nén cũ" x={1600} y={420} w={300} s={36} fill={t.warn} anchor="start" lines={2} />
          </g>
        )}
        {sq && <Txt text="chép cả viền ứng dụng và vết nén cũ" x={420} y={692} w={780} s={32} fill={t.warn} />}
      </g>
      <g opacity={a2}>
        <Txt text="kích thước theo màn hình, không theo ảnh gốc" x={sq ? 420 : Q.x + Q.w / 2} y={sq ? 750 : Q.y + ph + 46} w={sq ? 780 : 760} s={sq ? 32 : 38} fill={t.accent2} lines={2} />
      </g>
    </g>
  );
};

const Lem: React.FC<SceneProps> = ({ scene }) => {
  const t = useTheme();
  const f = useCurrentFrame();
  const { sq } = useGeom();
  const t1 = at(scene, 1);
  const t2 = at(scene, 2);
  const a = generation(0, "text");
  const b = generation(3, "text");
  const crop = { sx: 0, sy: 2, sw: 24, sh: 14 };
  const a2 = p(f, t2, 16);
  return (
    <g>
      <PixelImage im={a} x={sq ? 40 : 110} y={sq ? 40 : 60} size={sq ? 370 : 560} stroke={t.ok} />
      <PixelImage im={b} x={sq ? 430 : 730} y={sq ? 40 : 60} size={sq ? 370 : 560} stroke={t.warn} />
      <Txt text="ảnh chụp tin nhắn" x={sq ? 225 : 390} y={sq ? 360 : 530} w={370} s={sq ? 32 : 40} fill={t.ok} />
      <Txt text="sau khi gửi đi" x={sq ? 615 : 1010} y={sq ? 360 : 530} w={370} s={sq ? 32 : 40} fill={t.warn} />
      <Txt text="thu nhỏ, nén thêm, chia ô theo lưới mới" x={sq ? 420 : 620} y={sq ? 420 : 610} w={sq ? 780 : 1100} s={sq ? 32 : 40} fill={t.fg} />
      <g opacity={p(f, t1, 14)}>
        <Txt text="nét mảnh, cạnh sắc: loại JPEG nén kém nhất" x={sq ? 420 : 620} y={sq ? 480 : 680} w={sq ? 780 : 1100} s={sq ? 32 : 40} fill={t.accent2} />
      </g>
      <g opacity={a2}>
        <PixelImage im={b} x={sq ? 220 : 1360} y={sq ? 520 : 60} size={sq ? 400 : 460} {...crop} stroke={t.warn} />
        <Txt text="chữ lem quanh viền" x={sq ? 420 : 1590} y={sq ? 800 : 380} w={sq ? 600 : 460} s={sq ? 34 : 42} fill={t.warn} />
      </g>
    </g>
  );
};
