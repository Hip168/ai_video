import React from "react";
import { useCurrentFrame } from "remotion";
import { useTheme } from "../../lib/hooks";
import { Stage } from "../../lib/theme";
import type { SceneProps } from "../../lib/types";
import { at, Chip, modeOf, p, Robot, Tile, type TileKind, Txt, useGeom } from "./common";

/**
 * Lưới câu đố ảnh tự vẽ (không chụp giao diện thật).
 * - `chon`: lưới 3×3 ô ảnh đường phố, một con trỏ máy chọn đúng các ô có đèn giao thông (lưới hiện đủ từ frame 0).
 * - `loai`: beat 0 câu đố ảnh xoay quanh 13 loại vật; beat 1 xe đạp, xe máy, vạch qua đường, đèn giao thông.
 */
export const LuoiDen: React.FC<SceneProps> = ({ scene }) => {
  const mode = modeOf(scene.props, "chon");
  return <Stage>{mode === "loai" ? <Loai scene={scene} /> : <Chon />}</Stage>;
};

const GRID: TileKind[] = ["cay", "den", "nha", "den", "xe-may", "vach", "xe-dap", "nha", "den"];

const Chon: React.FC = () => {
  const t = useTheme();
  const f = useCurrentFrame();
  const { sq } = useGeom();
  const G = sq ? { x: 140, y: 120, s: 186 } : { x: 160, y: 120, s: 206 };
  const order = [1, 3, 8];
  const pickAt = (k: number) => 20 + k * 22;
  const cur = order.findIndex((_, k) => f < pickAt(k) + 22);
  const tgt = order[Math.max(0, cur === -1 ? order.length - 1 : cur)];
  const tx = G.x + (tgt % 3) * G.s + G.s * 0.6;
  const ty = G.y + Math.floor(tgt / 3) * G.s + G.s * 0.6;
  const W = G.s * 3;
  return (
    <g>
      <rect x={G.x - 16} y={G.y - (sq ? 100 : 104)} width={W + 32} height={W + (sq ? 120 : 124)} rx={16} fill="#f4f6fa" />
      <rect x={G.x - 16} y={G.y - (sq ? 100 : 104)} width={W + 32} height={sq ? 84 : 88} rx={16} fill="#4a76d8" />
      <Txt text="Chọn mọi ô có đèn giao thông" x={G.x + W / 2} y={G.y - (sq ? 46 : 48)} w={W} s={sq ? 34 : 38} fill="#ffffff" />
      {GRID.map((k, i) => {
        const pi = order.indexOf(i);
        const sel = pi >= 0 ? p(f, pickAt(pi), 8) : 0;
        return <Tile key={i} kind={k} x={G.x + (i % 3) * G.s + 3} y={G.y + Math.floor(i / 3) * G.s + 3} s={G.s - 6} sel={sel} />;
      })}
      <g transform={`translate(${tx} ${ty})`}>
        <path d="M0 0 L0 44 L12 32 L22 52 L30 48 L20 28 L36 28 Z" fill="#ffffff" stroke="#0b1220" strokeWidth={3} />
      </g>
      {sq ? (
        <g>
          <Robot x={90} y={760} s={110} fill={t.panel} line={t.accent} />
          <Txt text="Máy giải: nhanh ngang người, đúng hơn người" x={470} y={760} w={600} s={32} fill={t.accent2} lines={2} />
        </g>
      ) : (
        <g>
          <Robot x={1240} y={300} s={220} fill={t.panel} line={t.accent} />
          <Txt text="Máy giờ giải được câu đố ảnh" x={1440} y={500} w={700} s={44} fill={t.fg} lines={2} />
          <Txt text="nhanh ngang người, đúng hơn người" x={1440} y={620} w={700} s={44} fill={t.accent2} lines={2} />
        </g>
      )}
    </g>
  );
};

const Loai: React.FC<SceneProps> = ({ scene }) => {
  const t = useTheme();
  const f = useCurrentFrame();
  const { sq } = useGeom();
  const t1 = at(scene, 1);
  const kinds: { k: TileKind; name: string }[] = [
    { k: "xe-dap", name: "xe đạp" },
    { k: "xe-may", name: "xe máy" },
    { k: "vach", name: "vạch qua đường" },
    { k: "den", name: "đèn giao thông" },
  ];
  const s = sq ? 170 : 260;
  const gap = sq ? 20 : 60;
  const x0 = (sq ? 840 : 1920) / 2 - (4 * s + 3 * gap) / 2;
  const y0 = sq ? 230 : 250;
  return (
    <g>
      <Chip x={sq ? 220 : 710} y={sq ? 40 : 40} w={sq ? 400 : 500} h={sq ? 110 : 120} text="13 loại vật" s={sq ? 56 : 64} fill={t.accent2} color={t.bg} />
      <Txt text="câu đố ảnh xoay quanh, theo ETH Zürich (2024)" x={sq ? 420 : 960} y={sq ? 196 : 210} w={sq ? 760 : 1400} s={sq ? 30 : 40} fill={t.muted} weight={400} />
      {kinds.map((it, i) => {
        const x = x0 + i * (s + gap);
        return (
          <g key={i}>
            <Tile kind={it.k} x={x} y={y0} s={s} />
            <g opacity={p(f, t1 + i * 8, 12)}>
              <Txt text={it.name} x={x + s / 2} y={y0 + s + (sq ? 44 : 58)} w={s + gap - 6} s={sq ? 30 : 40} fill={t.fg} lines={2} />
            </g>
          </g>
        );
      })}
      <g opacity={p(f, t1 + 40, 12)}>
        <Txt text="toàn là thứ bạn gặp trên phố" x={sq ? 420 : 960} y={sq ? 560 : 680} w={sq ? 760 : 1400} s={sq ? 36 : 48} fill={t.accent} />
      </g>
    </g>
  );
};
