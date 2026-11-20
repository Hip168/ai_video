import React from "react";
import { useCurrentFrame } from "remotion";
import { useTheme } from "../../lib/hooks";
import { Stage } from "../../lib/theme";
import type { SceneProps } from "../../lib/types";
import { chromaPhoto, generation, halveAndBack, toYCC, type Img } from "./anh";
import { Arrow, at, lerp, modeOf, p, Txt, useGeom } from "./common";
import { PixelImage } from "./pixel";

/**
 * Ảnh là lưới điểm.
 * - `luoi`: ảnh tự vẽ, phóng to một góc thành lưới điểm, mỗi điểm là ba con số (đỏ, xanh lá, xanh dương).
 * - `lop-mau`: beat 0 tách thành lớp độ sáng và hai lớp màu; beat 1 lớp màu chỉ giữ nửa ngang, nửa dọc (một phần tư số điểm);
 *              beat 2 ghép lại: ảnh độ sáng nét phủ lớp màu nhoè, mắt vẫn thấy như ảnh thật.
 * - `thu-nho`: beat 0 bốn điểm cạnh nhau trộn thành một; beat 1 sợi dây mảnh thành vệt nhoè, phóng to lại không tách ra được.
 * - `ung-dung`: beat 0 ảnh rộng hơn 1.080 điểm bị giảm còn 1.080; beat 1 ảnh rộng 4.000 điểm thì số điểm còn khoảng 7%.
 */
export const DiemAnh: React.FC<SceneProps> = ({ scene }) => {
  const mode = modeOf(scene.props, "luoi");
  return (
    <Stage>
      {mode === "lop-mau" ? <LopMau scene={scene} /> : mode === "thu-nho" ? <ThuNho scene={scene} /> : mode === "ung-dung" ? <UngDung scene={scene} /> : <Luoi />}
    </Stage>
  );
};

const Luoi: React.FC = () => {
  const t = useTheme();
  const f = useCurrentFrame();
  const { sq } = useGeom();
  const im = generation(0);
  const Z = { sx: 12, sy: 24, sw: 5, sh: 4 }; // góc tường và cửa sổ
  const big = sq ? { x: 40, y: 30, s: 360 } : { x: 110, y: 90, s: 640 };
  const cell = big.s / im.w;
  const zoom = sq ? { x: 440, y: 30, s: 360 } : { x: 900, y: 90, s: 760 };
  const zc = zoom.s / Z.sw;
  const pick = { i: 2, j: 1 };
  const k = (Z.sy + pick.j) * im.w + Z.sx + pick.i;
  const a = p(f, 10, 20);
  return (
    <g>
      <PixelImage im={im} x={big.x} y={big.y} size={big.s} />
      <rect x={big.x + Z.sx * cell} y={big.y + Z.sy * cell} width={Z.sw * cell} height={Z.sh * cell} fill="none" stroke={t.accent2} strokeWidth={4} />
      <g opacity={a}>
        <PixelImage im={im} x={zoom.x} y={zoom.y} size={zoom.s} {...Z} />
        {Array.from({ length: Z.sw + 1 }, (_, i) => (
          <line key={`v${i}`} x1={zoom.x + i * zc} y1={zoom.y} x2={zoom.x + i * zc} y2={zoom.y + Z.sh * zc} stroke={t.bg} strokeWidth={3} />
        ))}
        {Array.from({ length: Z.sh + 1 }, (_, i) => (
          <line key={`h${i}`} x1={zoom.x} y1={zoom.y + i * zc} x2={zoom.x + zoom.s} y2={zoom.y + i * zc} stroke={t.bg} strokeWidth={3} />
        ))}
        <rect x={zoom.x + pick.i * zc} y={zoom.y + pick.j * zc} width={zc} height={zc} fill="none" stroke={t.accent2} strokeWidth={6} />
      </g>
      <g opacity={p(f, 30, 16)}>
        {sq ? (
          <g>
            <rect x={40} y={430} width={760} height={150} rx={20} fill={t.panel} stroke={t.accent2} strokeWidth={4} />
            <rect x={70} y={460} width={90} height={90} rx={10} fill={`rgb(${Math.round(im.r[k])},${Math.round(im.g[k])},${Math.round(im.b[k])})`} />
            <Txt text={`đỏ ${Math.round(im.r[k])} · xanh lá ${Math.round(im.g[k])} · xanh dương ${Math.round(im.b[k])}`} x={460} y={500} w={560} s={32} fill={t.fg} lines={2} />
          </g>
        ) : (
          <g>
            <Txt text={`một điểm = ba con số: đỏ ${Math.round(im.r[k])}, xanh lá ${Math.round(im.g[k])}, xanh dương ${Math.round(im.b[k])}`} x={1280} y={zoom.y + Z.sh * zc + 60} w={760} s={38} fill={t.accent2} lines={2} />
          </g>
        )}
      </g>
      <Txt text="tấm ảnh = một lưới điểm" x={sq ? 420 : big.x + big.s / 2} y={sq ? 650 : big.y + (big.s * 48) / 64 + 60} w={sq ? 760 : 640} s={sq ? 40 : 46} fill={t.fg} />
    </g>
  );
};

const LopMau: React.FC<SceneProps> = ({ scene }) => {
  const t = useTheme();
  const f = useCurrentFrame();
  const { sq } = useGeom();
  const t1 = at(scene, 1);
  const t2 = at(scene, 2);
  const a1 = p(f, t1, 14);
  const a2 = p(f, t2, 16);
  const g0 = generation(0);
  const full = toYCC(g0);
  const half = toYCC(chromaPhoto());
  const cb = a1 >= 0.5 ? half.cb : full.cb;
  const cr = a1 >= 0.5 ? half.cr : full.cr;
  const mY = (_: Img, i: number) => {
    const v = Math.round(full.y[i]);
    return `rgb(${v},${v},${v})`;
  };
  const mCb = (_: Img, i: number) => {
    const v = cb[i];
    return `rgb(${Math.round(255 - v)},${Math.round(255 - v * 0.6)},${Math.round(v)})`;
  };
  const mCr = (_: Img, i: number) => {
    const v = cr[i];
    return `rgb(${Math.round(v)},${Math.round(255 - v * 0.8)},${Math.round(255 - v * 0.8)})`;
  };
  const S = sq ? 250 : 500;
  const xs = sq ? [20, 295, 570] : [110, 710, 1310];
  const y0 = sq ? 40 : 60;
  const labels = ["độ sáng", "lớp màu 1", "lớp màu 2"];
  return (
    <g>
      <g opacity={1 - a2}>
        {[mY, mCb, mCr].map((m, i) => (
          <g key={i}>
            <PixelImage im={g0} x={xs[i]} y={y0} size={S} map={m} stroke={i === 0 ? t.fg : a1 > 0 ? t.accent2 : t.muted} />
            <Txt text={labels[i]} x={xs[i] + S / 2} y={y0 + (S * 48) / 64 + (sq ? 40 : 54)} w={S + 20} s={sq ? 32 : 42} fill={t.fg} />
          </g>
        ))}
        <g opacity={a1}>
          <Txt text="lớp màu chỉ giữ nửa ngang, nửa dọc: còn một phần tư số điểm" x={sq ? 420 : 960} y={sq ? 330 : 560} w={sq ? 780 : 1600} s={sq ? 32 : 44} fill={t.accent2} lines={2} />
        </g>
      </g>
      <g opacity={a2}>
        <PixelImage im={g0} x={sq ? 40 : 300} y={sq ? 40 : 60} size={sq ? 370 : 600} stroke={t.ok} />
        <PixelImage im={chromaPhoto()} x={sq ? 430 : 1020} y={sq ? 40 : 60} size={sq ? 370 : 600} stroke={t.accent2} />
        <Txt text="ảnh gốc" x={sq ? 225 : 600} y={sq ? 360 : 560} w={sq ? 370 : 600} s={sq ? 32 : 42} fill={t.ok} />
        <Txt text={sq ? "sáng nét, màu nhoè" : "độ sáng nét + lớp màu nhoè"} x={sq ? 615 : 1320} y={sq ? 360 : 560} w={sq ? 380 : 600} s={sq ? 32 : 42} fill={t.accent2} />
        <Txt text="mắt vẫn thấy như ảnh thật" x={sq ? 420 : 960} y={sq ? 440 : 660} w={sq ? 760 : 1200} s={sq ? 40 : 50} fill={t.fg} />
      </g>
    </g>
  );
};

const ThuNho: React.FC<SceneProps> = ({ scene }) => {
  const t = useTheme();
  const f = useCurrentFrame();
  const { sq } = useGeom();
  const t1 = at(scene, 1);
  const a1 = p(f, t1, 16);
  const g0 = generation(0);
  // 2×2 điểm có dây điện đi qua
  const sx = 20;
  const sy = 6;
  const cells = [
    [sx, sy],
    [sx + 1, sy],
    [sx, sy + 1],
    [sx + 1, sy + 1],
  ];
  const col = (x: number, y: number) => {
    const i = y * g0.w + x;
    return [g0.r[i], g0.g[i], g0.b[i]];
  };
  const avg = cells.map(([x, y]) => col(x, y)).reduce((a, c) => [a[0] + c[0] / 4, a[1] + c[1] / 4, a[2] + c[2] / 4], [0, 0, 0]);
  const rgbS = (c: number[]) => `rgb(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])})`;
  const merge = p(f, 20, 30);
  const c4 = sq ? 120 : 150;
  const gx = sq ? 80 : 200;
  const gy = sq ? 60 : 120;
  const half = halveAndBack(g0);
  const crop = { sx: 12, sy: 2, sw: 20, sh: 15 };
  return (
    <g>
      <g opacity={1 - a1}>
        {cells.map(([x, y], i) => {
          const dx = (i % 2) * c4;
          const dy = Math.floor(i / 2) * c4;
          return <rect key={i} x={gx + lerp(dx, c4 / 2, merge)} y={gy + lerp(dy, c4 / 2, merge)} width={c4 - 6} height={c4 - 6} fill={rgbS(col(x, y))} stroke={t.fg} strokeWidth={3} opacity={1 - merge * 0.6} />;
        })}
        <Txt text="4 điểm cạnh nhau" x={gx + c4} y={gy + 2 * c4 + (sq ? 44 : 56)} w={sq ? 320 : 400} s={sq ? 32 : 42} fill={t.fg} />
        <Arrow x1={gx + 2 * c4 + 30} y1={gy + c4} x2={sq ? 520 : 1100} y2={gy + c4} color={t.accent2} w={6} head={22} />
        <rect x={sq ? 540 : 1140} y={gy + c4 / 2} width={c4} height={c4} fill={rgbS(avg)} stroke={t.accent2} strokeWidth={5} opacity={merge} />
        <Txt text="1 điểm trộn" x={(sq ? 540 : 1140) + c4 / 2} y={gy + 2 * c4 + (sq ? 44 : 56)} w={sq ? 260 : 400} s={sq ? 32 : 42} fill={t.accent2} />
        <Txt text="thu nhỏ một nửa mỗi chiều" x={sq ? 420 : 960} y={sq ? 420 : 620} w={sq ? 760 : 1200} s={sq ? 36 : 46} fill={t.fg} />
      </g>
      <g opacity={a1}>
        <PixelImage im={g0} x={sq ? 40 : 200} y={sq ? 40 : 60} size={sq ? 370 : 680} {...crop} stroke={t.ok} />
        <PixelImage im={half} x={sq ? 430 : 1040} y={sq ? 40 : 60} size={sq ? 370 : 680} {...crop} stroke={t.warn} />
        <Txt text="sợi dây mảnh" x={sq ? 225 : 540} y={sq ? 360 : 620} w={370} s={sq ? 32 : 42} fill={t.ok} />
        <Txt text="thành vệt nhoè" x={sq ? 615 : 1380} y={sq ? 360 : 620} w={370} s={sq ? 32 : 42} fill={t.warn} />
        <Txt text="phóng to lại cũng không tách ra được" x={sq ? 420 : 960} y={sq ? 440 : 720} w={sq ? 760 : 1400} s={sq ? 36 : 46} fill={t.fg} />
      </g>
    </g>
  );
};

const UngDung: React.FC<SceneProps> = ({ scene }) => {
  const t = useTheme();
  const f = useCurrentFrame();
  const { sq } = useGeom();
  const t1 = at(scene, 1);
  const a1 = p(f, t1, 16);
  const g0 = generation(0);
  const BIG = sq ? 520 : 760;
  const ox = sq ? 40 : 110;
  const oy = sq ? 40 : 50;
  const small = (BIG * 1080) / 4000;
  const shrink = p(f, 20, 30);
  const w = lerp(BIG, small, shrink);
  return (
    <g>
      <rect x={ox} y={oy} width={BIG} height={(BIG * 3) / 4} fill="none" stroke={t.muted} strokeWidth={4} strokeDasharray="14 10" />
      <PixelImage im={g0} x={ox} y={oy} size={w} stroke={t.accent2} />
      <Txt text="Instagram, theo trang trợ giúp" x={sq ? 420 : 1450} y={sq ? 530 : 140} w={sq ? 760 : 680} s={sq ? 34 : 44} fill={t.fg} />
      <Txt text="ảnh rộng hơn 1.080 điểm: giảm xuống còn 1.080" x={sq ? 420 : 1450} y={sq ? 582 : 230} w={sq ? 760 : 680} s={sq ? 32 : 40} fill={t.accent2} lines={2} />
      <g opacity={a1}>
        <Txt text="ví dụ: rộng 4.000 điểm" x={ox + BIG / 2} y={oy + (BIG * 3) / 4 + (sq ? 40 : 54)} w={BIG} s={sq ? 32 : 40} fill={t.muted} />
        <rect x={sq ? 40 : 1150} y={sq ? 670 : 420} width={sq ? 760 : 600} height={sq ? 130 : 200} rx={24} fill={t.warn} />
        <Txt text="số điểm ảnh chỉ còn khoảng 7%" x={sq ? 420 : 1450} y={sq ? 748 : 540} w={sq ? 720 : 560} s={sq ? 40 : 48} fill={t.bg} lines={2} />
      </g>
    </g>
  );
};
