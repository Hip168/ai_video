import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { Link, Node, Packet, POS, Stage } from "./kit";

/** Chỉ để test linh kiện: Node, Link, Packet đổi theo frame. */
export const KitDemo: React.FC = () => {
  const frame = useCurrentFrame();
  const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
  return (
    <Stage>
      <Link from={POS.phone} to={POS.server} progress={interpolate(frame, [0, 60], [0, 1], clamp)} />
      <Node
        x={POS.phone.x}
        y={POS.phone.y}
        label="Điện thoại"
        kind="phone"
        progress={interpolate(frame, [0, 30], [0.2, 1], clamp)}
      />
      <Node x={POS.server.x} y={POS.server.y} label="Máy chủ" kind="server" />
      <Packet from={POS.phone} to={POS.server} start={0} duration={60} label="1" />
    </Stage>
  );
};
