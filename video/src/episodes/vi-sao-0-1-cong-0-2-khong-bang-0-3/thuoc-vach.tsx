import React from "react";
import { useCurrentFrame } from "remotion";
import { useTheme } from "../../lib/hooks";
import { Stage } from "../../lib/theme";
import { monoStyle, TextBlock } from "../../lib/b-kit";
import type { SceneProps } from "../../lib/types";
import { Arrow, at, CX, lerp, p } from "./common";

const N = 7; // số khoảng giữa các vạch
const STEP = 200;
const X0 = CX - (N * STEP) / 2;
const Y = 440;
const tx = (k: number): number => X0 + k * STEP;

/**
 * Cây thước của máy: chỉ cất được số nằm đúng trên vạch.
 * mode "vach": vạch hiện dần, một số rơi giữa hai vạch thì làm tròn, 0,1 được cất ở vạch nhỉnh hơn;
 * mode "lam-tron": tổng rơi giữa vạch 0,3 của máy và vạch trên, bị đẩy lên vạch trên, in ra 0.30000000000000004, so bằng ra false.
 */
export const ThuocVach: React.FC<SceneProps> = ({ scene }) => {
  const theme = useTheme();
  const f = useCurrentFrame();
  const mode = String(scene.props.mode ?? "vach");
  const t0 = at(scene, 0);

  const ruler = (
    <g>
      <line x1={tx(0) - 60} y1={Y} x2={tx(N) + 60} y2={Y} stroke={theme.muted} strokeWidth={6} strokeLinecap="round" opacity={p(f, t0)} />
      {Array.from({ length: N + 1 }, (_, k) => {
        const a = mode === "vach" ? p(f, t0 + k * 5, 10) : p(f, t0, 10);
        return (
          <g key={k} opacity={a}>
            <line x1={tx(k)} y1={Y - 40} x2={tx(k)} y2={Y + 40} stroke={theme.accent} strokeWidth={8} strokeLinecap="round" />
            <circle cx={tx(k)} cy={Y} r={11} fill={theme.accent} />
          </g>
        );
      })}
    </g>
  );

  if (mode === "vach") {
    const title = p(f, t0 + 10);
    // Beat 1: một số rơi vào giữa vạch 1 và 2 rồi trượt về vạch gần nhất (vạch 1).
    const t1 = at(scene, 1);
    const drop = p(f, t1, 16);
    const snap = p(f, t1 + 40, 16);
    const fx = lerp(tx(1) + 0.4 * STEP, tx(1), snap);
    const fy = lerp(Y - 200, Y, drop);
    // Beat 2: 0,1 thật nằm giữa vạch 4 và 5, gần vạch 5 hơn; máy chọn vạch 5.
    const t2 = at(scene, 2);
    const real = p(f, t2);
    const pick = p(f, t2 + 30);
    const rx = tx(4) + 0.62 * STEP;
    return (
      <Stage>
        <TextBlock text="Máy chỉ cất được số nằm đúng trên vạch" x={CX} y={170} width={1500} fontSize={54} fill={theme.fg} opacity={title} />
        {ruler}
        <g opacity={drop}>
          <circle cx={fx} cy={fy} r={20} fill={theme.accent2} />
          <TextBlock text="làm tròn về một vạch" x={tx(1) + 0.2 * STEP} y={Y + 120} width={520} fontSize={40} fill={theme.accent2} opacity={snap} />
        </g>
        <g opacity={real}>
          <line x1={rx} y1={Y - 150} x2={rx} y2={Y + 30} stroke={theme.warn} strokeWidth={5} strokeDasharray="14 10" />
          <TextBlock text="0,1" x={rx} y={Y - 175} width={200} fontSize={48} fill={theme.warn} />
        </g>
        <g opacity={pick}>
          <Arrow x1={rx + 10} y1={Y - 70} x2={tx(5) - 8} y2={Y - 70} color={theme.accent2} width={5} />
          <circle cx={tx(5)} cy={Y} r={30} fill="none" stroke={theme.accent2} strokeWidth={8} />
          <TextBlock text="vạch nhỉnh hơn 0,1" x={tx(5)} y={Y + 120} width={520} fontSize={44} fill={theme.accent2} />
        </g>
      </Stage>
    );
  }

  // lam-tron: vạch 3 là "0,3 của máy", vạch 4 là vạch ngay trên.
  const A = tx(3);
  const B = tx(4);
  const real3 = A + 0.3 * STEP;
  const t1 = at(scene, 1);
  const t2 = at(scene, 2);
  const t3 = at(scene, 3);
  const come = p(f, t0, 16);
  const push = p(f, t1, 18);
  const show = p(f, t2);
  const neq = p(f, t3);
  const sx = lerp((A + B) / 2, B, push);
  const sy = lerp(Y - 220, Y, come);
  return (
    <Stage>
      {ruler}
      <g opacity={p(f, t0)}>
        <line x1={real3} y1={Y - 150} x2={real3} y2={Y + 30} stroke={theme.muted} strokeWidth={5} strokeDasharray="14 10" />
        <TextBlock text="0,3" x={real3} y={Y - 175} width={200} fontSize={44} fill={theme.muted} />
        <TextBlock text="0,3 của máy" x={A} y={Y + 110} width={380} fontSize={40} fill={theme.fg} />
      </g>
      <g opacity={come}>
        <circle cx={sx} cy={sy} r={24} fill={theme.accent2} />
        <TextBlock text="tổng" x={sx} y={sy - 44} width={200} fontSize={40} fill={theme.accent2} />
      </g>
      <Arrow x1={(A + B) / 2 + 30} y1={Y + 70} x2={B - 20} y2={Y + 70} color={theme.accent2} width={5} opacity={push * (1 - show)} />
      <g opacity={show} style={monoStyle}>
        <rect x={B - 330} y={Y + 130} width={660} height={84} rx={16} fill={theme.panel} stroke={theme.accent2} strokeWidth={4} />
        <text x={B} y={Y + 188} fontSize={50} fontWeight={700} fill={theme.accent2} textAnchor="middle">
          {"0.30000000000000004"}
        </text>
      </g>
      <g opacity={neq}>
        <path d={`M${A} ${Y + 50} L${A} ${Y + 70} L${B} ${Y + 70} L${B} ${Y + 50}`} fill="none" stroke={theme.warn} strokeWidth={5} />
        <TextBlock text="khác vạch" x={CX} y={Y + 285} width={600} fontSize={48} fill={theme.warn} />
        <g style={monoStyle}>
          <text x={CX} y={Y + 375} fontSize={80} fontWeight={700} fill={theme.warn} textAnchor="middle">
            false
          </text>
        </g>
      </g>
    </Stage>
  );
};
