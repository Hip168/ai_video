import React from "react";
import { useCurrentFrame } from "remotion";
import { clamp01, useTheme } from "../hooks";
import { assertShortText, Stage, useBox } from "../theme";
import { clipLine, fitMono, itemStart, monoStyle, TextBlock } from "../b-kit";
import { CODE_BG, CODE_FG, CODE_MUTED } from "../code-highlight";
import type { SceneProps } from "../types";

interface LineIn {
  kind: "cmd" | "out" | "err";
  text: string;
}

const WIN_WIDE = { x: 130, y: 40, w: 1660, h: 750 };
/** Khung vuông (Short): cửa sổ gần kín hộp, chữ đơn cách tối thiểu 30 px. */
const WIN_SQUARE = { x: 20, y: 20, w: 800, h: 800 };
const BAR = 64;
const TYPE_FPS = 1.1; // ký tự mỗi frame khi gõ lệnh

/** Cửa sổ dòng lệnh: mỗi beat thêm một dòng; lệnh được gõ từng ký tự, kết quả hiện nguyên dòng. */
export const Terminal: React.FC<SceneProps> = ({ scene }) => {
  const theme = useTheme();
  const frame = useCurrentFrame();
  const box = useBox();
  const sq = box.layout === "square";
  const WIN = sq ? WIN_SQUARE : WIN_WIDE;
  const lines = (Array.isArray(scene.props.lines) ? scene.props.lines : []) as LineIn[];
  const title = typeof scene.props.title === "string" && scene.props.title !== "" ? scene.props.title : "terminal";
  const prompt = typeof scene.props.prompt === "string" && scene.props.prompt !== "" ? scene.props.prompt : "$";
  const n = lines.length;
  const promptCols = [...prompt].length + 1;
  const full = lines.map((l) => (l.kind === "cmd" ? `${prompt} ${l.text}` : l.text));
  const { size, charW, cols } = fitMono(full, WIN.w - 100, 40, sq ? 30 : 18);
  const colsOf = (l: LineIn) => Math.max(1, cols - (l.kind === "cmd" ? promptCols : 0));
  // Khung vuông: dòng dài xuống hàng (hàng sau thụt thẳng chữ hàng đầu) thay vì bị cắt. Khung ngang: một hàng mỗi dòng.
  const chunk = (text: string, w: number): string[] => {
    const ch = [...text];
    const out: string[] = [];
    for (let k = 0; k < ch.length; k += w) out.push(ch.slice(k, k + w).join(""));
    return out.length > 0 ? out : [""];
  };
  const rowsOf = lines.map((l) => (sq ? chunk(l.text, colsOf(l)).length : 1));
  const lineH = Math.min(64, (WIN.h - BAR - 50) / Math.max(1, rowsOf.reduce((a, b) => a + b, 0)));
  if (sq) {
    // Hàng thấp hơn chữ: không đọc được ở khung Short.
    assertShortText(box, Math.min(size, lineH), full.join(" / "));
  }
  const colorOf = (k: LineIn["kind"]) => (k === "err" ? theme.warn : k === "out" ? CODE_MUTED : CODE_FG);
  let cursorAt: { x: number; y: number } | null = null;
  const rows = lines.map((l, i) => {
    const t = frame - itemStart(scene, i, n);
    if (t < 0) return null;
    const row0 = rowsOf.slice(0, i).reduce((a, b) => a + b, 0);
    const y = WIN.y + BAR + 46 + row0 * lineH;
    const x0 = WIN.x + 50;
    const chars = [...l.text];
    const typed = l.kind === "cmd" ? Math.min(chars.length, Math.floor(t * TYPE_FPS)) : chars.length;
    const text = chars.slice(0, typed).join("");
    const segs = sq ? chunk(text, colsOf(l)) : [clipLine(text, colsOf(l))];
    const startCol = l.kind === "cmd" ? promptCols : 0;
    cursorAt = { x: x0 + (startCol + [...segs[segs.length - 1]].length) * charW, y: y + (segs.length - 1) * lineH };
    return (
      <g key={i} opacity={clamp01(t / 3 + 0.5)}>
        {l.kind === "cmd" && (
          <text x={x0} y={y} fontSize={size} fontWeight={700} fill={theme.ok}>
            {prompt}
          </text>
        )}
        {segs.map((sg, j) => (
          <text key={j} x={x0 + startCol * charW} y={y + j * lineH} fontSize={size} fill={colorOf(l.kind)} xmlSpace="preserve" style={{ whiteSpace: "pre" }}>
            {sg}
          </text>
        ))}
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
      <TextBlock text={title} x={WIN.x + WIN.w / 2} y={WIN.y + BAR / 2 + 11} width={sq ? 500 : 800} fontSize={32} fill={theme.fg} />
      <g style={monoStyle}>{rows}</g>
      {cursorAt && blink && (
        <rect x={(cursorAt as { x: number }).x + 4} y={(cursorAt as { y: number }).y - size * 0.8} width={charW * 0.8} height={size * 1.05} fill={theme.accent} opacity={0.9} />
      )}
    </Stage>
  );
};
