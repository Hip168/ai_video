import React from "react";
import { AbsoluteFill, Audio, Sequence, interpolate, useCurrentFrame } from "remotion";
import { loadFonts } from "./font";
import { ThemeContext, useTheme } from "./lib/hooks";
import { resolveScene } from "./lib/registry";
import { Subtitle, subtitleOpacity } from "./lib/subtitle";
import { getTheme } from "./lib/theme-data";
import { activeBeat2, type Scene2, type Timeline2 } from "./timeline2";

loadFonts();

export interface EpisodeProps extends Record<string, unknown> {
  timeline: Timeline2 | null;
  /** Mặc định true (D17): không phát tiếng, tiếng trộn sau bằng FFmpeg. */
  muted?: boolean;
  /** URL tuyệt đối của narration; chỉ dùng khi muted=false. */
  audioSrc?: string;
}

const FADE = 8;

/** Độ mờ của cảnh tại frame cục bộ; `fadeIn = false` cho cảnh mở đầu (khung 0 hiện đủ, không mờ dần từ nền). */
export function sceneOpacity(frame: number, durationFrames: number, fadeIn = true): number {
  const f = Math.max(1, Math.min(FADE, Math.floor(durationFrames / 2)));
  return interpolate(frame, [0, f, durationFrames - f, durationFrames], [fadeIn ? 0 : 1, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
}

export const SceneFade: React.FC<{ scene: Scene2; fadeIn?: boolean }> = ({ scene, fadeIn = true }) => {
  const frame = useCurrentFrame();
  const Comp = resolveScene(scene.type);
  const opacity = sceneOpacity(frame, scene.durationFrames, fadeIn);
  return (
    <AbsoluteFill style={{ opacity }}>
      <Comp scene={scene} />
    </AbsoluteFill>
  );
};

const Subtitles: React.FC<{ timeline: Timeline2 }> = ({ timeline }) => {
  const frame = useCurrentFrame();
  const beat = activeBeat2(timeline, frame);
  if (!beat) return null;
  return <Subtitle text={beat.text} opacity={subtitleOpacity(beat, frame, beat.startFrame > 0)} />;
};

const Body: React.FC<{ timeline: Timeline2; muted: boolean; audioSrc?: string }> = ({ timeline, muted, audioSrc }) => {
  const theme = useTheme();
  return (
    <AbsoluteFill style={{ backgroundColor: theme.bg }}>
      {!muted && audioSrc ? <Audio src={audioSrc} /> : null}
      {timeline.scenes.map((scene) => (
        <Sequence key={scene.id} from={scene.startFrame} durationInFrames={scene.durationFrames}>
          <SceneFade scene={scene} fadeIn={scene.startFrame > 0} />
        </Sequence>
      ))}
      <Subtitles timeline={timeline} />
    </AbsoluteFill>
  );
};

export const Episode: React.FC<EpisodeProps> = ({ timeline, muted = true, audioSrc }) => {
  if (!timeline) return <AbsoluteFill style={{ backgroundColor: getTheme("mau-a").bg }} />;
  return (
    <ThemeContext.Provider value={getTheme(timeline.theme)}>
      <Body timeline={timeline} muted={muted} audioSrc={audioSrc} />
    </ThemeContext.Provider>
  );
};
