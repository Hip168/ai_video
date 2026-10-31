import React from "react";
import { AbsoluteFill, Audio, staticFile } from "remotion";
import type { Timeline } from "./timeline";

export interface VideoProps extends Record<string, unknown> {
  timeline: Timeline | null;
}

export const Video: React.FC<VideoProps> = ({ timeline }) => {
  if (!timeline) return null;
  return (
    <AbsoluteFill style={{ backgroundColor: "#0b1220" }}>
      <Audio src={staticFile(timeline.audio.src)} />
    </AbsoluteFill>
  );
};
