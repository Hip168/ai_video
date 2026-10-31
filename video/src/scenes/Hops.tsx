import React from "react";
import { COLORS, Label, Link, Node, Packet, POS, Stage, useBeat, useBeatStart, useSpring } from "../kit";
import type { Scene } from "../timeline";

export const Hops: React.FC<{ scene: Scene }> = ({ scene }) => {
  const hop = useBeat(scene, "hop");
  const next = useBeat(scene, "next-hop");
  const paths = useBeat(scene, "paths");
  const hopAt = useBeatStart(scene, "hop");
  const pathsAt = useBeatStart(scene, "paths");
  const a = POS.router;
  const chain = [a, POS.isp1, POS.isp3];
  const alt = [a, POS.isp2, POS.isp3];
  const end = POS.server;
  const legs = (pts: typeof chain, to: typeof end) => [...pts, to];
  const route1 = legs(chain, end);
  const route2 = legs(alt, end);
  return (
    <Stage>
      {route1.slice(1).map((p, i) => <Link key={`u${i}`} from={route1[i]} to={p} progress={useSpring(hop, i * 8)} />)}
      {route2.slice(1).map((p, i) => <Link key={`d${i}`} from={route2[i]} to={p} progress={useSpring(paths, i * 8)} dashed />)}
      <Node x={a.x} y={a.y} label="Router nhà" kind="router" progress={useSpring(hop)} />
      <Node x={POS.isp1.x} y={POS.isp1.y} label="Nhà mạng A" kind="router" progress={useSpring(hop, 6)} />
      <Node x={POS.isp2.x} y={POS.isp2.y} label="Nhà mạng B" kind="router" progress={useSpring(paths, 0)} />
      <Node x={POS.isp3.x} y={POS.isp3.y} label="Nhà mạng C" kind="router" progress={useSpring(hop, 12)} />
      <Node x={end.x} y={end.y} label="Máy chủ" kind="server" progress={useSpring(hop, 18)} />
      {hop >= 20 && next < 0 && route1.slice(1).map((p, i) => (
        <Packet key={i} from={route1[i]} to={p} start={hopAt + 20 + i * 24} duration={22} />
      ))}
      <g opacity={useSpring(next, 0)}>
        <circle cx={POS.isp1.x} cy={POS.isp1.y} r={110} fill="none" stroke={COLORS.accent} strokeWidth={5} />
        <Label x={POS.isp1.x} y={POS.isp1.y - 140} size={34} color={COLORS.accent}>Chỉ chọn chặng kế</Label>
        <Label x={POS.isp1.x + 190} y={POS.isp1.y + 10} size={90} color={COLORS.accent}>➜</Label>
      </g>
      {paths >= 0 && [0, 1, 2].map((i) => (
        <Packet
          key={i}
          from={a}
          to={i === 1 ? POS.isp2 : POS.isp1}
          start={pathsAt + 10 + i * 20}
          duration={30 + i * 14}
          label={`#${i + 1}`}
        />
      ))}
    </Stage>
  );
};
