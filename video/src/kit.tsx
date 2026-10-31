import React from "react";
import { interpolate, spring, useCurrentFrame } from "remotion";
import { FONT_FAMILY } from "./font";
import type { Beat, Scene } from "./timeline";

export const COLORS = {
  bg: "#0b1220",
  fg: "#e8eefc",
  accent: "#4cc9f0",
  muted: "#6b7a99",
  packet: "#ffb703",
  ok: "#52d6a0",
  warn: "#ff6b6b",
};

export type Point = { x: number; y: number };

/** Toạ độ dùng chung giữa các cảnh (viewBox 1920x1080, vùng hình chính y < 880). */
export const POS: Record<
  "phone" | "router" | "isp1" | "isp2" | "isp3" | "dns" | "server" | "receiver",
  Point
> = {
  phone: { x: 240, y: 440 },
  router: { x: 640, y: 440 },
  isp1: { x: 940, y: 270 },
  isp2: { x: 1000, y: 610 },
  isp3: { x: 1280, y: 440 },
  dns: { x: 1500, y: 440 },
  server: { x: 1580, y: 440 },
  receiver: { x: 1680, y: 440 },
};

export function packetPosition(
  from: Point,
  to: Point,
  start: number,
  duration: number,
  frame: number,
): Point {
  if (duration <= 0 || frame >= start + duration) return { x: to.x, y: to.y };
  if (frame <= start) return { x: from.x, y: from.y };
  const t = (frame - start) / duration;
  return { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export function subtitleOpacity(beat: Beat, frame: number): number {
  const end = beat.startFrame + beat.durationFrames;
  if (frame < beat.startFrame || frame >= end) return 0;
  return Math.min(clamp01((frame - beat.startFrame) / 4), clamp01((end - frame) / 4));
}

/** Frame tương đối của beat (âm nếu chưa tới). Gọi bên trong cảnh (Sequence). */
export function useBeat(scene: Scene, cue: string | number): number {
  const frame = useCurrentFrame();
  let beat: Beat | undefined;
  if (typeof cue === "number") beat = scene.beats[cue];
  else beat = scene.beats.find((b) => b.cue === cue);
  const b = beat ?? scene.beats[0];
  return frame - (b.startFrame - scene.startFrame);
}

/** Frame (tương đối cảnh) mà beat bắt đầu. Dùng để neo `Packet.start` vào cue. */
export function useBeatStart(scene: Scene, cue: string | number): number {
  const frame = useCurrentFrame();
  return frame - useBeat(scene, cue);
}

/** Tiến độ 0..1 kiểu lò xo, bắt đầu tại frame `at` (hàm thuần của frame). */
export function useSpring(frame: number, at = 0): number {
  // fps cố định 30 theo hợp đồng; không dùng hook nên gọi trong điều kiện/vòng lặp vẫn an toàn.
  return spring({ frame: frame - at, fps: 30, config: { damping: 200 } });
}

export const Stage: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <svg
    viewBox="0 0 1920 1080"
    width={1920}
    height={1080}
    style={{ position: "absolute", inset: 0, fontFamily: `${FONT_FAMILY}, sans-serif` }}
  >
    <rect width={1920} height={1080} fill={COLORS.bg} />
    {children}
  </svg>
);

export const Label: React.FC<{
  x: number;
  y: number;
  children: React.ReactNode;
  size?: number;
  color?: string;
  opacity?: number;
  bold?: boolean;
}> = ({ x, y, children, size = 34, color = COLORS.fg, opacity = 1, bold = true }) => (
  <text
    x={x}
    y={y}
    fontSize={size}
    fontWeight={bold ? 700 : 400}
    fill={color}
    opacity={opacity}
    textAnchor="middle"
  >
    {children}
  </text>
);

export const Node: React.FC<{
  id?: string;
  x: number;
  y: number;
  label: string;
  kind?: "phone" | "router" | "server" | "book";
  progress?: number;
}> = ({ id, x, y, label, kind = "router", progress = 1 }) => {
  const scale = 0.8 + 0.2 * progress;
  const c = COLORS.accent;
  return (
    <g
      data-testid={id ? `node-${id}` : undefined}
      opacity={progress}
      transform={`translate(${x} ${y}) scale(${scale})`}
    >
      {kind === "phone" && (
        <>
          <rect x={-50} y={-90} width={100} height={180} rx={16} fill="#16223a" stroke={c} strokeWidth={5} />
          <rect x={-38} y={-70} width={76} height={120} rx={6} fill="#0b1220" />
          <circle cx={0} cy={70} r={7} fill={c} />
        </>
      )}
      {kind === "router" && (
        <>
          <rect x={-80} y={-20} width={160} height={70} rx={14} fill="#16223a" stroke={c} strokeWidth={5} />
          <line x1={-50} y1={-20} x2={-62} y2={-80} stroke={c} strokeWidth={6} strokeLinecap="round" />
          <line x1={50} y1={-20} x2={62} y2={-80} stroke={c} strokeWidth={6} strokeLinecap="round" />
          <circle cx={-40} cy={15} r={6} fill={COLORS.ok} />
          <circle cx={-15} cy={15} r={6} fill={COLORS.packet} />
        </>
      )}
      {kind === "server" && (
        <>
          {[-80, -25, 30].map((yy) => (
            <g key={yy}>
              <rect x={-70} y={yy} width={140} height={46} rx={8} fill="#16223a" stroke={c} strokeWidth={5} />
              <circle cx={-48} cy={yy + 23} r={6} fill={COLORS.ok} />
            </g>
          ))}
        </>
      )}
      {kind === "book" && (
        <>
          <rect x={-70} y={-85} width={140} height={170} rx={10} fill="#16223a" stroke={c} strokeWidth={5} />
          {[-45, -15, 15, 45].map((yy) => (
            <line key={yy} x1={-45} y1={yy} x2={45} y2={yy} stroke={COLORS.muted} strokeWidth={6} strokeLinecap="round" />
          ))}
        </>
      )}
      <Label x={0} y={kind === "phone" ? 140 : 130} size={34}>
        {label}
      </Label>
    </g>
  );
};

export const Link: React.FC<{
  from: Point;
  to: Point;
  progress?: number;
  dashed?: boolean;
}> = ({ from, to, progress = 1, dashed = false }) => {
  const p = clamp01(progress);
  return (
    <line
      data-testid="link"
      x1={from.x}
      y1={from.y}
      x2={from.x + (to.x - from.x) * p}
      y2={from.y + (to.y - from.y) * p}
      stroke={COLORS.muted}
      strokeWidth={5}
      strokeLinecap="round"
      strokeDasharray={dashed ? "4 16" : undefined}
    />
  );
};

export const Packet: React.FC<{
  from: Point;
  to: Point;
  start: number;
  duration: number;
  label?: string;
}> = ({ from, to, start, duration, label }) => {
  const frame = useCurrentFrame();
  const { x, y } = packetPosition(from, to, start, duration, frame);
  return (
    <g data-testid="packet" transform={`translate(${x} ${y})`}>
      <rect x={-28} y={-20} width={56} height={40} rx={6} fill={COLORS.packet} />
      <polyline points="-28,-20 0,4 28,-20" fill="none" stroke="#7a5200" strokeWidth={3} />
      {label !== undefined && (
        <text y={-34} fontSize={30} fontWeight={700} fill={COLORS.fg} textAnchor="middle">
          {label}
        </text>
      )}
    </g>
  );
};

export const Subtitle: React.FC<{ text: string; opacity?: number }> = ({ text, opacity = 1 }) => (
  <div
    style={{
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 90,
      display: "flex",
      justifyContent: "center",
      opacity,
      pointerEvents: "none",
    }}
  >
    <div
      data-testid="subtitle"
      style={{
        maxWidth: 1500,
        padding: "12px 28px",
        borderRadius: 16,
        background: "rgba(5, 8, 16, 0.78)",
        color: COLORS.fg,
        fontFamily: `${FONT_FAMILY}, sans-serif`,
        fontSize: 52,
        fontWeight: 700,
        lineHeight: 1.25,
        textAlign: "center",
        textWrap: "balance",
        display: "-webkit-box",
        WebkitLineClamp: 2,
        WebkitBoxOrient: "vertical",
        overflow: "hidden",
      }}
    >
      {text}
    </div>
  </div>
);

export { interpolate };
