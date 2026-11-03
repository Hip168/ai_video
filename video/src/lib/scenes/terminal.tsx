import React from "react";
import { useCurrentFrame } from "remotion";
import { clamp01, useTheme } from "../hooks";
import { Stage } from "../theme";
import { clipLine, fitMono, itemStart, monoStyle, TextBlock } from "../b-kit";
import { CODE_BG, CODE_FG, CODE_MUTED } from "../code-highlight";
import type { SceneProps } from "../types";

interface LineIn {
  kind: "cmd" | "out" | "err";
  text: string;
}

const WIN = { x: 130, y: 40, w: 1660, h: 750 };
const BAR = 64;
const TYPE_FPS = 1.1; // ký tự mỗi frame khi gõ lệnh

/** Cửa sổ dòng lệnh: mỗi beat thêm một dòng; lệnh được gõ từng ký tự, kết quả hiện nguyên dòng. */
export const Terminal: React.FC<SceneProps> = ({ scene }) => {
  const theme = useTheme();
  const frame = useCurrentFrame();
  const lines = (Array.isArray(scene.props.lines) ? scene.props.lines : []) as LineIn[];
  const title = typeof scene.props.title === "string" && scene.props.title !== "" ? scene.props.title : "terminal";
  const prompt = typeof scene.props.prompt === "string" && scene.props.prompt !== "" ? scene.props.prompt : "$";
  const n = lines.length;
  const promptCols = [...prompt].length + 1;
  const full = lines.map((l) => (l.kind === "cmd" ? `${prompt} ${l.text}` : l.text));
  const { size, charW, cols } = fitMono(full, WIN.w - 100, 40, 18);
  const lineH = Math.min(64, (WIN.h - BAR - 50) / Math.max(1, n));
  const colorOf = (k: LineIn["kind"]) => (k === "err" ? theme.warn : k === "out" ? CODE_MUTED : CODE_FG);
  let cursorAt: { x: number; y: number } | null = null;
  const rows = lines.map((l, i) => {
    const t = frame - itemStart(scene, i, n);
    if (t < 0) return null;
    const y = WIN.y + BAR + 46 + i * lineH;
    const x0 = WIN.x + 50;
    const chars = [...l.text];
    const typed = l.kind === "cmd" ? Math.min(chars.length, Math.floor(t * TYPE_FPS)) : chars.length;
    const shown = clipLine(chars.slice(0, typed).join(""), Math.max(1, cols - (l.kind === "cmd" ? promptCols : 0)));
    const startCol = l.kind === "cmd" ? promptCols : 0;
    cursorAt = { x: x0 + (startCol + [...shown].length) * charW, y };
    return (
      <g key={i} opacity={clamp01(t / 3 + 0.5)}>
        {l.kind === "cmd" && (
          <text x={x0} y={y} fontSize={size} fontWeight={700} fill={theme.ok}>
            {prompt}
          </text>
        )}
        <text x={x0 + startCol * charW} y={y} fontSize={size} fill={colorOf(l.kind)} xmlSpace="preserve" style={{ whiteSpace: "pre" }}>
          {shown}
        </text>
      </g>
    );
  });
  const blink = Math.floor(frame / 15) % 2 === 0;
  return (
    <Stage>
      <rect x={WIN.x} y={WIN.y} width={WIN.w} height={WIN.h} rx={24} fill={CODE_BG} stroke={theme.accent} strokeWidth={4} />
      <rect x={WIN.x} y={WIN.y} width={WIN.w} height={BAR} rx={24} fill={theme.panel} />
      <rect x={WIN.x} y={WIN.y + BAR - 24} width={WIN.w} height={24} fill={theme.panel} />
      {[theme.warn, theme.accent2, theme.ok].map((c, i) => (
        <circle key={i} cx={WIN.x + 40 + i * 42} cy={WIN.y + BAR / 2} r={13} fill={c} />
      ))}
      <TextBlock text={title} x={WIN.x + WIN.w / 2} y={WIN.y + BAR / 2 + 11} width={800} fontSize={32} fill={theme.fg} />
      <g style={monoStyle}>{rows}</g>
      {cursorAt && blink && (
        <rect x={(cursorAt as { x: number }).x + 4} y={(cursorAt as { y: number }).y - size * 0.8} width={charW * 0.8} height={size * 1.05} fill={theme.accent} opacity={0.9} />
      )}
    </Stage>
  );
};
