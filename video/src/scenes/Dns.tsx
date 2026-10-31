import React from "react";
import { COLORS, Label, Link, Node, Packet, POS, Stage, useBeat, useBeatStart, useSpring } from "../kit";
import type { Scene } from "../timeline";

export const Dns: React.FC<{ scene: Scene }> = ({ scene }) => {
  const need = useBeat(scene, "dns-need");
  const query = useBeat(scene, "dns-query");
  const reply = useBeat(scene, "dns-reply");
  const queryAt = useBeatStart(scene, "dns-query");
  const replyAt = useBeatStart(scene, "dns-reply");
  const book = POS.dns;
  const phone = POS.phone;
  return (
    <Stage>
      <Link from={phone} to={book} progress={useSpring(query, 0)} dashed />
      <Node x={phone.x} y={phone.y} label="Điện thoại" kind="phone" progress={useSpring(need)} />
      <Node x={book.x} y={book.y} label="DNS (danh bạ)" kind="book" progress={useSpring(query, 0)} />
      <g opacity={useSpring(need, 6)} transform={`translate(${phone.x + 330} ${phone.y - 190})`}>
        <rect x={-190} y={-45} width={380} height={90} rx={22} fill="#16223a" stroke={COLORS.warn} strokeWidth={4} />
        <Label x={0} y={12} size={34}>Địa chỉ máy chủ?</Label>
      </g>
      {query >= 10 && <Packet from={{ x: phone.x + 80, y: phone.y }} to={{ x: book.x - 90, y: book.y }} start={queryAt + 10} duration={60} label="chat.app?" />}
      {reply >= 10 && <Packet from={{ x: book.x - 90, y: book.y + 40 }} to={{ x: phone.x + 80, y: phone.y + 40 }} start={replyAt + 10} duration={60} label="203.0.113.7" />}
      <Label x={phone.x} y={phone.y + 200} size={44} color={COLORS.ok} opacity={useSpring(reply, 72)}>
        IP: 203.0.113.7
      </Label>
    </Stage>
  );
};
