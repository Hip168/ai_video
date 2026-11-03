import React, { useMemo } from "react";
import { useCurrentFrame } from "remotion";
import { useTheme } from "../hooks";
import { Stage } from "../theme";
import { fitText } from "../text";
import type { SceneProps } from "../types";
import { appearAt, easeOutCubic, fmtNum, prog, T } from "./a-common";

const COUNT_FRAMES = 48;

export const BigNumber: React.FC<SceneProps> = ({ scene }) => {
  const theme = useTheme();
  const frame = useCurrentFrame();
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
      <rect x={160} y={80} width={1600} height={700} rx={36} fill={theme.panel} opacity={a} />
      <FitBig full={widest} live={liveText} color={theme.accent} opacity={a} />
      <rect x={360} y={440} width={1200} height={12} rx={6} fill={theme.muted} opacity={0.35 * a} />
      <rect x={360} y={440} width={1200 * barP} height={12} rx={6} fill={theme.accent2} opacity={a} />
      <T x={960} y={530} text={label} size={56} width={1400} maxLines={2} fill={theme.fg} lh={1.25} opacity={prog(frame, start + 10, 14)} />
      {note !== "" && (
        <T x={960} y={690} text={note} size={40} width={1400} maxLines={2} fill={theme.muted} lh={1.25} opacity={prog(frame, appearAt(scene, 1), 14)} />
      )}
    </Stage>
  );
};

/** Số lớn: cỡ chữ lấy theo chuỗi đầy đủ, vẽ chuỗi đang đếm. */
const FitBig: React.FC<{ full: string; live: string; color: string; opacity: number }> = ({ full, live, color, opacity }) => {
  // Dùng T để đo; vẽ chữ đếm bằng cỡ đo từ chuỗi đầy đủ.
  const size = useFitSize(full);
  return (
    <text x={960} y={280 + size * 0.35} fontSize={size} fontWeight={700} fill={color} textAnchor="middle" opacity={opacity}>
      {live}
    </text>
  );
};

function useFitSize(text: string): number {
  return useMemo(() => {
    // Cỡ gốc tính theo số ký tự để vừa cả khi chuỗi dài; fitText đo thật và là chốt chặn cuối.
    const base = Math.round(Math.min(280, Math.max(40, 1400 / ([...text].length * 0.64))));
    return fitText({ text: text, fontSize: base, width: 1400, maxLines: 1 }).fontSize;
  }, [text]);
}
