import React from "react";
import { interpolate } from "remotion";
import { COLORS, Label, Link, Node, Packet, POS, Stage, useBeat, useBeatStart, useSpring } from "../kit";
import type { Scene } from "../timeline";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const SLOT_X = [420, 600, 780, 960];
const SLOT_Y = 440;
const LANE_Y = 560; // trục gửi lại, cùng trục với yêu cầu
const SENDER_X = 300;
const RESEND_DONE = 70; // frame (tương đối beat resend) mà ô thiếu được lấp

const Slot: React.FC<{ x: number; n: number; fill: string; ghost?: boolean }> = ({ x, n, fill, ghost }) => (
  <g transform={`translate(${x} ${SLOT_Y})`} opacity={ghost ? 0.6 : 1}>
    <rect x={-70} y={-45} width={140} height={90} rx={12} fill={ghost ? "none" : fill} stroke={fill} strokeWidth={5} strokeDasharray={ghost ? "10 10" : undefined} />
    <Label x={0} y={14} size={40} color={ghost ? fill : COLORS.bg}>{ghost ? "?" : `#${n}`}</Label>
  </g>
);

export const Server: React.FC<{ scene: Scene }> = ({ scene }) => {
  const reorder = useBeat(scene, "reorder");
  const resend = useBeat(scene, "resend");
  const forward = useBeat(scene, "forward");
  const resendAt = useBeatStart(scene, "resend");
  // thứ tự đến: 3,1,4,2 -> sắp lại 1,2,3,4
  const order = [3, 1, 4, 2];
  const sort = interpolate(reorder, [40, 90], [0, 1], clamp);
  const missing = resend >= 0 && resend < RESEND_DONE;
  const window = (a: number, b: number) => resend >= a && resend < b;
  const srv = POS.server;
  return (
    <Stage>
      <Node x={srv.x} y={srv.y} label="Máy chủ" kind="server" progress={useSpring(reorder)} />
      {order.map((n, i) => {
        const x = SLOT_X[i] + (SLOT_X[n - 1] - SLOT_X[i]) * sort;
        if (missing && n === 3) return <Slot key={n} x={SLOT_X[2]} n={n} fill={COLORS.warn} ghost />;
        return <Slot key={n} x={x} n={n} fill={COLORS.packet} />;
      })}
      {missing && (
        <>
          <Label x={SLOT_X[2]} y={SLOT_Y - 80} size={34} color={COLORS.warn} opacity={useSpring(resend, 2)}>
            Thiếu #3 — gửi lại!
          </Label>
          <Link from={{ x: srv.x - 100, y: LANE_Y }} to={{ x: SENDER_X, y: LANE_Y }} dashed progress={useSpring(resend, 4)} />
        </>
      )}
      {window(8, 38) && <Packet from={{ x: srv.x - 100, y: LANE_Y }} to={{ x: SENDER_X, y: LANE_Y }} start={resendAt + 8} duration={30} label="Gửi lại #3?" />}
      {window(38, 62) && <Packet from={{ x: SENDER_X, y: LANE_Y }} to={{ x: SLOT_X[2], y: LANE_Y }} start={resendAt + 38} duration={24} label="#3" />}
      {window(62, RESEND_DONE) && <Packet from={{ x: SLOT_X[2], y: LANE_Y }} to={{ x: SLOT_X[2], y: SLOT_Y }} start={resendAt + 62} duration={8} />}
      {forward >= 0 && (
        <g opacity={useSpring(forward)}>
          <Link from={{ x: srv.x + 90, y: srv.y }} to={{ x: POS.receiver.x - 70, y: POS.receiver.y }} progress={interpolate(forward, [10, 50], [0, 1], clamp)} />
          <Node x={POS.receiver.x} y={POS.receiver.y} label="Người nhận" kind="phone" />
          <Label x={(srv.x + POS.receiver.x) / 2} y={700} size={38} color={COLORS.muted}>Tìm người nhận…</Label>
        </g>
      )}
    </Stage>
  );
};
