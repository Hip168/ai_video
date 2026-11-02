import React from "react";
import { FONT_FAMILY } from "../font";
import type { Beat2 } from "../timeline2";
import { clamp01, useTheme } from "./hooks";

export function subtitleOpacity(beat: Beat2, frame: number): number {
  const end = beat.startFrame + beat.durationFrames;
  if (frame < beat.startFrame || frame >= end) return 0;
  return Math.min(clamp01((frame - beat.startFrame) / 4), clamp01((end - frame) / 4));
}

export const Subtitle: React.FC<{ text: string; opacity?: number }> = ({ text, opacity = 1 }) => {
  const theme = useTheme();
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
          maxWidth: 1500,
          padding: "12px 28px",
          borderRadius: 16,
          background: "rgba(5, 8, 16, 0.78)",
          color: theme.fg,
          fontFamily: `${FONT_FAMILY}, sans-serif`,
          fontSize: 52,
          fontWeight: 700,
          lineHeight: 1.25,
          textAlign: "center",
          textWrap: "balance",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {text}
      </div>
    </div>
  );
};
