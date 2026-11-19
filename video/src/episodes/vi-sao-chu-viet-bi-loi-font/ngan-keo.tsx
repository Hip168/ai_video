import React from "react";
import { useCurrentFrame } from "remotion";
import { useTheme } from "../../lib/hooks";
import { Stage } from "../../lib/theme";
import { TextBlock } from "../../lib/b-kit";
import type { SceneProps } from "../../lib/types";
import { at, Caption, p, useGeom } from "./common";

const COLS = 16;
const ROWS = 8;

/**
 * Tủ 128 ngăn kéo của ASCII (16 cột × 8 hàng).
 * Beat 0: các ngăn hiện lần lượt, mỗi ngăn một số thứ tự, một ngăn kéo ra chứa chữ A.
 * Beat 1: 95 ngăn cho ký tự in được (chữ, số, dấu câu) và 33 ngăn cho ký tự điều khiển.
 */
export const NganKeo: React.FC<SceneProps> = ({ scene }) => {
  const theme = useTheme();
  const f = useCurrentFrame();
  const { W, sq } = useGeom();
  const t1 = at(scene, 1);
  const pitchX = sq ? 50 : 78;
  const pitchY = sq ? 50 : 60;
  const dw = pitchX - (sq ? 6 : 8);
  const dh = pitchY - (sq ? 6 : 8);
  const x0 = (W - COLS * pitchX) / 2;
  const y0 = sq ? 150 : 135;
  const idxS = sq ? 0 : 20;
  const split = p(f, t1, 16);
  // Ký tự điều khiển: 32 ngăn đầu và ngăn cuối (33). Còn lại 95 ngăn in được.
  const isCtl = (i: number) => i < 32 || i === 127;
  const showA = p(f, 40, 12) * (1 - split);
  return (
    <Stage>
      <TextBlock text="Tủ 128 ngăn kéo" x={W / 2} y={sq ? 76 : 70} width={W - 80} fontSize={sq ? 48 : 56} fill={theme.accent} />
      {Array.from({ length: COLS * ROWS }, (_, i) => {
        const col = i % COLS;
        const row = Math.floor(i / COLS);
        const x = x0 + col * pitchX;
        const y = y0 + row * pitchY;
        const ap = p(f, 4 + (row * COLS + col) * 0.35, 8);
        const ctl = isCtl(i);
        const hot = split > 0.5;
        const fill = hot ? (ctl ? theme.muted : theme.accent) : theme.panel;
        const stroke = hot ? (ctl ? theme.muted : theme.accent) : theme.accent;
        const open = i === 65 && showA > 0.2;
        return (
          <g key={i} opacity={ap}>
            <rect x={x} y={y + (open ? 8 : 0)} width={dw} height={dh} rx={7} fill={open ? theme.fg : fill} stroke={stroke} strokeWidth={3} opacity={hot && ctl ? 0.55 : 1} />
            {open ? (
              <text x={x + dw / 2} y={y + 8 + dh * 0.72} fontSize={sq ? 34 : 46} fontWeight={700} textAnchor="middle" fill={theme.bg}>
                A
              </text>
            ) : (
              <line x1={x + dw * 0.3} y1={y + dh * 0.5} x2={x + dw * 0.7} y2={y + dh * 0.5} stroke={hot ? theme.bg : theme.accent} strokeWidth={3} strokeLinecap="round" opacity={0.7} />
            )}
          </g>
        );
      })}
      {idxS > 0 &&
        [0, 1, 2, 3].map((i) => (
          <text key={i} x={x0 + i * pitchX + dw / 2} y={y0 - 8} fontSize={idxS} textAnchor="middle" fill={theme.muted} fontWeight={700}>
            {i}
          </text>
        ))}
      {/* Chú giải */}
      <g opacity={split}>
        {(() => {
          const y = y0 + ROWS * pitchY + (sq ? 40 : 34);
          const sw = sq ? 36 : 40;
          const half = W / 2;
          return (
            <g>
              <rect x={sq ? 40 : half - 560} y={y} width={sw} height={sw} rx={8} fill={theme.accent} />
              <TextBlock text="95 ngăn: chữ, số, dấu câu" x={(sq ? 40 : half - 560) + sw + 16} y={y + sw * 0.82} width={sq ? 700 : 560} fontSize={sq ? 36 : 44} fill={theme.fg} anchor="start" />
              <rect x={sq ? 40 : half + 40} y={y + (sq ? 64 : 0)} width={sw} height={sw} rx={8} fill={theme.muted} opacity={0.7} />
              <TextBlock text="33 ngăn điều khiển" x={(sq ? 40 : half + 40) + sw + 16} y={y + (sq ? 64 : 0) + sw * 0.82} width={sq ? 700 : 480} fontSize={sq ? 36 : 44} fill={theme.fg} anchor="start" />
            </g>
          );
        })()}
      </g>
      <Caption
        text={f < t1 ? "Mỗi ngăn cất một ký tự, và có một số thứ tự" : "Có 95 ngăn cho ký tự in được và 33 ngăn cho ký tự điều khiển"}
        fill={f < t1 ? theme.fg : theme.accent2}
        y={sq ? 770 : 775}
        maxLines={sq ? 2 : 1}
      />
    </Stage>
  );
};
