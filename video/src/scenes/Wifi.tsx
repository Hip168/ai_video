import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { COLORS, Label, Link, Node, Packet, POS, Stage, useBeat, useBeatStart, useSpring } from "../kit";
import type { Scene } from "../timeline";

export const Wifi: React.FC<{ scene: Scene }> = ({ scene }) => {
  const wifi = useBeat(scene, "wifi");
  const gate = useBeat(scene, "gateway");
  const wifiAt = useBeatStart(scene, "wifi");
  const gateAt = useBeatStart(scene, "gateway");
  const frame = useCurrentFrame();
  const net = { x: 1250, y: 440 };
  const pulse = (k: number) => interpolate((frame + k * 12) % 36, [0, 36], [0, 1]);
  return (
    <Stage>
      <Link from={POS.phone} to={POS.router} dashed />
      <Link from={POS.router} to={net} progress={useSpring(gate, 0)} />
      <Node x={POS.phone.x} y={POS.phone.y} label="Điện thoại" kind="phone" />
      <Node x={POS.router.x} y={POS.router.y} label="Router nhà bạn" kind="router" progress={useSpring(wifi)} />
      {wifi >= 0 && [0, 1, 2].map((k) => (
        <path
          key={k}
          d={`M ${POS.phone.x + 70 + k * 40} ${POS.phone.y - 40 - k * 14} q ${20 + k * 8} ${40 + k * 14} 0 ${80 + k * 28}`}
          fill="none"
          stroke={COLORS.accent}
          strokeWidth={6}
          strokeLinecap="round"
          opacity={1 - pulse(k)}
        />
      ))}
      {[0, 1, 2].map((i) => wifi >= 0 && gate < 0 && (
        <Packet key={i} from={{ x: POS.phone.x + 80, y: POS.phone.y }} to={{ x: POS.router.x - 90, y: POS.router.y }} start={wifiAt + 12 + i * 14} duration={40} />
      ))}
      <g opacity={useSpring(gate, 0)}>
        <Node x={net.x} y={net.y} label="Internet" kind="server" />
        <Label x={960} y={700} size={40} color={COLORS.muted}>Người gác cổng của mạng nhà</Label>
      </g>
      {gate >= 0 && [0, 1, 2].map((i) => (
        <Packet key={i} from={{ x: POS.router.x + 90, y: POS.router.y }} to={{ x: net.x - 90, y: net.y }} start={gateAt + 10 + i * 14} duration={50} />
      ))}
    </Stage>
  );
};
