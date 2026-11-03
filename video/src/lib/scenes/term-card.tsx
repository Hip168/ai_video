import React from "react";
import { useCurrentFrame } from "remotion";
import { useTheme } from "../hooks";
import { Stage } from "../theme";
import type { SceneProps } from "../types";
import { appearAt, prog, T } from "./a-common";

/** Thẻ thuật ngữ: beat 0 hiện từ, beat 1 định nghĩa, beat 2 ví dụ. */
export const TermCard: React.FC<SceneProps> = ({ scene }) => {
  const theme = useTheme();
  const frame = useCurrentFrame();
  const p = scene.props;
  const term = String(p.term ?? "");
  const tag = typeof p.tag === "string" && p.tag !== "" ? p.tag : "Thuật ngữ";
  const pron = typeof p.pronunciation === "string" ? p.pronunciation : "";
  const def = String(p.definition ?? "");
  const ex = typeof p.example === "string" ? p.example : "";
  const a0 = prog(frame, appearAt(scene, 0), 14);
  const a1 = prog(frame, appearAt(scene, 1), 14);
  const a2 = prog(frame, appearAt(scene, 2), 14);
  return (
    <Stage>
      <g opacity={a0} transform={`translate(0 ${(1 - a0) * 40})`}>
        <rect x={160} y={80} width={1600} height={690} rx={36} fill={theme.panel} stroke={theme.accent} strokeWidth={6} />
        <rect x={160} y={80} width={20} height={690} rx={10} fill={theme.accent} />
        <rect x={240} y={120} width={300} height={56} rx={28} fill={theme.accent} />
        <T x={390} y={158} text={tag} size={30} width={260} maxLines={1} fill={theme.bg} />
        <T x={240} y={310} text={term} size={120} width={1400} maxLines={1} fill={theme.fg} anchor="start" />
        {pron !== "" && <T x={240} y={375} text={pron} size={44} width={1400} maxLines={1} fill={theme.muted} anchor="start" />}
      </g>
      <g opacity={a1} transform={`translate(${(1 - a1) * 40} 0)`}>
        <line x1={240} y1={420} x2={240 + 1360 * a1} y2={420} stroke={theme.accent2} strokeWidth={6} strokeLinecap="round" />
        <T x={240} y={495} text={def} size={46} width={1400} maxLines={3} fill={theme.fg} anchor="start" lh={1.3} />
      </g>
      {ex !== "" && (
        <g opacity={a2} transform={`translate(0 ${(1 - a2) * 30})`}>
          <rect x={240} y={655} width={8} height={90} rx={4} fill={theme.accent2} />
          <T x={274} y={690} text={ex} size={36} width={1330} maxLines={2} fill={theme.accent2} anchor="start" lh={1.25} />
        </g>
      )}
    </Stage>
  );
};
