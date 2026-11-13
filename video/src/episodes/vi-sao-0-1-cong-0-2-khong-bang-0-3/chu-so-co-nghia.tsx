import React from "react";
import { useCurrentFrame } from "remotion";
import { useTheme } from "../../lib/hooks";
import { Stage, useBox } from "../../lib/theme";
import { monoStyle, TextBlock } from "../../lib/b-kit";
import type { SceneProps } from "../../lib/types";
import { Arrow, at, cellSize, CX, Digits, p, W } from "./common";

const SUM = "0.30000000000000004";
/** Chuỗi 0,1 thật sự máy cất (đúng như lời). */
const EXACT = "0,1000000000000000055511151231257827021181583404541015625";

/**
 * Chữ số có nghĩa. mode "giu-tron": 0.30000000000000004 với 15 chữ số đầu được giữ trọn, chữ số 4 ở vị trí thứ 17;
 * mode "chinh-xac": gõ 0.1, máy cất con số dài.
 */
export const ChuSoCoNghia: React.FC<SceneProps> = ({ scene }) => {
  const theme = useTheme();
  const f = useCurrentFrame();
  const mode = String(scene.props.mode ?? "giu-tron");
  if (useBox().layout === "square") return <ChuSoCoNghiaSquare scene={scene} />;

  if (mode === "giu-tron") {
    const chars = [...SUM];
    const first = 2; // chữ số có nghĩa đầu tiên (số 3) ở chỉ số 2
    const cell = cellSize(chars.length, W - 400, 84);
    const x0 = CX - (chars.length * cell) / 2;
    const xs = (i: number) => x0 + i * cell;
    const Y = 400;
    const fs = cell / 0.62;
    const keep = p(f, at(scene, 0));
    const out = p(f, at(scene, 0) + 30);
    const four = p(f, at(scene, 1));
    const pulse = four > 0 ? 0.6 + 0.4 * Math.abs(Math.sin((f - at(scene, 1)) / 7)) : 0;
    const band = (from: number, to: number, color: string, op: number) => (
      <rect x={xs(from) + 2} y={Y - fs * 0.95} width={(to - from + 1) * cell - 4} height={fs * 1.25} rx={14} fill={color} opacity={op} />
    );
    return (
      <Stage>
        {band(first, first + 14, theme.ok, 0.25 * keep)}
        {band(first + 15, first + 16, theme.warn, 0.3 * out)}
        <rect x={xs(first + 16) + 2} y={Y - fs * 0.95} width={cell - 4} height={fs * 1.25} rx={14} fill={theme.accent2} opacity={pulse} />
        <Digits text={SUM} cx={CX} y={Y} cell={cell} style={() => ({ fill: theme.fg, opacity: 1 })} />
        <g style={monoStyle}>
          {chars.slice(first).map((_, k) => (
            <text key={k} x={xs(first + k) + cell / 2} y={Y - fs - 20} fontSize={30} fontWeight={700} fill={theme.muted} textAnchor="middle" opacity={keep}>
              {String(k + 1)}
            </text>
          ))}
        </g>
        <TextBlock text="giữ trọn 15 chữ số có nghĩa" x={(xs(first) + xs(first + 15)) / 2} y={Y + 110} width={900} fontSize={44} fill={theme.ok} opacity={keep} />
        <TextBlock text="từ chữ số thứ 16" x={xs(first + 16)} y={Y - fs - 80} width={520} fontSize={40} fill={theme.warn} opacity={out} />
        <Arrow x1={xs(first + 16) + cell / 2} y1={Y + 290} x2={xs(first + 16) + cell / 2} y2={Y + 50} color={theme.accent2} opacity={four} />
        <TextBlock text="chữ số có nghĩa thứ 17" x={xs(first + 16) - 120} y={Y + 370} width={700} fontSize={48} fill={theme.accent2} opacity={four} anchor="middle" />
      </Stage>
    );
  }

  // chinh-xac
  const head = p(f, at(scene, 0));
  const ask = p(f, at(scene, 0) + 20);
  const t1 = at(scene, 1);
  const split = EXACT.indexOf("555");
  const line1 = EXACT.slice(0, split);
  const line2 = EXACT.slice(split);
  const cell = cellSize(line2.length, W - 320, 64);
  const x0 = CX - (line2.length * cell) / 2;
  const n = f < t1 ? 0 : Math.floor((f - t1) * 1.5);
  const s1 = line1.slice(0, Math.min(line1.length, n));
  const s2 = line2.slice(0, Math.max(0, n - line1.length));
  return (
    <Stage>
      <g style={monoStyle} opacity={head}>
        <text x={CX - 80} y={250} fontSize={130} fontWeight={700} fill={theme.fg} textAnchor="end">
          0.1
        </text>
        <text x={CX + 20} y={250} fontSize={130} fontWeight={700} fill={theme.accent2} textAnchor="start" opacity={ask}>
          ?
        </text>
      </g>
      <Digits text={s1} cx={x0 + (s1.length * cell) / 2} y={480} cell={cell} style={() => ({ fill: theme.fg, opacity: 1 })} />
      <Digits text={s2} cx={x0 + (s2.length * cell) / 2} y={620} cell={cell} style={() => ({ fill: theme.accent2, opacity: 1 })} />
    </Stage>
  );
};

// ---- Khung vuông (Short, 840x840): cùng nội dung, nhãn bám mép phải, số dài ngắt ba dòng, chữ ≥ 30 px ----
const ChuSoCoNghiaSquare: React.FC<SceneProps> = ({ scene }) => {
  const theme = useTheme();
  const f = useCurrentFrame();
  const mode = String(scene.props.mode ?? "giu-tron");
  const C = 420;

  if (mode === "giu-tron") {
    const chars = [...SUM];
    const first = 2;
    const cell = cellSize(chars.length, 800, 42);
    const x0 = C - (chars.length * cell) / 2;
    const xs = (i: number) => x0 + i * cell;
    const Y = 400;
    const fs = cell / 0.62;
    const keep = p(f, at(scene, 0));
    const out = p(f, at(scene, 0) + 30);
    const four = p(f, at(scene, 1));
    const pulse = four > 0 ? 0.6 + 0.4 * Math.abs(Math.sin((f - at(scene, 1)) / 7)) : 0;
    const band = (from: number, to: number, color: string, op: number) => (
      <rect x={xs(from) + 2} y={Y - fs * 0.95} width={(to - from + 1) * cell - 4} height={fs * 1.25} rx={12} fill={color} opacity={op} />
    );
    const x17 = xs(first + 16) + cell / 2;
    return (
      <Stage>
        {band(first, first + 14, theme.ok, 0.25 * keep)}
        {band(first + 15, first + 16, theme.warn, 0.3 * out)}
        <rect x={xs(first + 16) + 2} y={Y - fs * 0.95} width={cell - 4} height={fs * 1.25} rx={12} fill={theme.accent2} opacity={pulse} />
        <Digits text={SUM} cx={C} y={Y} cell={cell} style={() => ({ fill: theme.fg, opacity: 1 })} />
        <g style={monoStyle}>
          {/* Ô hẹp: chỉ đánh số các mốc, số hai chữ số không chen nhau. */}
          {[1, 5, 10, 15, 17].map((k) => (
            <text key={k} x={xs(first + k - 1) + cell / 2} y={Y - fs - 20} fontSize={30} fontWeight={700} fill={theme.muted} textAnchor="middle" opacity={keep}>
              {String(k)}
            </text>
          ))}
        </g>
        <TextBlock text="giữ trọn 15 chữ số có nghĩa" x={(xs(first) + xs(first + 15)) / 2} y={Y + 110} width={660} fontSize={44} fill={theme.ok} opacity={keep} />
        <TextBlock text="từ chữ số thứ 16" x={820} y={Y - fs - 90} width={600} fontSize={40} fill={theme.warn} opacity={out} anchor="end" />
        <Arrow x1={x17} y1={Y + 290} x2={x17} y2={Y + 50} color={theme.accent2} opacity={four} />
        <TextBlock text="chữ số có nghĩa thứ 17" x={820} y={Y + 370} width={780} fontSize={48} fill={theme.accent2} opacity={four} anchor="end" />
      </Stage>
    );
  }

  // chinh-xac: con số dài ngắt ba dòng
  const head = p(f, at(scene, 0));
  const ask = p(f, at(scene, 0) + 20);
  const t1 = at(scene, 1);
  const split = EXACT.indexOf("555");
  const mid = split + Math.ceil((EXACT.length - split) / 2);
  const parts = [EXACT.slice(0, split), EXACT.slice(split, mid), EXACT.slice(mid)];
  const cell = cellSize(Math.max(...parts.map((s) => s.length)), 800, 44);
  const x0 = C - (Math.max(...parts.map((s) => s.length)) * cell) / 2;
  const n = f < t1 ? 0 : Math.floor((f - t1) * 1.5);
  let used = 0;
  const shown = parts.map((s) => {
    const r = s.slice(0, Math.max(0, Math.min(s.length, n - used)));
    used += s.length;
    return r;
  });
  return (
    <Stage>
      <g style={monoStyle} opacity={head}>
        <text x={C - 60} y={210} fontSize={120} fontWeight={700} fill={theme.fg} textAnchor="end">
          0.1
        </text>
        <text x={C + 20} y={210} fontSize={120} fontWeight={700} fill={theme.accent2} textAnchor="start" opacity={ask}>
          ?
        </text>
      </g>
      {shown.map((s, i) => (
        <Digits key={i} text={s} cx={x0 + (s.length * cell) / 2} y={420 + i * 120} cell={cell} style={() => ({ fill: i === 0 ? theme.fg : theme.accent2, opacity: 1 })} />
      ))}
    </Stage>
  );
};
