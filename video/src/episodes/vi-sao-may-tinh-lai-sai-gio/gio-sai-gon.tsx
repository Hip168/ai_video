import React from "react";
import { useCurrentFrame } from "remotion";
import { useTheme } from "../../lib/hooks";
import { Icon, Stage } from "../../lib/theme";
import type { SceneProps } from "../../lib/types";
import { Arrow, at, Chip, ClockFace, modeOf, p, Txt, useGeom } from "./common";

/** Mức giờ ở Sài Gòn theo cuốn sổ múi giờ (c017–c020, c037): mức đầu năm 1906, rồi 8 lần đổi. */
const STEPS: { year: string; off: string; v: number }[] = [
  { year: "1906", off: "+7:06:30", v: 7 + 6.5 / 60 },
  { year: "1911", off: "+7", v: 7 },
  { year: "1942", off: "+8", v: 8 },
  { year: "3/1945", off: "+9", v: 9 },
  { year: "9/1945", off: "+7", v: 7 },
  { year: "1947", off: "+8", v: 8 },
  { year: "1955", off: "+7", v: 7 },
  { year: "1959", off: "+8", v: 8 },
  { year: "1975", off: "+7", v: 7 },
];

/**
 * Lịch sử giờ ở Sài Gòn.
 * - `tong`: beat 0 cả chuỗi mức giờ 1906 → 1975 với 8 lần đổi, đánh số; beat 1 cuốn sổ múi giờ (con số 8 là phép đếm trên sổ).
 * - `phu-lien`: beat 0 đài thiên văn Phù Liễn ở Hải Phòng, Đông Dương lấy giờ theo đài từ 1/7/1906; beat 1 hai đồng hồ Greenwich và Phù Liễn, nhanh hơn 7 giờ 6 phút 30 giây.
 * - `hai-mien`: beat 0 đêm 31/12/1959 miền Nam vặn nhanh 1 giờ sang UTC+8; beat 1 cùng lúc ngoài Bắc 7 giờ, trong Nam 8 giờ.
 */
export const GioSaiGon: React.FC<SceneProps> = ({ scene }) => {
  const mode = modeOf(scene.props, "tong");
  if (mode === "phu-lien") return <PhuLien scene={scene} />;
  if (mode === "hai-mien") return <HaiMien scene={scene} />;
  return <Tong scene={scene} />;
};

const Tong: React.FC<SceneProps> = ({ scene }) => {
  const t = useTheme();
  const f = useCurrentFrame();
  const { sq } = useGeom();
  const t1 = at(scene, 1);
  const a1 = p(f, t1, 16);
  // nhịp sáng chạy dọc chuỗi (không che nội dung, chỉ nhấn)
  const hot = Math.floor(f / 18) % 9;
  if (sq) {
    const rowY = (i: number) => 150 + i * 68;
    const bx = 250;
    const len = (v: number) => (v - 6.2) * 190;
    return (
      <Stage>
        <Txt text="Giờ ở Sài Gòn, 1906 → 1975" x={420} y={62} w={790} s={42} fill={t.fg} />
        {STEPS.map((s, i) => {
          const y = rowY(i);
          const isHot = i === hot && i > 0;
          return (
            <g key={i}>
              {i > 0 ? (
                <g>
                  <circle cx={44} cy={y} r={24} fill={isHot ? t.accent2 : t.panel} stroke={t.accent2} strokeWidth={3} />
                  <text x={44} y={y + 11} fontSize={30} fontWeight={700} fill={isHot ? t.bg : t.accent2} textAnchor="middle">
                    {i}
                  </text>
                </g>
              ) : null}
              <Txt text={s.year} x={84} y={y + 12} w={150} s={34} fill={t.fg} anchor="start" />
              <rect x={bx} y={y - 22} width={len(s.v)} height={44} rx={10} fill={s.v >= 8.5 ? t.warn : s.v >= 7.5 ? t.accent2 : t.accent} opacity={0.85} />
              <Txt text={s.off} x={bx + len(s.v) + 14} y={y + 12} w={200} s={34} fill={t.fg} anchor="start" />
            </g>
          );
        })}
        <Chip x={40} y={756} w={290} h={70} text="8 lần đổi" s={42} fill={t.accent2} color={t.bg} />
        <g opacity={a1}>
          <Icon name="book" x={390} y={791} size={64} color={t.accent} />
          <Txt text="đếm trên sổ múi giờ" x={436} y={803} w={390} s={34} fill={t.accent} anchor="start" />
        </g>
      </Stage>
    );
  }
  const x0 = 300;
  const x1 = 1820;
  const seg = (x1 - x0) / STEPS.length;
  const Y = (v: number) => 600 - (v - 7) * 170;
  const path = STEPS.map((s, i) => `${i === 0 ? "M" : "L"}${x0 + i * seg} ${Y(s.v)} H${x0 + (i + 1) * seg}`).join(" ");
  return (
    <Stage>
      <Txt text="Giờ ở Sài Gòn, 1906 → 1975" x={x0} y={80} w={1000} s={54} fill={t.fg} anchor="start" />
      <Chip x={1440} y={30} w={380} h={86} text="8 lần đổi" s={54} fill={t.accent2} color={t.bg} />
      {[7, 8, 9].map((v) => (
        <g key={v}>
          <line x1={x0} y1={Y(v)} x2={x1} y2={Y(v)} stroke={t.muted} strokeWidth={2} opacity={0.4} strokeDasharray="6 10" />
          <Txt text={`UTC+${v}`} x={x0 - 24} y={Y(v) + 14} w={220} s={38} fill={t.muted} anchor="end" />
        </g>
      ))}
      <path d={path} fill="none" stroke={t.accent} strokeWidth={8} strokeLinejoin="round" />
      {STEPS.map((s, i) => {
        const cx = x0 + (i + 0.5) * seg;
        return <Txt key={`o${i}`} text={s.off} x={cx} y={Y(s.v) - 22} w={seg - 10} s={i === 0 ? 30 : 38} fill={t.fg} />;
      })}
      {STEPS.map((s, i) => {
        const bxp = x0 + i * seg;
        const isHot = i === hot && i > 0;
        return (
          <g key={i}>
            <line x1={bxp} y1={640} x2={bxp} y2={668} stroke={t.muted} strokeWidth={3} />
            <Txt text={s.year} x={bxp} y={708} w={seg} s={36} fill={i === 0 ? t.muted : t.fg} />
            {i > 0 && (
              <g>
                <circle cx={bxp} cy={(Y(s.v) + Y(STEPS[i - 1].v)) / 2} r={26} fill={isHot ? t.accent2 : t.bg} stroke={t.accent2} strokeWidth={4} />
                <text x={bxp} y={(Y(s.v) + Y(STEPS[i - 1].v)) / 2 + 11} fontSize={30} fontWeight={700} fill={isHot ? t.bg : t.accent2} textAnchor="middle">
                  {i}
                </text>
              </g>
            )}
          </g>
        );
      })}
      <g opacity={a1} transform={`translate(0 ${(1 - a1) * 20})`}>
        <Icon name="book" x={x0 + 40} y={780} size={70} color={t.accent} />
        <Txt text="con số 8 là phép đếm trên cuốn sổ múi giờ" x={x0 + 100} y={794} w={1300} s={40} fill={t.accent} anchor="start" />
      </g>
    </Stage>
  );
};

/** Mái vòm đài thiên văn. Tâm đáy (x, y), rộng w. */
const Dome: React.FC<{ x: number; y: number; w: number; fill: string; line: string; slit: string }> = ({ x, y, w, fill, line, slit }) => (
  <g>
    <rect x={x - w / 2} y={y - w * 0.45} width={w} height={w * 0.45} rx={8} fill={fill} stroke={line} strokeWidth={5} />
    <path d={`M${x - w * 0.42} ${y - w * 0.45} A${w * 0.42} ${w * 0.42} 0 0 1 ${x + w * 0.42} ${y - w * 0.45} Z`} fill={fill} stroke={line} strokeWidth={5} />
    <rect x={x - w * 0.05} y={y - w * 0.86} width={w * 0.1} height={w * 0.4} fill={slit} />
    <rect x={x - w * 0.12} y={y - w * 0.3} width={w * 0.24} height={w * 0.3} rx={6} fill={slit} />
  </g>
);

const PhuLien: React.FC<SceneProps> = ({ scene }) => {
  const t = useTheme();
  const f = useCurrentFrame();
  const { sq } = useGeom();
  const t1 = at(scene, 1);
  const a1 = p(f, t1, 16);
  const sec = (f / 30) % 60;
  if (sq) {
    return (
      <Stage>
        <Dome x={190} y={300} w={260} fill={t.panel} line={t.muted} slit={t.bg} />
        <Txt text="Đài thiên văn" x={360} y={130} w={460} s={38} fill={t.muted} anchor="start" weight={400} />
        <Txt text="Phù Liễn, Hải Phòng" x={360} y={186} w={460} s={42} fill={t.fg} anchor="start" />
        <Txt text="Đông Dương lấy giờ theo đài" x={360} y={240} w={460} s={32} fill={t.accent} anchor="start" lines={2} />
        <Txt text="từ 1/7/1906" x={360} y={330} w={460} s={36} fill={t.accent2} anchor="start" />
        <g opacity={a1}>
          <ClockFace cx={210} cy={530} r={120} hours={12} sec={sec} ring={t.muted} face={t.panel} hand={t.fg} secHand={t.accent2} />
          <ClockFace cx={630} cy={530} r={120} hours={7 + 6.5 / 60} sec={(sec + 30) % 60} ring={t.accent} face={t.panel} hand={t.fg} secHand={t.accent2} />
          <Txt text="Greenwich" x={210} y={696} w={360} s={36} fill={t.muted} />
          <Txt text="Phù Liễn" x={630} y={696} w={360} s={36} fill={t.accent} />
          <Arrow x1={350} y1={530} x2={490} y2={530} color={t.accent2} w={6} head={20} />
          <rect x={30} y={734} width={780} height={90} rx={20} fill={t.accent2} />
          <Txt text="nhanh hơn 7 giờ 6 phút 30 giây" x={420} y={792} w={750} s={40} fill={t.bg} />
        </g>
      </Stage>
    );
  }
  return (
    <Stage>
      <Dome x={380} y={610} w={400} fill={t.panel} line={t.muted} slit={t.bg} />
      <Txt text="Đài thiên văn Phù Liễn" x={380} y={680} w={640} s={46} fill={t.fg} />
      <Txt text="Hải Phòng" x={380} y={738} w={640} s={40} fill={t.muted} weight={400} />
      <Chip x={160} y={40} w={440} h={80} text="từ 1/7/1906" s={44} fill={t.accent2} color={t.bg} />
      <Txt text="Đông Dương lấy giờ theo đài" x={380} y={190} w={640} s={42} fill={t.accent} />
      <g opacity={a1}>
        <ClockFace cx={1000} cy={350} r={190} hours={12} sec={sec} ring={t.muted} face={t.panel} hand={t.fg} secHand={t.accent2} />
        <ClockFace cx={1580} cy={350} r={190} hours={7 + 6.5 / 60} sec={(sec + 30) % 60} ring={t.accent} face={t.panel} hand={t.fg} secHand={t.accent2} />
        <Txt text="Greenwich" x={1000} y={610} w={460} s={46} fill={t.muted} />
        <Txt text="Phù Liễn" x={1580} y={610} w={460} s={46} fill={t.accent} />
        <Arrow x1={1210} y1={350} x2={1370} y2={350} color={t.accent2} w={7} head={24} />
        <rect x={860} y={660} width={860} height={110} rx={24} fill={t.accent2} />
        <Txt text="nhanh hơn 7 giờ 6 phút 30 giây" x={1290} y={733} w={820} s={52} fill={t.bg} />
      </g>
    </Stage>
  );
};

const HaiMien: React.FC<SceneProps> = ({ scene }) => {
  const t = useTheme();
  const f = useCurrentFrame();
  const { sq } = useGeom();
  const t1 = at(scene, 1);
  const a1 = p(f, t1, 16);
  const turn = p(f, 36, 40); // miền Nam vặn nhanh 1 giờ
  const southOff = turn >= 1 ? "UTC+8" : "UTC+7";
  const G = sq
    ? { nx: 210, sx: 630, cy: 330, r: 140, titleY: 150, chipY: 500, chipW: 260, chipH: 64, timeY: 640, s: 40, capY: 62 }
    : { nx: 520, sx: 1400, cy: 380, r: 190, titleY: 140, chipY: 650, chipW: 300, chipH: 76, timeY: 770, s: 50, capY: 60 };
  return (
    <Stage>
      <Txt text="Đêm 31/12/1959 · sắc lệnh 362-TTP" x={sq ? 420 : 960} y={G.capY} w={sq ? 790 : 1500} s={sq ? 38 : 48} fill={t.accent2} />
      {[
        { x: G.nx, name: "Miền Bắc", off: "UTC+7", h: 7, ring: t.accent, time: "7 giờ" },
        { x: G.sx, name: "Miền Nam", off: southOff, h: 7 + turn, ring: turn >= 1 ? t.accent2 : t.accent, time: "8 giờ" },
      ].map((m, i) => (
        <g key={i}>
          <Txt text={m.name} x={m.x} y={G.titleY} w={sq ? 380 : 560} s={sq ? 40 : 50} fill={t.fg} />
          <ClockFace cx={m.x} cy={G.cy} r={G.r} hours={m.h} ring={m.ring} face={t.panel} hand={t.fg} />
          <Chip x={m.x - G.chipW / 2} y={G.chipY - G.chipH + (sq ? 0 : 20)} w={G.chipW} h={G.chipH} text={m.off} s={sq ? 36 : 44} fill={m.ring} color={t.bg} />
          <g opacity={a1}>
            <Txt text={m.time} x={m.x} y={G.timeY} w={sq ? 380 : 500} s={sq ? 56 : 66} fill={m.ring} />
          </g>
        </g>
      ))}
      {!sq && (
        <g opacity={p(f, 36, 14) * (1 - a1)}>
          <Txt text="vặn nhanh 1 giờ" x={(G.nx + G.sx) / 2} y={G.cy - 20} w={440} s={40} fill={t.accent2} />
          <Arrow x1={(G.nx + G.sx) / 2 + 120} y1={G.cy + 20} x2={G.sx - G.r - 24} y2={G.cy + 20} color={t.accent2} w={5} head={18} />
        </g>
      )}
      <g opacity={a1}>
        <path
          d={sq ? `M${G.nx} 680 v30 H${G.sx} v-30` : `M${G.nx + 150} ${G.timeY - 20} H${G.sx - 150}`}
          fill="none"
          stroke={t.warn}
          strokeWidth={5}
          strokeDasharray={sq ? undefined : "12 10"}
        />
        <Txt text="lệch nhau đúng 1 tiếng" x={(G.nx + G.sx) / 2} y={sq ? 780 : G.timeY - 40} w={sq ? 700 : 560} s={sq ? 40 : 44} fill={t.warn} />
      </g>
    </Stage>
  );
};
