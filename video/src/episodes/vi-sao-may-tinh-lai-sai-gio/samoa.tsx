import React from "react";
import { useCurrentFrame } from "remotion";
import { useTheme } from "../../lib/hooks";
import { Stage } from "../../lib/theme";
import type { SceneProps } from "../../lib/types";
import { Arrow, at, lerp, modeOf, Mono, p, Txt, useGeom } from "./common";

/**
 * Samoa bỏ hẳn một ngày (c022).
 * - `lich`: beat 0 ba tờ lịch thứ Năm 29, thứ Sáu 30, thứ Bảy 31 (12/2011), tờ 30 bị xé khỏi lịch; beat 1 23:59:59 thứ Năm nhảy thẳng sang 00:00:00 thứ Bảy.
 * - `doi-ngay`: beat 0 Samoa từ UTC−11 nhảy qua đường đổi ngày sang UTC+13; beat 1 khớp ngày với New Zealand và Úc.
 */
export const Samoa: React.FC<SceneProps> = ({ scene }) => {
  const mode = modeOf(scene.props, "lich");
  return mode === "doi-ngay" ? <DoiNgay scene={scene} /> : <Lich scene={scene} />;
};

const Lich: React.FC<SceneProps> = ({ scene }) => {
  const t = useTheme();
  const f = useCurrentFrame();
  const { sq } = useGeom();
  const t1 = at(scene, 1);
  const tear = p(f, 40, 24);
  const a1 = p(f, t1, 14);
  const jump = p(f, t1 + 16, 30);
  const G = sq
    ? { xs: [145, 420, 695], y: 150, w: 236, h: 300, head: 60, wd: 32, num: 120, timeY: 568, mono: 42, title: 44, titleY: 62 }
    : { xs: [500, 960, 1420], y: 170, w: 380, h: 420, head: 84, wd: 46, num: 190, timeY: 700, mono: 64, title: 54, titleY: 80 };
  const pages = [
    { wd: "Thứ Năm", d: "29" },
    { wd: "Thứ Sáu", d: "30" },
    { wd: "Thứ Bảy", d: "31" },
  ];
  return (
    <Stage>
      <Txt text="Samoa · tháng 12/2011" x={sq ? 420 : 960} y={G.titleY} w={sq ? 780 : 1200} s={G.title} fill={t.fg} />
      {pages.map((pg, i) => {
        const x = G.xs[i] - G.w / 2;
        const torn = i === 1;
        const rot = torn ? tear * 14 : 0;
        const dy = torn ? tear * 70 : 0;
        const op = torn ? 1 - tear * 0.75 : 1;
        return (
          <g key={i}>
            {torn && <rect x={x} y={G.y} width={G.w} height={G.h} rx={18} fill="none" stroke={t.warn} strokeWidth={4} strokeDasharray="14 10" opacity={tear} />}
            <g opacity={op} transform={`translate(${G.xs[i]} ${G.y + G.h / 2 + dy}) rotate(${rot}) translate(${-G.xs[i]} ${-(G.y + G.h / 2)})`}>
              <rect x={x} y={G.y} width={G.w} height={G.h} rx={18} fill={t.fg} />
              <rect x={x} y={G.y} width={G.w} height={G.head} rx={18} fill={torn ? t.warn : t.accent} />
              <rect x={x} y={G.y + G.head - 18} width={G.w} height={18} fill={torn ? t.warn : t.accent} />
              <Txt text={pg.wd} x={G.xs[i]} y={G.y + G.head / 2 + G.wd * 0.36} w={G.w - 20} s={G.wd} fill={t.bg} />
              <text x={G.xs[i]} y={G.y + G.head + (G.h - G.head) / 2 + G.num * 0.36} fontSize={G.num} fontWeight={700} fill={t.bg} textAnchor="middle">
                {pg.d}
              </text>
            </g>
            {torn && (
              <g opacity={tear}>
                <line x1={x + 20} y1={G.y + 20} x2={x + G.w - 20} y2={G.y + G.h - 20} stroke={t.warn} strokeWidth={10} strokeLinecap="round" />
                <line x1={x + G.w - 20} y1={G.y + 20} x2={x + 20} y2={G.y + G.h - 20} stroke={t.warn} strokeWidth={10} strokeLinecap="round" />
              </g>
            )}
          </g>
        );
      })}
      <g opacity={tear}>
        <Txt text="một ngày bị xóa khỏi lịch" x={G.xs[1]} y={G.y + G.h + (sq ? 44 : 60)} w={sq ? 420 : 600} s={sq ? 32 : 40} fill={t.warn} />
      </g>
      <g opacity={a1}>
        <rect x={G.xs[0] - (sq ? 125 : 190)} y={G.timeY - G.mono} width={sq ? 250 : 380} height={G.mono * 1.4} rx={14} fill={t.panel} stroke={t.muted} strokeWidth={3} />
        <Mono text="23:59:59" x={G.xs[0]} y={G.timeY + G.mono * 0.12} s={G.mono} fill={t.fg} />
      </g>
      <g opacity={jump}>
        <rect x={G.xs[2] - (sq ? 125 : 190)} y={G.timeY - G.mono} width={sq ? 250 : 380} height={G.mono * 1.4} rx={14} fill={t.panel} stroke={t.ok} strokeWidth={3} />
        <Mono text="00:00:00" x={G.xs[2]} y={G.timeY + G.mono * 0.12} s={G.mono} fill={t.ok} />
      </g>
      {a1 > 0 && (
        <path
          d={`M${G.xs[0] + (sq ? 40 : 70)} ${G.y - 8} Q${G.xs[1]} ${G.y - (sq ? 110 : 150)} ${lerp(G.xs[0] + 40, G.xs[2] - (sq ? 40 : 70), jump)} ${G.y - 8}`}
          fill="none"
          stroke={t.accent2}
          strokeWidth={7}
          strokeLinecap="round"
          opacity={a1}
        />
      )}
      <g opacity={p(f, t1 + 40, 12)}>
        <Txt text="nhảy thẳng sang thứ Bảy" x={sq ? 420 : 960} y={sq ? 680 : 790} w={sq ? 760 : 1000} s={sq ? 40 : 46} fill={t.accent2} />
      </g>
    </Stage>
  );
};

const DoiNgay: React.FC<SceneProps> = ({ scene }) => {
  const t = useTheme();
  const f = useCurrentFrame();
  const { sq } = useGeom();
  const t1 = at(scene, 1);
  const mv = p(f, 40, 50);
  const a1 = p(f, t1, 16);
  const G = sq
    ? { lineX: 470, top: 120, bot: 700, sFrom: 690, sTo: 340, sY: 360, nz: { x: 210, y: 520 }, au: { x: 90, y: 400 }, s: 34, dot: 22 }
    : { lineX: 1080, top: 110, bot: 720, sFrom: 1500, sTo: 860, sY: 340, nz: { x: 560, y: 520 }, au: { x: 260, y: 420 }, s: 44, dot: 28 };
  const sx = lerp(G.sFrom, G.sTo, mv);
  const off = mv >= 0.5 ? "UTC+13" : "UTC−11";
  const arc = Math.sin(mv * Math.PI) * (sq ? 80 : 120);
  return (
    <Stage>
      <rect x={sq ? 20 : 120} y={G.top} width={sq ? 800 : 1680} height={G.bot - G.top} rx={30} fill={t.accent} opacity={0.08} />
      <line x1={G.lineX} y1={G.top - 20} x2={G.lineX} y2={G.bot + 20} stroke={t.accent2} strokeWidth={6} strokeDasharray="18 14" />
      <Txt text="đường đổi ngày" x={G.lineX} y={G.bot + (sq ? 70 : 76)} w={sq ? 400 : 500} s={G.s} fill={t.accent2} />
      {/* vệt nhảy */}
      {mv > 0 && <Arrow x1={G.sFrom} y1={G.sY + 60} x2={sx + (mv < 1 ? 0 : 50)} y2={G.sY + 60} color={t.muted} w={4} head={18} dashed opacity={0.8} />}
      <g transform={`translate(${sx} ${G.sY - arc})`}>
        <circle r={G.dot} fill={t.warn} stroke={t.fg} strokeWidth={4} />
        <Txt text="Samoa" x={0} y={-G.dot - 20} w={sq ? 220 : 260} s={sq ? 40 : 48} fill={t.fg} />
        <rect x={sq ? -90 : -110} y={G.dot + 14} width={sq ? 180 : 220} height={sq ? 56 : 64} rx={14} fill={mv >= 0.5 ? t.ok : t.warn} />
        <Txt text={off} x={0} y={G.dot + (sq ? 54 : 58)} w={sq ? 170 : 210} s={sq ? 34 : 40} fill={t.bg} />
      </g>
      <g opacity={a1}>
        {[
          { ...G.nz, name: "New Zealand" },
          { ...G.au, name: "Úc" },
        ].map((c, i) => (
          <g key={i}>
            <circle cx={c.x} cy={c.y} r={G.dot} fill={t.ok} />
            <Txt text={c.name} x={c.x} y={c.y + G.dot + (sq ? 44 : 54)} w={sq ? 260 : 360} s={G.s} fill={t.fg} />
          </g>
        ))}
        <Txt text="khớp ngày với đối tác thương mại chính" x={sq ? 420 : 640} y={sq ? 52 : 210} w={sq ? 780 : 1000} s={sq ? 34 : 42} fill={t.ok} lines={sq ? 2 : 1} />
      </g>
    </Stage>
  );
};
