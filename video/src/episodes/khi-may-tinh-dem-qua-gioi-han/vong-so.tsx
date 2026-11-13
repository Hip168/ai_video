import React from "react";
import { useCurrentFrame } from "remotion";
import { useTheme } from "../../lib/hooks";
import { Stage } from "../../lib/theme";
import { TextBlock } from "../../lib/b-kit";
import type { SceneProps } from "../../lib/types";
import { arcPath, at, endOf, lerp, onCircle, p, useGeom } from "./common";

const GAP = 14; // khe (độ) đánh dấu chỗ nối giữa giá trị lớn nhất và nhỏ nhất

/** Góc (độ, 0 ở đỉnh, chiều kim đồng hồ) của vị trí `idx` trong `total` vị trí, khe nối ở góc `seam`. */
const angleOf = (idx: number, total: number, seam: number): number => seam + GAP / 2 + (idx / (total - 1)) * (360 - GAP);

/**
 * Vòng số: mọi giá trị của một kiểu số nguyên xếp quanh vòng tròn như mặt đồng hồ.
 * mode "u8": 0 đến 255, khe ở đỉnh; gán 256 thành 0, 257 thành 1.
 * mode "i8": khe xoay từ đỉnh xuống đáy, nửa trái thành số âm, rồi chữ "bù hai".
 * mode "i32": con trỏ ở 2.147.483.647, "+ 1" hiện ở dòng riêng (beat 0); cộng 1 thì nhảy qua khe sang −2.147.483.648 (beat 1);
 *   có beat 2 thì nhấn mạnh không về 0 mà sang số âm xa nhất (như "i32-xa").
 * mode "i32-xa": đã nhảy qua khe; nhấn mạnh không về 0 mà sang số âm xa nhất.
 */
export const VongSo: React.FC<SceneProps> = ({ scene }) => {
  const theme = useTheme();
  const f = useCurrentFrame();
  const { W, CX, sq } = useGeom();
  const mode = typeof scene.props.mode === "string" ? scene.props.mode : "u8";
  const t0 = at(scene, 0);
  const t1 = at(scene, 1);
  const t2 = scene.beats.length >= 3 ? at(scene, 2) : Infinity;
  const xa = mode === "i32-xa" || (mode === "i32" && f >= t2);
  const R = sq ? 230 : 262;
  const CY = sq ? 360 : 360;
  const stroke = sq ? 34 : 40;
  const signed = mode !== "u8";

  // Khe nối: u8 ở đỉnh; i8 xoay từ đỉnh xuống đáy ở beat 0; i32 ở đáy.
  const rot = mode === "i8" ? p(f, t0 + 12, 36) : signed ? 1 : 0;
  const seam = 180 * rot;
  const negP = mode === "i8" ? p(f, t0 + 48, 20) : signed ? 1 : 0;
  const total = 256;
  const a = (idx: number) => angleOf(idx, total, seam);

  // Con trỏ.
  let ptr = 0; // góc
  let center = "";
  let centerColor = theme.fg;
  let small = "";
  if (mode === "u8") {
    const s1 = p(f, t0 + 18, 18);
    const t257 = lerp(t0, endOf(scene, 0), 0.55);
    const s2 = p(f, t257, 14);
    ptr = s2 > 0 ? lerp(a(0) + 360, a(1) + 360, s2) : lerp(a(255), a(0) + 360, s1);
    small = f < t0 + 18 ? "u8: từ 0 đến 255" : f < t257 ? "gán 256" : "gán 257";
    center = f < t0 + 18 + 9 ? "255" : f < t257 + 7 ? "0" : "1";
    centerColor = f < t0 + 18 ? theme.fg : theme.accent2;
  } else if (mode === "i8") {
    ptr = -1;
    small = "8 bit có dấu";
    center = "bù hai";
    centerColor = theme.accent2;
  } else if (mode === "i32") {
    const jump = p(f, t1 + 4, 12);
    ptr = lerp(a(255), a(0) + 360, jump);
    small = f >= t2 ? "không về 0" : "int: 32 bit có dấu";
    center = f < t1 + 10 ? "2.147.483.647" : "−2.147.483.648";
    centerColor = f < t1 + 10 ? theme.fg : theme.warn;
  } else {
    ptr = a(0);
    small = "không về 0";
    center = "−2.147.483.648";
    centerColor = theme.warn;
  }
  const centerP = mode === "i8" ? p(f, t1, 14) : 1;
  const plusOne = mode === "i32" ? p(f, t0 + 10, 12) : 1;
  const centerText = center;
  // "+ 1" ở dòng riêng dưới số (một dòng không đủ chỗ), tắt khi nhảy qua khe.
  const plusOp = mode === "i32" ? plusOne * (1 - p(f, t1 + 4, 8)) : 0;

  // Nhãn hai bên khe.
  const minLabel = mode === "u8" ? "0" : mode === "i8" ? "" : "−2.147.483.648";
  const maxLabel = mode === "u8" ? "255" : mode === "i8" ? "" : "2.147.483.647";
  const fsL = sq ? 34 : 44;
  const ticks = 48;
  const pp = onCircle(CX, CY, R, ptr);
  const po = onCircle(CX, CY, R + stroke + 24, ptr);
  const pulse = 0.5 + 0.5 * Math.sin(f * 0.25);
  return (
    <Stage>
      {/* Vòng: nửa không âm màu chính, nửa âm màu cảnh báo. */}
      <path d={arcPath(CX, CY, R, seam + GAP / 2, seam + 360 - GAP / 2)} fill="none" stroke={theme.accent} strokeWidth={stroke} opacity={0.85} />
      {signed && <path d={arcPath(CX, CY, R, 180 + GAP / 2, 360)} fill="none" stroke={theme.warn} strokeWidth={stroke} opacity={0.9 * negP} />}
      {Array.from({ length: ticks }, (_, k) => {
        const ang = a((k * (total - 1)) / (ticks - 1));
        const q0 = onCircle(CX, CY, R - stroke / 2, ang);
        const q1 = onCircle(CX, CY, R + stroke / 2, ang);
        return <line key={k} x1={q0.x} y1={q0.y} x2={q1.x} y2={q1.y} stroke={theme.bg} strokeWidth={3} opacity={0.6} />;
      })}
      {/* Khe nối */}
      {(() => {
        const q0 = onCircle(CX, CY, R - stroke, seam);
        const q1 = onCircle(CX, CY, R + stroke, seam);
        return <line x1={q0.x} y1={q0.y} x2={q1.x} y2={q1.y} stroke={theme.accent2} strokeWidth={6} strokeDasharray="10 8" />;
      })()}
      {/* Nhãn số 0 ở đỉnh với kiểu có dấu */}
      {signed && rot > 0.95 && <TextBlock text="0" x={CX} y={CY - R - stroke / 2 - 18} width={200} fontSize={fsL} fill={theme.fg} />}
      {mode === "i8" && (
        <>
          <TextBlock text="0 và số dương" x={CX + R * 0.62 + (sq ? 0 : 160)} y={CY + R + stroke + 50} width={sq ? 360 : 520} fontSize={fsL} fill={theme.accent} opacity={negP} />
          <TextBlock text="số âm" x={CX - R * 0.62 - (sq ? 0 : 160)} y={CY + R + stroke + 50} width={sq ? 300 : 520} fontSize={fsL} fill={theme.warn} opacity={negP} />
        </>
      )}
      {mode === "u8" && (
        <>
          <TextBlock text={minLabel} x={CX + 70} y={CY - R - stroke / 2 - 18} width={160} fontSize={fsL} fill={theme.fg} anchor="start" />
          <TextBlock text={maxLabel} x={CX - 70} y={CY - R - stroke / 2 - 18} width={200} fontSize={fsL} fill={theme.fg} anchor="end" />
        </>
      )}
      {(mode === "i32" || mode === "i32-xa") && (
        <>
          <TextBlock text={maxLabel} x={CX + 30} y={CY + R + stroke + 50} width={W / 2 - 60} fontSize={fsL} fill={theme.accent} anchor="start" />
          <TextBlock text={minLabel} x={CX - 30} y={CY + R + stroke + 50} width={W / 2 - 60} fontSize={fsL} fill={theme.warn} anchor="end" />
        </>
      )}
      {/* Con trỏ */}
      {ptr >= 0 && (
        <g>
          <circle cx={pp.x} cy={pp.y} r={stroke * 0.62} fill={theme.accent2} stroke={theme.bg} strokeWidth={5} />
          <line x1={po.x} y1={po.y} x2={pp.x} y2={pp.y} stroke={theme.accent2} strokeWidth={8} strokeLinecap="round" />
        </g>
      )}
      {/* Chữ giữa vòng */}
      <TextBlock text={small} x={CX} y={CY - (sq ? 50 : 60)} width={R * 1.5} fontSize={sq ? 34 : 40} fill={theme.muted} weight={400} />
      <TextBlock text={centerText} x={CX} y={CY + (sq ? 30 : 36)} width={R * 1.62} fontSize={sq ? 56 : 72} fill={centerColor} opacity={centerP} />
      {mode === "u8" && (
        <TextBlock text="Không hề báo lỗi" x={CX} y={CY + (sq ? 110 : 120)} width={R * 1.4} fontSize={sq ? 34 : 40} fill={theme.ok} opacity={p(f, t1, 14)} />
      )}
      {xa && (
        <>
          {/* Mũi tên qua khe, nhấp nháy */}
          <path
            d={arcPath(CX, CY, R - stroke / 2 - 16, a(255) - 4, a(0) + 360 + 4)}
            fill="none"
            stroke={theme.warn}
            strokeWidth={8}
            strokeLinecap="round"
            opacity={0.4 + 0.6 * pulse}
          />
          <TextBlock text="số âm xa nhất" x={CX} y={CY + (sq ? 110 : 125)} width={R * 1.5} fontSize={sq ? 38 : 48} fill={theme.warn} opacity={p(f, (mode === "i32" ? t2 : t0) + 20, 14)} />
        </>
      )}
      {mode === "i32" && plusOp > 0 && (
        <TextBlock text="+ 1" x={CX} y={CY + (sq ? 110 : 125)} width={R * 1.2} fontSize={sq ? 50 : 64} fill={theme.accent2} opacity={plusOp} />
      )}
      {mode === "i32" && f >= t1 + 10 && (
        <path d={arcPath(CX, CY, R, 180 + GAP / 2, 180 + GAP / 2 + 40 * p(f, t1 + 10, 30))} fill="none" stroke={theme.accent2} strokeWidth={stroke + 10} opacity={0.35 + 0.3 * pulse} />
      )}
      {/* Vầng sáng quanh con trỏ: nhịp liên tục để cảnh không đứng hình */}
      {(mode === "i32" || mode === "i32-xa") && ptr >= 0 && (
        <circle cx={pp.x} cy={pp.y} r={stroke * (0.9 + 0.35 * pulse)} fill="none" stroke={f < t1 + 10 && mode === "i32" ? theme.accent2 : theme.warn} strokeWidth={5} opacity={0.3 + 0.5 * (1 - pulse)} />
      )}
    </Stage>
  );
};
