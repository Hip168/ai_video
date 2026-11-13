import React from "react";
import { useCurrentFrame } from "remotion";
import { useTheme } from "../../lib/hooks";
import { Stage, useBox } from "../../lib/theme";
import { TextBlock } from "../../lib/b-kit";
import type { SceneProps } from "../../lib/types";
import { at, cellSize, CX, Digits, lerp, p, W } from "./common";

/** Phân số viết mãi không hết. mode "chia": 1 chia 3 ra 0,333... và tiến gần 1/3 mà không chạm; "nhi-phan": 1/10 trong hệ hai lặp khối 0011, đặt cạnh 1/3 trong hệ mười. */
export const PhanSoLap: React.FC<SceneProps> = ({ scene }) => {
  const theme = useTheme();
  const f = useCurrentFrame();
  const mode = String(scene.props.mode ?? "chia");
  if (useBox().layout === "square") return <PhanSoLapSquare scene={scene} />;

  if (mode === "chia") {
    const head = p(f, at(scene, 0));
    // Chữ số 3 mọc dần: mỗi 8 frame thêm một chữ, tối đa 14 chữ rồi thêm "..."
    const k = f < at(scene, 1) ? 0 : Math.min(14, 1 + Math.floor((f - at(scene, 1)) / 8));
    const more = f >= at(scene, 1) + 14 * 8 ? "..." : "";
    const digits = k === 0 ? "" : `0,${"3".repeat(k)}${more}`;
    const cell = cellSize(19, W - 420, 84);
    // Thanh tiến gần: mỗi bước thêm một chữ số, khoảng cách tới 1/3 giảm mãi nhưng không về 0.
    const t2 = at(scene, 2);
    const step = f < t2 ? 0 : Math.min(6, 1 + Math.floor((f - t2) / 20));
    const TX0 = CX - 640;
    const TX1 = CX + 640;
    const gap = (n: number) => (TX1 - TX0) * 0.55 ** n;
    const xm = step === 0 ? TX0 : lerp(TX1 - gap(step - 1), TX1 - gap(step), p(f, t2 + (step - 1) * 20, 12));
    const track = p(f, t2);
    return (
      <Stage>
        <TextBlock text="1 chia 3" x={CX} y={190} width={1200} fontSize={110} fill={theme.fg} opacity={head} />
        <Digits
          text={digits}
          cx={CX}
          y={420}
          cell={cell}
          style={(i) => ({ fill: i >= 2 && i < 2 + k ? theme.accent : theme.fg, opacity: 1, box: i >= 2 && i < 2 + k ? theme.panel : undefined })}
        />
        <g opacity={track}>
          <line x1={TX0} y1={640} x2={TX1} y2={640} stroke={theme.muted} strokeWidth={6} strokeLinecap="round" />
          <line x1={TX1} y1={600} x2={TX1} y2={680} stroke={theme.accent2} strokeWidth={8} strokeLinecap="round" />
          <TextBlock text="1/3" x={TX1} y={740} width={200} fontSize={52} fill={theme.accent2} />
          <circle cx={xm} cy={640} r={20} fill={theme.accent} />
          <TextBlock text={step === 0 ? "" : `0,${"3".repeat(step)}`} x={xm} y={590} width={360} fontSize={40} fill={theme.accent} />
          <TextBlock text="ngày càng gần hơn" x={TX0} y={740} width={760} fontSize={44} fill={theme.muted} anchor="start" weight={400} />
        </g>
      </Stage>
    );
  }

  // nhi-phan
  const full = `0,0${"0011".repeat(5)}`;
  const t1 = at(scene, 1);
  const shown = f < t1 ? 0 : Math.min(full.length, 3 + Math.floor((f - t1) / 4));
  const tail = shown === full.length && f >= t1 + full.length * 4 ? "..." : "";
  const LABEL_X = 140;
  const DX = CX + 200; // tâm hàng chữ số, chừa chỗ cho nhãn bên trái
  const cell = cellSize(26, W - 760, 60);
  const row2 = p(f, at(scene, 2));
  const dec = `0,${"3".repeat(20)}...`;
  return (
    <Stage>
      <TextBlock text="lặp vô hạn" x={CX} y={170} width={1200} fontSize={84} fill={theme.accent2} opacity={p(f, at(scene, 0))} />
      <g opacity={p(f, at(scene, 0))}>
        <TextBlock text="1/10" x={LABEL_X} y={360} width={360} fontSize={72} fill={theme.fg} anchor="start" />
        <TextBlock text="hệ hai" x={LABEL_X} y={410} width={360} fontSize={36} fill={theme.muted} anchor="start" weight={400} />
      </g>
      <Digits
        text={`${full.slice(0, shown)}${tail}`}
        cx={DX}
        y={380}
        cell={cell}
        style={(i) => {
          if (i < 3 || i >= full.length) return { fill: theme.fg, opacity: 1 };
          const block = Math.floor((i - 3) / 4);
          return { fill: theme.fg, opacity: 1, box: block % 2 === 0 ? theme.accent : theme.accent2, boxOpacity: 0.35 };
        }}
      />
      <g opacity={row2}>
        <TextBlock text="1/3" x={LABEL_X} y={590} width={360} fontSize={72} fill={theme.fg} anchor="start" />
        <TextBlock text="hệ mười" x={LABEL_X} y={640} width={360} fontSize={36} fill={theme.muted} anchor="start" weight={400} />
        <Digits text={dec} cx={DX} y={610} cell={cell} style={(i) => ({ fill: i >= 2 && i < 22 ? theme.accent : theme.fg, opacity: 1 })} />
        <TextBlock text="viết mãi không hết" x={CX} y={780} width={1200} fontSize={56} fill={theme.accent2} />
      </g>
    </Stage>
  );
};

// ---- Khung vuông (Short, 840x840): cùng nội dung, xếp dọc, chữ ≥ 30 px ----
const PhanSoLapSquare: React.FC<SceneProps> = ({ scene }) => {
  const theme = useTheme();
  const f = useCurrentFrame();
  const mode = String(scene.props.mode ?? "chia");
  const C = 420;

  if (mode === "chia") {
    const k = f < at(scene, 1) ? 0 : Math.min(14, 1 + Math.floor((f - at(scene, 1)) / 8));
    const more = f >= at(scene, 1) + 14 * 8 ? "..." : "";
    const digits = k === 0 ? "" : `0,${"3".repeat(k)}${more}`;
    const cell = cellSize(19, 780, 60);
    const t2 = at(scene, 2);
    const step = f < t2 ? 0 : Math.min(6, 1 + Math.floor((f - t2) / 20));
    const TX0 = 90;
    const TX1 = 750;
    const gap = (n: number) => (TX1 - TX0) * 0.55 ** n;
    const xm = step === 0 ? TX0 : lerp(TX1 - gap(step - 1), TX1 - gap(step), p(f, t2 + (step - 1) * 20, 12));
    return (
      <Stage>
        <TextBlock text="1 chia 3" x={C} y={130} width={780} fontSize={96} fill={theme.fg} opacity={p(f, at(scene, 0))} />
        <Digits
          text={digits}
          cx={C}
          y={320}
          cell={cell}
          style={(i) => ({ fill: i >= 2 && i < 2 + k ? theme.accent : theme.fg, opacity: 1, box: i >= 2 && i < 2 + k ? theme.panel : undefined })}
        />
        <g opacity={p(f, t2)}>
          <line x1={TX0} y1={540} x2={TX1} y2={540} stroke={theme.muted} strokeWidth={6} strokeLinecap="round" />
          <line x1={TX1} y1={500} x2={TX1} y2={580} stroke={theme.accent2} strokeWidth={8} strokeLinecap="round" />
          <TextBlock text="1/3" x={TX1} y={640} width={160} fontSize={52} fill={theme.accent2} />
          <circle cx={xm} cy={540} r={20} fill={theme.accent} />
          <TextBlock text={step === 0 ? "" : `0,${"3".repeat(step)}`} x={Math.min(xm, 600)} y={480} width={300} fontSize={40} fill={theme.accent} />
          <TextBlock text="ngày càng gần hơn" x={C} y={760} width={780} fontSize={52} fill={theme.muted} weight={400} />
        </g>
      </Stage>
    );
  }

  // nhi-phan: nhãn đặt trên mỗi hàng chữ số
  const full = `0,0${"0011".repeat(5)}`;
  const t1 = at(scene, 1);
  const shown = f < t1 ? 0 : Math.min(full.length, 3 + Math.floor((f - t1) / 4));
  const tail = shown === full.length && f >= t1 + full.length * 4 ? "..." : "";
  const cell = cellSize(26, 800, 40);
  const row2 = p(f, at(scene, 2));
  const dec = `0,${"3".repeat(20)}...`;
  return (
    <Stage>
      <TextBlock text="lặp vô hạn" x={C} y={100} width={780} fontSize={72} fill={theme.accent2} opacity={p(f, at(scene, 0))} />
      <g opacity={p(f, at(scene, 0))}>
        <TextBlock text="1/10" x={C - 20} y={220} width={300} fontSize={60} fill={theme.fg} anchor="end" />
        <TextBlock text="hệ hai" x={C + 20} y={220} width={300} fontSize={40} fill={theme.muted} anchor="start" weight={400} />
      </g>
      <Digits
        text={`${full.slice(0, shown)}${tail}`}
        cx={C}
        y={330}
        cell={cell}
        style={(i) => {
          if (i < 3 || i >= full.length) return { fill: theme.fg, opacity: 1 };
          const block = Math.floor((i - 3) / 4);
          return { fill: theme.fg, opacity: 1, box: block % 2 === 0 ? theme.accent : theme.accent2, boxOpacity: 0.35 };
        }}
      />
      <g opacity={row2}>
        <TextBlock text="1/3" x={C - 20} y={480} width={300} fontSize={60} fill={theme.fg} anchor="end" />
        <TextBlock text="hệ mười" x={C + 20} y={480} width={300} fontSize={40} fill={theme.muted} anchor="start" weight={400} />
        <Digits text={dec} cx={C} y={590} cell={cell} style={(i) => ({ fill: i >= 2 && i < 22 ? theme.accent : theme.fg, opacity: 1 })} />
        <TextBlock text="viết mãi không hết" x={C} y={750} width={780} fontSize={60} fill={theme.accent2} />
      </g>
    </Stage>
  );
};
