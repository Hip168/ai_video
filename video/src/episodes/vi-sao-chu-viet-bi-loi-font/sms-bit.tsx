import React from "react";
import { useCurrentFrame } from "remotion";
import { useTheme } from "../../lib/hooks";
import { Stage } from "../../lib/theme";
import { TextBlock } from "../../lib/b-kit";
import type { SceneProps } from "../../lib/types";
import { at, Cell, p, useGeom } from "./common";

/**
 * SMS: 160 ký tự bảng 7 bit, từ một tin 140 byte.
 * Beat 0: bảng 7 bit mặc định của GSM, mỗi ký tự chiếm 7 bit, một tin chứa 140 byte.
 * Beat 1: một byte 8 bit, nên 140 byte là 140 × 8 bit; chia cho 7 bit mỗi ký tự được 160 ký tự.
 */
export const SmsBit: React.FC<SceneProps> = ({ scene }) => {
  const theme = useTheme();
  const f = useCurrentFrame();
  const { W, sq } = useGeom();
  const t1 = at(scene, 1);
  const cw = sq ? 82 : 120;
  const gap = sq ? 8 : 12;
  const ch = sq ? 76 : 96;
  const rowW = 7 * cw + 6 * gap;
  const rx0 = (W - rowW) / 2;
  const ry = sq ? 110 : 120;
  const barY = sq ? 330 : 350;
  const barH = sq ? 92 : 110;
  const barX = sq ? 40 : 160;
  const barW = W - barX * 2;
  const aP = p(f, 4, 12);
  const barP = p(f, 44, 14);
  const l1 = p(f, t1 + 6, 12);
  const l2 = p(f, t1 + 56, 12);
  const l3 = p(f, t1 + 106, 12);
  const fy = sq ? 545 : 565;
  const fs = sq ? 52 : 70;
  return (
    <Stage>
      <g opacity={aP}>
        <TextBlock text="Bảng 7 bit của GSM: một ký tự" x={W / 2} y={ry - (sq ? 22 : 24)} width={W - 80} fontSize={sq ? 40 : 50} fill={theme.accent} />
        {Array.from({ length: 7 }, (_, i) => (
          <Cell key={i} x={rx0 + i * (cw + gap)} y={ry} w={cw} h={ch} text={["1", "0", "1", "1", "0", "0", "1"][i]} s={sq ? 44 : 58} fill={theme.panel} stroke={theme.accent} color={theme.fg} opacity={p(f, 6 + i * 4, 8)} />
        ))}
        <TextBlock text="7 bit" x={W / 2} y={ry + ch + (sq ? 50 : 60)} width={400} fontSize={sq ? 44 : 54} fill={theme.accent} />
      </g>
      <g opacity={barP}>
        <rect x={barX} y={barY} width={barW} height={barH} rx={16} fill={theme.panel} stroke={theme.accent2} strokeWidth={5} />
        <TextBlock text="Một tin chứa 140 byte" x={W / 2} y={barY + barH / 2 + (sq ? 14 : 18)} width={barW - 40} fontSize={sq ? 44 : 58} fill={theme.accent2} />
      </g>
      <g>
        <g opacity={l1}>
          <TextBlock text="Một byte có 8 bit" x={W / 2 - (sq ? 0 : 400)} y={fy} width={sq ? W - 80 : 760} fontSize={sq ? 40 : 50} fill={theme.fg} />
          <TextBlock text="140 byte = 140 × 8 bit" x={W / 2 + (sq ? 0 : 400)} y={sq ? fy + 64 : fy} width={sq ? W - 80 : 760} fontSize={fs} fill={theme.fg} />
        </g>
        <g opacity={l2}>
          <TextBlock text="chia cho 7 bit mỗi ký tự" x={W / 2} y={fy + (sq ? 130 : 100)} width={W - 80} fontSize={sq ? 44 : 56} fill={theme.accent} />
        </g>
        <g opacity={l3}>
          <TextBlock text="(140 × 8) / 7 = 160 ký tự" x={W / 2} y={fy + (sq ? 220 : 210)} width={W - 80} fontSize={sq ? 56 : 84} fill={theme.ok} />
        </g>
      </g>
    </Stage>
  );
};
