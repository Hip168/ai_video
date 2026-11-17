import React from "react";
import { Composition, staticFile, type CalculateMetadataFunction } from "remotion";
import { Video, type VideoProps } from "./Video";
import { KitDemo } from "./KitDemo";
import { loadFonts } from "./font";
import { validateTimeline } from "./timeline";
import { Episode, type EpisodeProps } from "./Episode";
import { loadMonoFonts } from "./lib/fonts";
import { validateTimeline2 } from "./timeline2";
import { clipRange, Short, SHORT_H, SHORT_W, type ShortProps } from "./Short";
import { Outro, OUTRO_FRAMES, OUTRO_SIZE, type OutroProps } from "./Outro";
import { OutroFacebook, FB_OUTRO_FRAMES, type OutroFacebookProps } from "./OutroFacebook";

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

const shortMetadata: CalculateMetadataFunction<ShortProps> = async ({ props }) => {
  if (props.timeline === null || props.timeline === undefined || !props.clip) return { props };
  const timeline = validateTimeline2(props.timeline);
  const { start, end } = clipRange(timeline, props.clip);
  return {
    durationInFrames: end - start,
    fps: timeline.fps,
    width: SHORT_W,
    height: SHORT_H,
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
      id="Short"
      component={Short}
      durationInFrames={30}
      fps={30}
      width={SHORT_W}
      height={SHORT_H}
      defaultProps={{ timeline: null, clip: null, muted: true } as ShortProps}
      calculateMetadata={shortMetadata}
    />
    {(["wide", "vertical"] as const).map((layout) => (
      <Composition
        key={layout}
        id={layout === "wide" ? "OutroWide" : "OutroVertical"}
        component={Outro}
        durationInFrames={OUTRO_FRAMES}
        fps={30}
        width={OUTRO_SIZE[layout].w}
        height={OUTRO_SIZE[layout].h}
        defaultProps={{ layout } as OutroProps}
      />
    ))}
    {(["wide", "vertical"] as const).map((layout) => (
      <Composition
        key={`fb-${layout}`}
        id={layout === "wide" ? "OutroFacebookWide" : "OutroFacebookVertical"}
        component={OutroFacebook}
        durationInFrames={FB_OUTRO_FRAMES}
        fps={30}
        width={OUTRO_SIZE[layout].w}
        height={OUTRO_SIZE[layout].h}
        defaultProps={{ layout } as OutroFacebookProps}
      />
    ))}
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
