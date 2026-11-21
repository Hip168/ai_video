import React from "react";
import { useCurrentFrame } from "remotion";
import { clamp01, ease, useTheme } from "../hooks";
import { Stage, useBox } from "../theme";
import { itemStart, lerp, TextBlock } from "../b-kit";
import type { SceneProps } from "../types";

interface LayerIn {
  name: string;
  detail?: string;
}

/** Hình học theo khung: `wide` giữ đúng số cũ; `square` (Short) 840x840. */
const WIDE = { top: 60, area: 700, x0: 196, w0: 1528, inset: 46, hMax: 120 };
const SQUARE = { top: 40, area: 760, x0: 96, w0: 700, inset: 16, hMax: 130 }; // tầng và gói x 44..796: lề Short (hộp 984 tại x 48) >= 96 px
const GAP = 14;

/** Các tầng xếp chồng, tầng đầu ở trên cùng; tầng i hiện ở beat i, rồi một gói dữ liệu đi xuống qua các tầng. */
export const Layers: React.FC<SceneProps> = ({ scene }) => {
  const theme = useTheme();
  const frame = useCurrentFrame();
  const sq = useBox().layout === "square";
  const G = sq ? SQUARE : WIDE;
  const TOP = G.top;
  const AREA = G.area;
  const layers = (Array.isArray(scene.props.layers) ? scene.props.layers : []) as LayerIn[];
  const n = layers.length;
  const hl = typeof scene.props.highlight === "number" ? scene.props.highlight : -1;
  const h = Math.min(G.hMax, (AREA - GAP * (n - 1)) / Math.max(1, n));
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
        const inset = i * G.inset;
        const x = G.x0 + inset;
        const w = G.w0 - 2 * inset;
        const on = i === hl && frame >= lastStart + 14;
        const detail = typeof l.detail === "string" ? l.detail : "";
        return (
          <g key={i} opacity={a} transform={`translate(${(i % 2 === 0 ? -1 : 1) * (1 - a) * 120} 0)`}>
            <rect x={x} y={y} width={w} height={h} rx={20} fill={theme.panel} stroke={on ? theme.accent2 : theme.accent} strokeWidth={on ? 8 : 4} />
            {sq ? (
              <LayerTextSquare name={l.name} detail={detail} x={x + 30} y={y} w={w - 60} h={h} color={on ? theme.accent2 : theme.fg} muted={theme.muted} />
            ) : (
            <>
            <TextBlock text={l.name} x={x + 36} y={y + h / 2 + fs * 0.35} width={detail === "" ? w - 72 : w * 0.38} fontSize={fs} fill={on ? theme.accent2 : theme.fg} anchor="start" />
            {detail !== "" && (
              <TextBlock text={detail} x={x + w - 36} y={y + h / 2 + fs * 0.3} width={w * 0.5} fontSize={fs * 0.72} maxLines={2} fill={theme.muted} anchor="end" weight={400} lineHeight={1.1} />
            )}
            </>
            )}
          </g>
        );
      })}
      {phase >= 0 && (
        <g opacity={clamp01(1 - Math.abs(phase - 0.5) * 0.4)}>
          {sq ? (
            <>
              <rect x={44} y={packetY - 18} width={30} height={36} rx={8} fill={theme.accent2} />
              <polygon points={`74,${packetY} 92,${packetY - 12} 92,${packetY + 12}`} fill={theme.accent2} />
            </>
          ) : (
            <>
          <rect x={100} y={packetY - 20} width={56} height={40} rx={10} fill={theme.accent2} />
          <polygon points={`156,${packetY} 180,${packetY - 14} 180,${packetY + 14}`} fill={theme.accent2} />
            </>
          )}
        </g>
      )}
    </Stage>
  );
};

/** Chữ một tầng ở khung vuông: tên ở trên, chi tiết bên dưới, cùng bề rộng. */
const LayerTextSquare: React.FC<{ name: string; detail: string; x: number; y: number; w: number; h: number; color: string; muted: string }> = ({
  name,
  detail,
  x,
  y,
  w,
  h,
  color,
  muted,
}) => {
  const ns = Math.max(30, Math.min(40, h * 0.38));
  if (detail === "") return <TextBlock text={name} x={x} y={y + h / 2 + ns * 0.35} width={w} fontSize={ns} fill={color} anchor="start" />;
  const lines = h >= 120 ? 2 : 1;
  const ny = y + (h - ns - 8 - lines * 33) / 2 + ns * 0.85;
  return (
    <>
      <TextBlock text={name} x={x} y={ny} width={w} fontSize={ns} fill={color} anchor="start" />
      <TextBlock text={detail} x={x} y={ny + 8 + 30} width={w} fontSize={30} maxLines={lines} fill={muted} anchor="start" weight={400} lineHeight={1.1} />
    </>
  );
};
