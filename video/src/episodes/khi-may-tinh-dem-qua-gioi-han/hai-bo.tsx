import React from "react";
import { useCurrentFrame } from "remotion";
import { useTheme } from "../../lib/hooks";
import { Stage } from "../../lib/theme";
import { TextBlock } from "../../lib/b-kit";
import type { SceneProps } from "../../lib/types";
import { at, lerp, p, useGeom } from "./common";

/** Con quay (biểu tượng bộ tham chiếu quán tính): quay theo frame, `dead` 0..1 thì dừng và đỏ dần. */
const Gyro: React.FC<{ x: number; y: number; r: number; spin: number; dead: number; ok: string; bad: string; ink: string }> = ({ x, y, r, spin, dead, ok, bad, ink }) => {
  const col = dead > 0.5 ? bad : ok;
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle r={r} fill="none" stroke={col} strokeWidth={6} />
      <ellipse rx={r} ry={r * Math.abs(Math.cos(spin))} fill="none" stroke={col} strokeWidth={5} opacity={0.8} />
      <ellipse rx={r * Math.abs(Math.sin(spin * 0.7))} ry={r} fill="none" stroke={col} strokeWidth={5} opacity={0.6} />
      <circle r={r * 0.16} fill={col} />
      {dead > 0 && (
        <g opacity={dead}>
          <circle cx={r * 0.8} cy={-r * 0.8} r={r * 0.36} fill={bad} />
          <text x={r * 0.8} y={-r * 0.8 + r * 0.14} fontSize={r * 0.42} fontWeight={700} fill={ink} textAnchor="middle">
            !
          </text>
        </g>
      )}
    </g>
  );
};

/** Hộp một bộ tham chiếu quán tính. `dieAt` là frame bộ ấy ngừng (Infinity: không ngừng). */
const Unit: React.FC<{ x: number; y: number; w: number; h: number; title: string; f: number; dieAt: number; code: number; sq: boolean }> = ({ x, y, w, h, title, f, dieAt, code, sq }) => {
  const theme = useTheme();
  const dead = p(f, dieAt, 10);
  const spin = (Math.min(f, dieAt) * 0.12) % (2 * Math.PI);
  const r = Math.min(h * 0.24, w * 0.18);
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={24} fill={theme.panel} stroke={dead > 0.5 ? theme.warn : theme.accent} strokeWidth={5} />
      <TextBlock text={title} x={x + w / 2} y={y + (sq ? 50 : 58)} width={w - 40} fontSize={sq ? 34 : 42} fill={theme.fg} />
      <Gyro x={x + w * 0.3} y={y + h * 0.58} r={r} spin={spin} dead={dead} ok={theme.ok} bad={theme.warn} ink={theme.bg} />
      {/* Mã chạy bên trong: ba dòng giống hệt nhau ở hai bộ */}
      <g opacity={code}>
        {[0, 1, 2].map((k) => (
          <rect key={k} x={x + w * 0.55} y={y + h * 0.42 + k * h * 0.13} width={w * (k === 1 ? 0.25 : 0.33)} height={h * 0.07} rx={4} fill={theme.accent2} opacity={0.8} />
        ))}
      </g>
      <TextBlock text={dead > 0.5 ? "ngừng hoạt động" : "đang chạy"} x={x + w / 2} y={y + h - (sq ? 22 : 26)} width={w - 40} fontSize={sq ? 30 : 36} fill={dead > 0.5 ? theme.warn : theme.ok} weight={400} />
    </g>
  );
};

/**
 * Bộ tham chiếu quán tính của Ariane 5.
 * Beat 0: một bộ gặp lỗi, ngừng. Beat 1: hai bộ chạy song song. Beat 2: giống hệt nhau, cả phần cứng lẫn phần mềm.
 * Beat 3: bộ dự phòng ngừng trước, bộ chính ngừng sau 72 mili giây (trục thời gian minh hoạ, không theo tỉ lệ).
 */
export const HaiBo: React.FC<SceneProps> = ({ scene }) => {
  const theme = useTheme();
  const f = useCurrentFrame();
  const { W, H, CX, sq } = useGeom();
  const t0 = at(scene, 0);
  const t1 = at(scene, 1);
  const t2 = at(scene, 2);
  const t3 = at(scene, 3);
  const one = 1 - p(f, t1, 12);
  const two = p(f, t1 + 6, 14);
  const gap = sq ? 40 : 120;
  const uw = sq ? (W - 80 - gap) / 2 : 620;
  const uh = sq ? 330 : 360;
  const uy = H * (sq ? 0.06 : 0.07);
  const lx = CX - gap / 2 - uw;
  const rx = CX + gap / 2;
  const failB = t3 + 14; // dự phòng ngừng trước
  const failA = t3 + 14 + 24; // bộ chính ngừng sau (minh hoạ khoảng 72 mili giây)
  const code = p(f, t2, 14);
  const tl = p(f, t3, 12);
  const ty = uy + uh + (sq ? 170 : 150);
  const tx0 = lx + 20;
  const tx1 = rx + uw - 20;
  const xB = lerp(tx0, tx1, sq ? 0.2 : 0.35);
  const xA = lerp(tx0, tx1, sq ? 0.8 : 0.65);
  const fsL = sq ? 30 : 38;
  return (
    <Stage>
      {/* Một bộ, gặp lỗi thì ngừng */}
      <g opacity={one}>
        <Unit x={CX - (sq ? W - 80 : uw) / 2} y={uy} w={sq ? W - 80 : uw} h={uh} title="Bộ tham chiếu quán tính" f={f} dieAt={t0 + 24} code={0} sq={sq} />
        <TextBlock text="Gặp lỗi: ngừng hoạt động" x={CX} y={uy + uh + 90} width={W - 80} fontSize={sq ? 40 : 52} fill={theme.warn} opacity={p(f, t0 + 30, 14)} />
      </g>
      {/* Hai bộ song song */}
      <g opacity={two}>
        <Unit x={lx} y={uy} w={uw} h={uh} title="Bộ chính" f={f} dieAt={failA} code={code} sq={sq} />
        <Unit x={rx} y={uy} w={uw} h={uh} title="Bộ dự phòng" f={f} dieAt={failB} code={code} sq={sq} />
        <TextBlock text="=" x={CX} y={uy + uh * 0.6} width={gap + 20} fontSize={sq ? 44 : 72} fill={theme.accent2} opacity={code} />
        <TextBlock
          text={f < t2 ? "Chạy song song, phòng khi một bộ hỏng" : "Giống hệt nhau: phần cứng lẫn phần mềm"}
          x={CX}
          y={uy + uh + (sq ? 70 : 80)}
          width={W - 80}
          fontSize={sq ? 34 : 46}
          maxLines={sq ? 2 : 1}
          fill={f < t2 ? theme.fg : theme.accent2}
          weight={400}
          opacity={1 - tl}
        />
        {/* Trục thời gian: dự phòng ngừng trước 72 mili giây */}
        <g opacity={tl}>
          <line x1={tx0} y1={ty} x2={tx1} y2={ty} stroke={theme.muted} strokeWidth={5} />
          <polygon points={`${tx1 + 18},${ty} ${tx1},${ty - 12} ${tx1},${ty + 12}`} fill={theme.muted} />
          <g opacity={p(f, failB, 8)}>
            <circle cx={xB} cy={ty} r={14} fill={theme.warn} />
            <TextBlock text="dự phòng ngừng" x={xB} y={ty - 30} width={sq ? 300 : 420} fontSize={fsL} fill={theme.warn} weight={400} />
          </g>
          <g opacity={p(f, failA, 8)}>
            <circle cx={xA} cy={ty} r={14} fill={theme.warn} />
            <TextBlock text="bộ chính ngừng" x={xA} y={ty - 30} width={sq ? 300 : 420} fontSize={fsL} fill={theme.warn} weight={400} />
            <path d={`M${xB} ${ty + 30} V${ty + 44} H${xA} V${ty + 30}`} fill="none" stroke={theme.accent2} strokeWidth={5} />
            <TextBlock text="sớm hơn 72 mili giây" x={(xA + xB) / 2} y={ty + (sq ? 90 : 100)} width={sq ? 600 : 800} fontSize={sq ? 36 : 46} fill={theme.accent2} />
          </g>
        </g>
      </g>
    </Stage>
  );
};
