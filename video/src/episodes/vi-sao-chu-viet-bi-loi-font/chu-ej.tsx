import React from "react";
import { useCurrentFrame } from "remotion";
import { useTheme } from "../../lib/hooks";
import { Stage } from "../../lib/theme";
import { monoStyle, TextBlock } from "../../lib/b-kit";
import type { SceneProps } from "../../lib/types";
import { at, Cell, modeOf, p, useGeom } from "./common";

/** Chữ e có dấu nặng dưới chân và dấu mũ trên đầu, vẽ bằng hình (không dựa vào ký tự ghép của phông). */
const Parts: React.FC<{ cx: number; cy: number; s: number; color: string; dot: number; hat: number }> = ({ cx, cy, s, color, dot, hat }) => (
  <g>
    <text x={cx} y={cy + s * 0.34} fontSize={s} fontWeight={700} textAnchor="middle" fill={color}>
      e
    </text>
    {/* dấu nặng: chấm dưới chân */}
    <circle cx={cx} cy={cy + s * 0.34 + s * 0.2} r={s * 0.065} fill={color} opacity={dot} />
    {/* dấu mũ: chữ V ngược trên đầu */}
    <path
      d={`M${cx - s * 0.17} ${cy - s * 0.27} L${cx} ${cy - s * 0.44} L${cx + s * 0.17} ${cy - s * 0.27}`}
      fill="none"
      stroke={color}
      strokeWidth={s * 0.07}
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity={hat}
    />
  </g>
);

/**
 * Chữ ệ, hai cách lưu.
 * mode "hai" (2 beat): hai chữ ệ nhìn giống hệt nhau nhưng bên trong là hai dãy số khác nhau; máy cất theo một trong hai cách.
 * mode "gop" (3 beat): cách 1, dạng dựng sẵn: một điểm mã U+1EC7; cách 2, dạng phân rã: e (U+0065), dấu nặng (U+0323), dấu mũ (U+0302); đếm: một điểm mã hay ba điểm mã mà cả hai đều hiện ra ệ.
 */
export const ChuEj: React.FC<SceneProps> = ({ scene }) => {
  const theme = useTheme();
  const f = useCurrentFrame();
  const { W, sq } = useGeom();
  const mode = modeOf(scene.props, "hai");
  const t1 = at(scene, 1);
  const t2 = at(scene, 2);
  const big = sq ? 190 : 270;
  const pulse = 0.7 + 0.3 * Math.sin(f * 0.18);

  if (mode === "hai") {
    const cx = [W * (sq ? 0.27 : 0.3), W * (sq ? 0.73 : 0.7)];
    const cy = sq ? 270 : 330;
    const eqP = 1;
    const boxP = p(f, 24, 12);
    const wayP = p(f, t1, 14);
    const bw = sq ? 96 : 130;
    const bh = sq ? 70 : 90;
    return (
      <Stage>
        <TextBlock text="Hai chữ ệ giống hệt nhau" x={W / 2} y={sq ? 76 : 90} width={W - 80} fontSize={sq ? 48 : 68} fill={theme.accent} />
        {cx.map((x, i) => (
          <g key={i} opacity={eqP}>
            <rect x={x - (sq ? 150 : 190)} y={cy - (sq ? 130 : 160)} width={sq ? 300 : 380} height={sq ? 260 : 320} rx={26} fill={theme.panel} stroke={theme.accent} strokeWidth={5} />
            <text x={x} y={cy + big * 0.3} fontSize={big} fontWeight={700} textAnchor="middle" fill={theme.fg}>
              ệ
            </text>
          </g>
        ))}
        <g opacity={eqP}>
          <text x={W / 2} y={cy + (sq ? 22 : 30)} fontSize={sq ? 80 : 110} fontWeight={700} textAnchor="middle" fill={theme.accent2}>
            =
          </text>
        </g>
        {/* Bên trong: dãy số khác nhau */}
        {!sq || wayP < 1 ? (
          <g opacity={boxP * (1 - wayP * 0)}>
            {cx.map((x, i) => {
              const n = i === 0 ? 1 : 3;
              const total = n * bw + (n - 1) * 10;
              return (
                <g key={i}>
                  {Array.from({ length: n }, (_, k) => (
                    <Cell
                      key={k}
                      x={x - total / 2 + k * (bw + 10)}
                      y={cy + (sq ? 150 : 190)}
                      w={bw}
                      h={bh}
                      text={wayP > 0.3 ? "" : "?"}
                      s={sq ? 40 : 52}
                      fill="none"
                      stroke={theme.accent2}
                      color={theme.accent2}
                      dashed
                    />
                  ))}
                </g>
              );
            })}
          </g>
        ) : null}
        <g opacity={boxP}>
          <TextBlock text="bên trong: hai dãy số khác nhau" x={W / 2} y={cy + (sq ? 300 : 340)} width={W - 80} fontSize={sq ? 40 : 54} fill={theme.fg} />
        </g>
        <g opacity={wayP}>
          <TextBlock text="Máy cất theo một trong hai cách" x={W / 2} y={sq ? 740 : 760} width={W - 80} fontSize={sq ? 44 : 60} maxLines={sq ? 2 : 1} fill={theme.accent2} />
        </g>
      </Stage>
    );
  }

  // mode "gop"
  const aP = p(f, 4, 14);
  const bP = p(f, t1, 14);
  const cP = p(f, t2, 14);
  // Hai khối: cách 1 (dựng sẵn) và cách 2 (phân rã). Khung ngang: cạnh nhau; khung dọc: chồng lên nhau.
  const c1x = sq ? W / 2 : W * 0.25;
  const c2x = sq ? W / 2 : W * 0.7;
  const b1y = sq ? 24 : 40;
  const b2y = sq ? 290 : 40;
  const partW = sq ? 250 : 290;
  const partH = sq ? 190 : 300;
  const gap = sq ? 10 : 18;
  const xs = [c2x - partW - gap, c2x, c2x + partW + gap];
  const partsY = b2y + (sq ? 50 : 80);
  const rp = p(f, t1 + 80, 14);
  return (
    <Stage>
      {/* Cách 1 */}
      <g opacity={aP}>
        <TextBlock text="Cách 1: dạng dựng sẵn" x={c1x} y={b1y + (sq ? 34 : 34)} width={sq ? W - 80 : 700} fontSize={sq ? 38 : 48} fill={theme.accent} />
        <rect x={c1x - (sq ? 360 : 280)} y={b1y + (sq ? 50 : 80)} width={sq ? 720 : 560} height={sq ? 190 : 300} rx={22} fill={theme.panel} stroke={theme.accent} strokeWidth={4} />
        <text x={c1x - (sq ? 190 : 0)} y={b1y + (sq ? 50 + 130 : 80 + 140)} fontSize={sq ? 130 : 170} fontWeight={700} textAnchor="middle" fill={theme.fg}>
          ệ
        </text>
        <Cell x={sq ? c1x - 60 : c1x - 130} y={sq ? b1y + 90 : b1y + 80 + 205} w={sq ? 220 : 260} h={sq ? 70 : 76} text="U+1EC7" s={sq ? 36 : 44} fill={theme.bg} stroke={theme.accent} color={theme.fg} />
        {sq && <TextBlock text="một điểm mã duy nhất" x={c1x + 50} y={b1y + 214} width={420} fontSize={32} fill={theme.muted} weight={400} />}
        {!sq && <TextBlock text="một điểm mã duy nhất" x={c1x} y={b1y + 80 + 300 + 56} width={520} fontSize={40} fill={theme.muted} weight={400} />}
      </g>
      {/* Cách 2 */}
      <g opacity={bP}>
        <TextBlock text="Cách 2: dạng phân rã, ghép ba điểm mã" x={c2x} y={b2y + (sq ? 34 : 34)} width={sq ? W - 60 : 900} fontSize={sq ? 36 : 44} fill={theme.accent2} />
        {[
          { label: "chữ e", code: "U+0065" },
          { label: "dấu nặng", code: "U+0323" },
          { label: "dấu mũ", code: "U+0302" },
        ].map((c, i) => {
          const ip = p(f, t1 + 10 + i * 20, 12);
          const x = xs[i];
          return (
            <g key={i} opacity={ip} transform={`translate(0 ${(1 - ip) * 20})`}>
              <rect x={x - partW / 2} y={partsY} width={partW} height={partH} rx={20} fill={theme.panel} stroke={theme.accent2} strokeWidth={4} />
              <Parts cx={x} cy={partsY + (sq ? 62 : 100)} s={sq ? 72 : 110} color={theme.fg} dot={i === 1 ? 1 : 0} hat={i === 2 ? 1 : 0} />
              <TextBlock text={c.label} x={x} y={partsY + partH - (sq ? 56 : 76)} width={partW - 24} fontSize={sq ? 34 : 42} fill={theme.fg} />
              <text x={x} y={partsY + partH - (sq ? 18 : 26)} fontSize={sq ? 30 : 36} fontWeight={700} textAnchor="middle" fill={theme.muted} style={monoStyle}>
                {c.code}
              </text>
            </g>
          );
        })}
        <g opacity={rp}>
          <text x={c2x} y={partsY + partH + (sq ? 78 : 96)} fontSize={sq ? 84 : 110} fontWeight={700} textAnchor="middle" fill={theme.ok}>
            = ệ
          </text>
        </g>
      </g>
      {/* Đếm thử */}
      <g opacity={cP}>
        <TextBlock text="Một điểm mã, hay ba điểm mã" x={W / 2} y={sq ? 750 : 740} width={W - 80} fontSize={sq ? 44 : 60} fill={theme.fg} />
        <TextBlock text="mà cả hai đều hiện ra chữ ệ" x={W / 2} y={sq ? 805 : 806} width={W - 80} fontSize={sq ? 44 : 60} fill={theme.accent} />
      </g>
    </Stage>
  );
};
