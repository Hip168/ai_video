import React from "react";
import { useCurrentFrame } from "remotion";
import { clamp01, ease, useTheme } from "../hooks";
import { Stage } from "../theme";
import { itemStart, lerp, TextBlock } from "../b-kit";
import type { SceneProps } from "../types";

interface LayerIn {
  name: string;
  detail?: string;
}

const TOP = 60;
const AREA = 700;
const GAP = 14;

/** Các tầng xếp chồng, tầng đầu ở trên cùng; tầng i hiện ở beat i, rồi một gói dữ liệu đi xuống qua các tầng. */
export const Layers: React.FC<SceneProps> = ({ scene }) => {
  const theme = useTheme();
  const frame = useCurrentFrame();
  const layers = (Array.isArray(scene.props.layers) ? scene.props.layers : []) as LayerIn[];
  const n = layers.length;
  const hl = typeof scene.props.highlight === "number" ? scene.props.highlight : -1;
  const h = Math.min(120, (AREA - GAP * (n - 1)) / Math.max(1, n));
  const fs = Math.min(46, h * 0.42);
  const lastStart = n > 0 ? itemStart(scene, n - 1, n) : 0;
  // Gói dữ liệu: quét từ tầng đầu tới tầng cuối rồi lặp lại, sau khi mọi tầng đã hiện.
  const cycle = 24 * Math.max(2, n);
  const phase = frame >= lastStart + 14 ? ((frame - lastStart - 14) % cycle) / cycle : -1;
  const packetY = phase < 0 ? -1 : lerp(TOP + h / 2, TOP + (n - 1) * (h + GAP) + h / 2, ease(phase));
  return (
    <Stage>
      {layers.map((l, i) => {
        const a = ease((frame - itemStart(scene, i, n)) / 14);
        const y = TOP + i * (h + GAP);
        const inset = i * 46;
        const x = 160 + inset;
        const w = 1600 - 2 * inset;
        const on = i === hl && frame >= lastStart + 14;
        const detail = typeof l.detail === "string" ? l.detail : "";
        return (
          <g key={i} opacity={a} transform={`translate(${(i % 2 === 0 ? -1 : 1) * (1 - a) * 120} 0)`}>
            <rect x={x} y={y} width={w} height={h} rx={20} fill={theme.panel} stroke={on ? theme.accent2 : theme.accent} strokeWidth={on ? 8 : 4} />
            <TextBlock text={l.name} x={x + 36} y={y + h / 2 + fs * 0.35} width={detail === "" ? w - 72 : w * 0.38} fontSize={fs} fill={on ? theme.accent2 : theme.fg} anchor="start" />
            {detail !== "" && (
              <TextBlock text={detail} x={x + w - 36} y={y + h / 2 + fs * 0.3} width={w * 0.5} fontSize={fs * 0.72} maxLines={2} fill={theme.muted} anchor="end" weight={400} lineHeight={1.1} />
            )}
          </g>
        );
      })}
      {phase >= 0 && (
        <g opacity={clamp01(1 - Math.abs(phase - 0.5) * 0.4)}>
          <rect x={60} y={packetY - 20} width={64} height={40} rx={10} fill={theme.accent2} />
          <polygon points={`124,${packetY} 150,${packetY - 14} 150,${packetY + 14}`} fill={theme.accent2} />
        </g>
      )}
    </Stage>
  );
};
