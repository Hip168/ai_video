import React, { useMemo } from "react";
import { useCurrentFrame } from "remotion";
import { ease, useTheme } from "../hooks";
import { assertShortText, Stage, useBox } from "../theme";
import { clipLine, fitMono, itemStart, lerp, monoStyle, startedCount, TextBlock } from "../b-kit";
import { CODE_BG, CODE_FG, CODE_MUTED, CODE_LANGS, normalizeCode, tokenizeCode, type CodeLang } from "../code-highlight";
import type { SceneProps } from "../types";

interface NoteIn {
  line: number;
  text: string;
}

const WIDE = { panel: { x: 50, y: 40, w: 1150, h: 750 }, note: { x: 1250, y: 140, w: 620, h: 520 }, noteHead: 36, noteSize: 44, noteLines: 6, monoMin: 18 };
/** Khung vuông (Short): mã ở trên, ghi chú bên dưới; chữ mã tối thiểu 30 px. */
const SQUARE = { panel: { x: 20, y: 20, w: 800, h: 480 }, note: { x: 20, y: 520, w: 800, h: 300 }, noteHead: 32, noteSize: 38, noteLines: 4, monoMin: 30 };
const GUTTER = 70;
const MAX_LINES = 18;

export const CodeWalk: React.FC<SceneProps> = ({ scene }) => {
  const theme = useTheme();
  const frame = useCurrentFrame();
  const box = useBox();
  const G = box.layout === "square" ? SQUARE : WIDE;
  const PANEL = G.panel;
  const NOTE_X = G.note.x;
  const NOTE_W = G.note.w;
  const lineIn = (Array.isArray(scene.props.lines) ? scene.props.lines : []).map(String);
  const code = lineIn.join("\n");
  const langIn = scene.props.lang as CodeLang;
  const lang: CodeLang = CODE_LANGS.includes(langIn) ? langIn : "javascript";
  const notes = (Array.isArray(scene.props.notes) ? scene.props.notes : []) as NoteIn[];
  const rows = useMemo(() => tokenizeCode(code, lang).slice(0, MAX_LINES), [code, lang]);
  const plain = useMemo(() => normalizeCode(code).split("\n").slice(0, MAX_LINES), [code]);
  const textW = PANEL.w - GUTTER - 40;
  const { size, charW, cols } = useMemo(() => fitMono(plain, textW, 30, G.monoMin), [plain, textW, G.monoMin]);
  const n = rows.length;
  const lineH = Math.min(52, (PANEL.h - 60) / Math.max(1, n));
  // Khung vuông: dòng mã quá dài (bị cắt) hoặc quá nhiều dòng (chữ thấp hơn dòng) là chữ không đọc được.
  if (box.layout === "square") {
    const longest = Math.max(0, ...plain.map((l) => [...l].length));
    assertShortText(box, longest > cols ? 0 : Math.min(size, lineH), plain.join(" / "));
  }
  const lineY = (i: number) => PANEL.y + 40 + i * lineH;
  const cur = notes.length === 0 ? -1 : startedCount(frame, scene, notes.length) - 1;
  const note = cur >= 0 ? notes[cur] : null;
  const prevLine = cur > 0 ? notes[cur - 1].line - 1 : note ? note.line - 1 : 0;
  const curLine = note ? Math.min(n - 1, Math.max(0, note.line - 1)) : 0;
  const move = cur >= 0 ? ease((frame - itemStart(scene, cur, notes.length)) / 12) : 0;
  const barY = lineY(lerp(Math.min(n - 1, Math.max(0, prevLine)), curLine, move)) - lineH * 0.72;
  const noteA = cur >= 0 ? ease((frame - itemStart(scene, cur, notes.length) - 4) / 12) : 0;
  return (
    <Stage>
      <rect x={PANEL.x} y={PANEL.y} width={PANEL.w} height={PANEL.h} rx={22} fill={CODE_BG} stroke={theme.accent} strokeWidth={4} />
      {cur >= 0 && <rect x={PANEL.x + 8} y={barY} width={PANEL.w - 16} height={lineH} rx={8} fill={theme.accent} opacity={0.28} />}
      <g style={monoStyle}>
        {rows.map((tokens, i) => {
          const a = ease((frame - i * 2) / 10);
          const dim = cur >= 0 && i !== curLine ? 0.5 : 1;
          let col = 0;
          return (
            <g key={i} opacity={a * dim}>
              <text x={PANEL.x + GUTTER - 18} y={lineY(i)} fontSize={box.layout === "square" ? size : size * 0.8} fill={CODE_MUTED} textAnchor="end">
                {i + 1}
              </text>
              {tokens.map((t, j) => {
                const x = PANEL.x + GUTTER + col * charW;
                const chars = [...t.text];
                const room = Math.max(0, cols - col);
                col += chars.length;
                if (room === 0 || t.text.trim() === "") return null;
                const shown = chars.length > room ? clipLine(t.text, room) : t.text;
                return (
                  <text key={j} x={x} y={lineY(i)} fontSize={size} fill={t.color || CODE_FG} xmlSpace="preserve" style={{ whiteSpace: "pre" }}>
                    {shown}
                  </text>
                );
              })}
            </g>
          );
        })}
      </g>
      {note && (
        <g opacity={noteA} transform={`translate(${(1 - noteA) * 40} 0)`}>
          <rect x={NOTE_X} y={G.note.y} width={NOTE_W} height={G.note.h} rx={24} fill={theme.panel} stroke={theme.accent2} strokeWidth={5} />
          <TextBlock text={`Dòng ${note.line}`} x={NOTE_X + 40} y={G.note.y + 70} width={NOTE_W - 80} fontSize={G.noteHead} fill={theme.accent2} anchor="start" />
          <TextBlock text={note.text} x={NOTE_X + 40} y={G.note.y + (box.layout === "square" ? 125 : 150)} width={NOTE_W - 80} fontSize={G.noteSize} maxLines={G.noteLines} fill={theme.fg} anchor="start" weight={700} lineHeight={1.3} />
        </g>
      )}
    </Stage>
  );
};
