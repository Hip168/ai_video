import React from "react";
import { useCurrentFrame } from "remotion";
import { useTheme } from "../../lib/hooks";
import { Stage } from "../../lib/theme";
import { TextBlock } from "../../lib/b-kit";
import type { SceneProps } from "../../lib/types";
import { at, clamp01, fmtInt, lerp, p, useGeom } from "./common";

const FLIP = 16; // frame mỗi lần lật trang

/** Cuốn sổ mở: trang phải ghi số tuần; `flip` 0..1 là trang đang lật từ phải sang trái. */
const Book: React.FC<{ x: number; y: number; w: number; h: number; week: number; prev: number; flip: number; hot: boolean; sq: boolean }> = ({ x, y, w, h, week, prev, flip, hot, sq }) => {
  const theme = useTheme();
  const half = w / 2;
  const sx = x + half; // gáy sổ
  const fs = sq ? 40 : 54;
  // Trang đang lật: mép ngoài đi từ phải (sx + half) sang trái (sx - half).
  const edge = sx + half * Math.cos(Math.PI * clamp01(flip));
  const page = (px: number, label: string, color: string) => (
    <>
      {[0, 1, 2, 3].map((k) => (
        <line key={k} x1={px + 30} y1={y + h * (0.5 + k * 0.1)} x2={px + half - 30} y2={y + h * (0.5 + k * 0.1)} stroke={theme.muted} strokeWidth={3} opacity={0.35} />
      ))}
      <TextBlock text={label} x={px + half / 2} y={y + h * 0.3} width={half - 40} fontSize={fs} fill={color} />
    </>
  );
  return (
    <g>
      <rect x={x - 10} y={y - 10} width={w + 20} height={h + 20} rx={18} fill={theme.accent} opacity={0.35} />
      <rect x={x} y={y} width={half} height={h} rx={10} fill={theme.panel} stroke={theme.muted} strokeWidth={3} />
      <rect x={sx} y={y} width={half} height={h} rx={10} fill={theme.panel} stroke={hot ? theme.warn : theme.muted} strokeWidth={hot ? 6 : 3} />
      {page(x, prev < 0 ? "" : `tuần ${fmtInt(prev)}`, theme.muted)}
      {page(sx, `tuần ${fmtInt(week)}`, hot ? theme.warn : theme.fg)}
      {flip > 0 && flip < 1 && (
        <polygon points={`${sx},${y} ${edge},${y + 8} ${edge},${y + h - 8} ${sx},${y + h}`} fill={theme.bg} stroke={theme.muted} strokeWidth={3} opacity={0.9} />
      )}
      <line x1={sx} y1={y} x2={sx} y2={y + h} stroke={theme.muted} strokeWidth={5} />
    </g>
  );
};

/** Trang đang mở theo frame (chế độ "lat"): beat 0 lật dần từ tuần 0; beat 1 tới các trang cuối, hết trang 1.023 thì về tuần 0. */
function weekAt(f: number, t0: number, t1: number): { week: number; flip: number } {
  if (f < t1) {
    const k = Math.max(0, Math.floor((f - t0 - 10) / FLIP));
    const flip = f - t0 - 10 < 0 ? 0 : ((f - t0 - 10) % FLIP) / FLIP;
    return { week: k, flip: k < 1 && flip === 0 ? 0 : flip };
  }
  const k = Math.floor((f - t1) / FLIP);
  const seq = [1020, 1021, 1022, 1023, 0];
  const week = seq[Math.min(k, seq.length - 1)];
  const flip = k < seq.length - 1 ? ((f - t1) % FLIP) / FLIP : 0;
  return { week, flip };
}

/**
 * Số tuần GPS như cuốn sổ hơn một nghìn trang, mỗi tuần một trang.
 * mode "lat": lật trang; hết trang tuần 1.023 thì về tuần 0, sổ không ghi vòng thứ mấy.
 * mode "nham": một trang "tuần 0" có thể là tháng 8/1999 hay tháng 4/2019; lệch 19,7 năm; máy lỗi chọn 1999.
 */
export const SoTuan: React.FC<SceneProps> = ({ scene }) => {
  const theme = useTheme();
  const f = useCurrentFrame();
  const { W, H, CX, sq } = useGeom();
  const mode = typeof scene.props.mode === "string" ? scene.props.mode : "lat";
  const t0 = at(scene, 0);
  const t1 = at(scene, 1);
  const t2 = at(scene, 2);

  if (mode === "lat") {
    const { week, flip } = weekAt(f, t0, t1);
    const prev = week === 0 ? (f >= t1 ? 1023 : -1) : week - 1;
    const wrapped = f >= t1 && week === 0;
    const bw = sq ? 740 : 1000;
    const bh = sq ? 420 : 470;
    const bx = CX - bw / 2;
    const by = H * (sq ? 0.12 : 0.1);
    return (
      <Stage>
        <Book x={bx} y={by} w={bw} h={bh} week={week} prev={prev} flip={flip} hot={wrapped} sq={sq} />
        <TextBlock text="Mỗi tuần một trang" x={CX} y={by + bh + (sq ? 80 : 90)} width={W - 80} fontSize={sq ? 40 : 52} fill={theme.fg} weight={400} opacity={1 - p(f, t1, 10)} />
        <g opacity={p(f, t1 + 4 * FLIP, 12)}>
          <TextBlock text="Hết trang cuối: về trang đầu" x={CX} y={by + bh + (sq ? 80 : 90)} width={W - 80} fontSize={sq ? 40 : 52} fill={theme.warn} />
          <TextBlock text="Sổ không ghi đây là vòng thứ mấy" x={CX} y={by + bh + (sq ? 150 : 165)} width={W - 80} fontSize={sq ? 36 : 46} fill={theme.accent2} weight={400} />
        </g>
      </Stage>
    );
  }

  // mode "nham"
  const bw = sq ? 420 : 560;
  const bh = sq ? 230 : 300;
  const bx = sq ? CX - bw / 2 : 120;
  const by = sq ? 30 : H * 0.3;
  const lineY = sq ? 560 : H * 0.5;
  const lx0 = sq ? 70 : 860;
  const lx1 = sq ? W - 70 : W - 120;
  const xOld = lerp(lx0, lx1, 0.2);
  const xNew = lerp(lx0, lx1, 0.8);
  const from = { x: sq ? CX : bx + bw + 10, y: sq ? by + bh + 30 : by + bh / 2 };
  const q = p(f, t0 + 10, 16);
  const span = p(f, t1, 16);
  const pick = p(f, t2, 14);
  const fsD = sq ? 40 : 50;
  const curve = (tx: number, ty: number) => {
    const mx = (from.x + tx) / 2;
    const endY = ty - (sq ? 95 : 110);
    return `M${from.x} ${from.y} Q${mx} ${Math.min(from.y, endY) - (sq ? 20 : 80)} ${tx} ${endY}`;
  };
  return (
    <Stage>
      <Book x={bx} y={by} w={bw} h={bh} week={0} prev={-1} flip={0} hot={false} sq={sq} />
      {/* Trục thời gian */}
      <line x1={lx0} y1={lineY} x2={lx1} y2={lineY} stroke={theme.muted} strokeWidth={5} />
      {[
        { x: xOld, label: "8/1999", wrong: true },
        { x: xNew, label: "4/2019", wrong: false },
      ].map((d, i) => {
        const col = pick > 0.5 ? (d.wrong ? theme.warn : theme.ok) : theme.fg;
        return (
          <g key={i}>
            <path d={curve(d.x, lineY)} fill="none" stroke={pick > 0.5 && d.wrong ? theme.warn : theme.accent2} strokeWidth={d.wrong && pick > 0.5 ? 8 : 5} strokeDasharray={pick > 0.5 && d.wrong ? undefined : "14 10"} opacity={q * (pick > 0.5 && !d.wrong ? 0.3 : 1)} />
            <circle cx={d.x} cy={lineY} r={16} fill={col} />
            <TextBlock text={d.label} x={d.x} y={lineY + (sq ? 60 : 70)} width={sq ? 300 : 360} fontSize={fsD} fill={col} />
            <TextBlock text="?" x={d.x} y={lineY - (sq ? 40 : 45)} width={80} fontSize={fsD} fill={theme.accent2} opacity={q * (1 - pick)} />
          </g>
        );
      })}
      <TextBlock text="Vòng đầu hay vòng sau?" x={sq ? CX : (lx0 + lx1) / 2} y={lineY + (sq ? 170 : 190)} width={sq ? W - 80 : lx1 - lx0} fontSize={sq ? 38 : 48} fill={theme.fg} weight={400} opacity={q * (1 - span)} />
      {/* Khoảng lệch */}
      <g opacity={span}>
        <path d={`M${xOld} ${lineY + (sq ? 90 : 105)} V${lineY + (sq ? 110 : 125)} H${xNew} V${lineY + (sq ? 90 : 105)}`} fill="none" stroke={theme.accent2} strokeWidth={5} />
        <TextBlock text="lệch 19,7 năm" x={(xOld + xNew) / 2} y={lineY + (sq ? 170 : 190)} width={sq ? 500 : 600} fontSize={sq ? 40 : 52} fill={theme.accent2} />
      </g>
      <g opacity={pick}>
        <TextBlock text="máy lỗi tưởng" x={xOld} y={lineY - (sq ? 40 : 45)} width={sq ? 340 : 420} fontSize={sq ? 34 : 42} fill={theme.warn} />
        <TextBlock text="thực tế" x={xNew} y={lineY - (sq ? 40 : 45)} width={sq ? 300 : 360} fontSize={sq ? 34 : 42} fill={theme.ok} />
      </g>
    </Stage>
  );
};
