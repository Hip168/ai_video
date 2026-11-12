import React from "react";
import { useCurrentFrame } from "remotion";
import { useTheme } from "../../lib/hooks";
import { Stage, useBox } from "../../lib/theme";
import { TextBlock } from "../../lib/b-kit";
import type { SceneProps } from "../../lib/types";
import { at, jitter, lerp, p } from "./common";

// Trục điện áp: 0 V ở y = 700, 5 V ở y = 120.
const Y0 = 700;
const Y5 = 120;
const AX = 380; // trục dọc
const X1 = 1520; // mép phải vùng vẽ
const vy = (v: number): number => Y0 - ((Y0 - Y5) * v) / 5;

const Axis: React.FC<{ opacity: number; label: string; color: string; x1?: number }> = ({ opacity, label, color, x1 = X1 }) => (
  <g opacity={opacity}>
    <line x1={AX} y1={Y0 + 10} x2={AX} y2={Y5 - 30} stroke={color} strokeWidth={5} strokeLinecap="round" />
    <line x1={AX - 10} y1={Y0} x2={x1} y2={Y0} stroke={color} strokeWidth={5} strokeLinecap="round" />
    <polygon points={`${AX},${Y5 - 50} ${AX - 14},${Y5 - 24} ${AX + 14},${Y5 - 24}`} fill={color} />
    <TextBlock text={label} x={AX} y={Y0 + 70} width={340} fontSize={36} fill={color} weight={400} />
  </g>
);

/** Đường tín hiệu: điện áp `v(x)` (vôn) tại từng điểm x. */
function trace(v: (x: number) => number, x0 = AX + 20, x1 = X1 - 20): string {
  const pts: string[] = [];
  for (let x = x0; x <= x1; x += 12) pts.push(`${x},${vy(v(x)).toFixed(1)}`);
  return pts.join(" ");
}

/** Mức điện áp. mode: "nhieu" (điện áp rung), "ttl" (ngưỡng 0,8 V và 2 V), "vung-dem" (khoảng giữa), "muoi-nac" (5 V chia mười nấc), "flash" (8 mức ứng 3 bit). */
export const DienAp: React.FC<SceneProps> = ({ scene }) => {
  const theme = useTheme();
  const f = useCurrentFrame();
  const mode = String(scene.props.mode ?? "nhieu");
  const show = p(f, at(scene, 0));
  if (useBox().layout === "square") return <DienApSquare scene={scene} />;

  if (mode === "nhieu") {
    const amp = lerp(0.12, 0.45, p(f, at(scene, 1), 30));
    const causes = ["nhiệt", "dây dẫn bên cạnh", "nguồn điện chập chờn"];
    const NX1 = 1180;
    return (
      <Stage>
        <Axis opacity={show} label="điện áp" color={theme.muted} x1={NX1} />
        <line x1={AX + 20} y1={vy(3)} x2={NX1 - 20} y2={vy(3)} stroke={theme.muted} strokeWidth={4} strokeDasharray="18 14" opacity={show * 0.7} />
        <polyline points={trace((x) => 3 + amp * jitter(f, x), AX + 20, NX1 - 20)} fill="none" stroke={theme.accent} strokeWidth={7} strokeLinejoin="round" opacity={show} />
        {causes.map((c, i) => {
          const a = p(f, at(scene, 1) + i * 22);
          return (
            <g key={c} opacity={a} transform={`translate(${(1 - a) * 30} 0)`}>
              <rect x={1240} y={200 + i * 150} width={620} height={104} rx={24} fill={theme.panel} stroke={theme.accent2} strokeWidth={4} />
              <TextBlock text={c} x={1550} y={266 + i * 150} width={570} fontSize={44} fill={theme.fg} />
            </g>
          );
        })}
        <TextBlock text="Nhiễu" x={(AX + NX1) / 2} y={250} width={700} fontSize={130} fill={theme.warn} opacity={p(f, at(scene, 2))} />
      </Stage>
    );
  }

  if (mode === "ttl" || mode === "vung-dem") {
    const ttl = mode === "ttl";
    const s5 = ttl ? p(f, at(scene, 1)) : 1;
    const low = ttl ? p(f, at(scene, 2)) : 1;
    const high = ttl ? p(f, at(scene, 3)) : 1;
    const mid = ttl ? 0 : p(f, at(scene, 0));
    const midName = ttl ? 0 : p(f, at(scene, 1));
    const sig = ttl ? 0 : p(f, at(scene, 2));
    const ask = ttl ? 0 : p(f, at(scene, 3));
    const ZX = AX + 10;
    const ZW = 760;
    // Tín hiệu mức cao bị nhiễu kéo xuống, nhưng luôn ≥ 2,2 V.
    const dip = (x: number) => 1.0 * Math.exp(-(((x - 760 - ((f * 4) % 500)) / 70) ** 2));
    const sigV = (x: number) => 3.6 + 0.25 * jitter(f, x, 1.3) - dip(x);
    return (
      <Stage>
        <Axis opacity={ttl ? show : 1} label="điện áp" color={theme.muted} />
        <g opacity={s5}>
          <line x1={AX - 16} y1={vy(5)} x2={AX + 16} y2={vy(5)} stroke={theme.fg} strokeWidth={5} />
          <TextBlock text="5 V" x={AX - 30} y={vy(5) + 14} width={160} fontSize={40} fill={theme.fg} anchor="end" />
        </g>
        <g opacity={low}>
          <rect x={ZX} y={vy(0.8)} width={ZW} height={vy(0) - vy(0.8)} fill={theme.ok} opacity={0.35} />
          <line x1={AX - 16} y1={vy(0.8)} x2={ZX + ZW} y2={vy(0.8)} stroke={theme.ok} strokeWidth={4} />
          <TextBlock text="0,8 V" x={AX - 30} y={vy(0.8) + 14} width={180} fontSize={40} fill={theme.ok} anchor="end" />
          <TextBlock text="0" x={ZX + ZW / 2} y={vy(0.4) + 28} width={200} fontSize={80} fill={theme.fg} />
          <TextBlock text="Mức thấp" x={ZX + ZW + 40} y={vy(0.4) + 14} width={560} fontSize={44} fill={theme.ok} anchor="start" />
        </g>
        <g opacity={high}>
          <rect x={ZX} y={vy(5)} width={ZW} height={vy(2) - vy(5)} fill={theme.accent} opacity={0.3} />
          <line x1={AX - 16} y1={vy(2)} x2={ZX + ZW} y2={vy(2)} stroke={theme.accent} strokeWidth={4} />
          <TextBlock text="2 V" x={AX - 30} y={vy(2) + 14} width={160} fontSize={40} fill={theme.accent} anchor="end" />
          <TextBlock text="1" x={ZX + ZW / 2} y={vy(4.3) + 28} width={200} fontSize={80} fill={theme.fg} />
          <TextBlock text="Mức cao" x={ZX + ZW + 40} y={vy(3.5) + 14} width={560} fontSize={44} fill={theme.accent} anchor="start" />
        </g>
        <g opacity={mid}>
          <rect x={ZX} y={vy(2)} width={ZW} height={vy(0.8) - vy(2)} fill={theme.accent2} opacity={0.18 + 0.12 * Math.sin(f / 6)} />
          <TextBlock text={midName > 0.5 ? "Vùng đệm" : "?"} x={ZX + ZW + 40} y={vy(1.4) + 16} width={560} fontSize={52} fill={theme.accent2} anchor="start" />
        </g>
        {!ttl && (
          <g opacity={sig}>
            <polyline points={trace(sigV, ZX + 20, ZX + ZW - 20)} fill="none" stroke={theme.fg} strokeWidth={7} strokeLinejoin="round" />
            <TextBlock text="vẫn là 1" x={ZX + ZW + 40} y={vy(4.6) + 14} width={560} fontSize={44} fill={theme.fg} anchor="start" />
          </g>
        )}
        {!ttl && <TextBlock text="Thấp hay cao?" x={1440} y={780} width={800} fontSize={60} fill={theme.accent2} opacity={ask} />}
      </Stage>
    );
  }

  if (mode === "muoi-nac") {
    const bands = p(f, at(scene, 0), 20);
    const half = p(f, at(scene, 1));
    const noisy = at(scene, 2);
    const ZX = AX + 10;
    const ZW = 640;
    // Điện áp của số 3 (giữa nấc 1,5..2 V), bị nhiễu đẩy sang nấc 4 sau 40 frame.
    const push = p(f, noisy + 40, 16);
    const v = 1.75 + 0.12 * jitter(f, 0, 0.7) + 0.5 * push;
    const read = Math.min(9, Math.max(0, Math.floor(v / 0.5)));
    const dot = p(f, noisy);
    return (
      <Stage>
        <Axis opacity={1} label="điện áp" color={theme.muted} />
        <line x1={AX - 16} y1={vy(5)} x2={AX + 16} y2={vy(5)} stroke={theme.fg} strokeWidth={5} />
        <TextBlock text="5 V" x={AX - 30} y={vy(5) + 14} width={160} fontSize={40} fill={theme.fg} anchor="end" />
        {Array.from({ length: 10 }, (_, k) => {
          const a = p(f, at(scene, 0) + k * 4, 12);
          const yTop = vy((k + 1) * 0.5);
          const h = vy(k * 0.5) - yTop;
          const hot = dot > 0 && k === read;
          return (
            <g key={k} opacity={a * bands}>
              <rect x={ZX} y={yTop + 2} width={ZW} height={h - 4} fill={hot ? (push > 0.5 ? theme.warn : theme.accent2) : theme.accent} opacity={hot ? 0.85 : k % 2 === 0 ? 0.22 : 0.4} />
              <TextBlock text={String(k)} x={ZX + ZW + 50} y={yTop + h / 2 + 14} width={80} fontSize={40} fill={hot ? theme.accent2 : theme.fg} />
            </g>
          );
        })}
        <g opacity={half}>
          <line x1={ZX + ZW + 110} y1={vy(5) + 4} x2={ZX + ZW + 110} y2={vy(4.5) - 4} stroke={theme.accent2} strokeWidth={6} />
          <TextBlock text="mỗi nấc chỉ khoảng nửa vôn" x={ZX + ZW + 140} y={vy(4.75) + 14} width={600} fontSize={40} fill={theme.accent2} anchor="start" />
        </g>
        <g opacity={dot}>
          <circle cx={ZX + ZW / 2} cy={vy(v)} r={18} fill={theme.fg} />
          <TextBlock text={push > 0.5 ? "Đọc nhầm: 3 thành 4" : "Số 3"} x={ZX + ZW + 140} y={vy(2.6) + 14} width={600} fontSize={52} fill={push > 0.5 ? theme.warn : theme.fg} anchor="start" />
        </g>
      </Stage>
    );
  }

  // flash: 8 mức, mỗi mức một tổ hợp 3 bit.
  const ends = p(f, at(scene, 1));
  const LX = 560;
  const LW = 700;
  const top = 110;
  const h = 78;
  return (
    <Stage>
      <line x1={LX - 60} y1={top + 8 * h} x2={LX - 60} y2={top - 30} stroke={theme.muted} strokeWidth={5} strokeLinecap="round" />
      <polygon points={`${LX - 60},${top - 50} ${LX - 74},${top - 24} ${LX - 46},${top - 24}`} fill={theme.muted} />
      <TextBlock text="mức điện áp" x={LX - 90} y={top + 4 * h} width={360} fontSize={36} fill={theme.muted} anchor="end" weight={400} />
      {Array.from({ length: 8 }, (_, k) => {
        const a = p(f, at(scene, 0) + k * 6, 12);
        const y = top + (7 - k) * h;
        const bitsStr = k.toString(2).padStart(3, "0");
        const end = k === 0 || k === 7;
        const hot = end && ends > 0.5;
        return (
          <g key={k} opacity={a} transform={`translate(${(1 - a) * -30} 0)`}>
            <rect x={LX} y={y + 4} width={LW * (0.3 + (0.7 * k) / 7)} height={h - 8} rx={12} fill={hot ? theme.accent2 : theme.panel} stroke={theme.accent} strokeWidth={3} />
            <TextBlock text={bitsStr} x={LX + LW + 80} y={y + h / 2 + 16} width={200} fontSize={46} fill={hot ? theme.accent2 : theme.fg} anchor="start" />
          </g>
        );
      })}
      <g opacity={ends}>
        <TextBlock text="cao nhất" x={LX + LW + 260} y={top + h / 2 + 14} width={340} fontSize={40} fill={theme.accent2} anchor="start" />
        <TextBlock text="thấp nhất" x={LX + LW + 260} y={top + 7 * h + h / 2 + 14} width={340} fontSize={40} fill={theme.accent2} anchor="start" />
      </g>
    </Stage>
  );
};

// ---- Khung vuông (Short, 840x840): cùng nội dung, bố cục dọc, chữ ≥ 30 px ----

interface Geo {
  ax: number;
  x1: number;
  y0: number;
  y5: number;
}
const vyG = (g: Geo, v: number): number => g.y0 - ((g.y0 - g.y5) * v) / 5;

function traceG(g: Geo, v: (x: number) => number, x0: number, x1: number): string {
  const pts: string[] = [];
  for (let x = x0; x <= x1; x += 8) pts.push(`${x},${vyG(g, v(x)).toFixed(1)}`);
  return pts.join(" ");
}

const AxisSq: React.FC<{ g: Geo; opacity: number; color: string }> = ({ g, opacity, color }) => (
  <g opacity={opacity}>
    <line x1={g.ax} y1={g.y0 + 10} x2={g.ax} y2={g.y5 - 30} stroke={color} strokeWidth={5} strokeLinecap="round" />
    <line x1={g.ax - 10} y1={g.y0} x2={g.x1} y2={g.y0} stroke={color} strokeWidth={5} strokeLinecap="round" />
    <polygon points={`${g.ax},${g.y5 - 50} ${g.ax - 14},${g.y5 - 24} ${g.ax + 14},${g.y5 - 24}`} fill={color} />
    <TextBlock text="điện áp" x={g.ax} y={g.y0 + 60} width={260} fontSize={34} fill={color} weight={400} />
  </g>
);

const DienApSquare: React.FC<SceneProps> = ({ scene }) => {
  const theme = useTheme();
  const f = useCurrentFrame();
  const mode = String(scene.props.mode ?? "nhieu");
  const show = p(f, at(scene, 0));

  if (mode === "nhieu") {
    const g: Geo = { ax: 120, x1: 800, y0: 520, y5: 140 };
    const amp = lerp(0.12, 0.45, p(f, at(scene, 1), 30));
    const causes = ["nhiệt", "dây dẫn bên cạnh", "nguồn điện chập chờn"];
    return (
      <Stage>
        <AxisSq g={g} opacity={show} color={theme.muted} />
        <line x1={g.ax + 20} y1={vyG(g, 3)} x2={g.x1 - 20} y2={vyG(g, 3)} stroke={theme.muted} strokeWidth={4} strokeDasharray="18 14" opacity={show * 0.7} />
        <polyline points={traceG(g, (x) => 3 + amp * jitter(f, x * 1.8), g.ax + 20, g.x1 - 20)} fill="none" stroke={theme.accent} strokeWidth={7} strokeLinejoin="round" opacity={show} />
        {causes.map((c, i) => {
          const a = p(f, at(scene, 1) + i * 22);
          const x = 20 + i * 270;
          return (
            <g key={c} opacity={a} transform={`translate(0 ${(1 - a) * 30})`}>
              <rect x={x} y={630} width={260} height={120} rx={22} fill={theme.panel} stroke={theme.accent2} strokeWidth={4} />
              <TextBlock text={c} x={x + 130} y={680} width={230} fontSize={34} maxLines={2} fill={theme.fg} lineHeight={1.15} />
            </g>
          );
        })}
        <TextBlock text="Nhiễu" x={(g.ax + g.x1) / 2} y={260} width={600} fontSize={110} fill={theme.warn} opacity={p(f, at(scene, 2))} />
      </Stage>
    );
  }

  if (mode === "ttl" || mode === "vung-dem") {
    const g: Geo = { ax: 170, x1: 800, y0: 660, y5: 150 };
    const vy = (v: number) => vyG(g, v);
    const ttl = mode === "ttl";
    const s5 = ttl ? p(f, at(scene, 1)) : 1;
    const low = ttl ? p(f, at(scene, 2)) : 1;
    const high = ttl ? p(f, at(scene, 3)) : 1;
    const mid = ttl ? 0 : p(f, at(scene, 0));
    const midName = ttl ? 0 : p(f, at(scene, 1));
    const sig = ttl ? 0 : p(f, at(scene, 2));
    const ask = ttl ? 0 : p(f, at(scene, 3));
    const ZX = g.ax + 10;
    const ZW = 390;
    const LX = ZX + ZW + 24; // chữ nhãn vùng
    const dip = (x: number) => 1.0 * Math.exp(-(((x - ZX - 40 - ((f * 3) % (ZW - 80))) / 45) ** 2));
    const sigV = (x: number) => 3.6 + 0.25 * jitter(f, x * 2, 1.3) - dip(x);
    return (
      <Stage>
        <AxisSq g={g} opacity={ttl ? show : 1} color={theme.muted} />
        <g opacity={s5}>
          <line x1={g.ax - 16} y1={vy(5)} x2={g.ax + 16} y2={vy(5)} stroke={theme.fg} strokeWidth={5} />
          <TextBlock text="5 V" x={g.ax - 26} y={vy(5) + 12} width={130} fontSize={34} fill={theme.fg} anchor="end" />
        </g>
        <g opacity={low}>
          <rect x={ZX} y={vy(0.8)} width={ZW} height={vy(0) - vy(0.8)} fill={theme.ok} opacity={0.35} />
          <line x1={g.ax - 16} y1={vy(0.8)} x2={ZX + ZW} y2={vy(0.8)} stroke={theme.ok} strokeWidth={4} />
          <TextBlock text="0,8 V" x={g.ax - 26} y={vy(0.8) + 12} width={140} fontSize={34} fill={theme.ok} anchor="end" />
          <TextBlock text="0" x={ZX + ZW / 2} y={vy(0.4) + 24} width={160} fontSize={64} fill={theme.fg} />
          <TextBlock text="Mức thấp" x={LX} y={vy(0.4) + 12} width={230} fontSize={40} fill={theme.ok} anchor="start" />
        </g>
        <g opacity={high}>
          <rect x={ZX} y={vy(5)} width={ZW} height={vy(2) - vy(5)} fill={theme.accent} opacity={0.3} />
          <line x1={g.ax - 16} y1={vy(2)} x2={ZX + ZW} y2={vy(2)} stroke={theme.accent} strokeWidth={4} />
          <TextBlock text="2 V" x={g.ax - 26} y={vy(2) + 12} width={130} fontSize={34} fill={theme.accent} anchor="end" />
          <TextBlock text="1" x={ZX + ZW / 2} y={vy(4.3) + 24} width={160} fontSize={64} fill={theme.fg} />
          <TextBlock text="Mức cao" x={LX} y={vy(3.5) + 12} width={230} fontSize={40} fill={theme.accent} anchor="start" />
        </g>
        <g opacity={mid}>
          <rect x={ZX} y={vy(2)} width={ZW} height={vy(0.8) - vy(2)} fill={theme.accent2} opacity={0.18 + 0.12 * Math.sin(f / 6)} />
          <TextBlock text={midName > 0.5 ? "Vùng đệm" : "?"} x={LX} y={vy(1.4) + 14} width={230} fontSize={44} fill={theme.accent2} anchor="start" />
        </g>
        {!ttl && (
          <g opacity={sig}>
            <polyline points={traceG(g, sigV, ZX + 20, ZX + ZW - 20)} fill="none" stroke={theme.fg} strokeWidth={7} strokeLinejoin="round" />
            <TextBlock text="vẫn là 1" x={LX} y={vy(4.6) + 12} width={230} fontSize={40} fill={theme.fg} anchor="start" />
          </g>
        )}
        {!ttl && <TextBlock text="Thấp hay cao?" x={600} y={800} width={420} fontSize={52} fill={theme.accent2} opacity={ask} />}
      </Stage>
    );
  }

  if (mode === "muoi-nac") {
    const g: Geo = { ax: 170, x1: 620, y0: 660, y5: 140 };
    const vy = (v: number) => vyG(g, v);
    const bands = p(f, at(scene, 0), 20);
    const half = p(f, at(scene, 1));
    const noisy = at(scene, 2);
    const ZX = g.ax + 10;
    const ZW = 360;
    const push = p(f, noisy + 40, 16);
    const v = 1.75 + 0.12 * jitter(f, 0, 0.7) + 0.5 * push;
    const read = Math.min(9, Math.max(0, Math.floor(v / 0.5)));
    const dot = p(f, noisy);
    return (
      <Stage>
        <AxisSq g={g} opacity={1} color={theme.muted} />
        <line x1={g.ax - 16} y1={vy(5)} x2={g.ax + 16} y2={vy(5)} stroke={theme.fg} strokeWidth={5} />
        <TextBlock text="5 V" x={g.ax - 26} y={vy(5) + 12} width={130} fontSize={34} fill={theme.fg} anchor="end" />
        {Array.from({ length: 10 }, (_, k) => {
          const a = p(f, at(scene, 0) + k * 4, 12);
          const yTop = vy((k + 1) * 0.5);
          const h = vy(k * 0.5) - yTop;
          const hot = dot > 0 && k === read;
          return (
            <g key={k} opacity={a * bands}>
              <rect x={ZX} y={yTop + 2} width={ZW} height={h - 4} fill={hot ? (push > 0.5 ? theme.warn : theme.accent2) : theme.accent} opacity={hot ? 0.85 : k % 2 === 0 ? 0.22 : 0.4} />
              <TextBlock text={String(k)} x={ZX + ZW + 36} y={yTop + h / 2 + 11} width={60} fontSize={32} fill={hot ? theme.accent2 : theme.fg} />
            </g>
          );
        })}
        <g opacity={half}>
          <line x1={ZX + ZW + 76} y1={vy(5) + 4} x2={ZX + ZW + 76} y2={vy(4.5) - 4} stroke={theme.accent2} strokeWidth={6} />
          <TextBlock text="mỗi nấc chỉ khoảng nửa vôn" x={420} y={800} width={600} fontSize={36} fill={theme.accent2} />
        </g>
        <g opacity={dot}>
          <circle cx={ZX + ZW / 2} cy={vy(v)} r={16} fill={theme.fg} />
          <TextBlock text={push > 0.5 ? "Đọc nhầm: 3 thành 4" : "Số 3"} x={ZX + ZW + 100} y={vy(2.6) + 12} width={200} fontSize={40} maxLines={2} fill={push > 0.5 ? theme.warn : theme.fg} anchor="start" lineHeight={1.15} />
        </g>
      </Stage>
    );
  }

  // flash: 8 mức, mỗi mức một tổ hợp 3 bit.
  const ends = p(f, at(scene, 1));
  const AXX = 50;
  const LX = 80;
  const LW = 420;
  const top = 120;
  const h = 80;
  return (
    <Stage>
      <line x1={AXX} y1={top + 8 * h} x2={AXX} y2={top - 30} stroke={theme.muted} strokeWidth={5} strokeLinecap="round" />
      <polygon points={`${AXX},${top - 50} ${AXX - 14},${top - 24} ${AXX + 14},${top - 24}`} fill={theme.muted} />
      <TextBlock text="mức điện áp" x={AXX + 30} y={top - 40} width={400} fontSize={34} fill={theme.muted} anchor="start" weight={400} />
      {Array.from({ length: 8 }, (_, k) => {
        const a = p(f, at(scene, 0) + k * 6, 12);
        const y = top + (7 - k) * h;
        const bitsStr = k.toString(2).padStart(3, "0");
        const end = k === 0 || k === 7;
        const hot = end && ends > 0.5;
        return (
          <g key={k} opacity={a} transform={`translate(${(1 - a) * -30} 0)`}>
            <rect x={LX} y={y + 4} width={LW * (0.3 + (0.7 * k) / 7)} height={h - 8} rx={12} fill={hot ? theme.accent2 : theme.panel} stroke={theme.accent} strokeWidth={3} />
            <TextBlock text={bitsStr} x={LX + LW + 30} y={y + h / 2 + 15} width={120} fontSize={44} fill={hot ? theme.accent2 : theme.fg} anchor="start" />
          </g>
        );
      })}
      <g opacity={ends}>
        <TextBlock text="cao nhất" x={LX + LW + 160} y={top + h / 2 + 13} width={180} fontSize={36} fill={theme.accent2} anchor="start" />
        <TextBlock text="thấp nhất" x={LX + LW + 160} y={top + 7 * h + h / 2 + 13} width={180} fontSize={36} fill={theme.accent2} anchor="start" />
      </g>
    </Stage>
  );
};
