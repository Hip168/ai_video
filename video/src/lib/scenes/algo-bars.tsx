import React from "react";
import { useCurrentFrame } from "remotion";
import { useTheme } from "../hooks";
import { Stage, useBox } from "../theme";
import { itemStart, TextBlock } from "../b-kit";
import { ALGO_MAX_H, algoBarsAt } from "../algo-bars-at";
import type { SceneProps } from "../types";

const WIDE = { baseY: 700, w: 1920, area: 1700, cx: 960, title: [80, 90, 1000, 52], step: [1840, 90, 600, 40], noteY: 775, noteW: 1700, noteSize: 44, fsMin: 0 };
/** Khung vuông (Short): chữ số trên cột tối thiểu 30 px. */
const SQUARE = { baseY: 680, w: 840, area: 780, cx: 420, title: [30, 80, 540, 40], step: [810, 80, 240, 34], noteY: 790, noteW: 780, noteSize: 36, fsMin: 30 };

/** Thanh cột chạy theo danh sách trạng thái tính sẵn: trạng thái k hiện ở beat k, chiều cao nội suy giữa hai trạng thái. Không chạy thuật toán. */
export const AlgoBars: React.FC<SceneProps> = ({ scene }) => {
  const theme = useTheme();
  const frame = useCurrentFrame();
  const G = useBox().layout === "square" ? SQUARE : WIDE;
  const BASE_Y = G.baseY;
  const n = Array.isArray(scene.props.states) ? scene.props.states.length : 0;
  const title = typeof scene.props.title === "string" ? scene.props.title : "";
  if (n === 0) return <Stage />;
  const beats = scene.beats.length > 0
    ? scene.beats.map((b) => ({ startFrame: b.startFrame - scene.startFrame, cue: b.cue }))
    : Array.from({ length: n }, (_, i) => ({ startFrame: itemStart(scene, i, n), cue: "step" }));
  const f = algoBarsAt(scene.props, frame, beats);
  const k = f.index;
  const len = f.values.length;
  const slot = Math.min(150, G.area / len);
  const bw = slot * 0.78;
  const x0 = (G.w - slot * len) / 2;
  const act = new Set(f.active);
  const done = new Set(f.done);
  const fs = Math.max(G.fsMin, Math.min(44, slot * 0.4));
  const settled = f.heights.every((h, i) => Math.abs(h - (f.values[i] / Math.max(1, ...(scene.props.states as { values: number[] }[]).flatMap((s) => s.values))) * ALGO_MAX_H) < 0.5);
  return (
    <Stage>
      {title !== "" && <TextBlock text={title} x={G.title[0]} y={G.title[1]} width={G.title[2]} fontSize={G.title[3]} fill={theme.fg} anchor="start" />}
      <TextBlock text={`Bước ${k + 1} / ${n}`} x={G.step[0]} y={G.step[1]} width={G.step[2]} fontSize={G.step[3]} fill={theme.muted} anchor="end" />
      <line x1={x0 - 20} y1={BASE_Y + 4} x2={x0 + slot * len + 20} y2={BASE_Y + 4} stroke={theme.muted} strokeWidth={4} />
      {f.values.map((v, i) => {
        const h = f.heights[i];
        const x = x0 + i * slot + (slot - bw) / 2;
        const isAct = act.has(i);
        const isDone = done.has(i);
        const fill = isAct ? theme.accent2 : isDone ? theme.ok : theme.accent;
        return (
          <g key={i} transform={`translate(0 ${isAct && settled ? -8 : 0})`}>
            <rect x={x} y={BASE_Y - h} width={bw} height={h} rx={8} fill={fill} />
            <TextBlock text={String(v)} x={x + bw / 2} y={BASE_Y - h - 14} width={slot} fontSize={fs} fill={isAct ? theme.accent2 : theme.fg} />
          </g>
        );
      })}
      {f.note !== "" && <TextBlock text={f.note} x={G.cx} y={G.noteY} width={G.noteW} fontSize={G.noteSize} fill={theme.fg} weight={400} />}
    </Stage>
  );
};
