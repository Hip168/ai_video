import React from "react";
import { useCurrentFrame } from "remotion";
import { useTheme } from "../../lib/hooks";
import { Stage } from "../../lib/theme";
import type { SceneProps } from "../../lib/types";
import { at, ClockFace, clamp01, Laptop, lerp, Mark, p, ServerBox, Txt, useGeom } from "./common";

/** Nguyên tử vẽ bằng nhân và ba quỹ đạo. */
const Atom: React.FC<{ x: number; y: number; r: number; color: string; f: number }> = ({ x, y, r, color, f }) => (
  <g transform={`translate(${x} ${y})`}>
    {[0, 60, 120].map((a) => (
      <ellipse key={a} cx={0} cy={0} rx={r} ry={r * 0.36} fill="none" stroke={color} strokeWidth={4} transform={`rotate(${a + f * 0.6})`} />
    ))}
    <circle r={r * 0.16} fill={color} />
  </g>
);

/**
 * Máy hỏi giờ qua mạng.
 * Beat 0: máy tính không có đồng hồ nguyên tử, gửi câu hỏi qua mạng.
 * Beat 1: máy chủ giờ, chuyên trả lời đúng một câu "bây giờ là mấy giờ", gửi giờ về.
 */
export const HoiGio: React.FC<SceneProps> = ({ scene }) => {
  const t = useTheme();
  const f = useCurrentFrame();
  const { sq } = useGeom();
  const t1 = at(scene, 1);
  const L = sq ? { x: 230, y: 230, w: 320 } : { x: 400, y: 360, w: 440 };
  const S = sq ? { x: 650, y: 520, w: 190 } : { x: 1530, y: 360, w: 270 };
  const from = { x: L.x + L.w / 2 + (sq ? 0 : 30), y: L.y + (sq ? 130 : 0) };
  const to = { x: S.x - S.w / 2 - (sq ? 10 : 30), y: S.y };
  // gói hỏi: chạy trong beat 0 rồi lặp; gói trả lời: từ beat 1
  const q = clamp01(((f - 40) % 120) / 70);
  const qOn = f >= 40 && f < t1 + 20;
  const r = clamp01((f - t1 - 20) / 50);
  const srvOn = p(f, t1, 12);
  const pos = (u: number) => ({ x: lerp(from.x, to.x, u), y: lerp(from.y, to.y, u) });
  const qp = pos(q);
  const rp = pos(1 - r);
  return (
    <Stage>
      <g>
        <Laptop x={L.x} y={L.y} w={L.w} fill={t.panel} line={t.muted} screen={t.bg}>
          <ClockFace cx={L.x} cy={L.y} r={L.w * 0.18} hours={r >= 1 ? 10.15 : 10.15 + Math.sin(f * 0.05) * 0.4} ring={r >= 1 ? t.ok : t.accent2} face={t.panel} hand={t.fg} />
        </Laptop>
        {r >= 1 && <Mark cx={L.x + L.w * 0.32} cy={L.y - L.w * 0.18} r={sq ? 30 : 36} ok />}
        {/* đồng hồ nguyên tử gạch bỏ */}
        <g transform={`translate(${sq ? L.x - 120 : L.x - 40} ${sq ? 60 : 110})`}>
          <Atom x={0} y={0} r={sq ? 44 : 56} color={t.muted} f={f} />
          <line x1={sq ? -52 : -66} y1={sq ? -52 : -66} x2={sq ? 52 : 66} y2={sq ? 52 : 66} stroke={t.warn} strokeWidth={8} strokeLinecap="round" />
        </g>
        <Txt text="không mang đồng hồ nguyên tử" x={sq ? 560 : L.x} y={sq ? 52 : 690} w={sq ? 520 : 620} s={sq ? 32 : 38} fill={t.muted} weight={400} lines={sq ? 2 : 1} />
        {/* đường mạng */}
        <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={t.muted} strokeWidth={5} strokeDasharray="16 14" />
        <ServerBox x={S.x} y={S.y} w={S.w} fill={t.panel} line={srvOn > 0 ? t.accent : t.muted} led={t.ok} on={srvOn} />
        <Txt text="Máy chủ giờ" x={S.x} y={S.y + S.w * 0.6 + (sq ? 50 : 66)} w={sq ? 300 : 420} s={sq ? 38 : 46} fill={srvOn > 0 ? t.accent : t.fg} />
      </g>
      {qOn && f >= 40 && (
        <g transform={`translate(${qp.x} ${qp.y})`}>
          <rect x={sq ? -150 : -210} y={sq ? -46 : -50} width={sq ? 300 : 420} height={sq ? 76 : 84} rx={20} fill={t.accent2} />
          <Txt text="mấy giờ rồi?" x={0} y={sq ? 4 : 6} w={sq ? 280 : 390} s={sq ? 38 : 44} fill={t.bg} />
        </g>
      )}
      {f >= t1 + 20 && (
        <g transform={`translate(${rp.x} ${rp.y})`} opacity={r >= 1 ? 0 : 1}>
          <circle r={sq ? 40 : 48} fill={t.ok} />
          <ClockFace cx={0} cy={0} r={sq ? 30 : 36} hours={10.15} ring={t.bg} face={t.ok} hand={t.bg} />
        </g>
      )}
      <g opacity={srvOn}>
        <Txt
          text="chỉ trả lời một câu: bây giờ là mấy giờ"
          x={sq ? 420 : 1240}
          y={sq ? 800 : 140}
          w={sq ? 790 : 1100}
          s={sq ? 34 : 42}
          fill={t.accent}
        />
      </g>
    </Stage>
  );
};
