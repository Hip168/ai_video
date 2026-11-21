import React, { useMemo } from "react";
import { useCurrentFrame } from "remotion";
import { useTheme } from "../hooks";
import { assertShortText, Stage, useBox } from "../theme";
import { fitText } from "../text";
import type { SceneProps } from "../types";
import { appearAt, easeOutCubic, fmtNum, prog, T } from "./a-common";

const COUNT_FRAMES = 48;

/** Hình học theo khung: `wide` giữ đúng số cũ; `square` (Short) 840x840. */
const WIDE = { cx: 960, panel: [160, 80, 1600, 700], numY: 280, numW: 1400, numMax: 280, bar: [360, 440, 1200], labelY: 530, labelSize: 56, noteY: 690, noteSize: 40, textW: 1400, lines: 2 };
const SQUARE = { cx: 420, panel: [44, 30, 752, 780], numY: 190, numW: 700, numMax: 200, bar: [120, 330, 600], labelY: 420, labelSize: 48, noteY: 640, noteSize: 40, textW: 700, lines: 3 };
type Geom = typeof WIDE;

export const BigNumber: React.FC<SceneProps> = ({ scene }) => {
  const theme = useTheme();
  const frame = useCurrentFrame();
  const G = useBox().layout === "square" ? SQUARE : WIDE;
  const p = scene.props;
  const value = typeof p.value === "number" ? p.value : 0;
  const from = typeof p.from === "number" ? p.from : 0;
  const decimals = typeof p.decimals === "number" ? p.decimals : 0;
  const prefix = typeof p.prefix === "string" ? p.prefix : "";
  const suffix = typeof p.suffix === "string" ? p.suffix : "";
  const label = String(p.label ?? "");
  const note = typeof p.note === "string" ? p.note : "";

  const start = appearAt(scene, 0);
  const k = easeOutCubic((frame - start) / COUNT_FRAMES);
  const shown = frame < start ? from : from + (value - from) * k;
  const fullText = `${prefix}${fmtNum(value, decimals)}${suffix}`;
  const fromText = `${prefix}${fmtNum(from, decimals)}${suffix}`;
  const widest = [...fromText].length > [...fullText].length ? fromText : fullText;
  const liveText = `${prefix}${fmtNum(shown, decimals)}${suffix}`;
  // Cỡ chữ tính theo chuỗi cuối để không nhảy cỡ khi đếm.
  const a = prog(frame, Math.max(0, start - 6), 12);
  const barP = frame < start ? 0 : k;
  return (
    <Stage>
      <rect x={G.panel[0]} y={G.panel[1]} width={G.panel[2]} height={G.panel[3]} rx={36} fill={theme.panel} opacity={a} />
      <FitBig full={widest} live={liveText} color={theme.accent} opacity={a} G={G} />
      <rect x={G.bar[0]} y={G.bar[1]} width={G.bar[2]} height={12} rx={6} fill={theme.muted} opacity={0.35 * a} />
      <rect x={G.bar[0]} y={G.bar[1]} width={G.bar[2] * barP} height={12} rx={6} fill={theme.accent2} opacity={a} />
      <T x={G.cx} y={G.labelY} text={label} size={G.labelSize} width={G.textW} maxLines={G.lines} fill={theme.fg} lh={1.25} opacity={prog(frame, start + 10, 14)} />
      {note !== "" && (
        <T x={G.cx} y={G.noteY} text={note} size={G.noteSize} width={G.textW} maxLines={G.lines} fill={theme.muted} lh={1.25} opacity={prog(frame, appearAt(scene, 1), 14)} />
      )}
    </Stage>
  );
};

/** Số lớn: cỡ chữ lấy theo chuỗi đầy đủ, vẽ chuỗi đang đếm. */
const FitBig: React.FC<{ full: string; live: string; color: string; opacity: number; G: Geom }> = ({ full, live, color, opacity, G }) => {
  // Dùng T để đo; vẽ chữ đếm bằng cỡ đo từ chuỗi đầy đủ.
  const size = useFitSize(full, G);
  assertShortText(useBox(), size, full);
  return (
    <text x={G.cx} y={G.numY + size * 0.35} fontSize={size} fontWeight={700} fill={color} textAnchor="middle" opacity={opacity}>
      {live}
    </text>
  );
};

function useFitSize(text: string, G: Geom): number {
  return useMemo(() => {
    // Cỡ gốc tính theo số ký tự để vừa cả khi chuỗi dài; fitText đo thật và là chốt chặn cuối.
    const base = Math.round(Math.min(G.numMax, Math.max(40, G.numW / ([...text].length * 0.64))));
    return fitText({ text: text, fontSize: base, width: G.numW, maxLines: 1 }).fontSize;
  }, [text, G]);
}
