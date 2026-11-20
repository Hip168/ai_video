import React from "react";
import { useCurrentFrame } from "remotion";
import { useTheme } from "../../lib/hooks";
import { Icon, Stage } from "../../lib/theme";
import type { SceneProps } from "../../lib/types";
import { Arrow, at, ClockFace, Laptop, lerp, Mark, modeOf, Mono, p, pb, Txt, useGeom } from "./common";

/**
 * Trình duyệt chặn trang vì giờ trên máy sai.
 * - `canh-bao`: beat 0 trang cảnh báo "Đồng hồ của bạn bị chậm"; beat 1 bảng kiểm: trang web ổn, mạng ổn, ngày giờ trên máy sai.
 * - `ve`: beat 0 chứng chỉ như tấm vé có hai mốc; beat 1 trục thời gian, trình duyệt chỉ tin khi hôm nay nằm giữa hai mốc, và hỏi máy hôm nay là ngày nào.
 * - `phep-tinh`: beat 0 chứng chỉ có hiệu lực 11/2026 tới 2/2027 trên trục năm; beat 1 máy tưởng là 2015; beat 2 chưa tới ngày, bị từ chối.
 */
export const ChromeCham: React.FC<SceneProps> = ({ scene }) => {
  const mode = modeOf(scene.props, "canh-bao");
  if (mode === "ve") return <Ve scene={scene} />;
  if (mode === "phep-tinh") return <PhepTinh scene={scene} />;
  return <CanhBao scene={scene} />;
};

const CanhBao: React.FC<SceneProps> = ({ scene }) => {
  const t = useTheme();
  const f = useCurrentFrame();
  const { sq } = useGeom();
  const t1 = at(scene, 1);
  const slide = p(f, t1, 18);
  const ww = sq ? 800 : 1100;
  const wh = sq ? 450 : 740;
  const wx = sq ? 20 : lerp(410, 110, slide);
  const wy = sq ? 16 : 40;
  const bodyY = wy + (sq ? 150 : 200);
  const rows: { name: string; ok: boolean }[] = [
    { name: "Trang web: không hỏng", ok: true },
    { name: "Mạng: không rớt", ok: true },
    { name: "Ngày giờ trên máy: SAI", ok: false },
  ];
  return (
    <Stage>
      <g>
        <rect x={wx} y={wy} width={ww} height={wh} rx={24} fill={t.panel} stroke={t.muted} strokeWidth={4} />
        <rect x={wx} y={wy} width={ww} height={sq ? 64 : 76} rx={24} fill={t.bg} opacity={0.6} />
        {[t.warn, t.accent2, t.ok].map((c, i) => (
          <circle key={i} cx={wx + 36 + i * 36} cy={wy + (sq ? 32 : 38)} r={11} fill={c} />
        ))}
        <rect x={wx + 160} y={wy + (sq ? 12 : 16)} width={ww - 190} height={sq ? 42 : 46} rx={21} fill={t.bg} stroke={t.warn} strokeWidth={3} />
        <polygon
          points={`${wx + 190},${wy + (sq ? 44 : 50)} ${wx + 204},${wy + (sq ? 20 : 24)} ${wx + 218},${wy + (sq ? 44 : 50)}`}
          fill={t.warn}
        />
        <Txt text="trang báo quen" x={wx + 236} y={wy + (sq ? 44 : 50)} w={ww - 300} s={sq ? 30 : 32} fill={t.muted} anchor="start" weight={400} />
        <ClockFace cx={wx + (sq ? 90 : 130)} cy={bodyY + (sq ? 14 : 30)} r={sq ? 54 : 72} hours={10.2} ring={t.warn} face={t.bg} hand={t.fg} />
        <Txt text="Đồng hồ của bạn bị chậm" x={wx + (sq ? 170 : 240)} y={bodyY + (sq ? 30 : 50)} w={ww - (sq ? 190 : 280)} s={sq ? 50 : 66} fill={t.fg} anchor="start" />
        <Txt text="Your clock is behind" x={wx + (sq ? 40 : 80)} y={bodyY + (sq ? 130 : 200)} w={ww - 100} s={sq ? 40 : 48} fill={t.accent2} anchor="start" />
        <Mono text="NET::ERR_CERT_DATE_INVALID" x={wx + (sq ? 40 : 80)} y={bodyY + (sq ? 200 : 300)} s={sq ? 32 : 34} fill={t.muted} anchor="start" />
        {!sq && (
          <g>
            <rect x={wx + 80} y={bodyY + 360} width={360} height={84} rx={18} fill={t.accent} />
            <Txt text="Không vào được" x={wx + 260} y={bodyY + 414} w={330} s={38} fill={t.bg} />
          </g>
        )}
      </g>
      {rows.map((r, i) => {
        const a = p(f, t1 + 10 + i * 12, 14);
        if (sq) {
          const y = 500 + i * 110;
          return (
            <g key={i} opacity={a}>
              <rect x={20} y={y} width={800} height={96} rx={20} fill={r.ok ? t.panel : t.warn} opacity={r.ok ? 1 : 0.22} />
              <rect x={20} y={y} width={800} height={96} rx={20} fill="none" stroke={r.ok ? t.ok : t.warn} strokeWidth={4} />
              <Mark cx={74} cy={y + 48} r={32} ok={r.ok} />
              <Txt text={r.name} x={130} y={y + 61} w={670} s={38} fill={t.fg} anchor="start" />
            </g>
          );
        }
        const y = 120 + i * 210;
        return (
          <g key={i} opacity={a} transform={`translate(${(1 - a) * 60} 0)`}>
            <rect x={1250} y={y} width={600} height={170} rx={24} fill={r.ok ? t.panel : t.warn} opacity={r.ok ? 1 : 0.22} />
            <rect x={1250} y={y} width={600} height={170} rx={24} fill="none" stroke={r.ok ? t.ok : t.warn} strokeWidth={5} />
            <Mark cx={1330} cy={y + 85} r={44} ok={r.ok} />
            <Txt text={r.name} x={1400} y={y + 74} w={430} s={44} fill={t.fg} anchor="start" lines={2} />
          </g>
        );
      })}
    </Stage>
  );
};

const Ve: React.FC<SceneProps> = ({ scene }) => {
  const t = useTheme();
  const f = useCurrentFrame();
  const { sq } = useGeom();
  const t1 = at(scene, 1);
  const a1 = p(f, t1, 16);
  // Tấm vé
  const vx = sq ? 20 : 300;
  const vy = sq ? 20 : 40;
  const vw = sq ? 800 : 1320;
  const vh = sq ? 360 : 400;
  const stub = sq ? 250 : 400;
  const fs = sq ? 34 : 46;
  // Trục thời gian
  const ax0 = sq ? 60 : 260;
  const ax1 = sq ? 780 : 1660;
  const ay = sq ? 640 : 640;
  const m0 = lerp(ax0, ax1, 0.32);
  const m1 = lerp(ax0, ax1, 0.7);
  // Mốc "hôm nay?" dò qua lại trên trục rồi dừng giữa hai mốc
  const k = p(f, t1 + 30, 70);
  const swing = Math.sin(Math.max(0, f - t1 - 30) * 0.09) * (1 - k);
  const todayX = lerp(m0, m1, 0.5) + swing * (m1 - m0) * 0.9;
  const inside = todayX >= m0 && todayX <= m1;
  return (
    <Stage>
      <g>
        <rect x={vx} y={vy} width={vw} height={vh} rx={30} fill={t.panel} stroke={t.accent} strokeWidth={6} />
        <circle cx={vx + stub} cy={vy} r={30} fill={t.bg} />
        <circle cx={vx + stub} cy={vy + vh} r={30} fill={t.bg} />
        <line x1={vx + stub} y1={vy + 40} x2={vx + stub} y2={vy + vh - 40} stroke={t.muted} strokeWidth={4} strokeDasharray="14 12" />
        <Icon name="lock" x={vx + stub / 2} y={vy + (sq ? 120 : 140)} size={sq ? 110 : 150} color={t.ok} />
        <Txt text="Chứng chỉ" x={vx + stub / 2} y={vy + (sq ? 250 : 290)} w={stub - 30} s={sq ? 36 : 46} fill={t.fg} />
        <Txt text="bảo mật" x={vx + stub / 2} y={vy + (sq ? 296 : 346)} w={stub - 30} s={sq ? 36 : 46} fill={t.fg} />
        {[
          { label: "Bắt đầu có hiệu lực", c: t.ok },
          { label: "Hết hiệu lực", c: t.warn },
        ].map((r, i) => {
          const y = vy + (sq ? 110 : 130) + i * (sq ? 140 : 160);
          const x = vx + stub + (sq ? 34 : 60);
          const w = vw - stub - (sq ? 60 : 110);
          return (
            <g key={i}>
              <rect x={x} y={y - fs * 1.1} width={sq ? 40 : 52} height={sq ? 40 : 52} rx={8} fill="none" stroke={r.c} strokeWidth={4} />
              <line x1={x} y1={y - fs * 1.1 + 12} x2={x + (sq ? 40 : 52)} y2={y - fs * 1.1 + 12} stroke={r.c} strokeWidth={4} />
              <Txt text={r.label} x={x + (sq ? 56 : 76)} y={y - fs * 0.3} w={w - 80} s={fs} fill={r.c} anchor="start" />
              <line x1={x} y1={y + (sq ? 44 : 56)} x2={x + w} y2={y + (sq ? 44 : 56)} stroke={t.muted} strokeWidth={4} strokeDasharray="4 10" strokeLinecap="round" />
            </g>
          );
        })}
      </g>
      <g opacity={a1}>
        <rect x={m0} y={ay - 60} width={m1 - m0} height={120} rx={14} fill={t.ok} opacity={0.18} />
        <line x1={ax0} y1={ay} x2={ax1} y2={ay} stroke={t.muted} strokeWidth={6} strokeLinecap="round" />
        <line x1={m0} y1={ay - 70} x2={m0} y2={ay + 70} stroke={t.ok} strokeWidth={6} />
        <line x1={m1} y1={ay - 70} x2={m1} y2={ay + 70} stroke={t.warn} strokeWidth={6} />
        <Txt text="trình duyệt tin" x={(m0 + m1) / 2} y={ay + (sq ? 110 : 112)} w={m1 - m0 + 60} s={sq ? 34 : 40} fill={t.ok} />
        <Txt text="không tin" x={(ax0 + m0) / 2} y={ay + (sq ? 110 : 112)} w={m0 - ax0 + 20} s={sq ? 30 : 36} fill={t.warn} weight={400} />
        <Txt text="không tin" x={(m1 + ax1) / 2} y={ay + (sq ? 110 : 112)} w={ax1 - m1 + 20} s={sq ? 30 : 36} fill={t.warn} weight={400} />
        {/* mốc hôm nay */}
        <g transform={`translate(${todayX} ${ay})`}>
          <polygon points="0,-14 -18,-44 18,-44" fill={inside ? t.accent2 : t.warn} />
          <rect x={sq ? -110 : -130} y={sq ? -112 : -116} width={sq ? 220 : 260} height={sq ? 64 : 68} rx={16} fill={inside ? t.accent2 : t.warn} />
          <Txt text="hôm nay?" x={0} y={sq ? -68 : -70} w={sq ? 200 : 240} s={sq ? 36 : 40} fill={t.bg} />
        </g>
      </g>
      {!sq && (
        <g opacity={p(f, t1 + 40, 16)}>
          <Laptop x={150} y={ay - 30} w={150} fill={t.panel} line={t.muted} screen={t.bg} />
          <Txt text="hỏi máy" x={150} y={ay + 90} w={220} s={36} fill={t.accent} />
        </g>
      )}
    </Stage>
  );
};

const PhepTinh: React.FC<SceneProps> = ({ scene }) => {
  const t = useTheme();
  const f = useCurrentFrame();
  const { sq } = useGeom();
  const t1 = at(scene, 1);
  const t2 = at(scene, 2);
  const y0 = 2013;
  const y1 = 2028.5;
  const ax0 = sq ? 50 : 140;
  const ax1 = sq ? 790 : 1780;
  const ay = sq ? 420 : 430;
  const X = (yr: number) => lerp(ax0, ax1, (yr - y0) / (y1 - y0));
  const bA = X(2026 + 10 / 12);
  const bB = X(2027 + 1 / 12);
  const bw = Math.max(sq ? 40 : 46, bB - bA);
  const bx = (bA + bB) / 2 - bw / 2;
  const a1 = p(f, t1, 16);
  const a2 = p(f, t2, 14);
  const stampS = 1 + (1 - p(f, t2 + 6, 10)) * 0.6;
  const pin = X(2015);
  return (
    <Stage>
      <g>
        <Txt text="Thử làm một phép tính" x={sq ? 420 : 960} y={sq ? 70 : 80} w={sq ? 780 : 1400} s={sq ? 44 : 54} fill={t.accent2} />
        {/* dải hiệu lực */}
        <rect x={bx} y={ay - (sq ? 110 : 130)} width={bw} height={sq ? 220 : 260} rx={10} fill={t.ok} opacity={0.3} />
        <rect x={bx} y={ay - (sq ? 110 : 130)} width={bw} height={sq ? 220 : 260} rx={10} fill="none" stroke={t.ok} strokeWidth={4} />
        <Txt text="Chứng chỉ có hiệu lực" x={sq ? 560 : bx + bw - 10} y={sq ? 170 : 200} w={sq ? 520 : 760} s={sq ? 36 : 42} fill={t.ok} anchor={sq ? "middle" : "end"} />
        <Txt text="11/2026 → 2/2027" x={sq ? 560 : bx + bw - 10} y={sq ? 222 : 256} w={sq ? 520 : 760} s={sq ? 38 : 46} fill={t.fg} anchor={sq ? "middle" : "end"} />
        <line x1={ax0} y1={ay} x2={ax1} y2={ay} stroke={t.muted} strokeWidth={6} strokeLinecap="round" />
        {[2015, 2020, 2025].map((yr) => (
          <g key={yr}>
            <line x1={X(yr)} y1={ay - 14} x2={X(yr)} y2={ay + 14} stroke={t.muted} strokeWidth={4} />
            <Txt text={String(yr)} x={X(yr)} y={ay + (sq ? 56 : 62)} w={sq ? 120 : 160} s={sq ? 32 : 38} fill={t.muted} weight={400} />
          </g>
        ))}
      </g>
      {/* máy tưởng là 2015 */}
      <g opacity={a1} transform={`translate(0 ${(1 - a1) * -30})`}>
        <line x1={pin} y1={ay - 20} x2={pin} y2={ay - (sq ? 120 : 150)} stroke={t.warn} strokeWidth={5} />
        <circle cx={pin} cy={ay} r={14} fill={t.warn} />
        <Laptop x={pin + (sq ? 30 : 10)} y={ay - (sq ? 190 : 230)} w={sq ? 120 : 150} fill={t.panel} line={t.warn} screen={t.bg} />
        <Txt text="Máy tưởng: năm 2015" x={sq ? 220 : pin + 120} y={ay + (sq ? 120 : 140)} w={sq ? 400 : 560} s={sq ? 36 : 44} fill={t.warn} anchor={sq ? "middle" : "start"} />
      </g>
      {/* chưa tới ngày, bị từ chối */}
      <g opacity={a2}>
        <Arrow x1={pin + 30} y1={ay + (sq ? 170 : 190)} x2={bx - 16} y2={ay + (sq ? 170 : 190)} color={t.accent2} w={5} head={22} dashed />
        <Txt text="chưa tới ngày có hiệu lực" x={(pin + bx) / 2} y={ay + (sq ? 230 : 240)} w={sq ? 560 : bx - pin} s={sq ? 34 : 40} fill={t.accent2} />
        <g transform={`translate(${sq ? 420 : 1500} ${sq ? 755 : 772}) rotate(-6) scale(${stampS})`}>
          <rect x={sq ? -200 : -230} y={-52} width={sq ? 400 : 460} height={104} rx={14} fill="none" stroke={t.warn} strokeWidth={8} />
          <Txt text="BỊ TỪ CHỐI" x={0} y={20} w={sq ? 370 : 430} s={sq ? 56 : 64} fill={t.warn} />
        </g>
      </g>
    </Stage>
  );
};
