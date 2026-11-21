import React from "react";
import { useCurrentFrame } from "remotion";
import { useTheme } from "../../lib/hooks";
import { Stage } from "../../lib/theme";
import type { SceneProps } from "../../lib/types";
import { Arrow, at, ChapterTag, Chip, modeOf, p, Txt, useGeom } from "./common";

/** Hộp thư tự vẽ (chân cột, thân hộp, cờ). Tâm đáy (x, y), cao s. */
export const MailBox: React.FC<{ x: number; y: number; s: number; body: string; line: string; flag: string; opacity?: number }> = ({ x, y, s, body, line, flag, opacity = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${s / 100})`} opacity={opacity}>
    <rect x={-6} y={-50} width={12} height={50} fill={line} />
    <path d="M-34 -50 V-80 A20 20 0 0 1 -14 -100 H20 A20 20 0 0 1 40 -80 V-50 Z" fill={body} stroke={line} strokeWidth={5} />
    <rect x={22} y={-108} width={6} height={36} fill={line} />
    <rect x={28} y={-108} width={22} height={14} fill={flag} />
  </g>
);

/**
 * Cái hộp thư nằm trên ổ hàng trăm lần (c017).
 * - `ke`: beat 0 mặt ổ cứng chia thành nhiều khúc, khúc nào cũng có một bản của cùng một cái hộp thư (hiện đủ ngay frame 0);
 *         beat 1 tên game và nguồn (chỉ chữ).
 * - `chep`: beat 0 mỗi khối phố có hộp thư, nên hộp thư được chép vào khúc của khối phố ấy; beat 1 cùng một hộp thư bị chép lại hàng trăm lần.
 * props: `chapterLabel` (chỉ hiện ở khung ngang).
 */
export const HopThu: React.FC<SceneProps> = ({ scene }) => {
  const mode = modeOf(scene.props, "ke");
  const label = typeof scene.props.chapterLabel === "string" ? scene.props.chapterLabel : "";
  return (
    <Stage>
      {mode === "chep" ? <Chep scene={scene} /> : <Ke scene={scene} />}
      <ChapterTag text={label} />
    </Stage>
  );
};

const Ke: React.FC<SceneProps> = ({ scene }) => {
  const t = useTheme();
  const f = useCurrentFrame();
  const { sq } = useGeom();
  const t1 = at(scene, 1);
  const G = sq ? { x: 60, y: 40, w: 720, h: 520, cols: 6, rows: 4 } : { x: 120, y: 110, w: 1680, h: 470, cols: 10, rows: 4 };
  const cw = G.w / G.cols;
  const ch = G.h / G.rows;
  const hot = Math.floor(f / 6) % (G.cols * G.rows);
  return (
    <g>
      <rect x={G.x - 10} y={G.y - 10} width={G.w + 20} height={G.h + 20} rx={20} fill={t.panel} stroke={t.muted} strokeWidth={4} />
      {Array.from({ length: G.cols * G.rows }, (_, i) => {
        const c = i % G.cols;
        const r = Math.floor(i / G.cols);
        const x = G.x + c * cw;
        const y = G.y + r * ch;
        return (
          <g key={i}>
            <rect x={x + 6} y={y + 6} width={cw - 12} height={ch - 12} rx={10} fill={t.bg} stroke={i === hot ? t.accent2 : t.muted} strokeWidth={i === hot ? 5 : 2} />
            <MailBox x={x + cw / 2} y={y + ch - 16} s={ch * 0.66} body={t.accent} line={t.fg} flag={t.warn} />
          </g>
        );
      })}
      <Txt text="cùng một cái hộp thư, chép trên ổ cứng tới hàng trăm lần" x={sq ? 420 : 960} y={sq ? 620 : 660} w={sq ? 720 : 1600} s={sq ? 36 : 50} fill={t.fg} lines={2} />
      <g opacity={p(f, t1, 14)}>
        <Chip x={sq ? 60 : 560} y={sq ? 720 : 710} w={sq ? 720 : 800} h={sq ? 76 : 84} text="Marvel's Spider-Man, theo Mark Cerny" s={sq ? 32 : 40} fill={t.accent2} color={t.bg} />
      </g>
    </g>
  );
};

const Chep: React.FC<SceneProps> = ({ scene }) => {
  const t = useTheme();
  const f = useCurrentFrame();
  const { sq } = useGeom();
  const t1 = at(scene, 1);
  const a1 = p(f, t1, 16);
  const n = 4;
  const bw = sq ? 160 : 300;
  const gap = sq ? 24 : 120;
  const x0 = (sq ? 840 : 1920) / 2 - (n * bw + (n - 1) * gap) / 2;
  const by = sq ? 50 : 70;
  const bh = sq ? 160 : 200;
  const dy = sq ? 330 : 420;
  const dh = sq ? 150 : 170;
  return (
    <g>
      {Array.from({ length: n }, (_, i) => {
        const x = x0 + i * (bw + gap);
        const ar = p(f, 10 + i * 8, 16);
        return (
          <g key={i}>
            {/* khối phố */}
            <rect x={x} y={by} width={bw} height={bh} rx={14} fill={t.panel} stroke={t.accent} strokeWidth={4} />
            <rect x={x + 14} y={by + 16} width={bw * 0.36} height={bh * 0.55} rx={6} fill={t.accent} opacity={0.6} />
            <rect x={x + bw * 0.5} y={by + 30} width={bw * 0.22} height={bh * 0.4} rx={6} fill={t.accent} opacity={0.45} />
            <MailBox x={x + bw * 0.78} y={by + bh - 12} s={bh * 0.42} body={t.accent2} line={t.fg} flag={t.warn} />
            <Arrow x1={x + bw / 2} y1={by + bh + 10} x2={x + bw / 2} y2={by + bh + 10 + (dy - by - bh - 24) * ar} color={t.muted} w={4} head={16} opacity={ar} />
            {/* khúc trên ổ */}
            <rect x={x} y={dy} width={bw} height={dh} rx={12} fill={t.bg} stroke={t.muted} strokeWidth={3} />
            <rect x={x + 12} y={dy + 14} width={bw * 0.3} height={dh - 28} rx={6} fill={t.accent} opacity={0.5} />
            <rect x={x + bw * 0.4} y={dy + 30} width={bw * 0.18} height={dh - 44} rx={6} fill={t.accent} opacity={0.4} />
            <g opacity={ar}>
              <MailBox x={x + bw * 0.8} y={dy + dh - 12} s={dh * 0.5} body={t.accent2} line={t.fg} flag={t.warn} />
            </g>
          </g>
        );
      })}
      <Txt text="khối phố có hộp thư thì khúc của nó cũng có" x={sq ? 420 : 960} y={dy + dh + (sq ? 50 : 70)} w={sq ? 700 : 1500} s={sq ? 32 : 42} fill={t.accent2} lines={sq ? 2 : 1} />
      <g opacity={a1}>
        <rect x={sq ? 60 : 460} y={sq ? 640 : 720} width={sq ? 720 : 1000} height={sq ? 110 : 90} rx={22} fill={t.warn} />
        <Txt text="cùng một hộp thư: chép lại hàng trăm lần" x={sq ? 420 : 960} y={sq ? 684 : 778} w={sq ? 680 : 960} s={sq ? 36 : 44} fill={t.bg} lines={sq ? 2 : 1} />
      </g>
    </g>
  );
};
