import React from "react";
import { interpolate } from "remotion";
import { COLORS, Label, Link, Node, Packet, POS, Stage, useBeat, useBeatStart, useSpring } from "../kit";
import type { Scene } from "../timeline";

export const Phone: React.FC<{ scene: Scene }> = ({ scene }) => {
  const send = useBeat(scene, "send");
  const far = useBeat(scene, 1);
  const go = useBeat(scene, 2);
  const sendAt = useBeatStart(scene, "send");
  const enter = useSpring(send);
  const press = interpolate(send, [20, 26, 32], [1, 0.8, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const linkP = interpolate(far, [0, 60], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const dest = { x: 1680, y: 440 };
  return (
    <Stage>
      <Link from={POS.phone} to={dest} progress={linkP} dashed />
      <Node x={POS.phone.x} y={POS.phone.y} label="Điện thoại của bạn" kind="phone" progress={enter} />
      <g opacity={useSpring(send, 4)} transform={`translate(${POS.phone.x} ${POS.phone.y - 190})`}>
        <rect x={-130} y={-40} width={260} height={80} rx={24} fill={COLORS.accent} />
        <Label x={0} y={12} size={34} color={COLORS.bg}>Xin chào!</Label>
      </g>
      <g transform={`translate(${POS.phone.x + 220} ${POS.phone.y + 20}) scale(${press})`} opacity={useSpring(send, 14)}>
        <circle r={44} fill={COLORS.ok} />
        <Label x={0} y={12} size={32} color={COLORS.bg}>Gửi</Label>
      </g>
      {send >= 30 && <Packet from={{ x: POS.phone.x + 80, y: POS.phone.y }} to={{ x: 1100, y: 440 }} start={sendAt + 30} duration={50} />}
      <Node x={dest.x} y={dest.y} label="Người bạn" kind="phone" progress={useSpring(far, 20)} />
      <Label x={960} y={700} size={44} color={COLORS.muted} opacity={useSpring(go, 0)}>
        Một chặng đường dài ở giữa…
      </Label>
    </Stage>
  );
};
