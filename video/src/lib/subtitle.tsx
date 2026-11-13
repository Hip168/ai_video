import React, { useMemo } from "react";
import { FONT_FAMILY } from "../font";
import type { Beat2 } from "../timeline2";
import { clamp01, useTheme } from "./hooks";
import { measureWidth, MIN_FONT_SCALE, type MeasureWidth } from "./text";

/** `fadeIn = false`: hiện đủ ngay frame đầu của beat (beat mở đầu tập, khung 0 không trống). */
export function subtitleOpacity(beat: Beat2, frame: number, fadeIn = true): number {
  const end = beat.startFrame + beat.durationFrames;
  if (frame < beat.startFrame || frame >= end) return 0;
  const inOp = fadeIn ? clamp01((frame - beat.startFrame) / 4) : 1;
  return Math.min(inOp, clamp01((end - frame) / 4));
}

const SUB_FONT = 52;
const SUB_MAX_W = 1500;
const SUB_PAD_X = 28;
const SUB_LINES = 2;
/** Bề rộng chữ trong hộp, chừa 3% cho sai số đo. */
const SUB_TEXT_W = (SUB_MAX_W - 2 * SUB_PAD_X) * 0.97;

/** Số dòng khi ngắt ở khoảng trắng; từ dài hơn một dòng thì sang dòng mới rồi ngắt giữa từ. */
function countLines(text: string, size: number, measure: MeasureWidth): number {
  let lines = 0;
  let cur = "";
  for (const w of text.split(/\s+/).filter((x) => x !== "")) {
    const next = cur === "" ? w : `${cur} ${w}`;
    if (measure(next, size) <= SUB_TEXT_W) {
      cur = next;
      continue;
    }
    if (cur !== "") lines++;
    cur = "";
    for (const ch of [...w]) {
      if (cur !== "" && measure(cur + ch, size) > SUB_TEXT_W) {
        lines++;
        cur = ch;
      } else cur += ch;
    }
  }
  return cur === "" ? lines : lines + 1;
}

/** Cỡ chữ phụ đề: 52 px; không vừa 2 dòng thì giảm dần tới 70% (MIN_FONT_SCALE). */
export function subtitleFontSize(text: string, measure: MeasureWidth = measureWidth): number {
  const min = Math.floor(SUB_FONT * MIN_FONT_SCALE);
  let size = SUB_FONT;
  while (size > min && countLines(text, size, measure) > SUB_LINES) size--;
  return size;
}

export const Subtitle: React.FC<{ text: string; opacity?: number }> = ({ text, opacity = 1 }) => {
  const theme = useTheme();
  const fontSize = useMemo(() => subtitleFontSize(text), [text]);
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 90,
        display: "flex",
        justifyContent: "center",
        opacity,
        pointerEvents: "none",
      }}
    >
      <div
        data-testid="subtitle"
        style={{
          maxWidth: SUB_MAX_W,
          padding: `12px ${SUB_PAD_X}px`,
          borderRadius: 16,
          background: "rgba(5, 8, 16, 0.78)",
          color: theme.fg,
          fontFamily: `${FONT_FAMILY}, sans-serif`,
          fontSize,
          fontWeight: 700,
          lineHeight: 1.25,
          textAlign: "center",
          textWrap: "balance",
          overflowWrap: "anywhere",
          display: "-webkit-box",
          WebkitLineClamp: SUB_LINES,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {text}
      </div>
    </div>
  );
};
