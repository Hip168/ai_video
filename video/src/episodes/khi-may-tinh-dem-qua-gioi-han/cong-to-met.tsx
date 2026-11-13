import React from "react";
import { useCurrentFrame } from "remotion";
import { useTheme } from "../../lib/hooks";
import { Stage } from "../../lib/theme";
import { monoStyle, TextBlock } from "../../lib/b-kit";
import type { SceneProps } from "../../lib/types";
import { at, clamp01, endOf, lerp, p, useGeom } from "./common";

const N = 5; // số ô của đồng hồ
const ROLL = 8; // frame lăn một chữ số

/** Đếm từng nấc: mỗi `step` frame cộng 1, chữ số cuối lăn trong `ROLL` frame cuối của nấc. */
function ticking(f: number, step: number): number {
  if (f <= 0) return 0;
  const n = Math.floor(f / step);
  const r = clamp01((f - n * step - (step - ROLL)) / ROLL);
  return n + r * r * (3 - 2 * r);
}

/** Giá trị đồng hồ theo frame, theo chế độ. */
function valueAt(mode: string, f: number, t: number[], end0: number): number {
  if (mode === "chay") {
    // Chạy đều từ 0; tới beat 2 thì tua nhanh lên toàn số 9.
    const v2 = ticking(t[2], 6);
    if (f < t[2]) return ticking(f, 6);
    return lerp(v2, 99999, p(f, t[2] + 6, 42));
  }
  if (mode === "lat") {
    // Đứng ở 99.999, rồi thêm một cây số: lật về 00.000.
    return 99999 + p(f, t[0] + 18, 26);
  }
  // "nhip": đếm từng nấc từ 99.990, chạm 99.999 trước beat 2; beat 2 thì cộng thêm một và lật.
  const stepLen = Math.max(8, Math.floor(Math.max(1, end0) / 9));
  const before = Math.min(9, ticking(f, stepLen));
  if (f < t[2] + 10) return 99990 + before;
  return 99999 + ticking(f - t[2] - 10 + 22, 30);
}

/** Một ô chữ số kiểu trống lăn. */
const Drum: React.FC<{ x: number; y: number; w: number; h: number; d: number; roll: number; fill: string; clip: string }> = ({ x, y, w, h, d, roll, fill, clip }) => {
  const fs = h * 0.66;
  return (
    <g clipPath={`url(#${clip})`} style={monoStyle}>
      <text x={x + w / 2} y={y + h * 0.72 - roll * h} fontSize={fs} fontWeight={700} fill={fill} textAnchor="middle">
        {d}
      </text>
      <text x={x + w / 2} y={y + h * 0.72 + (1 - roll) * h} fontSize={fs} fontWeight={700} fill={fill} textAnchor="middle">
        {(d + 1) % 10}
      </text>
    </g>
  );
};

/** Đồng hồ đếm số cây số 5 ô. mode "chay": chạy tới toàn số 9; "lat": thêm một, lật về toàn số 0, rồi đổi sang dãy bit; "nhip": đếm từng nhịp, chạm trần rồi lật. */
export const CongToMet: React.FC<SceneProps> = ({ scene }) => {
  const theme = useTheme();
  const f = useCurrentFrame();
  const { W, H, CX, sq } = useGeom();
  const mode = typeof scene.props.mode === "string" ? scene.props.mode : "chay";
  const t = [at(scene, 0), at(scene, 1), at(scene, 2)];
  const v = valueAt(mode, f, t, endOf(scene, 1));
  const iv = Math.floor(v + 1e-9);
  const frac = v - iv;

  const cw = Math.min(200, (W - 160) / (N + 1.6));
  const ch = cw * 1.35;
  const gap = cw * 0.12;
  const total = N * cw + (N - 1) * gap;
  const x0 = CX - total / 2;
  const showBits = mode === "lat";
  const y0 = showBits ? H * (sq ? 0.2 : 0.17) : H * (sq ? 0.3 : 0.25);
  const id = `ctm-${scene.id}`;

  // Viền ô sáng lên ở beat 1 (chế độ "chay"); toàn số 9 thì cả dãy đổi màu.
  const cellHi = mode === "chay" ? p(f, t[1], 12) : 0;
  const allNine = iv === 99999 && frac < 0.02 ? 1 : 0;
  const carryOut = iv >= 100000 || (iv === 99999 && frac > 0.5);
  const carryT = mode === "lat" ? p(f, t[0] + 30, 30) : mode === "nhip" ? p(f, t[2] + 22, 30) : 0;

  // Dãy 8 bit (chế độ "lat", beat 2).
  const bitsP = showBits ? p(f, t[2], 16) : 0;
  const bw = Math.min(110, (W - 120) / 8.6);
  const bx0 = CX - (8 * bw + 7 * bw * 0.12) / 2;
  const by = H * (sq ? 0.66 : 0.66);

  const title = mode === "chay" ? "Đồng hồ đếm số cây số" : mode === "lat" ? "Thêm một cây số nữa" : "Máy đếm đúng, trong số ô được cho";
  const fsT = sq ? 44 : 56;
  return (
    <Stage>
      <defs>
        {Array.from({ length: N }, (_, i) => (
          <clipPath key={i} id={`${id}-${i}`}>
            <rect x={x0 + i * (cw + gap)} y={y0} width={cw} height={ch} rx={cw * 0.12} />
          </clipPath>
        ))}
      </defs>
      <TextBlock text={title} x={CX} y={y0 - (sq ? 50 : 60)} width={W - 80} fontSize={fsT} fill={theme.fg} />
      <rect x={x0 - cw * 0.25} y={y0 - cw * 0.2} width={total + cw * 0.5} height={ch + cw * 0.4} rx={cw * 0.25} fill={theme.panel} stroke={theme.muted} strokeWidth={4} />
      {Array.from({ length: N }, (_, i) => {
        const k = N - 1 - i; // k = 0 là ô phải cùng
        const pow = 10 ** k;
        const d = Math.floor(iv / pow) % 10;
        const lower9 = k === 0 || iv % pow === pow - 1;
        const roll = lower9 ? frac : 0;
        const x = x0 + i * (cw + gap);
        const hot = allNine > 0 || cellHi > 0;
        return (
          <g key={i}>
            <rect x={x} y={y0} width={cw} height={ch} rx={cw * 0.12} fill={theme.bg} stroke={hot ? theme.accent2 : theme.accent} strokeWidth={hot ? 6 : 3} />
            <Drum x={x} y={y0} w={cw} h={ch} d={d} roll={roll} fill={allNine > 0 ? theme.accent2 : theme.fg} clip={`${id}-${i}`} />
          </g>
        );
      })}
      {/* Ô thứ sáu không có: chữ số nhớ "1" hiện ra bên trái rồi rơi mất. */}
      {(mode === "lat" || mode === "nhip") && carryOut && (
        <g opacity={1 - carryT}>
          <rect x={x0 - cw - gap - cw * 0.25} y={y0} width={cw} height={ch} rx={cw * 0.12} fill="none" stroke={theme.warn} strokeWidth={4} strokeDasharray="14 10" />
          <text
            x={x0 - gap - cw * 0.75}
            y={y0 + ch * 0.72 + carryT * H * 0.35}
            fontSize={ch * 0.66}
            fontWeight={700}
            fill={theme.warn}
            textAnchor="middle"
            style={monoStyle}
          >
            1
          </text>
        </g>
      )}
      {mode === "chay" && (
        <>
          <TextBlock text="Mỗi ô chỉ hiện một chữ số" x={CX} y={y0 + ch + (sq ? 110 : 120)} width={W - 80} fontSize={sq ? 40 : 48} fill={theme.accent2} opacity={cellHi} weight={400} />
          <TextBlock text="Mọi ô đều là số chín" x={CX} y={y0 + ch + (sq ? 180 : 200)} width={W - 80} fontSize={sq ? 44 : 56} fill={theme.accent2} opacity={allNine} />
        </>
      )}
      {mode === "lat" && (
        <>
          <TextBlock text="Không hỏng: chỉ hết ô để ghi" x={CX} y={y0 + ch + (sq ? 80 : 90)} width={W - 80} fontSize={sq ? 40 : 52} fill={theme.accent2} opacity={p(f, t[1], 14)} />
          <g opacity={bitsP} transform={`translate(0 ${(1 - bitsP) * 30})`}>
            {Array.from({ length: 8 }, (_, i) => {
              const x = bx0 + i * bw * 1.12;
              return (
                <g key={i}>
                  <rect x={x} y={by} width={bw} height={bw} rx={bw * 0.14} fill={theme.panel} stroke={theme.accent} strokeWidth={4} />
                  <text x={x + bw / 2} y={by + bw * 0.7} fontSize={bw * 0.6} fontWeight={700} fill={theme.muted} textAnchor="middle" style={monoStyle}>
                    0
                  </text>
                </g>
              );
            })}
            <TextBlock text="Số nguyên trong máy: một số bit cố định" x={CX} y={by + bw + (sq ? 60 : 64)} width={W - 80} fontSize={sq ? 36 : 44} fill={theme.fg} weight={400} />
          </g>
        </>
      )}
      {mode === "nhip" && (
        <TextBlock text="Lỡ đếm hết ô thì sao?" x={CX} y={y0 + ch + (sq ? 150 : 170)} width={W - 80} fontSize={sq ? 52 : 72} fill={theme.accent2} opacity={p(f, t[2], 14)} />
      )}
    </Stage>
  );
};
