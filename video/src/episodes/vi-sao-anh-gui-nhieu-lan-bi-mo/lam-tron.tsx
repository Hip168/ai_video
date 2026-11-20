import React from "react";
import { useCurrentFrame } from "remotion";
import { useTheme } from "../../lib/hooks";
import { Stage } from "../../lib/theme";
import type { SceneProps } from "../../lib/types";
import { at, lerp, modeOf, p, Txt, useGeom } from "./common";

const fmt = (v: number) => String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ".");

/**
 * Làm tròn giá tiền trên trục số (ví dụ của lời đọc).
 * - `mot`: beat 0 ba giá 12.400, 12.300, 11.600; beat 1 làm tròn tới nghìn, cả ba thành 12.000 (mức làm tròn: một nghìn);
 *          beat 2 chỉ biết 12.000 thì không đoán lại được giá gốc, phần lẻ mất hẳn.
 * - `hai`: beat 0 12.400 làm tròn tới nghìn thành 12.000; beat 1 nơi khác làm tròn tới năm nghìn: thành 10.000; beat 2 lệch thêm, xa giá gốc hơn.
 */
export const LamTron: React.FC<SceneProps> = ({ scene }) => {
  const mode = modeOf(scene.props, "mot");
  return <Stage>{mode === "hai" ? <Hai scene={scene} /> : <Mot scene={scene} />}</Stage>;
};

const Axis: React.FC<{ lo: number; hi: number; step: number; x0: number; x1: number; y: number; s: number }> = ({ lo, hi, step, x0, x1, y, s }) => {
  const t = useTheme();
  const X = (v: number) => lerp(x0, x1, (v - lo) / (hi - lo));
  const ticks: number[] = [];
  for (let v = lo; v <= hi; v += step) ticks.push(v);
  return (
    <g>
      <line x1={x0 - 20} y1={y} x2={x1 + 20} y2={y} stroke={t.muted} strokeWidth={5} strokeLinecap="round" />
      {ticks.map((v) => (
        <g key={v}>
          <line x1={X(v)} y1={y - 16} x2={X(v)} y2={y + 16} stroke={t.muted} strokeWidth={4} />
          <Txt text={fmt(v)} x={X(v)} y={y + s + 26} w={s * 5} s={s} fill={t.muted} weight={400} />
        </g>
      ))}
    </g>
  );
};

const Tag: React.FC<{ x: number; y: number; text: string; color: string; s: number; w: number }> = ({ x, y, text, color, s, w }) => {
  const t = useTheme();
  return (
    <g>
      <rect x={x - w / 2} y={y - s * 1.05} width={w} height={s * 1.5} rx={s * 0.4} fill={color} />
      <polygon points={`${x - 12},${y + s * 0.45} ${x + 12},${y + s * 0.45} ${x},${y + s * 0.45 + 16}`} fill={color} />
      <Txt text={text} x={x} y={y} w={w - 16} s={s} fill={t.bg} />
    </g>
  );
};

const Mot: React.FC<SceneProps> = ({ scene }) => {
  const t = useTheme();
  const f = useCurrentFrame();
  const { sq } = useGeom();
  const t1 = at(scene, 1);
  const t2 = at(scene, 2);
  const go = p(f, t1 + 6, 24);
  const a2 = p(f, t2, 14);
  const lo = 11000;
  const hi = 13000;
  const x0 = sq ? 90 : 220;
  const x1 = sq ? 750 : 1700;
  const ay = sq ? 470 : 520;
  const X = (v: number) => lerp(x0, x1, (v - lo) / (hi - lo));
  const prices = [12400, 12300, 11600];
  const s = sq ? 34 : 46;
  const tw = sq ? 160 : 230;
  const rows = sq ? [130, 240, 350] : [170, 290, 410];
  return (
    <g>
      <Txt text="giá tiền trên trục số" x={sq ? 420 : 960} y={sq ? 56 : 70} w={sq ? 760 : 1200} s={sq ? 36 : 46} fill={t.fg} />
      <Axis lo={lo} hi={hi} step={1000} x0={x0} x1={x1} y={ay} s={sq ? 30 : 38} />
      {prices.map((v, i) => {
        const x = lerp(X(v), X(12000), go);
        const y = lerp(rows[i], ay - (sq ? 40 : 50) - i * (sq ? 6 : 8), go);
        return (
          <g key={i} opacity={go >= 1 && i > 0 ? 0 : 1}>
            <line x1={X(v)} y1={rows[i] + 20} x2={X(v)} y2={ay} stroke={t.accent} strokeWidth={2} strokeDasharray="6 6" opacity={1 - go} />
            <Tag x={x} y={y} text={go >= 1 ? fmt(12000) : fmt(v)} color={go >= 1 ? t.accent2 : t.accent} s={s} w={tw} />
          </g>
        );
      })}
      <g opacity={p(f, t1, 12)}>
        <Txt text="làm tròn tới nghìn: mức làm tròn là một nghìn" x={sq ? 420 : 960} y={sq ? 610 : 680} w={sq ? 780 : 1400} s={sq ? 32 : 42} fill={t.accent2} lines={2} />
      </g>
      <g opacity={a2}>
        <rect x={sq ? 40 : 460} y={sq ? 690 : 720} width={sq ? 760 : 1000} height={sq ? 110 : 90} rx={22} fill={t.warn} />
        <Txt text="không đoán lại được giá gốc: phần lẻ đã mất" x={sq ? 420 : 960} y={sq ? 735 : 778} w={sq ? 720 : 960} s={sq ? 32 : 42} fill={t.bg} lines={2} />
      </g>
    </g>
  );
};

const Hai: React.FC<SceneProps> = ({ scene }) => {
  const t = useTheme();
  const f = useCurrentFrame();
  const { sq } = useGeom();
  const t1 = at(scene, 1);
  const t2 = at(scene, 2);
  const g1 = p(f, 20, 22);
  const g2 = p(f, t1 + 10, 22);
  const a2 = p(f, t2, 14);
  const lo = 9000;
  const hi = 13000;
  const x0 = sq ? 90 : 220;
  const x1 = sq ? 750 : 1700;
  const ay = sq ? 430 : 470;
  const X = (v: number) => lerp(x0, x1, (v - lo) / (hi - lo));
  const s = sq ? 34 : 46;
  const tw = sq ? 160 : 230;
  const v = g2 > 0 ? 10000 : g1 > 0 ? 12000 : 12400;
  const x = g2 > 0 ? lerp(X(12000), X(10000), g2) : lerp(X(12400), X(12000), g1);
  return (
    <g>
      <Axis lo={lo} hi={hi} step={1000} x0={x0} x1={x1} y={ay} s={sq ? 30 : 38} />
      {/* giá gốc giữ lại để so */}
      <circle cx={X(12400)} cy={ay} r={12} fill={t.ok} />
      <Txt text="giá gốc" x={X(12400)} y={ay - (sq ? 170 : 200)} w={200} s={sq ? 30 : 36} fill={t.ok} />
      <line x1={X(12400)} y1={ay - (sq ? 150 : 180)} x2={X(12400)} y2={ay - 14} stroke={t.ok} strokeWidth={3} strokeDasharray="6 6" />
      <Tag x={x} y={ay - (sq ? 50 : 60)} text={fmt(v)} color={g2 > 0 ? t.warn : g1 > 0 ? t.accent2 : t.accent} s={s} w={tw} />
      <g opacity={g1}>
        <Txt text="lần 1: làm tròn tới nghìn" x={sq ? 420 : 960} y={sq ? 80 : 90} w={sq ? 760 : 1200} s={sq ? 34 : 44} fill={t.accent2} />
      </g>
      <g opacity={p(f, t1, 12)}>
        <Txt text="lần sau, nơi khác: làm tròn tới năm nghìn" x={sq ? 420 : 960} y={sq ? 140 : 160} w={sq ? 780 : 1300} s={sq ? 34 : 44} fill={t.warn} />
      </g>
      <g opacity={a2}>
        <rect x={X(10000)} y={ay + (sq ? 80 : 90)} width={X(12400) - X(10000)} height={sq ? 24 : 30} rx={10} fill={t.warn} opacity={0.8} />
        <Txt text="lệch thêm, xa giá gốc hơn" x={(X(10000) + X(12400)) / 2} y={ay + (sq ? 150 : 170)} w={sq ? 600 : 900} s={sq ? 34 : 44} fill={t.warn} />
        <Txt text="mỗi lần đổi mức làm tròn là một lần lệch thêm" x={sq ? 420 : 960} y={sq ? 720 : 760} w={sq ? 780 : 1400} s={sq ? 32 : 42} fill={t.fg} lines={2} />
      </g>
    </g>
  );
};
