import React from "react";
import { useCurrentFrame } from "remotion";
import { useTheme } from "../../lib/hooks";
import { Stage } from "../../lib/theme";
import { monoStyle, TextBlock } from "../../lib/b-kit";
import type { SceneProps } from "../../lib/types";
import { at, lerp, p } from "./common";

const FS = 170;
const CW = FS * 0.6; // bề rộng một ký tự đơn cách

/** Một từ vẽ từng ký tự (đơn cách) để tô riêng ký tự thứ `hi`. `swap` thay ký tự `hi` bằng `to` theo tiến độ 0..1. */
const Word: React.FC<{ word: string; cx: number; y: number; hi: number; hiColor: string; color: string; swap?: { to: string; t: number } }> = ({
  word,
  cx,
  y,
  hi,
  hiColor,
  color,
  swap,
}) => {
  const chars = [...word];
  const x0 = cx - (chars.length * CW) / 2 + CW / 2;
  return (
    <g style={monoStyle} fontSize={FS} fontWeight={700} textAnchor="middle">
      {chars.map((c, i) => {
        const x = x0 + i * CW;
        if (i === hi && swap) {
          return (
            <g key={i}>
              <text x={x} y={y - swap.t * 60} fill={hiColor} opacity={1 - swap.t}>
                {c}
              </text>
              <text x={x} y={y + (1 - swap.t) * 60} fill={hiColor} opacity={swap.t}>
                {swap.to}
              </text>
            </g>
          );
        }
        return (
          <text key={i} x={x} y={y} fill={i === hi ? hiColor : color}>
            {c}
          </text>
        );
      })}
    </g>
  );
};

/** bite (miếng cắn) dễ lẫn với bit, nên chữ i được đổi thành chữ y: byte. */
export const BiteByte: React.FC<SceneProps> = ({ scene }) => {
  const theme = useTheme();
  const f = useCurrentFrame();
  const a0 = p(f, at(scene, 0));
  const b1 = at(scene, 1);
  const split = p(f, b1, 20); // tách sang trái, hiện "bit" bên phải
  const swapT = p(f, b1 + 70, 18);
  const b2 = p(f, at(scene, 2));
  const leftX = lerp(960, 600, split);
  return (
    <Stage>
      <g opacity={a0}>
        <Word word="bite" cx={leftX} y={420} hi={1} hiColor={split > 0 ? theme.accent2 : theme.fg} color={theme.fg} swap={{ to: "y", t: swapT }} />
        <TextBlock text="miếng cắn" x={leftX} y={540} width={600} fontSize={52} fill={theme.muted} opacity={1 - swapT} />
        <TextBlock text="Đọc lên vẫn vậy" x={960} y={720} width={1400} fontSize={52} fill={theme.accent} opacity={b2} />
      </g>
      <g opacity={split}>
        <Word word="bit" cx={1320} y={420} hi={1} hiColor={theme.accent2} color={theme.fg} />
        <TextBlock text={swapT > 0.5 ? "≠" : "≈"} x={960} y={400} width={200} fontSize={120} fill={swapT > 0.5 ? theme.ok : theme.warn} />
        <TextBlock text="Nhìn dễ lẫn" x={960} y={180} width={1200} fontSize={60} fill={theme.warn} opacity={1 - b2} />
      </g>
      <TextBlock text="Không thể nhầm với bit nữa" x={960} y={180} width={1400} fontSize={60} fill={theme.ok} opacity={b2} />
    </Stage>
  );
};
