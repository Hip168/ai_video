import React from "react";
import { rgb, type Img } from "./anh";

/** Vẽ ảnh thành lưới ô vuông SVG; (x, y) góc trên trái, `size` bề rộng hiển thị. Vùng con tuỳ chọn (sx, sy, sw, sh). */
export const PixelImage: React.FC<{
  im: Img;
  x: number;
  y: number;
  size: number;
  sx?: number;
  sy?: number;
  sw?: number;
  sh?: number;
  stroke?: string;
  map?: (im: Img, i: number) => string;
}> = ({ im, x, y, size, sx = 0, sy = 0, sw, sh, stroke, map }) => {
  const W = sw ?? im.w;
  const Hh = sh ?? im.h;
  const c = size / W;
  const cells: React.ReactNode[] = [];
  for (let j = 0; j < Hh; j++)
    for (let i = 0; i < W; i++) {
      const k = (sy + j) * im.w + (sx + i);
      cells.push(<rect key={k} x={x + i * c} y={y + j * c} width={c + 0.6} height={c + 0.6} fill={map ? map(im, k) : rgb(im, k)} />);
    }
  return (
    <g>
      {cells}
      {stroke && <rect x={x} y={y} width={size} height={c * Hh} fill="none" stroke={stroke} strokeWidth={4} />}
    </g>
  );
};

/** Chiều cao hiển thị của ảnh khi rộng `size`. */
export const imgH = (im: Img, size: number, sw?: number, sh?: number): number => (size / (sw ?? im.w)) * (sh ?? im.h);
