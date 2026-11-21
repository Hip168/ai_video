import React from "react";
import { useCurrentFrame } from "remotion";
import { useTheme } from "../../lib/hooks";
import { Stage } from "../../lib/theme";
import type { SceneProps } from "../../lib/types";
import { at, Human, lerp, modeOf, p, Robot, Txt, useGeom } from "./common";

/**
 * Thanh so người với máy trên thang 0–100%.
 * - `giai`: beat 0 nhóm ETH Zürich cho máy giải câu đố ảnh reCAPTCHA v2; beat 1 máy giải 100%, nghiên cứu trước 68–71%;
 *           beat 2 số câu đố máy phải giải để qua không khác người là mấy.
 * - `dung`: beat 0 người đúng 50–85% (nghiên cứu 2023); beat 1 máy trong các cuộc tấn công trước: 85–100%, đa số trên 96%.
 */
export const NguoiMay: React.FC<SceneProps> = ({ scene }) => {
  const mode = modeOf(scene.props, "giai");
  return <Stage>{mode === "dung" ? <Dung scene={scene} /> : <Giai scene={scene} />}</Stage>;
};

interface Bar {
  who: "nguoi" | "may";
  name: string;
  lo: number;
  hi: number;
  label: string;
  on: number;
  color: string;
}

const Bars: React.FC<{ bars: Bar[]; top: number }> = ({ bars, top }) => {
  const t = useTheme();
  const { sq } = useGeom();
  const x0 = sq ? 170 : 420;
  const x1 = sq ? 780 : 1700;
  const X = (v: number) => lerp(x0, x1, v / 100);
  const rowH = sq ? 170 : 200;
  return (
    <g>
      {[0, 50, 100].map((v) => (
        <g key={v}>
          <line x1={X(v)} y1={top - 20} x2={X(v)} y2={top + bars.length * rowH - 50} stroke={t.muted} strokeWidth={2} strokeDasharray="6 8" opacity={0.6} />
          <Txt text={`${v}%`} x={X(v)} y={top - 32} w={140} s={sq ? 30 : 34} fill={t.muted} weight={400} />
        </g>
      ))}
      {bars.map((b, i) => {
        const y = top + i * rowH;
        return (
          <g key={i} opacity={b.on}>
            {b.who === "nguoi" ? <Human x={sq ? 90 : 230} y={y + 40} s={sq ? 90 : 110} fill={t.panel} line={b.color} /> : <Robot x={sq ? 90 : 230} y={y + 40} s={sq ? 90 : 110} fill={t.panel} line={b.color} />}
            <rect x={x0} y={y + 10} width={x1 - x0} height={sq ? 50 : 60} rx={12} fill={t.panel} />
            <rect x={X(b.lo)} y={y + 10} width={Math.max(14, X(b.hi) - X(b.lo))} height={sq ? 50 : 60} rx={12} fill={b.color} />
            <Txt text={`${b.name}: ${b.label}`} x={x0} y={y + (sq ? 100 : 130)} w={x1 - x0} s={sq ? 32 : 42} fill={b.color} anchor="start" lines={2} />
          </g>
        );
      })}
    </g>
  );
};

const Giai: React.FC<SceneProps> = ({ scene }) => {
  const t = useTheme();
  const f = useCurrentFrame();
  const { sq } = useGeom();
  const t1 = at(scene, 1);
  const t2 = at(scene, 2);
  const a1 = p(f, t1, 14);
  return (
    <g>
      <Txt text="ETH Zürich cho máy giải câu đố ảnh reCAPTCHA v2" x={sq ? 420 : 960} y={sq ? 60 : 80} w={sq ? 760 : 1600} s={sq ? 34 : 46} fill={t.fg} lines={2} />
      <Bars
        top={sq ? 230 : 240}
        bars={[
          { who: "may", name: "Máy, nhóm ETH Zürich", lo: 0, hi: 100, label: "100%", on: a1, color: t.accent },
          { who: "may", name: "Nghiên cứu trước", lo: 0, hi: 70, label: "68–71%", on: p(f, t1 + 14, 14), color: t.muted },
        ]}
      />
      <g opacity={p(f, t2, 14)}>
        <Txt text="số câu đố phải giải để qua: không khác người là mấy" x={sq ? 420 : 960} y={sq ? 640 : 700} w={sq ? 760 : 1500} s={sq ? 32 : 42} fill={t.accent2} lines={2} />
      </g>
    </g>
  );
};

const Dung: React.FC<SceneProps> = ({ scene }) => {
  const t = useTheme();
  const f = useCurrentFrame();
  const { sq } = useGeom();
  const t1 = at(scene, 1);
  return (
    <g>
      <Txt text="Tỉ lệ giải đúng CAPTCHA" x={sq ? 420 : 960} y={sq ? 60 : 80} w={sq ? 760 : 1400} s={sq ? 38 : 50} fill={t.fg} />
      <Bars
        top={sq ? 200 : 220}
        bars={[
          { who: "nguoi", name: "Người", lo: 50, hi: 85, label: "50–85%", on: 1, color: t.accent2 },
          { who: "may", name: "Máy, các nghiên cứu trước", lo: 85, hi: 100, label: "85–100%, đa số trên 96%", on: p(f, t1, 14), color: t.accent },
        ]}
      />
    </g>
  );
};
