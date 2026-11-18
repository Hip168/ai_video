import React from "react";
import { useCurrentFrame } from "remotion";
import { useTheme } from "../../lib/hooks";
import { Stage } from "../../lib/theme";
import { TextBlock } from "../../lib/b-kit";
import type { SceneProps } from "../../lib/types";
import { Arrow, at, Chip, lerp, p, useGeom } from "./common";

/**
 * Soạn văn bản bằng phông cũ rồi gửi cho người khác.
 * Beat 0: máy người soạn có bộ phông VNI hay ABC, chữ Việt hiện đủ.
 * Beat 1: tệp gửi sang máy thiếu bộ phông ấy, người nhận thấy toàn ký tự lạ.
 */
export const PhongCu: React.FC<SceneProps> = ({ scene }) => {
  const theme = useTheme();
  const f = useCurrentFrame();
  const { W, sq } = useGeom();
  const t1 = at(scene, 1);
  const ww = sq ? 780 : 760;
  const wh = sq ? 262 : 410;
  const ax = sq ? 30 : 120;
  const ay = sq ? 30 : 150;
  const bx = sq ? 30 : W - 120 - ww;
  const by = sq ? 360 : 150;
  const fsText = sq ? 78 : 100;
  const aP = p(f, 2, 14);
  const fileP = clampFile(f, t1);
  const bP = p(f, t1 + 16, 14);
  const pulse = 0.7 + 0.3 * Math.sin(f * 0.2);
  const win = (x: number, y: number, title: string, color: string, body: React.ReactNode, op: number) => (
    <g opacity={op}>
      <rect x={x} y={y} width={ww} height={wh} rx={22} fill={theme.panel} stroke={color} strokeWidth={5} />
      <rect x={x} y={y} width={ww} height={64} rx={22} fill={theme.bg} opacity={0.55} />
      {[theme.warn, theme.accent2, theme.ok].map((c, i) => (
        <circle key={i} cx={x + 36 + i * 38} cy={y + 32} r={11} fill={c} />
      ))}
      <TextBlock text={title} x={x + ww / 2 + 50} y={y + 44} width={ww - 260} fontSize={sq ? 34 : 36} fill={theme.fg} />
      {body}
    </g>
  );
  const chipY = (y: number) => y + 84;
  return (
    <Stage>
      {win(
        ax,
        ay,
        "Máy người soạn",
        theme.accent,
        <g>
          <Chip x={ax + 30} y={chipY(ay)} w={sq ? 250 : 190} h={sq ? 56 : 60} text="Phông: VNI" s={sq ? 32 : 34} fill={theme.accent} stroke={theme.accent} color={theme.bg} />
          <Chip x={ax + (sq ? 300 : 240)} y={chipY(ay)} w={sq ? 220 : 190} h={sq ? 56 : 60} text="hay ABC" s={sq ? 32 : 34} fill={theme.accent2} stroke={theme.accent2} color={theme.bg} />
          <TextBlock text="Tiếng Việt" x={ax + ww / 2} y={ay + wh - (sq ? 46 : 80)} width={ww - 80} fontSize={fsText} fill={theme.fg} />
        </g>,
        aP,
      )}
      {/* Tệp bay từ máy này sang máy kia */}
      {fileP > 0 && fileP < 1 && (
        <g transform={`translate(${sq ? W / 2 : lerp(ax + ww + 60, bx - 60, fileP)} ${sq ? lerp(ay + wh + 4, by - 70, fileP) : ay + wh / 2})`}>
          <rect x={-34} y={-42} width={68} height={84} rx={8} fill={theme.fg} stroke={theme.bg} strokeWidth={4} />
          <line x1={-18} y1={-14} x2={18} y2={-14} stroke={theme.bg} strokeWidth={4} opacity={0.6} />
          <line x1={-18} y1={4} x2={18} y2={4} stroke={theme.bg} strokeWidth={4} opacity={0.6} />
          <line x1={-18} y1={22} x2={4} y2={22} stroke={theme.bg} strokeWidth={4} opacity={0.6} />
        </g>
      )}
      {fileP > 0 && (
        <g opacity={Math.min(1, fileP * 2)}>
          {sq ? (
            <Arrow x1={W / 2} y1={ay + wh + 14} x2={W / 2} y2={by - 14} color={theme.muted} w={5} head={20} />
          ) : (
            <Arrow x1={ax + ww + 20} y1={ay + wh / 2} x2={bx - 20} y2={ay + wh / 2} color={theme.muted} w={6} head={24} />
          )}
        </g>
      )}
      {win(
        bx,
        by,
        "Máy người nhận",
        theme.warn,
        <g>
          <TextBlock text="thiếu bộ phông ấy" x={bx + ww / 2} y={chipY(by) + (sq ? 36 : 40)} width={ww - 80} fontSize={sq ? 36 : 40} fill={theme.muted} weight={400} />
          <g opacity={pulse}>
            <TextBlock text="TiÕng ViÖt" x={bx + ww / 2} y={by + wh - (sq ? 46 : 80)} width={ww - 80} fontSize={fsText} fill={theme.warn} />
          </g>
        </g>,
        bP,
      )}
    </Stage>
  );
};

function clampFile(f: number, t1: number): number {
  return Math.min(1, Math.max(0, (f - t1 - 2) / 18));
}
