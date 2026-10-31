import React from "react";
import { interpolate } from "remotion";
import { COLORS, Label, Node, POS, Stage, useBeat, useSpring } from "../kit";
import type { Scene } from "../timeline";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const SLOT_X = [620, 800, 980, 1160];

const Slot: React.FC<{ x: number; y: number; n: number; fill: string; ghost?: boolean }> = ({ x, y, n, fill, ghost }) => (
  <g transform={`translate(${x} ${y})`} opacity={ghost ? 0.5 : 1}>
    <rect x={-70} y={-45} width={140} height={90} rx={12} fill={ghost ? "none" : fill} stroke={fill} strokeWidth={5} strokeDasharray={ghost ? "10 10" : undefined} />
    <Label x={0} y={14} size={40} color={ghost ? fill : COLORS.bg}>{ghost ? "?" : `#${n}`}</Label>
  </g>
);

export const Server: React.FC<{ scene: Scene }> = ({ scene }) => {
  const reorder = useBeat(scene, "reorder");
  const resend = useBeat(scene, "resend");
  const forward = useBeat(scene, "forward");
  // thứ tự đến: 3,1,4,2 -> sắp lại 1,2,3,4
  const order = [3, 1, 4, 2];
  const sort = interpolate(reorder, [40, 90], [0, 1], clamp);
  const lost = resend >= 0;
  const back = interpolate(resend, [20, 70], [0, 1], clamp);
  return (
    <Stage>
      <Node x={400} y={440} label="Máy chủ" kind="server" progress={useSpring(reorder)} />
      {order.map((n, i) => {
        const target = n - 1;
        const x = SLOT_X[i] + (SLOT_X[target] - SLOT_X[i]) * sort;
        if (lost && n === 3) return <Slot key={n} x={SLOT_X[2]} y={440} n={n} fill={COLORS.warn} ghost />;
        return <Slot key={n} x={x} y={440} n={n} fill={COLORS.packet} />;
      })}
      {lost && (
        <g opacity={useSpring(resend, 6)}>
          <Label x={SLOT_X[2]} y={360} size={34} color={COLORS.warn}>Thiếu #3 — gửi lại!</Label>
          <g transform={`translate(${1560 + (SLOT_X[2] - 1560) * back} ${620})`}>
            <rect x={-60} y={-40} width={120} height={80} rx={10} fill={COLORS.packet} />
            <Label x={0} y={14} size={36} color={COLORS.bg}>#3</Label>
          </g>
        </g>
      )}
      {forward >= 0 && (
        <g opacity={useSpring(forward)}>
          <Label x={960} y={620} size={38} color={COLORS.muted}>Tìm người nhận…</Label>
          <Node x={POS.receiver.x} y={POS.receiver.y} label="Người nhận" kind="phone" />
          <line x1={1280} y1={440} x2={interpolate(forward, [10, 50], [1280, 1560], clamp)} y2={440} stroke={COLORS.ok} strokeWidth={8} strokeLinecap="round" />
        </g>
      )}
    </Stage>
  );
};
