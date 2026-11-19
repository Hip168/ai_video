import React from "react";
import { useCurrentFrame } from "remotion";
import { useTheme } from "../../lib/hooks";
import { Icon, Stage } from "../../lib/theme";
import { TextBlock } from "../../lib/b-kit";
import type { SceneProps } from "../../lib/types";
import { at, Caption, Cell, clamp01, modeOf, p, useGeom } from "./common";

interface Glyph {
  g: string;
  hex: string[];
  /** Cách đọc nhầm theo Windows-1252, từng ô một. */
  w: string[];
}

/** "Tiếng Việt" theo UTF-8 (14 ô) và cách Windows-1252 đọc từng ô (đúng chuỗi trong lời: Tiáº¿ng Viá»‡t). */
const GLYPHS: Glyph[] = [
  { g: "T", hex: ["54"], w: ["T"] },
  { g: "i", hex: ["69"], w: ["i"] },
  { g: "ế", hex: ["E1", "BA", "BF"], w: ["á", "º", "¿"] },
  { g: "n", hex: ["6E"], w: ["n"] },
  { g: "g", hex: ["67"], w: ["g"] },
  { g: " ", hex: ["20"], w: [" "] },
  { g: "V", hex: ["56"], w: ["V"] },
  { g: "i", hex: ["69"], w: ["i"] },
  { g: "ệ", hex: ["E1", "BB", "87"], w: ["á", "»", "‡"] },
  { g: "t", hex: ["74"], w: ["t"] },
];

interface Flat {
  glyph: number;
  k: number;
  hex: string;
  w: string;
}
const FLAT: Flat[] = GLYPHS.flatMap((gl, gi) => gl.hex.map((h, k) => ({ glyph: gi, k, hex: h, w: gl.w[k] })));
const MOJI = "Tiáº¿ng Viá»‡t";

/**
 * Chữ ma và dãy byte.
 * mode "luu" (2 beat): beat 0: "Tiếng Việt" lưu theo UTF-8, mỗi chữ vào một hay vài ô nhớ (byte), mỗi ô hai ký tự; beat 1: 14 ô, riêng chữ ế chiếm ba ô.
 * mode "doc" (2 beat): beat 0: đưa đúng các ô ấy cho một bảng cũ (Windows-1252); beat 1: ba ô của ế bị đọc thành ba ký tự riêng, cả dãy hiện ra Tiáº¿ng Viá»‡t.
 */
export const ChuMa: React.FC<SceneProps> = ({ scene }) => {
  const theme = useTheme();
  const f = useCurrentFrame();
  const { W, sq } = useGeom();
  const mode = modeOf(scene.props, "luu");
  const t1 = at(scene, 1);
  const perRow = sq ? 7 : 14;
  const cw = sq ? 100 : 106;
  const gap = sq ? 14 : 10;
  const ch = sq ? 84 : 92;
  const rowW = perRow * cw + (perRow - 1) * gap;
  const x0 = (W - rowW) / 2;
  const hexS = sq ? 40 : 44;
  const resS = sq ? 54 : 58;
  const cellPos = (i: number, top: number, pitch: number) => ({ x: x0 + (i % perRow) * (cw + gap), y: top + Math.floor(i / perRow) * pitch });

  if (mode === "luu") {
    const top = sq ? 230 : 380;
    const pitch = sq ? 240 : 0;
    const letterS = sq ? 62 : 84;
    const hiP = p(f, t1, 12);
    // Ô hiện lần lượt trong beat 0.
    const cellP = (i: number) => p(f, 14 + i * 3, 10);
    return (
      <Stage>
        <TextBlock text="Lưu theo UTF-8" x={W / 2} y={sq ? 76 : 100} width={W - 80} fontSize={sq ? 48 : 64} fill={theme.accent} />
        {GLYPHS.map((gl, gi) => {
          const first = FLAT.findIndex((c) => c.glyph === gi);
          const last = first + gl.hex.length - 1;
          const a = cellPos(first, top, pitch);
          const b = cellPos(last, top, pitch);
          const cx = (a.x + b.x + cw) / 2;
          const isE = gi === 2;
          const hot = isE && hiP > 0.4;
          return (
            <g key={gi} opacity={p(f, gi * 2, 10)}>
              {gl.g === " " ? (
                <rect x={cx - 22} y={a.y - 30} width={44} height={6} rx={3} fill={theme.muted} />
              ) : (
                <text x={cx} y={a.y - 26} fontSize={letterS} fontWeight={700} textAnchor="middle" fill={hot ? theme.accent2 : theme.fg}>
                  {gl.g}
                </text>
              )}
            </g>
          );
        })}
        {FLAT.map((c, i) => {
          const pos = cellPos(i, top, pitch);
          const pr = cellP(i);
          const isE = c.glyph === 2;
          const hot = isE && hiP > 0.4;
          return (
            <Cell
              key={i}
              x={pos.x}
              y={pos.y}
              w={cw}
              h={ch}
              text={c.hex}
              s={hexS}
              fill={hot ? theme.accent2 : theme.panel}
              stroke={hot ? theme.accent2 : theme.accent}
              color={hot ? theme.bg : theme.fg}
              opacity={pr}
            />
          );
        })}
        {/* Dấu ngoặc ba ô của chữ ế */}
        <g opacity={hiP}>
          {(() => {
            const a = cellPos(2, top, pitch);
            const b = cellPos(4, top, pitch);
            const y = a.y + ch + 14;
            return (
              <g>
                <path d={`M${a.x} ${y} V${y + 12} H${b.x + cw} V${y}`} fill="none" stroke={theme.accent2} strokeWidth={5} strokeLinejoin="round" />
                <TextBlock text="chữ ế: ba ô" x={(a.x + b.x + cw) / 2} y={y + (sq ? 52 : 56)} width={sq ? 360 : 420} fontSize={sq ? 38 : 44} fill={theme.accent2} />
              </g>
            );
          })()}
        </g>
        <Caption
          text={f < t1 ? "Mỗi chữ vào một hay vài ô nhớ (byte), mỗi ô ghi bằng hai ký tự" : "Hai chữ Tiếng Việt thành mười bốn ô nhớ"}
          fill={f < t1 ? theme.fg : theme.accent}
        />
      </Stage>
    );
  }

  // mode "doc"
  const top = sq ? 190 : 300;
  const pitch = sq ? 250 : 0;
  const resTop = (i: number) => cellPos(i, top, pitch).y + ch + (sq ? 16 : 18);
  const bookP = p(f, 4, 14);
  const outP = (i: number) => p(f, t1 + 8 + i * 3, 10);
  const bigP = p(f, t1 + 8 + 14 * 3 + 6, 14);
  const bookY = sq ? 20 : 30;
  return (
    <Stage>
      <g opacity={bookP}>
        <Icon name="book" x={W / 2 - (sq ? 250 : 360)} y={bookY + (sq ? 56 : 66)} size={sq ? 100 : 120} color={theme.accent2} />
        <TextBlock text="Windows-1252" x={W / 2 - (sq ? 170 : 280)} y={bookY + (sq ? 62 : 74)} width={sq ? 460 : 640} fontSize={sq ? 56 : 72} fill={theme.accent2} anchor="start" />
        <TextBlock text="bảng cũ của Windows" x={W / 2 - (sq ? 170 : 280)} y={bookY + (sq ? 110 : 128)} width={sq ? 460 : 640} fontSize={sq ? 36 : 44} fill={theme.muted} anchor="start" weight={400} />
      </g>
      {FLAT.map((c, i) => {
        const pos = cellPos(i, top, pitch);
        const isE = c.glyph === 2;
        const rp = outP(i);
        const warnCell = isE && rp > 0.5;
        return (
          <g key={i}>
            <Cell x={pos.x} y={pos.y} w={cw} h={ch} text={c.hex} s={hexS} fill={theme.panel} stroke={warnCell ? theme.warn : theme.accent} color={theme.fg} sw={warnCell ? 6 : 4} />
            <g opacity={rp} transform={`translate(0 ${(1 - rp) * -14})`}>
              <line x1={pos.x + cw / 2} y1={pos.y + ch + 2} x2={pos.x + cw / 2} y2={resTop(i) - 2} stroke={theme.muted} strokeWidth={3} />
              {c.w === " " ? (
                <rect x={pos.x + cw / 2 - 20} y={resTop(i) + ch / 2 + 6} width={40} height={6} rx={3} fill={theme.muted} />
              ) : (
                <>
                  <rect x={pos.x} y={resTop(i)} width={cw} height={ch} rx={12} fill={warnCell || c.glyph === 8 ? theme.warn : theme.panel} stroke={warnCell || c.glyph === 8 ? theme.warn : theme.muted} strokeWidth={4} />
                  <text x={pos.x + cw / 2} y={resTop(i) + ch / 2 + resS * 0.34} fontSize={resS} fontWeight={700} textAnchor="middle" fill={warnCell || c.glyph === 8 ? theme.bg : theme.fg}>
                    {c.w}
                  </text>
                </>
              )}
            </g>
          </g>
        );
      })}
      <g opacity={bigP}>
        <TextBlock text={MOJI} x={W / 2} y={sq ? 700 : 640} width={W - 80} fontSize={sq ? 68 : 112} fill={theme.warn} />
      </g>
      <Caption
        text={f < t1 ? "Đọc nhầm các ô ấy theo một bảng cũ" : "Ba ô của chữ ế bị đọc thành ba ký tự riêng lẻ"}
        fill={f < t1 ? theme.fg : theme.warn}
        y={sq ? 790 : 770}
        maxLines={sq ? 2 : 1}
      />
    </Stage>
  );
};
