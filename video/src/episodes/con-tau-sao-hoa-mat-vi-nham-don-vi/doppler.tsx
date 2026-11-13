import React from "react";
import { useCurrentFrame } from "remotion";
import { useTheme } from "../../lib/hooks";
import { Stage } from "../../lib/theme";
import { TextBlock } from "../../lib/b-kit";
import type { SceneProps } from "../../lib/types";
import { Arrow, at, ease, modeOf, p, Ship, useGeom } from "./common";

const EMIT = 10; // phát một vòng sóng mỗi 10 frame
const C = 9; // tốc độ sóng, px/frame

/** Xe hơi sơ đồ. */
const Car: React.FC<{ x: number; y: number; s: number; body: string; wheel: string; flip?: boolean }> = ({ x, y, s, body, wheel, flip }) => (
  <g transform={`translate(${x} ${y}) scale(${flip ? -1 : 1} 1)`}>
    <rect x={-s} y={-s * 0.35} width={s * 2} height={s * 0.55} rx={s * 0.15} fill={body} />
    <path d={`M${-s * 0.55} ${-s * 0.35} L${-s * 0.3} ${-s * 0.75} H${s * 0.4} L${s * 0.65} ${-s * 0.35} Z`} fill={body} />
    <circle cx={-s * 0.55} cy={s * 0.22} r={s * 0.24} fill={wheel} />
    <circle cx={s * 0.55} cy={s * 0.22} r={s * 0.24} fill={wheel} />
  </g>
);

/** Trạm mặt đất: Trái Đất nhỏ và chảo ăng-ten. */
const Station: React.FC<{ x: number; y: number; s: number; earth: string; dish: string }> = ({ x, y, s, earth, dish }) => (
  <g>
    <circle cx={x - s * 0.4} cy={y} r={s} fill={earth} />
    <path d={`M${x + s * 0.55} ${y - s * 0.55} A ${s * 0.6} ${s * 0.6} 0 0 1 ${x + s * 0.55} ${y + s * 0.55}`} fill="none" stroke={dish} strokeWidth={s * 0.14} />
    <line x1={x + s * 0.55} y1={y} x2={x + s * 0.95} y2={y} stroke={dish} strokeWidth={s * 0.1} />
  </g>
);

/**
 * Đo chuyển động bằng cách nghe sóng vô tuyến (hiệu ứng Doppler).
 * mode "doc" (3 beat): trạm nghe sóng của tàu; còi xe lao tới thì cao, chạy ra xa thì trầm; nhạy nhất khi tàu tiến lại hay lùi ra.
 * mode "ngang" (3 beat): cú phụt đẩy tàu sang ngang; xe chạy ngang từ xa: còi gần như không đổi; tàu lệch dần mà sóng nghe vẫn như cũ.
 */
export const Doppler: React.FC<SceneProps> = ({ scene }) => {
  const theme = useTheme();
  const f = useCurrentFrame();
  const { W, H, sq } = useGeom();
  const mode = modeOf(scene.props, "doc");
  const t1 = at(scene, 1);
  const t2 = at(scene, 2);
  const lx = sq ? 70 : 190;
  const ly = sq ? 470 : 480;
  const sx0 = sq ? 600 : 1300;
  const amp = sq ? 120 : 170;
  const w = 0.028;
  const doc = mode !== "ngang";

  /** Vị trí nguồn ở frame t (t có thể âm). */
  const pos = (t: number): { x: number; y: number } => {
    if (doc) {
      // Dọc theo đường nhìn (trục x)
      return { x: sx0 + amp * Math.sin(t * w), y: ly };
    }
    // Sang ngang: trục y, ở xa. Beat 2: tàu thật trôi dần sang ngang khỏi vị trí trên giấy.
    const x = sx0 + (sq ? 40 : 160);
    if (t < t2) return { x, y: ly + amp * Math.sin(t * w) };
    const y2 = ly + amp * Math.sin(t2 * w);
    return { x, y: y2 + (ly + amp * 0.9 - y2) * ease((t - t2) / 90) };
  };
  const car = f >= t1 && f < t2;
  const src = pos(f);
  const vx = amp * w * Math.cos(f * w);

  const rings: React.ReactNode[] = [];
  const life = Math.ceil((sq ? 900 : 1800) / C);
  for (let k = Math.floor((f - life) / EMIT); k <= Math.floor(f / EMIT); k++) {
    const e = k * EMIT;
    const age = f - e;
    if (age < 0 || age > life) continue;
    const o = pos(e);
    rings.push(<circle key={k} cx={o.x} cy={o.y} r={age * C} fill="none" stroke={car ? theme.accent2 : theme.accent} strokeWidth={4} opacity={0.75 * (1 - age / life)} />);
  }

  const caps = doc
    ? ["Trạm mặt đất nghe sóng vô tuyến của tàu", "Như tiếng còi xe: lao tới thì cao giọng, ra xa thì trầm", "Nhạy nhất khi tàu tiến lại gần hay lùi ra xa Trái Đất"]
    : ["Cú phụt đẩy tàu chủ yếu sang ngang", "Xe chạy ngang qua từ xa: còi gần như không đổi giọng", "Tàu lệch dần, sóng nghe vẫn gần như cũ"];
  const capP = [1 - p(f, t1, 10), p(f, t1, 10) * (1 - p(f, t2, 10)), p(f, t2, 10)];
  const pitch = doc ? (vx < 0 ? "cao giọng" : "trầm xuống") : "gần như không đổi";
  const s = sq ? 30 : 44;
  // Chế độ ngang, beat 2: vị trí trên giấy (đứng yên) và tàu thật lệch dần sang ngang.
  const paperY = ly;

  return (
    <Stage>
      <clipPath id="doppler-clip">
        <rect x={0} y={sq ? 130 : 170} width={W} height={(sq ? H : 830) - (sq ? 130 : 170)} />
      </clipPath>
      <g clipPath="url(#doppler-clip)">{rings}</g>
      <line x1={lx + s} y1={ly} x2={sx0 - amp - 40} y2={ly} stroke={theme.muted} strokeWidth={3} strokeDasharray="6 12" opacity={0.6} />
      <TextBlock text="đường nhìn từ Trái Đất" x={(lx + sx0 - amp) / 2} y={ly + (sq ? 60 : 70)} width={sq ? 420 : 640} fontSize={sq ? 30 : 34} fill={theme.muted} weight={400} />
      <Station x={lx} y={ly} s={sq ? 48 : 70} earth={theme.accent} dish={theme.fg} />
      {car ? (
        <Car x={src.x} y={src.y} s={s * 1.4} body={theme.accent2} wheel={theme.fg} flip={doc ? vx > 0 : false} />
      ) : (
        <>
          {!doc && f >= t2 && (
            <g opacity={p(f, t2, 12)}>
              <Ship x={src.x} y={paperY} s={s} body={theme.panel} panel={theme.panel} line={theme.muted} />
              <TextBlock text="trên giấy" x={src.x - s - 20} y={paperY + 12} width={260} fontSize={sq ? 30 : 36} fill={theme.muted} anchor="end" weight={400} />
            </g>
          )}
          <Ship x={src.x} y={src.y} s={s} body={theme.fg} panel={theme.accent} line={theme.bg} />
        </>
      )}
      {/* Mũi tên hướng chuyển động */}
      {doc ? (
        <g opacity={p(f, t2, 12)}>
          <Arrow x1={sx0 - amp} y1={ly - (sq ? 90 : 120)} x2={sx0 - amp - (sq ? 120 : 200)} y2={ly - (sq ? 90 : 120)} color={theme.ok} w={7} head={24} />
          <Arrow x1={sx0 + amp} y1={ly - (sq ? 90 : 120)} x2={sx0 + amp + (sq ? 100 : 200)} y2={ly - (sq ? 90 : 120)} color={theme.ok} w={7} head={24} />
        </g>
      ) : (
        <g opacity={1 - p(f, t1, 10) + p(f, t2, 10)}>
          <Arrow x1={src.x + (sq ? 80 : 150)} y1={ly + 60} x2={src.x + (sq ? 80 : 150)} y2={ly - 60} color={theme.warn} w={7} head={24} />
          <Arrow x1={src.x + (sq ? 80 : 150)} y1={ly - 60} x2={src.x + (sq ? 80 : 150)} y2={ly + 60} color={theme.warn} w={7} head={24} />
        </g>
      )}
      {caps.map((c, i) => (
        <TextBlock key={i} text={c} x={W / 2} y={sq ? 60 : 90} width={W - 80} fontSize={sq ? 36 : 52} maxLines={2} fill={i === 1 ? theme.accent2 : theme.fg} opacity={capP[i]} />
      ))}
      {/* Giọng nghe được ở trạm (chỉ khi có xe) */}
      <g opacity={car ? 1 : 0}>
        <TextBlock text={pitch} x={lx + (sq ? 10 : 20)} y={ly - (sq ? 90 : 120)} width={sq ? 360 : 460} fontSize={sq ? 34 : 44} fill={theme.accent2} anchor="start" />
      </g>
      <g opacity={!doc && f >= t2 ? p(f, t2 + 10, 14) : 0}>
        <TextBlock text="Sai số không lộ rõ ra" x={W / 2} y={sq ? 790 : 790} width={W - 80} fontSize={sq ? 40 : 52} fill={theme.warn} />
      </g>
    </Stage>
  );
};
