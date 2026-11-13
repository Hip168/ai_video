import React from "react";
import { useCurrentFrame } from "remotion";
import { useTheme } from "../hooks";
import { Stage, useBox } from "../theme";
import type { SceneProps } from "../types";
import { appearAt, Cross, prog, T, Tick } from "./a-common";

interface Pair {
  myth: string;
  fact: string;
}

const TOP = 110;
const H = 620;

/** Thẻ i hiện ở beat 2i (huyền thoại), lật ở beat 2i+1 (sự thật). */
export const MythFact: React.FC<SceneProps> = ({ scene }) => {
  const theme = useTheme();
  const frame = useCurrentFrame();
  const pairs = (Array.isArray(scene.props.pairs) ? scene.props.pairs : []) as Pair[];
  const n = Math.max(1, pairs.length);
  if (useBox().layout === "square") {
    // Khung vuông (Short): một thẻ chiếm cả hộp; nhiều thẻ thì xếp chồng theo chiều dọc.
    const gapS = 20;
    const hS = (760 - (n - 1) * gapS) / n;
    return (
      <Stage>
        {pairs.map((pair, i) => {
          const y = 40 + i * (hS + gapS);
          const cx = 420;
          const cy = y + hS / 2;
          const show = prog(frame, appearAt(scene, 2 * i), 12);
          const flip = prog(frame, appearAt(scene, 2 * i + 1), 20);
          const sx = Math.max(0.02, Math.abs(Math.cos(flip * Math.PI)));
          const back = flip >= 0.5;
          const color = back ? theme.ok : theme.warn;
          const one = n === 1;
          const iconCx = one ? cx : 100;
          const iconCy = one ? y + 100 : cy;
          return (
            <g key={i} opacity={show} transform={`translate(0 ${(1 - show) * 40})`}>
              <g transform={`translate(${cx} ${cy}) scale(${sx} 1) translate(${-cx} ${-cy})`}>
                <rect x={40} y={y} width={760} height={hS} rx={32} fill={theme.panel} stroke={color} strokeWidth={6} />
                {back ? (
                  <Tick cx={iconCx} cy={iconCy} r={one ? 50 : 36} p={prog(frame, appearAt(scene, 2 * i + 1) + 8, 14)} color={theme.ok} ink={theme.bg} />
                ) : (
                  <Cross cx={iconCx} cy={iconCy} r={one ? 50 : 36} p={prog(frame, appearAt(scene, 2 * i) + 4, 14)} color={theme.warn} ink={theme.bg} />
                )}
                {one ? (
                  <>
                    <T x={cx} y={y + 230} text={back ? "SỰ THẬT" : "HUYỀN THOẠI"} size={40} width={680} maxLines={1} fill={color} />
                    <T x={cx} y={y + 360} text={back ? pair.fact : pair.myth} size={50} width={680} maxLines={6} fill={theme.fg} lh={1.25} />
                  </>
                ) : (
                  <>
                    <T x={170} y={y + 52} text={back ? "SỰ THẬT" : "HUYỀN THOẠI"} size={30} width={600} maxLines={1} fill={color} anchor="start" />
                    <T x={170} y={y + 100} text={back ? pair.fact : pair.myth} size={36} width={600} maxLines={Math.max(1, Math.floor((hS - 90) / 45))} fill={theme.fg} anchor="start" lh={1.2} />
                  </>
                )}
              </g>
            </g>
          );
        })}
      </Stage>
    );
  }
  const gap = 40;
  const w = Math.min(760, (1720 - (n - 1) * gap) / n);
  const x0 = 960 - (n * w + (n - 1) * gap) / 2;
  return (
    <Stage>
      {pairs.map((pair, i) => {
        const cx = x0 + i * (w + gap) + w / 2;
        const cy = TOP + H / 2;
        const show = prog(frame, appearAt(scene, 2 * i), 12);
        const flip = prog(frame, appearAt(scene, 2 * i + 1), 20);
        const sx = Math.max(0.02, Math.abs(Math.cos(flip * Math.PI)));
        const back = flip >= 0.5;
        const color = back ? theme.ok : theme.warn;
        const textW = w - 80;
        return (
          <g key={i} opacity={show} transform={`translate(0 ${(1 - show) * 40})`}>
            <g transform={`translate(${cx} ${cy}) scale(${sx} 1) translate(${-cx} ${-cy})`}>
              <rect x={cx - w / 2} y={TOP} width={w} height={H} rx={32} fill={theme.panel} stroke={color} strokeWidth={6} />
              {back ? (
                <Tick cx={cx} cy={TOP + 90} r={44} p={prog(frame, appearAt(scene, 2 * i + 1) + 8, 14)} color={theme.ok} ink={theme.bg} />
              ) : (
                <Cross cx={cx} cy={TOP + 90} r={44} p={prog(frame, appearAt(scene, 2 * i) + 4, 14)} color={theme.warn} ink={theme.bg} />
              )}
              <T x={cx} y={TOP + 200} text={back ? "SỰ THẬT" : "HUYỀN THOẠI"} size={40} width={textW} maxLines={1} fill={color} />
              <T x={cx} y={TOP + 330} text={back ? pair.fact : pair.myth} size={46} width={textW} maxLines={5} fill={theme.fg} lh={1.25} />
            </g>
          </g>
        );
      })}
    </Stage>
  );
};
