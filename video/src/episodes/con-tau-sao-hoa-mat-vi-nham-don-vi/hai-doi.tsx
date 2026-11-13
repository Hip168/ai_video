import React from "react";
import { useCurrentFrame } from "remotion";
import { useTheme } from "../../lib/hooks";
import { Stage } from "../../lib/theme";
import { monoStyle, TextBlock } from "../../lib/b-kit";
import type { SceneProps } from "../../lib/types";
import { Arrow, at, Card, lerp, modeOf, p, Ship, useGeom } from "./common";

/** Ghim vị trí (giọt nước ngược). */
const Pin: React.FC<{ x: number; y: number; s: number; color: string; hole: string }> = ({ x, y, s, color, hole }) => (
  <g transform={`translate(${x} ${y})`}>
    <path d={`M0 0 C ${-s * 0.9} ${-s * 0.9} ${-s * 0.6} ${-s * 1.8} 0 ${-s * 1.8} C ${s * 0.6} ${-s * 1.8} ${s * 0.9} ${-s * 0.9} 0 0 Z`} fill={color} />
    <circle cx={0} cy={-s * 1.2} r={s * 0.28} fill={hole} />
  </g>
);

/** Tờ tệp dữ liệu có góc gấp. */
const Doc: React.FC<{ x: number; y: number; w: number; h: number; fill: string; line: string }> = ({ x, y, w, h, fill, line }) => (
  <g transform={`translate(${x} ${y})`}>
    <path d={`M${-w / 2} ${-h / 2} H${w / 2 - w * 0.25} L${w / 2} ${-h / 2 + w * 0.25} V${h / 2} H${-w / 2} Z`} fill={fill} stroke={line} strokeWidth={4} />
    {[0, 1, 2].map((k) => (
      <line key={k} x1={-w * 0.32} y1={-h * 0.12 + k * h * 0.2} x2={w * (k === 2 ? 0.1 : 0.3)} y2={-h * 0.12 + k * h * 0.2} stroke={line} strokeWidth={4} opacity={0.6} />
    ))}
  </g>
);

/**
 * Hai đội ở hai nơi.
 * mode "gioi-thieu" (3 beat): hai nơi cách xa nhau; Lockheed Martin ở Colorado (thiết kế, chế tạo, vận hành); JPL của NASA ở California (dẫn đường).
 * mode "thu" (2 beat): phần mềm dưới đất ghi tệp, đưa đúng tệp đó cho phần mềm dẫn đường đọc thử; phép thử có thể đã phát hiện lỗi đơn vị.
 */
export const HaiDoi: React.FC<SceneProps> = ({ scene }) => {
  const theme = useTheme();
  const f = useCurrentFrame();
  const { W, sq } = useGeom();
  const mode = modeOf(scene.props, "gioi-thieu");
  const t1 = at(scene, 1);
  const t2 = at(scene, 2);
  const cw = sq ? 370 : 600;
  const ch = sq ? 400 : 430;
  const cy = sq ? 250 : 230;
  const lx = sq ? 30 : 150;
  const rx = sq ? W - 30 - cw : W - 150 - cw;
  const fsT = sq ? 36 : 50;
  const fsB = sq ? 30 : 40;

  if (mode === "thu") {
    const loop = 46;
    const ph = f < t1 ? ((f % loop) + loop) % loop : loop;
    const k = Math.min(1, ph / (loop * 0.8));
    const docEndX = sq ? rx + cw / 2 : rx + cw * 0.3;
    const baseY = sq ? cy + 232 : cy + ch * 0.45;
    const docX = lerp(lx + cw * 0.5, docEndX, k);
    const docY = baseY - Math.sin(k * Math.PI) * (sq ? 90 : 120);
    const chk = p(f, t1 + 6, 14);
    const pulse = 0.6 + 0.4 * Math.sin(f * 0.2);
    const needX = sq ? rx + cw / 2 : rx + cw * 0.72;
    const needY = sq ? cy + 150 : baseY + 16;
    const bad = chk > 0.5;
    return (
      <Stage>
        <TextBlock text="Chạy thử cả chuỗi" x={W / 2} y={sq ? 70 : 100} width={W - 80} fontSize={sq ? 44 : 60} fill={theme.accent2} />
        <Card x={lx} y={cy} w={cw} h={ch} fill={theme.panel} stroke={theme.accent}>
          <TextBlock text="Phần mềm dưới mặt đất" x={lx + cw / 2} y={cy + (sq ? 60 : 72)} width={cw - 40} fontSize={fsT} maxLines={2} fill={theme.fg} />
          <TextBlock text="ghi ra tệp" x={lx + cw / 2} y={cy + ch - 34} width={cw - 40} fontSize={fsB} fill={theme.muted} weight={400} />
        </Card>
        <Card x={rx} y={cy} w={cw} h={ch} fill={theme.panel} stroke={bad ? theme.warn : theme.accent}>
          <TextBlock text="Phần mềm dẫn đường" x={rx + cw / 2} y={cy + (sq ? 60 : 72)} width={cw - 40} fontSize={fsT} maxLines={2} fill={theme.fg} />
          <TextBlock text="cần: N·s" x={needX} y={needY} width={sq ? cw - 40 : cw * 0.5} fontSize={fsB} fill={theme.fg} />
          <TextBlock
            text={bad ? "lbf·s ≠ N·s" : "đọc thử đúng tệp đó"}
            x={rx + cw / 2}
            y={cy + ch - 34}
            width={cw - 40}
            fontSize={fsB}
            fill={bad ? theme.warn : theme.muted}
            weight={bad ? 700 : 400}
            opacity={bad ? pulse : 1}
          />
        </Card>
        <Arrow x1={lx + cw + 14} y1={cy + ch * 0.32} x2={rx - 14} y2={cy + ch * 0.32} color={theme.muted} w={5} head={22} />
        <g transform={`translate(${docX} ${docY})`}>
          <Doc x={0} y={0} w={sq ? 84 : 120} h={sq ? 96 : 150} fill={theme.fg} line={theme.bg} />
          <rect x={sq ? -60 : -78} y={sq ? 56 : 86} width={sq ? 120 : 156} height={sq ? 42 : 54} rx={12} fill={theme.accent2} />
          <text x={0} y={sq ? 87 : 124} fontSize={sq ? 30 : 38} fontWeight={700} fill={theme.bg} textAnchor="middle" style={monoStyle}>
            lbf·s
          </text>
        </g>
        <g opacity={chk}>
          <TextBlock text="Có thể đã phát hiện lỗi đơn vị từ sớm" x={W / 2} y={sq ? 735 : 750} width={W - 80} fontSize={sq ? 38 : 54} maxLines={2} fill={theme.ok} />
        </g>
      </Stage>
    );
  }

  // gioi-thieu
  const lineP = p(f, 0, 16);
  const aP = p(f, t1, 14);
  const bP = p(f, t2, 14);
  const shipY = sq ? 130 : 130 + 8 * Math.sin(f * 0.08);
  const midX = W / 2;
  const team = (x: number, show: number, name: string, place: string, job: string, color: string) => (
    <g>
      <Card x={x} y={cy} w={cw} h={ch} fill={theme.panel} stroke={show > 0.5 ? color : theme.muted} sw={show > 0.5 ? 6 : 4} />
      <Pin x={x + cw / 2} y={cy + (sq ? 100 : 120)} s={sq ? 46 : 56} color={show > 0.5 ? color : theme.muted} hole={theme.panel} />
      <g opacity={show} transform={`translate(0 ${(1 - show) * 20})`}>
        <TextBlock text={name} x={x + cw / 2} y={cy + (sq ? 165 : 190)} width={cw - 40} fontSize={fsT} maxLines={2} fill={theme.fg} />
        <TextBlock text={place} x={x + cw / 2} y={cy + (sq ? 235 : 300)} width={cw - 40} fontSize={fsB} fill={color} weight={400} />
        <TextBlock text={job} x={x + cw / 2} y={cy + ch - (sq ? 100 : 46)} width={cw - 40} fontSize={fsB} maxLines={2} fill={theme.fg} weight={400} />
      </g>
    </g>
  );
  return (
    <Stage>
      <Ship x={midX - (sq ? 30 : 40)} y={shipY} s={sq ? 44 : 60} rot={0} body={theme.fg} panel={theme.accent} line={theme.bg} />
      <line x1={lx + cw} y1={cy + ch / 2} x2={rx} y2={cy + ch / 2} stroke={theme.accent2} strokeWidth={5} strokeDasharray="16 12" strokeDashoffset={-f * 1.5} opacity={lineP} />
      <TextBlock text="hai nơi cách xa nhau" x={midX} y={sq ? cy + ch + 70 : cy + ch / 2 - 24} width={sq ? W - 80 : 360} fontSize={sq ? 30 : 38} fill={theme.accent2} opacity={lineP} weight={400} />
      {team(lx, aP, "Lockheed Martin", "bang Colorado", "thiết kế, chế tạo, vận hành", theme.accent)}
      {team(rx, bP, "JPL của NASA", "bang California", "dẫn đường", theme.accent2)}
    </Stage>
  );
};
