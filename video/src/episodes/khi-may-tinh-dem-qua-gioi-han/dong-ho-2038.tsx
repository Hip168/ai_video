import React from "react";
import { useCurrentFrame } from "remotion";
import { useTheme } from "../../lib/hooks";
import { Stage } from "../../lib/theme";
import { monoStyle, TextBlock } from "../../lib/b-kit";
import type { SceneProps } from "../../lib/types";
import { at, lerp, p, useGeom } from "./common";

/** Bảng số đơn cách trong khung. */
const Panel: React.FC<{ x: number; y: number; w: number; h: number; text: string; color: string; border: string; size: number; flip?: number }> = ({ x, y, w, h, text, color, border, size, flip = 0 }) => {
  const theme = useTheme();
  const sy = Math.abs(Math.cos(Math.PI * flip));
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={18} fill={theme.panel} stroke={border} strokeWidth={5} />
      <g transform={`translate(0 ${y + h / 2}) scale(1 ${Math.max(0.02, sy)}) translate(0 ${-(y + h / 2)})`}>
        <text x={x + w / 2} y={y + h / 2 + size * 0.36} fontSize={size} fontWeight={700} fill={color} textAnchor="middle" style={monoStyle}>
          {text}
        </text>
      </g>
    </g>
  );
};

/**
 * Năm 2038 của đồng hồ đếm giây 32 bit có dấu.
 * mode "moc": 03:14:08 UTC ngày 19/1/2038, số giây cần cất là trần cộng một (beat 0); giờ Việt Nam: hơn 10 giờ sáng (beat 1).
 * mode "lat": bộ đếm lật sang −2.147.483.648 (beat 0); số giây âm là trước mốc 1970 (beat 1).
 */
export const DongHo2038: React.FC<SceneProps> = ({ scene }) => {
  const theme = useTheme();
  const f = useCurrentFrame();
  const { W, H, CX, sq } = useGeom();
  const mode = typeof scene.props.mode === "string" ? scene.props.mode : "moc";
  const t0 = at(scene, 0);
  const t1 = at(scene, 1);
  const pw = sq ? W - 60 : 1240;
  const px = CX - pw / 2;
  const blink = Math.floor(f / 15) % 2 === 0;

  if (mode === "moc") {
    const vn = p(f, t1, 14);
    const yDate = H * (sq ? 0.1 : 0.1);
    const ph = sq ? 130 : 150;
    const yClock = yDate + (sq ? 40 : 40);
    const yCount = yClock + ph + (sq ? 70 : 80);
    return (
      <Stage>
        <TextBlock text="19/1/2038" x={CX} y={yDate} width={W - 80} fontSize={sq ? 44 : 56} fill={theme.fg} />
        <Panel x={px} y={yClock} w={pw} h={ph} text={blink ? "03:14:08 UTC" : "03 14 08 UTC"} color={theme.accent2} border={theme.accent} size={sq ? 66 : 96} />
        <TextBlock text="Số giây cần cất" x={px} y={yCount - 16} width={pw} fontSize={sq ? 34 : 40} fill={theme.muted} anchor="start" weight={400} />
        <Panel x={px} y={yCount} w={pw} h={ph} text="2.147.483.647 + 1" color={theme.fg} border={blink ? theme.warn : theme.muted} size={sq ? 54 : 84} />
        <TextBlock text="Ô 32 bit có dấu: không còn đủ chỗ" x={CX} y={yCount + ph + (sq ? 56 : 64)} width={W - 80} fontSize={sq ? 36 : 46} fill={theme.warn} opacity={p(f, t0 + 20, 14) * (1 - vn)} />
        <TextBlock text="Giờ Việt Nam: hơn 10 giờ sáng" x={CX} y={yCount + ph + (sq ? 56 : 64)} width={W - 80} fontSize={sq ? 40 : 52} fill={theme.accent2} opacity={vn} />
      </Stage>
    );
  }

  // mode "lat"
  const flip = p(f, t0 + 12, 16);
  const ph = sq ? 140 : 170;
  const yCount = H * (sq ? 0.1 : 0.08);
  const shown = flip < 0.5 ? "2.147.483.647 + 1" : "−2.147.483.648";
  const axis = p(f, t1, 16);
  const ay = yCount + ph + (sq ? 300 : 300);
  const ax0 = sq ? 50 : 200;
  const ax1 = sq ? W - 50 : W - 200;
  const x1970 = lerp(ax0, ax1, 0.62);
  const xNeg = lerp(ax0, ax1, 0.12);
  const arrow = p(f, t1 + 14, 30);
  const xHead = lerp(x1970, xNeg, arrow);
  return (
    <Stage>
      <TextBlock text="Bộ đếm giây, 32 bit có dấu" x={CX} y={yCount - 20} width={W - 80} fontSize={sq ? 34 : 40} fill={theme.muted} weight={400} />
      <Panel x={px} y={yCount} w={pw} h={ph} text={shown} color={flip < 0.5 ? theme.fg : theme.warn} border={flip < 0.5 ? theme.accent : theme.warn} size={sq ? 58 : 96} flip={flip} />
      <TextBlock text="Lật sang số âm xa nhất" x={CX} y={yCount + ph + (sq ? 70 : 80)} width={W - 80} fontSize={sq ? 40 : 52} fill={theme.warn} opacity={p(f, t0 + 28, 14)} />
      <g opacity={axis}>
        <line x1={ax0} y1={ay} x2={ax1} y2={ay} stroke={theme.muted} strokeWidth={5} />
        <polygon points={`${ax1 + 20},${ay} ${ax1},${ay - 12} ${ax1},${ay + 12}`} fill={theme.muted} />
        <line x1={x1970} y1={ay - 30} x2={x1970} y2={ay + 30} stroke={theme.fg} strokeWidth={6} />
        <TextBlock text="mốc 1970" x={x1970} y={ay + (sq ? 76 : 80)} width={sq ? 280 : 360} fontSize={sq ? 36 : 44} fill={theme.fg} />
        <TextBlock text="số giây dương" x={lerp(x1970, ax1, 0.5)} y={ay - (sq ? 44 : 50)} width={sq ? 280 : 420} fontSize={sq ? 30 : 38} fill={theme.accent} weight={400} />
        <line x1={x1970} y1={ay} x2={xHead} y2={ay} stroke={theme.warn} strokeWidth={10} strokeLinecap="round" />
        <polygon points={`${xHead - 24},${ay} ${xHead},${ay - 16} ${xHead},${ay + 16}`} fill={theme.warn} opacity={arrow > 0.02 ? 1 : 0} />
        <TextBlock text="số giây âm: trước 1970" x={lerp(xNeg, x1970, 0.5)} y={ay - (sq ? 44 : 50)} width={sq ? 460 : 640} fontSize={sq ? 32 : 42} fill={theme.warn} opacity={arrow} />
      </g>
    </Stage>
  );
};
