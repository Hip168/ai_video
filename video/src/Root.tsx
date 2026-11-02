import React from "react";
import { Composition, staticFile, type CalculateMetadataFunction } from "remotion";
import { Video, type VideoProps } from "./Video";
import { KitDemo } from "./KitDemo";
import { loadFonts } from "./font";
import { validateTimeline } from "./timeline";
import { Episode, type EpisodeProps } from "./Episode";
import { loadMonoFonts } from "./lib/fonts";
import { validateTimeline2 } from "./timeline2";

const calculateMetadata: CalculateMetadataFunction<VideoProps> = async ({ props }) => {
  let raw: unknown = props.timeline;
  if (raw === null || raw === undefined) {
    const res = await fetch(staticFile("timeline.json"));
    if (!res.ok) throw new Error(`Không nạp được timeline.json (HTTP ${res.status})`);
    raw = await res.json();
  }
  const timeline = validateTimeline(raw);
  return {
    durationInFrames: timeline.durationInFrames,
    fps: timeline.fps,
    width: timeline.width,
    height: timeline.height,
    props: { timeline },
  };
};

const episodeMetadata: CalculateMetadataFunction<EpisodeProps> = async ({ props }) => {
  if (props.timeline === null || props.timeline === undefined) return { props };
  const timeline = validateTimeline2(props.timeline);
  return {
    durationInFrames: timeline.durationInFrames,
    fps: timeline.fps,
    width: timeline.width,
    height: timeline.height,
    props: { ...props, timeline },
  };
};

loadFonts();
loadMonoFonts();

export const Root: React.FC = () => (
  <>
    <Composition
      id="Video"
      component={Video}
      durationInFrames={30}
      fps={30}
      width={1920}
      height={1080}
      defaultProps={{ timeline: null } as VideoProps}
      calculateMetadata={calculateMetadata}
    />
    <Composition
      id="Episode"
      component={Episode}
      durationInFrames={30}
      fps={30}
      width={1920}
      height={1080}
      defaultProps={{ timeline: null, muted: true } as EpisodeProps}
      calculateMetadata={episodeMetadata}
    />
    <Composition
      id="KitDemo"
      component={KitDemo}
      durationInFrames={90}
      fps={30}
      width={1920}
      height={1080}
    />
  </>
);
