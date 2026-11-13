import React from "react";
import { useCurrentFrame } from "remotion";
import { useTheme } from "../../lib/hooks";
import { Stage } from "../../lib/theme";
import { TextBlock } from "../../lib/b-kit";
import type { SceneProps } from "../../lib/types";
import { at, clamp01, endOf, p, useGeom } from "./common";

const DAYS = 248;

/**
 * Boeing 787: bốn bộ điều khiển máy phát (GCU) bật cùng lúc, bộ đếm của cả bốn tăng như nhau (beat 0);
 * tới ngày 248 cả bốn cùng chuyển sang chế độ an toàn. Beat 1: dãy đèn điện xoay chiều tắt hết.
 */
export const BonGcu: React.FC<SceneProps> = ({ scene }) => {
  const theme = useTheme();
  const f = useCurrentFrame();
  const { W, H, CX, sq } = useGeom();
  const t0 = at(scene, 0);
  const t1 = at(scene, 1);
  const runFrom = t0 + 14;
  const runTo = Math.max(runFrom + 30, endOf(scene, 0) - 24);
  const prog = clamp01((f - runFrom) / (runTo - runFrom));
  const day = Math.floor(prog * DAYS);
  const safe = p(f, runTo, 10);
  const off = p(f, t1 + 8, 16);
  const on = p(f, t0 + 4, 10);

  // Bố cục: hàng 4 hộp (wide) hoặc lưới 2x2 (square).
  const cols = sq ? 2 : 4;
  const gap = sq ? 30 : 40;
  const bw = (W - (sq ? 60 : 200) - (cols - 1) * gap) / cols;
  const bh = sq ? 180 : 230;
  const top = H * (sq ? 0.17 : 0.2);
  const x0 = CX - (cols * bw + (cols - 1) * gap) / 2;
  const boxes = [0, 1, 2, 3].map((i) => ({ x: x0 + (i % cols) * (bw + gap), y: top + Math.floor(i / cols) * (bh + gap) }));
  const rowsH = sq ? 2 * bh + gap : bh;

  const lampsY = top + rowsH + (sq ? 110 : 150);
  const lamps = 6;
  const lampGap = Math.min(150, (W - 200) / lamps);
  const lx0 = CX - ((lamps - 1) * lampGap) / 2;
  return (
    <Stage>
      <TextBlock
        text={`ngày ${day}`}
        x={CX}
        y={top - (sq ? 30 : 50)}
        width={W - 80}
        fontSize={sq ? 52 : 68}
        fill={safe > 0.5 ? theme.warn : theme.accent2}
      />
      {boxes.map((b, i) => (
        <g key={i}>
          <rect x={b.x} y={b.y} width={bw} height={bh} rx={22} fill={theme.panel} stroke={safe > 0.5 ? theme.warn : theme.accent} strokeWidth={5} />
          <TextBlock text="GCU" x={b.x + bw / 2} y={b.y + (sq ? 50 : 62)} width={bw - 30} fontSize={sq ? 38 : 48} fill={theme.fg} />
          <circle cx={b.x + bw - 32} cy={b.y + 32} r={14} fill={safe > 0.5 ? theme.warn : theme.ok} opacity={on} />
          {/* Thanh bộ đếm */}
          <rect x={b.x + 24} y={b.y + bh * 0.48} width={bw - 48} height={bh * 0.14} rx={8} fill={theme.bg} />
          <rect x={b.x + 24} y={b.y + bh * 0.48} width={(bw - 48) * prog} height={bh * 0.14} rx={8} fill={safe > 0.5 ? theme.warn : theme.accent2} />
          <TextBlock text={safe > 0.5 ? "chế độ an toàn" : "bộ đếm"} x={b.x + bw / 2} y={b.y + bh - (sq ? 22 : 30)} width={bw - 20} fontSize={sq ? 30 : 36} fill={safe > 0.5 ? theme.warn : theme.muted} weight={400} />
        </g>
      ))}
      {/* Điện xoay chiều: dãy đèn */}
      {Array.from({ length: lamps }, (_, k) => {
        const x = lx0 + k * lampGap;
        const lit = 1 - off;
        return (
          <g key={k}>
            <circle cx={x} cy={lampsY} r={sq ? 28 : 34} fill={theme.panel} stroke={theme.muted} strokeWidth={4} />
            <circle cx={x} cy={lampsY} r={sq ? 28 : 34} fill={theme.accent2} opacity={lit * on} />
          </g>
        );
      })}
      <TextBlock
        text={off > 0.5 ? "Mất toàn bộ điện xoay chiều" : "Điện xoay chiều"}
        x={CX}
        y={lampsY + (sq ? 90 : 100)}
        width={W - 80}
        fontSize={sq ? 38 : 48}
        fill={off > 0.5 ? theme.warn : theme.fg}
        weight={off > 0.5 ? 700 : 400}
      />
    </Stage>
  );
};
