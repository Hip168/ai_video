import React from "react";
import { useCurrentFrame } from "remotion";
import { useTheme } from "../../lib/hooks";
import { Stage } from "../../lib/theme";
import { TextBlock } from "../../lib/b-kit";
import type { SceneProps } from "../../lib/types";
import { at, clamp01, endOf, fmtInt, lerp, p, useGeom } from "./common";

/**
 * 8 bit không dấu và có dấu trên cùng một trục số.
 * Beat 0: thanh 0..255 hiện ra, rồi một bản sao trượt xuống và lùi sang trái nửa thanh thành −128..127
 * (số ở hai đầu đếm dần theo). Beat 1: chia đôi thanh có dấu (nửa số âm, nửa số 0 và số dương),
 * rồi nhấn số dương lớn nhất 127, nhịp sáng liên tục tới hết cảnh.
 */
export const NuaAm: React.FC<SceneProps> = ({ scene }) => {
  const theme = useTheme();
  const f = useCurrentFrame();
  const { W, CX, sq } = useGeom();
  const t0 = at(scene, 0);
  const t1 = at(scene, 1);
  const e0 = endOf(scene, 0);
  const e1 = endOf(scene, 1);

  // Trục chung từ −128 đến 255: thanh 256 giá trị rộng 2/3 trục.
  const AX0 = sq ? 40 : 135;
  const AX1 = sq ? W - 40 : W - 135;
  const span = AX1 - AX0;
  const BW = (span * 256) / 384;
  const X0 = AX0 + (span * 128) / 384; // vị trí số 0
  const BH = sq ? 80 : 90;
  const y1 = sq ? 120 : 140;
  const y2 = sq ? 420 : 430;
  const fsLab = sq ? 36 : 46;
  const fsEnd = sq ? 36 : 44;
  const fsBig = sq ? 40 : 52;

  const show1 = p(f, t0, 14);
  // Trượt trải suốt beat 0 để hình không đứng.
  const slideFrom = t0 + 24;
  const slideTo = Math.max(slideFrom + 40, lerp(t0, e0, 0.7));
  const slide = clamp01((f - slideFrom) / (slideTo - slideFrom));
  const sl = slide * slide * (3 - 2 * slide);
  const copyOn = p(f, slideFrom - 6, 8);
  const bx2 = X0 - (BW / 2) * sl;
  const by2 = lerp(y1, y2, sl);
  const lo = Math.round(lerp(0, -128, sl));
  const hi = Math.round(lerp(255, 127, sl));
  const signedLab = p(f, slideTo, 12);
  const zeroLine = clamp01((f - slideTo) / Math.max(20, e0 - slideTo - 6));

  // Beat 1
  const halfL = p(f, t1 + 4, 14);
  const halfR = p(f, t1 + 24, 14);
  const tMax = lerp(t1, e1, 0.5);
  const maxOn = p(f, tMax, 14);
  const pulse = 0.5 + 0.5 * Math.sin((f - tMax) * 0.22);

  const negW = (BW / 2) * sl;
  const braceY = y2 + BH + fsEnd + (sq ? 34 : 44);
  const brace = (xa: number, xb: number, op: number, col: string) => (
    <path d={`M${xa + 6} ${braceY - 16} V${braceY} H${xb - 6} V${braceY - 16}`} fill="none" stroke={col} strokeWidth={5} opacity={op} />
  );
  const xMax = X0 + BW / 2; // mép phải thanh có dấu (127)
  return (
    <Stage>
      {/* Thanh không dấu */}
      <g opacity={show1}>
        <TextBlock text="8 bit không dấu" x={X0} y={y1 - 26} width={BW} fontSize={fsLab} fill={theme.accent} anchor="start" />
        <rect x={X0} y={y1} width={BW} height={BH} rx={14} fill={theme.accent} opacity={0.85} />
        <TextBlock text="0" x={X0} y={y1 + BH + fsEnd + 10} width={200} fontSize={fsEnd} fill={theme.fg} />
        <TextBlock text="255" x={X0 + BW} y={y1 + BH + fsEnd + 10} width={200} fontSize={fsEnd} fill={theme.fg} />
      </g>
      {/* Đường số 0 nối hai thanh */}
      <line x1={X0} y1={y1 + BH + fsEnd + 24} x2={X0} y2={lerp(y1 + BH + fsEnd + 24, y2 - 6, zeroLine)} stroke={theme.muted} strokeWidth={4} strokeDasharray="10 8" opacity={zeroLine > 0 ? 0.8 : 0} />
      {/* Bản sao trượt thành thanh có dấu */}
      <g opacity={copyOn}>
        <TextBlock text="8 bit có dấu" x={bx2} y={by2 - 26} width={BW} fontSize={fsLab} fill={theme.accent2} anchor="start" opacity={signedLab} />
        <rect x={bx2} y={by2} width={BW} height={BH} rx={14} fill={theme.accent} opacity={0.85} />
        <rect x={bx2} y={by2} width={negW} height={BH} rx={14} fill={theme.warn} opacity={0.9} />
        <TextBlock text={fmtInt(lo)} x={bx2} y={by2 + BH + fsEnd + 10} width={220} fontSize={fsEnd} fill={sl > 0.05 ? theme.warn : theme.fg} />
        <TextBlock text={fmtInt(hi)} x={bx2 + BW} y={by2 + BH + fsEnd + 10} width={220} fontSize={fsEnd} fill={theme.fg} opacity={1 - maxOn} />
        {sl >= 1 && <TextBlock text="0" x={X0} y={by2 + BH + fsEnd + 10} width={120} fontSize={fsEnd} fill={theme.fg} />}
      </g>
      {/* Chia đôi */}
      {brace(X0 - BW / 2, X0, halfL, theme.warn)}
      <TextBlock text="số âm" x={X0 - BW / 4} y={braceY + fsBig + 14} width={BW / 2 - 20} fontSize={fsBig} fill={theme.warn} opacity={halfL} />
      {brace(X0, xMax, halfR, theme.accent)}
      <TextBlock text="0 và số dương" x={X0 + BW / 4} y={braceY + fsBig + 14} width={BW / 2 - 20} fontSize={fsBig} fill={theme.accent} opacity={halfR} />
      {/* Số dương lớn nhất */}
      <g opacity={maxOn}>
        <circle cx={xMax} cy={by2 + BH / 2} r={(sq ? 34 : 42) * (1 + 0.25 * pulse)} fill="none" stroke={theme.accent2} strokeWidth={6} opacity={0.4 + 0.6 * (1 - pulse)} />
        <TextBlock text="127" x={xMax} y={by2 + BH + fsEnd + 10} width={220} fontSize={fsEnd * (1.1 + 0.08 * pulse)} fill={theme.accent2} />
        <TextBlock
          text="số dương lớn nhất: 127"
          x={sq ? CX : xMax + 70}
          y={sq ? y2 - 120 : y2 + BH / 2 + 18}
          width={sq ? W - 80 : W - 40 - (xMax + 70)}
          anchor={sq ? "middle" : "start"}
          fontSize={sq ? 38 : 48}
          fill={theme.accent2}
        />
      </g>
    </Stage>
  );
};
