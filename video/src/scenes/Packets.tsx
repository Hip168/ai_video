import React from "react";
import { interpolate } from "remotion";
import { COLORS, Label, Node, POS, Stage, useBeat, useSpring } from "../kit";
import type { Scene } from "../timeline";

const PARTS = [1, 2, 3, 4];

export const Packets: React.FC<{ scene: Scene }> = ({ scene }) => {
  const split = useBeat(scene, "split");
  const label = useBeat(scene, "label");
  const spread = interpolate(split, [10, 50], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <Stage>
      <Node x={POS.phone.x} y={POS.phone.y} label="Tin nhắn" kind="phone" progress={useSpring(split)} />
      {PARTS.map((n, i) => {
        const y = 440 + (i - 1.5) * 130 * spread;
        const x = 700 + 120 * spread;
        return (
          <g key={n} transform={`translate(${x} ${y})`}>
            <rect x={-60} y={-40} width={120} height={80} rx={10} fill={COLORS.packet} />
            <polyline points="-60,-40 0,6 60,-40" fill="none" stroke="#7a5200" strokeWidth={4} />
            <Label x={0} y={34} size={30} color={COLORS.bg}>{`#${n}`}</Label>
          </g>
        );
      })}
      <g opacity={useSpring(label, 0)} transform={`translate(1300 420)`}>
        <rect x={-280} y={-170} width={560} height={340} rx={20} fill="#16223a" stroke={COLORS.packet} strokeWidth={5} />
        <Label x={0} y={-100} size={34} color={COLORS.packet}>Phong bì (packet)</Label>
        <Label x={0} y={-30} size={36}>Từ: điện thoại</Label>
        <Label x={0} y={30} size={36}>Đến: máy chủ</Label>
        <Label x={0} y={90} size={36}>Số thứ tự: 3</Label>
      </g>
    </Stage>
  );
};
