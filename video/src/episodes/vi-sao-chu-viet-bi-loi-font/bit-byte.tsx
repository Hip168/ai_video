import React from "react";
import { useCurrentFrame } from "remotion";
import { useTheme } from "../../lib/hooks";
import { Stage } from "../../lib/theme";
import { TextBlock } from "../../lib/b-kit";
import type { SceneProps } from "../../lib/types";
import { Cell, p, useGeom } from "./common";

/** Mẫu 7 bit minh hoạ (không phải một ký tự cụ thể). */
const SAMPLE = ["1", "0", "0", "1", "0", "1", "1"];

/**
 * Một byte tám ô: bảy ô đầu là 7 bit của ASCII, ô thứ tám để trống (dành làm bit chẵn lẻ, bit phụ kiểm tra lỗi).
 * Một beat: các ô hiện lần lượt, dấu ngoặc 7 bit, rồi ô thứ tám nháy.
 */
export const BitByte: React.FC<SceneProps> = () => {
  const theme = useTheme();
  const f = useCurrentFrame();
  const { W, sq } = useGeom();
  const cw = sq ? 84 : 150;
  const gap = sq ? 10 : 18;
  const ch = sq ? 110 : 150;
  const total = 8 * cw + 7 * gap;
  const x0 = (W - total) / 2;
  const y0 = sq ? 230 : 250;
  const s = sq ? 52 : 84;
  const brace = p(f, 70, 14);
  const eighth = p(f, 120, 14);
  const pulse = 0.55 + 0.45 * Math.sin(f * 0.22);
  const xs = (i: number) => x0 + i * (cw + gap);
  return (
    <Stage>
      <TextBlock text="Một byte: tám ô" x={W / 2} y={sq ? 90 : 110} width={W - 80} fontSize={sq ? 54 : 72} fill={theme.accent} />
      {Array.from({ length: 8 }, (_, i) => {
        const ap = p(f, 8 + i * 6, 10);
        if (i < 7) return <Cell key={i} x={xs(i)} y={y0} w={cw} h={ch} text={SAMPLE[i]} s={s} fill={theme.panel} stroke={theme.accent} color={theme.fg} opacity={ap} />;
        return (
          <g key={i}>
            <Cell x={xs(i)} y={y0} w={cw} h={ch} text="" s={s} fill="none" stroke={theme.accent2} color={theme.accent2} opacity={ap} dashed sw={5} />
            <text x={xs(i) + cw / 2} y={y0 + ch / 2 + s * 0.36} fontSize={s} fontWeight={700} textAnchor="middle" fill={theme.accent2} opacity={ap * (eighth > 0 ? pulse : 0.4)}>
              ?
            </text>
          </g>
        );
      })}
      {/* Ngoặc 7 bit */}
      <g opacity={brace}>
        <path d={`M${xs(0)} ${y0 + ch + 16} V${y0 + ch + 30} H${xs(6) + cw} V${y0 + ch + 16}`} fill="none" stroke={theme.accent} strokeWidth={5} strokeLinejoin="round" />
        <TextBlock text="7 bit: đủ cho 128 vị trí" x={(xs(0) + xs(6) + cw) / 2} y={y0 + ch + (sq ? 84 : 92)} width={xs(6) + cw - xs(0)} fontSize={sq ? 38 : 48} fill={theme.accent} />
      </g>
      {/* Bit thứ tám */}
      <g opacity={eighth}>
        <TextBlock
          text="Bit thứ tám: để dành làm bit chẵn lẻ, một bit phụ kiểm tra lỗi"
          x={W / 2}
          y={sq ? y0 + ch + 190 : y0 + ch + 190}
          width={W - 100}
          fontSize={sq ? 40 : 54}
          maxLines={2}
          fill={theme.accent2}
        />
      </g>
    </Stage>
  );
};
