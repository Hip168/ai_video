import React from "react";
import { useCurrentFrame } from "remotion";
import { useTheme } from "../../lib/hooks";
import { Stage } from "../../lib/theme";
import type { SceneProps } from "../../lib/types";
import { at, Chip, cityBlocks, clamp01, lerp, modeOf, p, Txt, useGeom } from "./common";

/**
 * Thành phố khối hộp tự vẽ, nhìn từ trên xuống (không gợi bản đồ game nào).
 * - `o-luoi`: beat 0 thành phố, lưới ô vuông phủ lên như giấy kẻ ô.
 * - `tam-nap`: beat 0 người chơi đi, ô gần được nạp, ô xa được dỡ; beat 1 vòng "tầm nạp".
 * - `culling`: beat 0 máy quay và khung nhìn, chỉ vật thấy được mới vẽ; beat 1 ba kiểu loại bỏ (Unreal Engine).
 * - `culling-ba`: beat 0 bỏ vật ngoài khung nhìn; beat 1 bỏ vật bị che khuất; beat 2 bỏ vật quá khoảng cách vẽ.
 * - `quay-dau`: beat 0 người chơi quay người nửa giây; beat 1 phía sau lưng được nạp, khoảng 4 GB dữ liệu nén; beat 2 đủ cho mọi thứ sau lưng.
 */
export const ThanhPho: React.FC<SceneProps> = ({ scene }) => {
  const mode = modeOf(scene.props, "o-luoi");
  if (mode === "tam-nap") return <TamNap scene={scene} />;
  if (mode === "culling" || mode === "culling-ba") return <Culling scene={scene} three={mode === "culling-ba"} />;
  if (mode === "quay-dau") return <QuayDau scene={scene} />;
  return <OLuoi scene={scene} />;
};

interface Map {
  x0: number;
  y0: number;
  cell: number;
  cols: number;
  rows: number;
}

function useMap(cols: number, rows: number): Map {
  const { sq } = useGeom();
  if (sq) {
    const cell = Math.min(760 / cols, 600 / rows);
    return { x0: 420 - (cell * cols) / 2, y0: 40, cell, cols, rows };
  }
  const cell = Math.min(1040 / cols, 740 / rows);
  return { x0: 100, y0: 415 - (cell * rows) / 2, cell, cols, rows };
}

/** Một khối nhà: `state` 1 = vẽ đủ, 0 = chỉ còn viền đứt (không có trong bộ nhớ / không vẽ). */
const Block: React.FC<{ m: Map; c: number; r: number; h: number; state: number; hot?: number }> = ({ m, c, r, h, state, hot = 0 }) => {
  const t = useTheme();
  const pad = m.cell * 0.14;
  const x = m.x0 + c * m.cell + pad;
  const y = m.y0 + r * m.cell + pad;
  const s = m.cell - 2 * pad;
  const roof = 0.45 + 0.55 * h;
  return (
    <g>
      <rect x={x} y={y} width={s} height={s} rx={6} fill="none" stroke={t.muted} strokeWidth={2} strokeDasharray="6 6" opacity={0.6 * (1 - state)} />
      <g opacity={state}>
        <rect x={x} y={y} width={s} height={s} rx={6} fill={hot > 0 ? t.accent2 : t.accent} opacity={0.25 + 0.6 * roof} />
        <rect x={x + s * 0.18} y={y + s * 0.18} width={s * 0.64} height={s * 0.64} rx={4} fill={t.bg} opacity={0.18 + 0.25 * h} />
      </g>
    </g>
  );
};

const Player: React.FC<{ x: number; y: number; ang: number; r: number }> = ({ x, y, ang, r }) => {
  const t = useTheme();
  return (
    <g transform={`translate(${x} ${y}) rotate(${ang})`}>
      <circle r={r} fill={t.warn} stroke={t.fg} strokeWidth={4} />
      <polygon points={`0,${-r - 16} ${-r * 0.6},${-r * 0.4} ${r * 0.6},${-r * 0.4}`} fill={t.fg} />
    </g>
  );
};

const SideNote: React.FC<{ lines: { text: string; color: string; op: number }[] }> = ({ lines }) => {
  const { sq } = useGeom();
  return (
    <g>
      {lines.map((l, i) => (
        <g key={i} opacity={l.op}>
          <Txt
            text={l.text}
            x={sq ? 420 : 1480}
            y={sq ? 702 + i * 52 : 230 + i * 150}
            w={sq ? 740 : 620}
            s={sq ? 36 : 46}
            fill={l.color}
            lines={sq ? 1 : 2}
          />
        </g>
      ))}
    </g>
  );
};

const OLuoi: React.FC<SceneProps> = () => {
  const t = useTheme();
  const f = useCurrentFrame();
  const m = useMap(8, 6);
  const blocks = cityBlocks(m.cols, m.rows);
  const g = p(f, 10, 40);
  return (
    <Stage>
      {blocks.map((b, i) => (
        <Block key={i} m={m} c={b.c} r={b.r} h={b.h} state={1} />
      ))}
      <g opacity={g}>
        {Array.from({ length: m.cols + 1 }, (_, i) => (
          <line key={`v${i}`} x1={m.x0 + i * m.cell} y1={m.y0} x2={m.x0 + i * m.cell} y2={m.y0 + lerp(0, m.rows * m.cell, g)} stroke={t.accent2} strokeWidth={4} />
        ))}
        {Array.from({ length: m.rows + 1 }, (_, i) => (
          <line key={`h${i}`} x1={m.x0} y1={m.y0 + i * m.cell} x2={m.x0 + lerp(0, m.cols * m.cell, g)} y2={m.y0 + i * m.cell} stroke={t.accent2} strokeWidth={4} />
        ))}
      </g>
      <SideNote
        lines={[
          { text: "Cắt thành phố thành nhiều ô", color: t.fg, op: 1 },
          { text: "như tờ giấy kẻ ô vuông phủ lên bản đồ", color: t.accent2, op: g },
        ]}
      />
    </Stage>
  );
};

const TamNap: React.FC<SceneProps> = ({ scene }) => {
  const t = useTheme();
  const f = useCurrentFrame();
  const { sq } = useGeom();
  const m = useMap(8, 6);
  const t1 = at(scene, 1);
  const a1 = p(f, t1, 14);
  const blocks = cityBlocks(m.cols, m.rows);
  // người chơi đi dọc con đường giữa hàng 2 và 3, qua lại
  const span = m.cols - 1.2;
  const u = (Math.sin((f / Math.max(60, scene.durationFrames)) * Math.PI * 1.6 - Math.PI / 2) + 1) / 2;
  const pc = 0.6 + u * span;
  const pr = 3;
  const R = 1.9; // tầm nạp, tính bằng ô
  const px = m.x0 + pc * m.cell;
  const py = m.y0 + pr * m.cell;
  return (
    <Stage>
      {blocks.map((b, i) => {
        const d = Math.hypot(b.c + 0.5 - pc, b.r + 0.5 - pr);
        const state = clamp01((R + 0.35 - d) / 0.5);
        return <Block key={i} m={m} c={b.c} r={b.r} h={b.h} state={state} />;
      })}
      <g opacity={a1}>
        <circle cx={px} cy={py} r={R * m.cell} fill={t.accent2} opacity={0.08} />
        <circle cx={px} cy={py} r={R * m.cell} fill="none" stroke={t.accent2} strokeWidth={5} strokeDasharray="14 10" />
        <rect x={px - (sq ? 90 : 100)} y={py - R * m.cell - (sq ? 52 : 58)} width={sq ? 180 : 200} height={sq ? 46 : 52} rx={14} fill={t.accent2} />
        <Txt text="tầm nạp" x={px} y={py - R * m.cell - (sq ? 18 : 20)} w={sq ? 170 : 190} s={sq ? 32 : 36} fill={t.bg} />
      </g>
      <Player x={px} y={py} ang={90} r={sq ? 16 : 20} />
      <SideNote
        lines={[
          { text: "Ô gần người chơi: nạp vào", color: t.accent, op: 1 },
          { text: "Ô ở xa: dỡ ra", color: t.muted, op: 1 },
        ]}
      />
    </Stage>
  );
};

const Culling: React.FC<SceneProps & { three: boolean }> = ({ scene, three }) => {
  const t = useTheme();
  const f = useCurrentFrame();
  const { sq } = useGeom();
  const m = useMap(9, 5);
  const blocks = cityBlocks(m.cols, m.rows, 11);
  const px = m.x0 + 4.5 * m.cell;
  const py = m.y0 + 5.45 * m.cell;
  const half = (34 * Math.PI) / 180; // nửa góc khung nhìn
  const far = 4.6 * m.cell; // khoảng cách vẽ
  const tower = { c: 4, r: 3 }; // tòa cao che khuất
  const tAng = Math.atan2(m.x0 + (tower.c + 0.5) * m.cell - px, py - (m.y0 + (tower.r + 0.5) * m.cell));
  const tDist = Math.hypot(m.x0 + (tower.c + 0.5) * m.cell - px, py - (m.y0 + (tower.r + 0.5) * m.cell));
  const kind = (c: number, r: number): "out" | "hid" | "far" | "ok" | "tower" => {
    if (c === tower.c && r === tower.r) return "tower";
    const dx = m.x0 + (c + 0.5) * m.cell - px;
    const dy = py - (m.y0 + (r + 0.5) * m.cell);
    const ang = Math.atan2(dx, dy);
    const dist = Math.hypot(dx, dy);
    if (Math.abs(ang) > half) return "out";
    if (Math.abs(ang - tAng) < 0.16 && dist > tDist) return "hid";
    if (dist > far) return "far";
    return "ok";
  };
  const t0 = at(scene, 0);
  const t1 = at(scene, 1);
  const t2 = at(scene, 2);
  // culling-ba: từng kiểu bỏ theo beat; culling: đã bỏ cả ba ngay từ đầu
  const gone = {
    out: three ? p(f, t0 + 10, 16) : 1,
    hid: three ? p(f, t1 + 10, 16) : 1,
    far: three ? p(f, t2 + 10, 16) : 1,
  };
  const chips = [
    { text: "1. Ngoài khung nhìn", on: three ? p(f, t0, 12) : p(f, t1 + 6, 12) },
    { text: "2. Bị vật khác che khuất", on: three ? p(f, t1, 12) : p(f, t1 + 14, 12) },
    { text: "3. Quá khoảng cách vẽ", on: three ? p(f, t2, 12) : p(f, t1 + 22, 12) },
  ];
  const coneL = { x: px + Math.sin(-half) * far * 1.3, y: py - Math.cos(-half) * far * 1.3 };
  const coneR = { x: px + Math.sin(half) * far * 1.3, y: py - Math.cos(half) * far * 1.3 };
  const showFar = three ? p(f, t2, 12) : 1;
  return (
    <Stage>
      <defs>
        <clipPath id="cull-map">
          <rect x={m.x0} y={m.y0} width={m.cols * m.cell} height={m.rows * m.cell + m.cell} />
        </clipPath>
      </defs>
      <g clipPath="url(#cull-map)">
        <polygon points={`${px},${py} ${coneL.x},${coneL.y} ${coneR.x},${coneR.y}`} fill={t.accent2} opacity={0.12} />
        <line x1={px} y1={py} x2={coneL.x} y2={coneL.y} stroke={t.accent2} strokeWidth={4} />
        <line x1={px} y1={py} x2={coneR.x} y2={coneR.y} stroke={t.accent2} strokeWidth={4} />
        <g opacity={showFar}>
          <path d={`M${px + Math.sin(-half) * far} ${py - Math.cos(-half) * far} A${far} ${far} 0 0 1 ${px + Math.sin(half) * far} ${py - Math.cos(half) * far}`} fill="none" stroke={t.warn} strokeWidth={5} strokeDasharray="12 10" />
        </g>
      </g>
      {blocks.map((b, i) => {
        const k = kind(b.c, b.r);
        const state = k === "ok" || k === "tower" ? 1 : 1 - gone[k];
        return <Block key={i} m={m} c={b.c} r={b.r} h={k === "tower" ? 1 : b.h} state={state} hot={k === "tower" ? 1 : 0} />;
      })}
      <Player x={px} y={py} ang={0} r={sq ? 16 : 20} />
      <Txt text="máy quay" x={px + (sq ? 110 : 140)} y={py + 12} w={sq ? 170 : 220} s={sq ? 30 : 36} fill={t.fg} />
      {!three && !sq && (
        <Txt text="Unreal Engine: ba kiểu loại bỏ" x={1490} y={170} w={600} s={44} fill={t.fg} opacity={p(f, t1, 12)} lines={2} />
      )}
      {chips.map((c, i) => (
        <g key={i} opacity={c.on}>
          <Chip
            x={sq ? 60 : 1190}
            y={sq ? 640 + i * 62 : 280 + i * 130}
            w={sq ? 720 : 600}
            h={sq ? 54 : 96}
            text={c.text}
            s={sq ? 32 : 40}
            fill={t.panel}
            stroke={i === 0 ? t.accent2 : i === 1 ? t.accent : t.warn}
            color={t.fg}
          />
        </g>
      ))}
    </Stage>
  );
};

const QuayDau: React.FC<SceneProps> = ({ scene }) => {
  const t = useTheme();
  const f = useCurrentFrame();
  const { sq } = useGeom();
  const m = useMap(9, 6);
  const blocks = cityBlocks(m.cols, m.rows, 3);
  const t1 = at(scene, 1);
  const t2 = at(scene, 2);
  const turn = p(f, 30, 15); // nửa giây = 15 frame
  const load = p(f, t1, 15);
  const pc = 4.5;
  const pr = 3;
  const px = m.x0 + pc * m.cell;
  const py = m.y0 + pr * m.cell;
  const ang = 180 * turn;
  const L = 3.2 * m.cell;
  const half = 36;
  const ray = (a: number) => ({ x: px + Math.sin((a * Math.PI) / 180) * L, y: py - Math.cos((a * Math.PI) / 180) * L });
  const a = ray(ang - half);
  const b = ray(ang + half);
  return (
    <Stage>
      {blocks.map((bk, i) => {
        const front = bk.r + 0.5 < pr;
        const state = front ? 1 : Math.max(0.0, load);
        return <Block key={i} m={m} c={bk.c} r={bk.r} h={bk.h} state={state} hot={!front && load > 0 && load < 1 ? 1 : 0} />;
      })}
      <polygon points={`${px},${py} ${a.x},${a.y} ${b.x},${b.y}`} fill={t.accent2} opacity={0.18} />
      <Player x={px} y={py} ang={ang} r={sq ? 18 : 22} />
      <g opacity={p(f, 30, 10)}>
        <Txt text="quay người: chừng nửa giây" x={sq ? 420 : 1480} y={sq ? 700 : 230} w={sq ? 740 : 620} s={sq ? 36 : 46} fill={t.fg} lines={sq ? 1 : 2} />
      </g>
      <g opacity={p(f, t1, 12)}>
        <Txt text="SSD của PS5 nạp khoảng 4 GB dữ liệu nén" x={sq ? 420 : 1480} y={sq ? 752 : 420} w={sq ? 740 : 620} s={sq ? 34 : 46} fill={t.accent2} lines={sq ? 1 : 2} />
      </g>
      <g opacity={p(f, t2, 12)}>
        <Txt text="đủ cho mọi thứ sau lưng bạn" x={sq ? 420 : 1480} y={sq ? 804 : 610} w={sq ? 740 : 620} s={sq ? 34 : 46} fill={t.ok} lines={sq ? 1 : 2} />
      </g>
    </Stage>
  );
};
