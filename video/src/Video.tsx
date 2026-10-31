import React from "react";
import {
  AbsoluteFill,
  Audio,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { loadFonts } from "./font";
import { Subtitle, subtitleOpacity } from "./kit";
import { SCENES } from "./scenes";
import { activeBeat, type Scene, type Timeline } from "./timeline";

loadFonts();

export interface VideoProps extends Record<string, unknown> {
  timeline: Timeline | null;
}

const FADE = 12;

const SceneFade: React.FC<{ scene: Scene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const Comp = SCENES[scene.id];
  const opacity = interpolate(
    frame,
    [0, FADE, scene.durationFrames - FADE, scene.durationFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  return (
    <AbsoluteFill style={{ opacity }}>
      <Comp scene={scene} />
    </AbsoluteFill>
  );
};

const Subtitles: React.FC<{ timeline: Timeline }> = ({ timeline }) => {
  const frame = useCurrentFrame();
  const beat = activeBeat(timeline, frame);
  if (!beat) return null;
  return <Subtitle text={beat.text} opacity={subtitleOpacity(beat, frame)} />;
};

export const Video: React.FC<VideoProps> = ({ timeline }) => {
  if (!timeline) return null;
  return (
    <AbsoluteFill style={{ backgroundColor: "#0b1220" }}>
      <Audio src={staticFile(timeline.audio.src)} />
      {timeline.scenes.map((scene) => (
        <Sequence
          key={scene.id}
          from={scene.startFrame}
          durationInFrames={scene.durationFrames}
        >
          <SceneFade scene={scene} />
        </Sequence>
      ))}
      <Subtitles timeline={timeline} />
    </AbsoluteFill>
  );
};
