import React from "react";
import { useCurrentFrame } from "remotion";
import { useTheme } from "../../lib/hooks";
import { Stage } from "../../lib/theme";
import { TextBlock } from "../../lib/b-kit";
import type { SceneProps } from "../../lib/types";
import { Arrow, at, clamp01, p, useGeom } from "./common";

/**
 * Cú đẩy trên trục lực–thời gian.
 * Beat 0: mạnh bao nhiêu (trục lực). Beat 1: kéo dài bao lâu (trục thời gian).
 * Beat 2: đẩy thật mạnh 1 giây và đẩy nhẹ 5 giây: hai hình chữ nhật cùng diện tích, cùng một cú hích.
 */
export const XungLuc: React.FC<SceneProps> = ({ scene }) => {
  const theme = useTheme();
  const f = useCurrentFrame();
  const { W, sq } = useGeom();
  const t1 = at(scene, 1);
  const t2 = at(scene, 2);
  const ox = sq ? 110 : 360;
  const oy = sq ? 640 : 700;
  const sec = sq ? 128 : 230; // px mỗi giây
  const unit = sq ? 78 : 96; // px mỗi đơn vị lực (không ghi số)
  const xEnd = ox + sec * 5 + (sq ? 50 : 140);
  const yTop = oy - unit * 5 - (sq ? 70 : 90);
  const fs = sq ? 32 : 40;

  const yP = p(f, 0, 14);
  const xP = p(f, t1, 14);
  const aP = clamp01((f - t2) / 14);
  const bP = clamp01((f - t2 - 16) / 34);
  const eqP = p(f, t2 + 52, 14);
  // Vạch "thời gian trôi" quét dọc trục trước khi vẽ hai cú đẩy.
  const sweep = f < t2 ? ((f % 60) / 60) * sec * 5 : -1;

  return (
    <Stage>
      {/* Trục: có từ frame 0 */}
      <line x1={ox} y1={oy} x2={xEnd} y2={oy} stroke={theme.fg} strokeWidth={5} />
      <polygon points={`${xEnd + 20},${oy} ${xEnd},${oy - 11} ${xEnd},${oy + 11}`} fill={theme.fg} />
      <line x1={ox} y1={oy} x2={ox} y2={yTop} stroke={theme.fg} strokeWidth={5} />
      <polygon points={`${ox},${yTop - 20} ${ox - 11},${yTop} ${ox + 11},${yTop}`} fill={theme.fg} />
      <TextBlock text="lực" x={ox + 24} y={yTop + 8} width={200} fontSize={fs} fill={theme.fg} anchor="start" />
      <TextBlock text="thời gian" x={sq ? ox + sec * 3 : xEnd + 34} y={sq ? oy + 50 : oy + 14} width={sq ? 260 : 220} fontSize={fs} fill={theme.fg} anchor={sq ? "middle" : "start"} />
      {[1, 5].map((s) => (
        <g key={s}>
          <line x1={ox + s * sec} y1={oy - 10} x2={ox + s * sec} y2={oy + 10} stroke={theme.fg} strokeWidth={4} />
          <TextBlock text={`${s} giây`} x={ox + s * sec} y={oy + (sq ? 50 : 60)} width={200} fontSize={fs} fill={theme.muted} weight={400} />
        </g>
      ))}
      {sweep >= 0 && <line x1={ox + sweep} y1={oy - 6} x2={ox + sweep} y2={oy - unit * 1.2} stroke={theme.muted} strokeWidth={4} strokeDasharray="10 8" opacity={0.7} />}

      {/* Beat 0: mạnh bao nhiêu */}
      <g opacity={yP * (1 - aP)}>
        <Arrow x1={ox - (sq ? 40 : 60)} y1={oy - 20} x2={ox - (sq ? 40 : 60)} y2={oy - unit * (2.5 + 1.5 * Math.sin(f * 0.12))} color={theme.accent} w={8} head={sq ? 22 : 28} />
        <TextBlock text="mạnh bao nhiêu?" x={ox + (sq ? 30 : 40)} y={oy - unit * 3.2} width={sq ? 420 : 520} fontSize={sq ? 36 : 48} fill={theme.accent} anchor="start" opacity={1 - aP} />
      </g>
      {/* Beat 1: kéo dài bao lâu */}
      <g opacity={xP * (1 - aP)}>
        <path d={`M${ox} ${oy - 40} V${oy - 56} H${ox + sec * 5} V${oy - 40}`} fill="none" stroke={theme.accent2} strokeWidth={6} />
        <TextBlock text="kéo dài bao lâu?" x={ox + sec * 2.5 + (sq ? 40 : 0)} y={oy - 76} width={sq ? 440 : 560} fontSize={sq ? 36 : 48} fill={theme.accent2} />
      </g>

      {/* Beat 2: hai cú đẩy */}
      <rect x={ox} y={oy - unit * 5} width={sec * aP} height={unit * 5} fill={theme.accent} opacity={0.55 * (aP > 0 ? 1 : 0)} stroke={theme.accent} strokeWidth={4} />
      <rect x={ox} y={oy - unit} width={sec * 5 * bP} height={unit} fill={theme.accent2} opacity={0.6 * (bP > 0 ? 1 : 0)} stroke={theme.accent2} strokeWidth={4} />
      <g opacity={p(f, t2 + 6, 12)}>
        <TextBlock text="thật mạnh, 1 giây" x={ox + sec + 20} y={oy - unit * 4.4} width={sq ? 360 : 520} fontSize={sq ? 34 : 44} fill={theme.accent} anchor="start" />
      </g>
      <g opacity={p(f, t2 + 30, 12)}>
        <TextBlock text="nhẹ, 5 giây" x={ox + sec * 3} y={oy - unit - 22} width={sq ? 360 : 520} fontSize={sq ? 34 : 44} fill={theme.accent2} />
      </g>
      <g opacity={eqP}>
        <TextBlock
          text="Diện tích bằng nhau: cùng một cú hích"
          x={sq ? W / 2 : ox + sec * 1.4}
          y={sq ? 120 : oy - unit * 3}
          width={sq ? W - 60 : 1100}
          fontSize={sq ? 38 : 54}
          maxLines={2}
          fill={theme.fg}
          anchor={sq ? "middle" : "start"}
        />
      </g>
      {/* Khung diện tích nhấp nháy nhẹ sau khi so sánh, để cảnh không đứng yên */}
      {eqP > 0 && (
        <g opacity={0.5 + 0.5 * Math.sin((f - t2) * 0.15)}>
          <rect x={ox} y={oy - unit * 5} width={sec} height={unit * 5} fill="none" stroke={theme.fg} strokeWidth={3} strokeDasharray="12 10" strokeDashoffset={-f} />
          <rect x={ox} y={oy - unit} width={sec * 5} height={unit} fill="none" stroke={theme.fg} strokeWidth={3} strokeDasharray="12 10" strokeDashoffset={f} />
        </g>
      )}
    </Stage>
  );
};
