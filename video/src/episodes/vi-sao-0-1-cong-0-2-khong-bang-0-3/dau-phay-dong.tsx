import React from "react";
import { useCurrentFrame } from "remotion";
import { useTheme } from "../../lib/hooks";
import { Stage, useBox } from "../../lib/theme";
import { monoStyle, TextBlock } from "../../lib/b-kit";
import type { SceneProps } from "../../lib/types";
import { Arrow, at, CX, p } from "./common";

/** Cách viết khoa học: 1.500 thành 1,5 × 10 mũ 3; phần chữ số và phần số mũ; dấu phẩy dịch theo số mũ; máy dùng cơ số 2. */
export const DauPhayDong: React.FC<SceneProps> = ({ scene }) => {
  const theme = useTheme();
  const f = useCurrentFrame();
  const a0 = p(f, at(scene, 0));
  const a0b = p(f, at(scene, 0) + 24);
  const a1 = p(f, at(scene, 1));
  const t2 = at(scene, 2);
  const a2 = p(f, t2);
  const base2 = p(f, t2 + 75);
  if (useBox().layout === "square") return <DauPhayDongSquare f={f} t2={t2} a0={a0} a0b={a0b} a1={a1} a2={a2} base2={base2} />;

  // Hàng trên: "1.500" → "1,5 × 10³"
  const LX = CX - 480;
  const RX = CX + 140;
  const Y = 290;

  // Hàng dưới: dải chữ số 1 5 0 0, dấu phẩy nhảy theo số mũ e = 0..3 (mỗi 22 frame), lặp lại.
  const e = f < t2 ? 0 : Math.floor((f - t2) / 22) % 4;
  const CELL = 110;
  const SX0 = CX + 20;
  const SY = 620;
  const ds = ["1", "5", "0", "0"];
  const commaX = SX0 + (e + 1) * CELL;
  return (
    <Stage>
      <g style={monoStyle} opacity={a0}>
        <text x={LX} y={Y} fontSize={110} fontWeight={700} fill={theme.fg} textAnchor="middle">
          1.500
        </text>
      </g>
      <Arrow x1={LX + 190} y1={Y - 36} x2={RX - 230} y2={Y - 36} color={theme.muted} opacity={a0b} />
      <g style={monoStyle} opacity={a0b}>
        <text x={RX - 200} y={Y} fontSize={110} fontWeight={700} fill={theme.accent} textAnchor="start">
          1,5
        </text>
        <text x={RX + 30} y={Y} fontSize={90} fontWeight={700} fill={theme.fg} textAnchor="start">
          × 10
        </text>
        <text x={RX + 300} y={Y - 60} fontSize={64} fontWeight={700} fill={theme.accent2} textAnchor="start">
          3
        </text>
      </g>
      <g opacity={a1}>
        <path d={`M${RX - 200} ${Y + 30} L${RX - 200} ${Y + 50} L${RX - 10} ${Y + 50} L${RX - 10} ${Y + 30}`} fill="none" stroke={theme.accent} strokeWidth={5} />
        <TextBlock text="các chữ số" x={RX - 105} y={Y + 105} width={360} fontSize={40} fill={theme.accent} />
        <Arrow x1={RX + 420} y1={Y + 60} x2={RX + 340} y2={Y - 70} color={theme.accent2} width={5} />
        <TextBlock text="số mũ: dấu phẩy ở đâu" x={RX + 430} y={Y + 105} width={520} fontSize={40} fill={theme.accent2} />
      </g>
      <g opacity={a2}>
        <TextBlock text="dấu phẩy động" x={CX} y={500} width={900} fontSize={52} fill={theme.accent2} />
        <g style={monoStyle}>
          {ds.map((d, i) => {
            const afterComma = i > e && d === "0";
            return (
              <g key={i}>
                <rect x={SX0 + i * CELL + 6} y={SY - 90} width={CELL - 12} height={120} rx={14} fill={theme.panel} />
                <text x={SX0 + i * CELL + CELL / 2} y={SY} fontSize={96} fontWeight={700} fill={afterComma ? theme.muted : theme.fg} opacity={afterComma ? 0.45 : 1} textAnchor="middle">
                  {d}
                </text>
              </g>
            );
          })}
          {e < 3 && <circle cx={commaX} cy={SY + 10} r={12} fill={theme.accent2} />}
          <text x={CX - 600} y={SY} fontSize={80} fontWeight={700} fill={theme.fg} textAnchor="start">
            1,5 × 10
          </text>
          <text x={CX - 220} y={SY - 50} fontSize={56} fontWeight={700} fill={theme.accent2} textAnchor="start">
            {String(e)}
          </text>
          <text x={CX - 110} y={SY} fontSize={80} fontWeight={700} fill={theme.muted} textAnchor="start">
            =
          </text>
        </g>
      </g>
      <g opacity={base2}>
        <rect x={CX - 260} y={712} width={520} height={90} rx={45} fill={theme.accent} />
        <TextBlock text="máy: cơ số 2" x={CX} y={773} width={480} fontSize={48} fill={theme.bg} />
      </g>
    </Stage>
  );
};

// ---- Khung vuông (Short, 840x840): cùng hình, thu gọn ngang, chữ ≥ 30 px ----
const DauPhayDongSquare: React.FC<{ f: number; t2: number; a0: number; a0b: number; a1: number; a2: number; base2: number }> = ({ f, t2, a0, a0b, a1, a2, base2 }) => {
  const theme = useTheme();
  const Y = 210;
  const RX = 360; // đầu "1,5"
  const e = f < t2 ? 0 : Math.floor((f - t2) / 22) % 4;
  const CELL = 95;
  const SX0 = 430;
  const SY = 600;
  const ds = ["1", "5", "0", "0"];
  const commaX = SX0 + (e + 1) * CELL;
  return (
    <Stage>
      <g style={monoStyle} opacity={a0}>
        <text x={135} y={Y} fontSize={80} fontWeight={700} fill={theme.fg} textAnchor="middle">
          1.500
        </text>
      </g>
      <Arrow x1={265} y1={Y - 26} x2={RX - 15} y2={Y - 26} color={theme.muted} opacity={a0b} />
      <g style={monoStyle} opacity={a0b}>
        <text x={RX} y={Y} fontSize={80} fontWeight={700} fill={theme.accent} textAnchor="start">
          1,5
        </text>
        <text x={RX + 160} y={Y} fontSize={64} fontWeight={700} fill={theme.fg} textAnchor="start">
          × 10
        </text>
        <text x={RX + 320} y={Y - 44} fontSize={48} fontWeight={700} fill={theme.accent2} textAnchor="start">
          3
        </text>
      </g>
      <g opacity={a1}>
        <path d={`M${RX} ${Y + 25} L${RX} ${Y + 45} L${RX + 144} ${Y + 45} L${RX + 144} ${Y + 25}`} fill="none" stroke={theme.accent} strokeWidth={5} />
        <TextBlock text="các chữ số" x={RX + 72} y={Y + 95} width={300} fontSize={36} fill={theme.accent} />
        <Arrow x1={RX + 334} y1={Y + 110} x2={RX + 334} y2={Y - 30} color={theme.accent2} width={5} />
        <TextBlock text="số mũ: dấu phẩy ở đâu" x={820} y={Y + 160} width={620} fontSize={36} fill={theme.accent2} anchor="end" />
      </g>
      <g opacity={a2}>
        <TextBlock text="dấu phẩy động" x={420} y={470} width={780} fontSize={52} fill={theme.accent2} />
        <g style={monoStyle}>
          {ds.map((d, i) => {
            const afterComma = i > e && d === "0";
            return (
              <g key={i}>
                <rect x={SX0 + i * CELL + 6} y={SY - 80} width={CELL - 12} height={108} rx={14} fill={theme.panel} />
                <text x={SX0 + i * CELL + CELL / 2} y={SY} fontSize={80} fontWeight={700} fill={afterComma ? theme.muted : theme.fg} opacity={afterComma ? 0.45 : 1} textAnchor="middle">
                  {d}
                </text>
              </g>
            );
          })}
          {e < 3 && <circle cx={commaX} cy={SY + 10} r={11} fill={theme.accent2} />}
          <text x={30} y={SY} fontSize={58} fontWeight={700} fill={theme.fg} textAnchor="start">
            1,5 × 10
          </text>
          <text x={312} y={SY - 40} fontSize={40} fontWeight={700} fill={theme.accent2} textAnchor="start">
            {String(e)}
          </text>
          <text x={360} y={SY} fontSize={58} fontWeight={700} fill={theme.muted} textAnchor="start">
            =
          </text>
        </g>
      </g>
      <g opacity={base2}>
        <rect x={160} y={690} width={520} height={90} rx={45} fill={theme.accent} />
        <TextBlock text="máy: cơ số 2" x={420} y={751} width={480} fontSize={48} fill={theme.bg} />
      </g>
    </Stage>
  );
};
