import React from "react";
import { useCurrentFrame } from "remotion";
import { useTheme } from "../../lib/hooks";
import { Stage } from "../../lib/theme";
import { monoStyle, TextBlock } from "../../lib/b-kit";
import type { SceneProps } from "../../lib/types";
import { at, Caption, lerp, modeOf, p, ThumbsUp, useGeom } from "./common";

/** Một byte tám bit: `prefix` bit đầu tô màu dấu hiệu, phần còn lại màu `rest`. */
const ByteBits: React.FC<{
  x: number;
  y: number;
  w: number;
  h: number;
  bits: string;
  prefix: number;
  s: number;
  markColor: string;
  restColor: string;
  fill: string;
  stroke: string;
  opacity?: number;
  sw?: number;
}> = ({ x, y, w, h, bits, prefix, s, markColor, restColor, fill, stroke, opacity = 1, sw = 4 }) => (
  <g opacity={opacity}>
    <rect x={x} y={y} width={w} height={h} rx={12} fill={fill} stroke={stroke} strokeWidth={sw} />
    <text x={x + w / 2} y={y + h / 2 + s * 0.36} fontSize={s} fontWeight={700} textAnchor="middle" style={monoStyle} xmlSpace="preserve">
      <tspan fill={markColor}>{bits.slice(0, prefix)}</tspan>
      <tspan fill={restColor}>{bits.slice(prefix)}</tspan>
    </text>
  </g>
);

const TEMPLATE: { n: number; bytes: string[]; prefix: number[] }[] = [
  { n: 1, bytes: ["0xxxxxxx"], prefix: [1] },
  { n: 2, bytes: ["110xxxxx", "10xxxxxx"], prefix: [3, 2] },
  { n: 3, bytes: ["1110xxxx", "10xxxxxx", "10xxxxxx"], prefix: [4, 2, 2] },
  { n: 4, bytes: ["11110xxx", "10xxxxxx", "10xxxxxx", "10xxxxxx"], prefix: [5, 2, 2, 2] },
];

// é = U+00E9 (C3 A9), ế = U+1EBF (E1 BA BF), 👍 = U+1F44D (F0 9F 91 8D)
const EXAMPLES: { bytes: string[]; prefix: number[]; hex: string }[] = [
  { bytes: ["01100001"], prefix: [1], hex: "" },
  { bytes: ["11000011", "10101001"], prefix: [3, 2], hex: "C3 A9" },
  { bytes: ["11100001", "10111010", "10111111"], prefix: [4, 2, 2], hex: "E1 BA BF" },
  { bytes: ["11110000", "10011111", "10010001", "10001101"], prefix: [5, 2, 2, 2], hex: "F0 9F 91 8D" },
];

/**
 * UTF-8: cách xếp bit của một ký tự.
 * mode "yeu-cau" (3 beat): byte của chữ ASCII không lẫn vào byte của chữ nhiều byte; nghe dở chừng vẫn tìm được đầu chữ kế tiếp; một lỗi không kéo hỏng cả đoạn.
 * mode "bon" (2 beat): mỗi ký tự từ 1 đến 4 byte (ASCII một byte); ví dụ é 2 byte, ế 3 byte, 👍 4 byte (vẽ bằng SVG).
 */
export const Utf8Bit: React.FC<SceneProps> = ({ scene }) => {
  const theme = useTheme();
  const f = useCurrentFrame();
  const { W, sq } = useGeom();
  const mode = modeOf(scene.props, "bon");
  const t1 = at(scene, 1);
  const t2 = at(scene, 2);
  const s = sq ? 30 : 44;
  const bw = sq ? 150 : 240;
  const bh = sq ? 80 : 100;
  const gap = sq ? 8 : 14;

  if (mode === "yeu-cau") {
    // Dòng chữ a ế b và năm byte của nó.
    const bytes = [
      { b: "0xxxxxxx", pre: 1, g: 0 },
      { b: "1110xxxx", pre: 4, g: 1 },
      { b: "10xxxxxx", pre: 2, g: 1 },
      { b: "10xxxxxx", pre: 2, g: 1 },
      { b: "0xxxxxxx", pre: 1, g: 2 },
    ];
    const n = bytes.length;
    const total = n * bw + (n - 1) * gap;
    const x0 = (W - total) / 2;
    const y0 = sq ? 300 : 280;
    const xs = (i: number) => x0 + i * (bw + gap);
    const letters = ["a", "ế", "b"];
    const letterSpan = [
      [0, 0],
      [1, 3],
      [4, 4],
    ];
    const scan = p(f, t1 + 10, 60); // con trỏ trượt từ byte 2 tới byte 4
    const ptr = lerp(2, 4, scan);
    const dead = p(f, t2, 10);
    const rule = p(f, 18, 14);
    return (
      <Stage>
        <TextBlock text="Chữ a ế b trong máy" x={W / 2} y={sq ? 76 : 96} width={W - 80} fontSize={sq ? 48 : 60} fill={theme.accent} />
        {letters.map((g, i) => {
          const [a, b] = letterSpan[i];
          const cx = (xs(a) + xs(b) + bw) / 2;
          const broken = dead > 0.5 && i === 1;
          return (
            <text key={i} x={cx} y={y0 - 26} fontSize={sq ? 72 : 96} fontWeight={700} textAnchor="middle" fill={broken ? theme.warn : theme.fg}>
              {broken ? "?" : g}
            </text>
          );
        })}
        {bytes.map((c, i) => {
          const asc = c.g !== 1;
          const bad = dead > 0.5 && i === 2;
          const skipped = f >= t1 + 10 && i >= 2 && i < ptr - 0.01 && i !== 4;
          return (
            <ByteBits
              key={i}
              x={xs(i)}
              y={y0}
              w={bw}
              h={bh}
              bits={c.b}
              prefix={c.pre}
              s={s}
              markColor={bad ? theme.bg : asc ? theme.accent : theme.accent2}
              restColor={bad ? theme.bg : theme.muted}
              fill={bad ? theme.warn : theme.panel}
              stroke={bad ? theme.warn : asc ? theme.accent : theme.accent2}
              opacity={skipped ? 0.45 : 1}
            />
          );
        })}
        {/* Beat 0: bit đầu */}
        <g opacity={rule}>
          <TextBlock text="a, b: bắt đầu bằng 0" x={(xs(0) + bw / 2 + xs(4) + bw / 2) / 2} y={y0 + bh + (sq ? 70 : 76)} width={total} fontSize={sq ? 38 : 48} fill={theme.accent} />
          <TextBlock text="mọi byte của ế: bắt đầu bằng 1" x={W / 2} y={y0 + bh + (sq ? 130 : 140)} width={total} fontSize={sq ? 38 : 48} fill={theme.accent2} />
        </g>
        {/* Beat 1: nghe dở chừng, trượt tới đầu chữ kế tiếp */}
        {f >= t1 && (
          <g opacity={p(f, t1, 10) * (dead > 0.5 ? 0.0 : 1)}>
            <g transform={`translate(${lerp(xs(2) + bw / 2, xs(4) + bw / 2, scan)} ${y0 - (sq ? 36 : 40)})`}>
              <polygon points="0,26 -16,0 16,0" fill={theme.ok} />
            </g>
            <TextBlock
              text={scan < 0.98 ? "nghe dở chừng: bắt đầu bằng 10, đi tiếp" : "đây là đầu chữ kế tiếp"}
              x={W / 2}
              y={y0 + bh + (sq ? 215 : 230)}
              width={W - 80}
              fontSize={sq ? 38 : 48}
              maxLines={2}
              fill={theme.ok}
            />
          </g>
        )}
        {/* Beat 2: một lỗi nhỏ không kéo hỏng cả đoạn sau */}
        <g opacity={dead}>
          <TextBlock text="Một byte hỏng chỉ làm hỏng một chữ" x={W / 2} y={y0 + bh + (sq ? 215 : 230)} width={W - 80} fontSize={sq ? 38 : 48} maxLines={2} fill={theme.warn} />
        </g>
      </Stage>
    );
  }

  // mode "bon"
  const labelW = sq ? 130 : 220;
  const maxBytes = 4;
  const gridW = maxBytes * bw + (maxBytes - 1) * gap;
  const xs0 = (W - (labelW + gridW)) / 2 + labelW;
  const pitch = sq ? 122 : 128;
  const y0 = sq ? 140 : 120;
  const exP = p(f, t1, 14);
  const rowIn = (i: number) => p(f, 4 + i * 10, 12);
  const glyphs = [null, "é", "ế", "thumb"] as const;
  return (
    <Stage>
      {TEMPLATE.map((row, ri) => {
        const y = y0 + ri * pitch;
        const ex = EXAMPLES[ri];
        const useEx = exP > 0.5 && ri > 0;
        const bytes = useEx ? ex.bytes : row.bytes;
        const prefix = useEx ? ex.prefix : row.prefix;
        const g = glyphs[ri];
        return (
          <g key={ri} opacity={rowIn(ri) * (exP > 0 && ri === 0 ? 1 - 0.55 * exP : 1)}>
            {/* nhãn trái: số byte, rồi ký tự ví dụ */}
            {useEx ? (
              g === "thumb" ? (
                <ThumbsUp x={xs0 - labelW / 2} y={y + bh / 2} s={sq ? 84 : 100} />
              ) : (
                <text x={xs0 - labelW / 2} y={y + bh / 2 + (sq ? 24 : 32)} fontSize={sq ? 72 : 96} fontWeight={700} textAnchor="middle" fill={theme.accent2}>
                  {g}
                </text>
              )
            ) : (
              <TextBlock text={`${row.n} byte`} x={xs0 - labelW / 2} y={y + bh / 2 + (sq ? 14 : 18)} width={labelW - 12} fontSize={sq ? 38 : 50} fill={ri === 0 ? theme.accent : theme.fg} />
            )}
            {bytes.map((b, bi) => (
              <ByteBits
                key={bi}
                x={xs0 + bi * (bw + gap)}
                y={y}
                w={bw}
                h={bh}
                bits={b}
                prefix={prefix[bi]}
                s={s}
                markColor={bi === 0 ? theme.accent2 : theme.accent}
                restColor={useEx ? theme.fg : theme.muted}
                fill={theme.panel}
                stroke={bi === 0 ? theme.accent2 : theme.accent}
              />
            ))}
            {useEx && !sq && ex.hex !== "" && (
              <text x={xs0 + bytes.length * (bw + gap) + 10} y={y + bh / 2 + 16} fontSize={38} fontWeight={700} fill={theme.muted} style={monoStyle}>
                {ex.hex}
              </text>
            )}
            {useEx && sq && ex.hex !== "" && (
              <text x={xs0 + (bytes.length - 1) * (bw + gap) + bw} y={y + bh + 28} fontSize={30} fontWeight={700} fill={theme.muted} style={monoStyle} textAnchor="end">
                {ex.hex}
              </text>
            )}
          </g>
        );
      })}
      <Caption
        text={f < t1 ? "Mỗi ký tự dùng từ 1 đến 4 byte. ASCII chỉ cần một byte" : "Chữ é 2 byte, chữ ế 3 byte, biểu tượng này 4 byte"}
        fill={f < t1 ? theme.fg : theme.accent2}
        y={sq ? 735 : 770}
        maxLines={sq ? 2 : 1}
      />
    </Stage>
  );
};
