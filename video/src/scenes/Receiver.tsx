import React from "react";
import { interpolate } from "remotion";
import { COLORS, Label, Link, Node, Packet, POS, Stage, useBeat, useBeatStart, useSpring } from "../kit";
import type { Scene } from "../timeline";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export const Receiver: React.FC<{ scene: Scene }> = ({ scene }) => {
  const deliver = useBeat(scene, "deliver");
  const notify = useBeat(scene, "notify");
  const end = useBeat(scene, "end");
  const deliverAt = useBeatStart(scene, "deliver");
  const phone = { x: 1500, y: 440 };
  const shake = notify >= 0 && notify < 40 ? Math.sin(notify * 1.6) * 10 * (1 - notify / 40) : 0;
  return (
    <Stage>
      <Link from={{ x: 340, y: 440 }} to={phone} />
      <Node x={340} y={440} label="Máy chủ" kind="server" progress={useSpring(deliver)} />
      <g transform={`translate(${shake} 0)`}>
        <Node x={phone.x} y={phone.y} label="Người nhận" kind="phone" progress={useSpring(deliver, 10)} />
      </g>
      {deliver >= 10 && notify < 0 && [0, 1, 2, 3].map((i) => (
        <Packet key={i} from={{ x: 430, y: 440 }} to={{ x: phone.x - 80, y: phone.y }} start={deliverAt + 10 + i * 14} duration={60} />
      ))}
      <g opacity={useSpring(notify, 6)} transform={`translate(${phone.x} ${phone.y - 190})`}>
        <rect x={-150} y={-40} width={300} height={80} rx={24} fill={COLORS.accent} />
        <Label x={0} y={12} size={34} color={COLORS.bg}>Xin chào!</Label>
      </g>
      <g opacity={useSpring(end, 0)}>
        <Label x={960} y={640} size={96} color={COLORS.ok}>≈ 1 giây</Label>
        <line x1={660} y1={700} x2={interpolate(end, [0, 40], [660, 1260], clamp)} y2={700} stroke={COLORS.ok} strokeWidth={8} strokeLinecap="round" />
      </g>
    </Stage>
  );
};
