import React from "react";
import { useCurrentFrame } from "remotion";
import { useTheme } from "../../lib/hooks";
import { Stage } from "../../lib/theme";
import type { SceneProps } from "../../lib/types";
import { Arrow, at, Chip, lerp, modeOf, p, Robot, Txt, useGeom, WarpWord } from "./common";

/**
 * Dòng thời gian 1999 → 2014. Chỉ ghi năm đã có trong lời của cảnh hoặc trước đó.
 * - `1999`: beat 0 trục thời gian, mốc 11/1999 Slashdot mở bình chọn; beat 1 người máy Carnegie Mellon tự bỏ phiếu; beat 2 người máy MIT đáp trả.
 * - `doi`: beat 0 bài thi chỉ có tác dụng khi câu hỏi là thứ máy chưa làm được; beat 1 câu đố cứ đổi suốt hơn hai mươi năm (chữ méo → số nhà → ô bấm → ảnh, không ghi năm).
 * - `2012`: beat 0 từ khoảng 3/2012 người dùng gõ lại số nhà trên ảnh Street View; beat 1 năm 2013 Goodfellow và đồng nghiệp dạy máy đọc số nhà.
 */
export const DongThoiGian: React.FC<SceneProps> = ({ scene }) => {
  const mode = modeOf(scene.props, "1999");
  return <Stage>{mode === "doi" ? <Doi scene={scene} /> : mode === "2012" ? <Nam2012 scene={scene} /> : <Nam1999 scene={scene} />}</Stage>;
};

const Y0 = 1999;
const Y1 = 2014;

const Axis: React.FC<{ marks: { y: number; label: string; on: number; below?: boolean }[] }> = ({ marks }) => {
  const t = useTheme();
  const { sq } = useGeom();
  const x0 = sq ? 110 : 160;
  const x1 = sq ? 730 : 1760;
  const ay = sq ? 120 : 140;
  const X = (y: number) => lerp(x0, x1, (y - Y0) / (Y1 - Y0));
  return (
    <g>
      <line x1={x0} y1={ay} x2={x1} y2={ay} stroke={t.muted} strokeWidth={6} strokeLinecap="round" />
      {Array.from({ length: Y1 - Y0 + 1 }, (_, i) => (
        <line key={i} x1={X(Y0 + i)} y1={ay - 10} x2={X(Y0 + i)} y2={ay + 10} stroke={t.muted} strokeWidth={3} opacity={0.6} />
      ))}
      {marks.map((m, i) => (
        <g key={i} opacity={0.35 + 0.65 * m.on}>
          <circle cx={X(m.y)} cy={ay} r={sq ? 14 : 18} fill={m.on > 0.5 ? t.accent2 : t.panel} stroke={t.accent2} strokeWidth={4} />
          <Txt text={m.label} x={X(m.y)} y={m.below ? ay + (sq ? 50 : 60) : ay - (sq ? 30 : 36)} w={sq ? 150 : 200} s={sq ? 30 : 38} fill={m.on > 0.5 ? t.accent2 : t.muted} />
        </g>
      ))}
    </g>
  );
};

const Nam1999: React.FC<SceneProps> = ({ scene }) => {
  const t = useTheme();
  const f = useCurrentFrame();
  const { sq } = useGeom();
  const t1 = at(scene, 1);
  const t2 = at(scene, 2);
  const a1 = p(f, t1, 14);
  const a2 = p(f, t2, 14);
  return (
    <g>
      <Axis marks={[{ y: 1999, label: "11/1999", on: 1 }]} />
      <rect x={sq ? 50 : 160} y={sq ? 180 : 220} width={sq ? 740 : 1600} height={sq ? 130 : 150} rx={22} fill={t.panel} stroke={t.accent} strokeWidth={4} />
      <Txt text="Slashdot mở bình chọn" x={sq ? 420 : 960} y={sq ? 232 : 282} w={sq ? 700 : 1500} s={sq ? 38 : 50} fill={t.fg} />
      <Txt text="trường cao học khoa học máy tính tốt nhất" x={sq ? 420 : 960} y={sq ? 282 : 340} w={sq ? 700 : 1500} s={sq ? 30 : 38} fill={t.muted} weight={400} />
      {[
        { name: "Carnegie Mellon", a: a1, from: t1 + 10, x: sq ? 220 : 620, c: t.accent },
        { name: "MIT", a: a2, from: t2 + 10, x: sq ? 620 : 1300, c: t.accent2 },
      ].map((b, i) => (
        <g key={i} opacity={b.a}>
          <Robot x={b.x} y={sq ? 440 : 540} s={sq ? 120 : 200} fill={t.panel} line={b.c} />
          <Txt text={b.name} x={b.x} y={sq ? 550 : 700} w={sq ? 360 : 500} s={sq ? 34 : 44} fill={b.c} />
          <Txt text={i === 0 ? "tự động bỏ phiếu" : "viết chương trình đáp trả"} x={b.x} y={sq ? 600 : 760} w={sq ? 380 : 520} s={sq ? 30 : 40} fill={t.fg} weight={400} />
          {[0, 1, 2].map((k) => {
            const u = ((f - b.from) / 20 + k / 3) % 1;
            return f > b.from ? <rect key={k} x={b.x - 14} y={(sq ? 380 : 440) - u * (sq ? 50 : 50)} width={28} height={20} rx={4} fill={b.c} opacity={1 - u} /> : null;
          })}
        </g>
      ))}
    </g>
  );
};

const Doi: React.FC<SceneProps> = ({ scene }) => {
  const t = useTheme();
  const f = useCurrentFrame();
  const { sq } = useGeom();
  const t1 = at(scene, 1);
  const stages = ["Chữ méo", "Số nhà trên ảnh", "Ô bấm", "Chọn ảnh"];
  const s = 360;
  const gap = 40;
  const x0 = (sq ? 840 : 1920) / 2 - (4 * s + 3 * gap) / 2;
  const y = sq ? 420 : 470;
  return (
    <g>
      <rect x={sq ? 50 : 210} y={sq ? 40 : 60} width={sq ? 740 : 1500} height={sq ? 210 : 220} rx={24} fill={t.panel} />
      <Txt text="Bài thi chỉ có tác dụng khi câu hỏi là thứ máy chưa làm được" x={sq ? 420 : 960} y={sq ? 110 : 140} w={sq ? 700 : 1400} s={sq ? 36 : 48} fill={t.fg} lines={2} />
      <WarpWord text="?" cx={sq ? 420 : 960} cy={sq ? 210 : 240} s={sq ? 50 : 60} fill={t.accent2} noise="transparent" />
      <g opacity={p(f, t1, 14)}>
        <Txt text="Máy làm được rồi thì câu hỏi phải đổi" x={sq ? 420 : 960} y={sq ? 320 : 380} w={sq ? 760 : 1400} s={sq ? 32 : 42} fill={t.accent2} />
        {stages.map((st, i) => {
          const a = p(f, t1 + 10 + i * 10, 12);
          const x = sq ? 60 + (i % 2) * 380 : x0 + i * (s + gap);
          const yy = sq ? y - 40 + Math.floor(i / 2) * 110 : y;
          const cw = sq ? 340 : s;
          return (
            <g key={i} opacity={a}>
              <Chip x={x} y={yy} w={cw} h={sq ? 90 : 120} text={`${i + 1}. ${st}`} s={sq ? 32 : 38} fill={i === 3 ? t.accent : t.bg} stroke={t.accent} color={i === 3 ? t.bg : t.fg} />
              {!sq && i < 3 && <Arrow x1={x + s + 4} y1={y + 60} x2={x + s + gap - 4} y2={y + 60} color={t.muted} w={4} head={12} />}
            </g>
          );
        })}
        <Txt text="suốt hơn hai mươi năm" x={sq ? 420 : 960} y={y + (sq ? 250 : 210)} w={sq ? 760 : 1200} s={sq ? 34 : 44} fill={t.muted} weight={400} />
      </g>
    </g>
  );
};

const Nam2012: React.FC<SceneProps> = ({ scene }) => {
  const t = useTheme();
  const f = useCurrentFrame();
  const { sq } = useGeom();
  const t1 = at(scene, 1);
  const a1 = p(f, t1, 14);
  const plate = (x: number, y: number, w: number) => (
    <g>
      <rect x={x} y={y} width={w} height={w * 0.62} rx={10} fill="#c9b89a" />
      <rect x={x + w * 0.18} y={y + w * 0.14} width={w * 0.64} height={w * 0.34} rx={6} fill="#1f4e9c" stroke="#f4f6fa" strokeWidth={4} />
      <WarpWord text="127" cx={x + w / 2} cy={y + w * 0.31} s={w * 0.24} fill="#f4f6fa" noise="transparent" seed={5} />
    </g>
  );
  return (
    <g>
      <Axis marks={[{ y: 1999, label: "1999", on: 0.3 }, { y: 2009, label: "2009", on: 0.3 }, { y: 2012, label: "3/2012", on: 1 - a1 * 0.5 }, { y: 2013, label: "2013", on: a1, below: true }]} />
      <g>
        {plate(sq ? 70 : 180, sq ? 200 : 240, sq ? 300 : 420)}
        <Txt text="ảnh số nhà từ Street View" x={sq ? 240 : 390} y={sq ? 430 : 560} w={sq ? 400 : 500} s={sq ? 30 : 38} fill={t.muted} weight={400} />
        <Txt text="người dùng gõ lại số nhà" x={sq ? 240 : 390} y={sq ? 480 : 620} w={sq ? 400 : 520} s={sq ? 32 : 42} fill={t.fg} />
      </g>
      <g opacity={a1}>
        <Arrow x1={sq ? 390 : 640} y1={sq ? 330 : 400} x2={sq ? 470 : 900} y2={sq ? 330 : 400} color={t.accent2} w={6} head={20} />
        <Robot x={sq ? 620 : 1150} y={sq ? 330 : 400} s={sq ? 150 : 220} fill={t.panel} line={t.accent} />
        <Txt text="Goodfellow và đồng nghiệp ở Google" x={sq ? 600 : 1440} y={sq ? 470 : 600} w={sq ? 380 : 700} s={sq ? 30 : 42} fill={t.accent} lines={2} />
        <Txt text="dạy máy đọc chính những số nhà ấy" x={sq ? 420 : 1440} y={sq ? 600 : 720} w={sq ? 760 : 700} s={sq ? 32 : 40} fill={t.fg} />
      </g>
    </g>
  );
};
