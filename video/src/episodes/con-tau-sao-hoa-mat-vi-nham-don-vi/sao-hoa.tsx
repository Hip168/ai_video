import React from "react";
import { useCurrentFrame } from "remotion";
import { useTheme } from "../../lib/hooks";
import { Stage } from "../../lib/theme";
import { monoStyle, TextBlock } from "../../lib/b-kit";
import type { SceneProps } from "../../lib/types";
import { Arrow, at, clamp01, lerp, Mars, modeOf, p, Ship, useGeom } from "./common";

const D2R = Math.PI / 180;

/** Điểm trên quỹ đạo elip (nhìn từ Trái Đất, nghiêng): sin(a) < 0 là phía sau hành tinh. */
function orbitPt(cx: number, cy: number, rx: number, ry: number, a: number): { x: number; y: number; back: boolean } {
  return { x: cx + rx * Math.cos(a * D2R), y: cy + ry * Math.sin(a * D2R), back: Math.sin(a * D2R) < 0 };
}

/** Góc (độ, âm) mà tàu trên elip bán trục `rx` vừa khuất sau đĩa bán kính `r`. */
const hideAngle = (r: number, rx: number): number => -Math.acos(Math.min(1, r / rx)) / D2R;

/** Nửa elip phía sau (vẽ trước hành tinh) hoặc phía trước (vẽ sau). */
function halfOrbit(cx: number, cy: number, rx: number, ry: number, back: boolean): string {
  return back ? `M${cx - rx} ${cy} A ${rx} ${ry} 0 0 1 ${cx + rx} ${cy}` : `M${cx + rx} ${cy} A ${rx} ${ry} 0 0 1 ${cx - rx} ${cy}`;
}

/** Vòng sóng tín hiệu nở ra quanh tàu (phát mỗi 14 frame, có từ frame âm để frame 0 đã có sóng). */
const Waves: React.FC<{ x: number; y: number; f: number; until: number; color: string; scale: number }> = ({ x, y, f, until, color, scale }) => {
  const out: React.ReactNode[] = [];
  const life = 42;
  for (let k = Math.floor((f - life) / 14); k <= Math.floor(f / 14); k++) {
    const e = k * 14;
    if (e > until) continue;
    const age = f - e;
    if (age < 0 || age > life) continue;
    out.push(<circle key={k} cx={x} cy={y} r={(20 + age * 2.2) * scale} fill="none" stroke={color} strokeWidth={4} opacity={0.8 * (1 - age / life)} />);
  }
  return <g>{out}</g>;
};

/** Ngọn lửa động cơ (chiều dài dao động theo frame). */
const Flame: React.FC<{ x: number; y: number; s: number; f: number; color: string; core: string }> = ({ x, y, s, f, color, core }) => {
  const len = s * (1.1 + 0.25 * Math.sin(f * 0.9) + 0.15 * Math.sin(f * 2.3));
  return (
    <g transform={`translate(${x} ${y})`}>
      <polygon points={`${-s * 0.28},0 ${s * 0.28},0 0,${len}`} fill={color} />
      <polygon points={`${-s * 0.13},0 ${s * 0.13},0 0,${len * 0.55}`} fill={core} />
    </g>
  );
};

/**
 * Con tàu bay vòng ra sau Sao Hỏa (nhìn từ phía Trái Đất).
 * mode "khuat" (3 beat): theo kế hoạch tạm khuất rồi quay lại; tắt sớm 49 giây; không quay lại.
 * mode "dot" (2 beat): 09:00:46 động cơ chính đốt; khoảng 4 phút sau tàu khuất.
 * mode "som" (2 beat): khuất sớm hơn lịch 49 giây; vì tàu đi thấp hơn, sát hành tinh hơn.
 */
export const SaoHoa: React.FC<SceneProps> = ({ scene }) => {
  const theme = useTheme();
  const f = useCurrentFrame();
  const { W, H, sq } = useGeom();
  const mode = modeOf(scene.props, "khuat");
  const t1 = at(scene, 1);
  const t2 = at(scene, 2);
  const r = sq ? 120 : 200;
  const mcx = sq ? W / 2 : W * 0.66;
  const mcy = sq ? 330 : H * 0.47;
  const rx = r * 1.7;
  const ry = r * 0.34;
  const shipS = sq ? 34 : 46;
  const scale = sq ? 0.75 : 1;
  const dash = `${18 * scale} ${14 * scale}`;
  const dashOff = -f * 1.2;

  // Chữ: cột trái (khung ngang) hoặc dải dưới (khung vuông).
  const tx = sq ? W / 2 : 80;
  const tw = sq ? W - 60 : 780;
  const anchor = sq ? "middle" : "start";
  const ty0 = sq ? 560 : 150;

  const orbitBack = (rxx: number, ryy: number, color: string, dashed: boolean, op = 1) => (
    <path d={halfOrbit(mcx, mcy, rxx, ryy, true)} fill="none" stroke={color} strokeWidth={4} strokeDasharray={dashed ? dash : undefined} strokeDashoffset={dashOff} opacity={op} />
  );
  const orbitFront = (rxx: number, ryy: number, color: string, dashed: boolean, op = 1) => (
    <path d={halfOrbit(mcx, mcy, rxx, ryy, false)} fill="none" stroke={color} strokeWidth={4} strokeDasharray={dashed ? dash : undefined} strokeDashoffset={dashOff} opacity={op} />
  );

  if (mode === "som") {
    // Hai quỹ đạo: kế hoạch (cao, nét đứt) và thực tế (thấp). Cùng tốc độ góc, tàu thật khuất trước. Lặp lại.
    const rxP = r * 1.95;
    const ryP = r * 0.42;
    const rxA = r * 1.3;
    const ryA = r * 0.26;
    const a0 = 50;
    const hideA = hideAngle(r, rxA);
    const hideP = hideAngle(r, rxP);
    const period = 150;
    const ph = ((f % period) + period) % period;
    const w = (a0 - hideP + 25) / 110;
    const ang = a0 - w * ph;
    const real = orbitPt(mcx, mcy, rxA, ryA, ang);
    const ghost = orbitPt(mcx, mcy, rxP, ryP, ang);
    const realGone = ang < hideA;
    const ghostGone = ang < hideP;
    const lowP = p(f, t1, 16);
    const legX = sq ? 120 : 80;
    const legY = sq ? 790 : 470;
    const legX2 = sq ? 470 : 80;
    const legY2 = sq ? 790 : 530;
    const arrFrom = orbitPt(mcx, mcy, rxP, ryP, 150);
    const arrTo = orbitPt(mcx, mcy, rxA, ryA, 150);
    const ship = (pt: { x: number; y: number }, gone: boolean, ghostly: boolean) =>
      gone ? null : <Ship x={pt.x} y={pt.y} s={shipS * (ghostly ? 0.85 : 1)} body={ghostly ? theme.panel : theme.fg} panel={ghostly ? theme.panel : theme.accent} line={ghostly ? theme.muted : theme.bg} opacity={ghostly ? 0.8 : 1} />;
    return (
      <Stage>
        {orbitBack(rxP, ryP, theme.muted, true)}
        {orbitBack(rxA, ryA, theme.accent, false)}
        {ghost.back && ship(ghost, ghostGone, true)}
        {real.back && ship(real, realGone, false)}
        <Mars cx={mcx} cy={mcy} r={r} />
        {orbitFront(rxP, ryP, theme.muted, true)}
        {orbitFront(rxA, ryA, theme.accent, false)}
        {!ghost.back && ship(ghost, ghostGone, true)}
        {!real.back && ship(real, realGone, false)}
        <TextBlock text="Khuất sớm hơn lịch 49 giây" x={tx} y={ty0} width={tw} fontSize={sq ? 44 : 62} fill={theme.accent2} anchor={anchor} />
        {/* Chú thích hai quỹ đạo */}
        <g>
          <line x1={legX} y1={legY} x2={legX + 70} y2={legY} stroke={theme.muted} strokeWidth={5} strokeDasharray="14 10" />
          <TextBlock text="dự kiến" x={legX + 86} y={legY + 12} width={260} fontSize={sq ? 30 : 38} fill={theme.muted} anchor="start" weight={400} />
          <line x1={legX2} y1={legY2} x2={legX2 + 70} y2={legY2} stroke={theme.accent} strokeWidth={5} />
          <TextBlock text="thực tế" x={legX2 + 86} y={legY2 + 12} width={260} fontSize={sq ? 30 : 38} fill={theme.accent} anchor="start" weight={400} />
        </g>
        <g opacity={lowP}>
          <TextBlock
            text="Tàu đi thấp hơn, sát mặt Sao Hỏa hơn dự tính"
            x={tx}
            y={ty0 + (sq ? 70 : 110)}
            width={tw}
            fontSize={sq ? 36 : 48}
            maxLines={2}
            fill={theme.fg}
            anchor={anchor}
            weight={400}
          />
          <Arrow x1={arrFrom.x} y1={arrFrom.y} x2={arrTo.x} y2={arrTo.y} color={theme.warn} w={6} head={20} />
        </g>
      </Stage>
    );
  }

  // khuat / dot: một quỹ đạo, tàu khuất rồi không ra nữa.
  const hideAt = mode === "dot" ? t1 + 14 : t1 + 10;
  const a0 = 62;
  const aH = hideAngle(r, rx);
  const w = (a0 - aH) / Math.max(1, hideAt);
  const ang = a0 - w * f;
  const pt = orbitPt(mcx, mcy, rx, ry, ang);
  const visible = ang >= aH;
  const lost = ang < aH;
  const lostP = p(f, hideAt, 10);
  const shipEl = visible ? (
    <g>
      {mode === "dot" && <Flame x={pt.x - shipS * 0.1} y={pt.y + shipS * 0.5} s={shipS} f={f} color={theme.accent2} core={theme.fg} />}
      <Ship x={pt.x} y={pt.y} s={shipS} body={theme.fg} panel={theme.accent} line={theme.bg} />
    </g>
  ) : null;
  // Chỗ lẽ ra tàu ló ra (bờ trái hành tinh) — chỉ để chờ, có dấu hỏi ở beat cuối.
  const reappear = orbitPt(mcx, mcy, rx, ry, -Math.acos(-(r + (sq ? 34 : 50)) / rx) / D2R);
  return (
    <Stage>
      {orbitBack(rx, ry, theme.muted, true, 0.9)}
      {pt.back && shipEl}
      <Mars cx={mcx} cy={mcy} r={r} />
      {orbitFront(rx, ry, theme.muted, true, 0.9)}
      {!pt.back && shipEl}
      {visible && mode === "khuat" && <Waves x={pt.x} y={pt.y} f={f} until={hideAt} color={theme.accent} scale={scale} />}
      {visible && mode === "dot" && <Waves x={pt.x} y={pt.y} f={f} until={hideAt} color={theme.accent} scale={scale * 0.8} />}
      {/* Mất tín hiệu ở bờ phải hành tinh */}
      {lost && (
        <g opacity={lostP}>
          <circle cx={mcx + r + 6} cy={mcy - ry * 0.8} r={sq ? 22 : 28} fill={theme.warn} />
          <text x={mcx + r + 6} y={mcy - ry * 0.8 + (sq ? 11 : 14)} fontSize={sq ? 34 : 42} fontWeight={700} fill={theme.bg} textAnchor="middle">
            ×
          </text>
          <TextBlock text="mất tín hiệu" x={mcx + r + (sq ? 36 : 46)} y={mcy - ry * 0.8 + (sq ? 11 : 14)} width={sq ? W - (mcx + r + 40) : 360} fontSize={sq ? 30 : 40} fill={theme.warn} anchor="start" />
        </g>
      )}

      {mode === "khuat" ? (
        <>
          <TextBlock text="Theo kế hoạch" x={tx} y={ty0} width={tw} fontSize={sq ? 36 : 44} fill={theme.muted} anchor={anchor} weight={400} />
          <TextBlock
            text="Khuất sau Sao Hỏa, tạm mất tín hiệu, rồi quay lại"
            x={tx}
            y={ty0 + (sq ? 50 : 70)}
            width={tw}
            fontSize={sq ? 38 : 54}
            maxLines={2}
            fill={theme.fg}
            anchor={anchor}
          />
          {/* Trục thời gian: dự kiến và thực tế (beat 1) */}
          <TimeBar
            x0={sq ? 70 : 90}
            x1={sq ? W - 70 : 860}
            y={sq ? 745 : 560}
            f={f}
            from={t1}
            sq={sq}
            colors={{ line: theme.muted, plan: theme.fg, real: theme.warn, text: theme.accent2 }}
          />
          <g opacity={p(f, t2, 14)}>
            <circle cx={reappear.x} cy={reappear.y} r={sq ? 26 : 34} fill="none" stroke={theme.muted} strokeWidth={4} strokeDasharray="8 8" strokeDashoffset={-f} />
            <text x={reappear.x} y={reappear.y + (sq ? 12 : 15)} fontSize={sq ? 36 : 44} fontWeight={700} fill={theme.muted} textAnchor="middle">
              ?
            </text>
            <TextBlock text="Không bao giờ quay lại" x={tx} y={sq ? 70 : 720} width={tw} fontSize={sq ? 44 : 60} fill={theme.warn} anchor={anchor} />
          </g>
        </>
      ) : (
        <>
          <text x={sq ? W / 2 : tx} y={ty0 + (sq ? 0 : 20)} fontSize={sq ? 64 : 96} fontWeight={700} fill={theme.accent2} textAnchor={anchor} style={monoStyle}>
            09:00:46
          </text>
          <TextBlock text="giờ quốc tế: động cơ chính bắt đầu đốt" x={tx} y={ty0 + (sq ? 56 : 100)} width={tw} fontSize={sq ? 34 : 46} maxLines={2} fill={theme.fg} anchor={anchor} weight={400} />
          <g opacity={p(f, t1, 14)}>
            <TextBlock text="Khoảng bốn phút sau: tàu khuất sau Sao Hỏa" x={tx} y={sq ? 790 : 420} width={tw} fontSize={sq ? 36 : 50} maxLines={2} fill={theme.accent} anchor={anchor} />
          </g>
        </>
      )}
    </Stage>
  );
};

/** Trục thời gian ngắn: mốc "dự kiến" và mốc "thực tế" sớm hơn 49 giây (không theo tỉ lệ). */
const TimeBar: React.FC<{ x0: number; x1: number; y: number; f: number; from: number; sq: boolean; colors: { line: string; plan: string; real: string; text: string } }> = ({
  x0,
  x1,
  y,
  f,
  from,
  sq,
  colors,
}) => {
  const a = p(f, from, 14);
  const b = p(f, from + 12, 16);
  const xPlan = lerp(x0, x1, 0.78);
  const xReal = lerp(x0, x1, 0.38);
  const fs = sq ? 32 : 38;
  return (
    <g opacity={a}>
      <line x1={x0} y1={y} x2={x1} y2={y} stroke={colors.line} strokeWidth={5} />
      <polygon points={`${x1 + 18},${y} ${x1},${y - 11} ${x1},${y + 11}`} fill={colors.line} />
      <circle cx={xPlan} cy={y} r={13} fill={colors.plan} />
      <TextBlock text="dự kiến tắt" x={xPlan} y={y - 28} width={260} fontSize={fs} fill={colors.plan} weight={400} />
      <g opacity={b}>
        <circle cx={xReal} cy={y} r={13} fill={colors.real} />
        <TextBlock text="tắt thật" x={xReal} y={y - 28} width={260} fontSize={fs} fill={colors.real} weight={400} />
        <path d={`M${xReal} ${y + 26} V${y + 40} H${lerp(xReal, xPlan, clamp01(b))} V${y + 26}`} fill="none" stroke={colors.text} strokeWidth={5} />
        <TextBlock text="sớm hơn 49 giây" x={(xReal + xPlan) / 2} y={y + (sq ? 78 : 86)} width={460} fontSize={sq ? 36 : 44} fill={colors.text} />
      </g>
    </g>
  );
};
