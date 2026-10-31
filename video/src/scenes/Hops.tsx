import React from "react";
import { useCurrentFrame } from "remotion";
import { COLORS, Label, Link, Node, Packet, POS, Stage, useBeat, useBeatStart, useSpring } from "../kit";
import type { Scene } from "../timeline";

const SLOTS = [
  { x: 1640, y: 300 },
  { x: 1640, y: 440 },
  { x: 1640, y: 580 },
];

// Gói #2 về trước, rồi #1, rồi #3: đến nơi không đúng thứ tự (offset so với đầu cue paths).
const ROUTES = [
  { label: "#1", via: [POS.isp2, POS.isp3], legs: [34, 24, 34], start: 8, slot: 1 },
  { label: "#2", via: [POS.isp1, POS.isp3], legs: [22, 20, 22], start: 20, slot: 0 },
  { label: "#3", via: [POS.isp3], legs: [42, 28], start: 40, slot: 2 },
];

export const Hops: React.FC<{ scene: Scene }> = ({ scene }) => {
  const frame = useCurrentFrame();
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
      {paths >= 0 && route2.slice(1).map((p, i) => <Link key={`d${i}`} from={route2[i]} to={p} progress={useSpring(paths, i * 8)} dashed />)}
      <Node x={a.x} y={a.y} label="Router nhà" kind="router" progress={useSpring(hop)} />
      <Node x={POS.isp1.x} y={POS.isp1.y} label="Nhà mạng A" kind="router" progress={useSpring(hop, 6)} />
      <Node x={POS.isp2.x} y={POS.isp2.y} label="Nhà mạng B" kind="router" progress={useSpring(paths, 0)} />
      <Node x={POS.isp3.x} y={POS.isp3.y} label="Nhà mạng C" kind="router" progress={useSpring(hop, 12)} />
      <Node x={end.x} y={end.y} label="Máy chủ" kind="server" progress={useSpring(hop, 18)} />
      {hop >= 20 && next < 0 && route1.slice(1).map((p, i) => frame >= hopAt + 20 + i * 24 && (
        <Packet key={i} from={route1[i]} to={p} start={hopAt + 20 + i * 24} duration={22} />
      ))}
      <g opacity={paths < 0 ? useSpring(next, 0) : 0}>
        <rect x={POS.isp1.x - 110} y={POS.isp1.y - 105} width={220} height={175} rx={30} fill="none" stroke={COLORS.accent} strokeWidth={5} />
        <Label x={POS.isp1.x} y={POS.isp1.y - 140} size={34} color={COLORS.accent}>Chỉ chọn chặng kế</Label>
        <Label x={POS.isp1.x + 190} y={POS.isp1.y + 10} size={90} color={COLORS.accent}>➜</Label>
      </g>
      {paths >= 0 && ROUTES.filter((r) => frame >= pathsAt + r.start).map((r) => {
        const pts = [a, ...r.via, SLOTS[r.slot]];
        let t = pathsAt + r.start;
        let k = 0;
        while (k < r.legs.length - 1 && frame >= t + r.legs[k]) {
          t += r.legs[k];
          k++;
        }
        return <Packet key={r.label} from={pts[k]} to={pts[k + 1]} start={t} duration={r.legs[k]} label={r.label} />;
      })}
    </Stage>
  );
};
