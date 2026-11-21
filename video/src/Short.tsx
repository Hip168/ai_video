import React from "react";
import { AbsoluteFill, Sequence, interpolate, useCurrentFrame } from "remotion";
import { FONT_FAMILY } from "./font";
import { SceneFade } from "./Episode";
import { clamp01, ThemeContext, useTheme } from "./lib/hooks";
import { SceneBox, SHORT_SUBTITLE_PX, SQUARE_BOX } from "./lib/theme";
import { getTheme } from "./lib/theme-data";
import { glueVi } from "./lib/glue";
import { activeBeat2, type Timeline2 } from "./timeline2";

/** Khung Short 1080×1920 (D28, D32). */
export const SHORT_W = 1080;
export const SHORT_H = 1920;
/**
 * Bố cục toàn màn hình (thay D32 MỞ-1 và phần căn giữa của D34): người xem dùng chế độ xem sạch của YouTube, TikTok
 * (ẩn nút, mô tả), nên không thu cảnh vào vùng an toàn. Lề 48 px quanh mép; hộp cảnh vuông rộng hết 1080 − 2·48 = 984,
 * tâm ở giữa khung (y 960); hook ngay trên, phụ đề ngay dưới.
 */
export const SHORT_SCENE = { x0: 48, x1: 1032, y0: 468, y1: 1452 } as const;
export const SHORT_HOOK = { x0: 48, x1: 1032, y0: 318, y1: 448 } as const;
/** Phụ đề trong cột x 48–888 như đoạn kết dọc (PR #88): chữ không lấn dải nút bên phải (x > 900). */
export const SHORT_SUBTITLE = { x0: 48, x1: 888, y0: 1472, y1: 1602 } as const;
/** Cảnh vẽ theo hệ toạ độ 840x840 (`SQUARE_BOX`) rồi phóng lên hộp 984: chữ ra to hơn ngưỡng tính theo đơn vị cảnh. */
export const SHORT_SCENE_SCALE = (SHORT_SCENE.x1 - SHORT_SCENE.x0) / SQUARE_BOX.w;
export const SHORT_FADE = 8;

/** Độ mờ của cả phần Short: khung 0 hiện đủ (không fade vào), chỉ fade ra `SHORT_FADE` frame cuối. */
export function shortOpacity(frame: number, len: number): number {
  const f = Math.max(1, Math.min(SHORT_FADE, Math.floor(len / 2)));
  return interpolate(frame, [len - f, len], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
}

export interface ShortClip {
  from: string;
  to: string;
  hook: string;
  part: number;
  total: number;
}

export interface ShortProps extends Record<string, unknown> {
  timeline: Timeline2 | null;
  clip: ShortClip | null;
  /** Luôn câm: tiếng của Short cắt từ mix.wav và gắn bằng FFmpeg. */
  muted?: boolean;
}

/** Chỉ số cảnh đầu và cuối (tính cả) của phần; cảnh đầu lùi qua các cảnh không có beat đứng ngay trước (D33). */
export function sceneRange(timeline: Timeline2, clip: { from: string; to: string }): { first: number; last: number } {
  const sceneOf = (id: string) => timeline.scenes.findIndex((s) => s.beats.some((b) => b.id === id));
  let first = sceneOf(clip.from);
  const last = sceneOf(clip.to);
  if (first < 0) throw new Error(`Short: không có beat ${clip.from}`);
  if (last < 0) throw new Error(`Short: không có beat ${clip.to}`);
  if (last < first) throw new Error(`Short: beat ${clip.to} đứng trước ${clip.from}`);
  while (first > 0 && timeline.scenes[first - 1].beats.length === 0) first--;
  return { first, last };
}

/** Dải frame của phần: `start` = đầu cảnh đầu, `end` = cuối cảnh chứa `to` (không tính). */
export function clipRange(timeline: Timeline2, clip: { from: string; to: string }): { start: number; end: number } {
  const { first, last } = sceneRange(timeline, clip);
  const a = timeline.scenes[first];
  const b = timeline.scenes[last];
  return { start: a.startFrame, end: b.startFrame + b.durationFrames };
}

/** Số ký tự tối đa một đoạn phụ đề Short (2 dòng chữ 48 px; giữ số của hộp 840 cũ). */
export const MAX_SHORT_SUBTITLE_CHARS = 52;

export interface SubtitleSegment {
  text: string;
  /** frame bắt đầu, tương đối đầu beat */
  start: number;
  durationFrames: number;
}

/**
 * Beat dài hơn MAX_SHORT_SUBTITLE_CHARS thì tách đôi tại dấu phẩy (hoặc khoảng trắng) gần giữa, lặp tới khi
 * mỗi đoạn đủ ngắn; thời gian chia theo tỉ lệ ký tự. Lấy cách tách của `splitSubtitleDoc` (nhánh 4).
 */
export function splitSubtitleShort(text: string, durationFrames: number): SubtitleSegment[] {
  if (text.length <= MAX_SHORT_SUBTITLE_CHARS || durationFrames < 2) return [{ text, start: 0, durationFrames }];
  const mid = text.length / 2;
  const near = (idxs: number[]) =>
    idxs.reduce((best, i) => (best < 0 || Math.abs(i - mid) < Math.abs(best - mid) ? i : best), -1);
  const commas: number[] = [];
  const spaces: number[] = [];
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "," && text[i + 1] === " ") commas.push(i + 1);
    else if (text[i] === " ") spaces.push(i);
  }
  const c = near(commas);
  const cut = c >= 0 && Math.abs(c - mid) <= text.length * 0.25 ? c : near([...commas, ...spaces]);
  if (cut < 0) return [{ text, start: 0, durationFrames }];
  const a = text.slice(0, cut).trim();
  const b = text.slice(cut).trim();
  const d1 = Math.min(durationFrames - 1, Math.max(1, Math.round((durationFrames * a.length) / (a.length + b.length))));
  return [
    ...splitSubtitleShort(a, d1),
    ...splitSubtitleShort(b, durationFrames - d1).map((s) => ({ ...s, start: s.start + d1 })),
  ];
}

const FONT = `${FONT_FAMILY}, sans-serif`;

const Hook: React.FC<{ text: string; part: number; total: number }> = ({ text, part, total }) => {
  const theme = useTheme();
  return (
    <div
      style={{
        position: "absolute",
        left: SHORT_HOOK.x0,
        top: SHORT_HOOK.y0,
        width: SHORT_HOOK.x1 - SHORT_HOOK.x0,
        height: SHORT_HOOK.y1 - SHORT_HOOK.y0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        fontFamily: FONT,
        fontWeight: 700,
        textAlign: "center",
      }}
    >
      <div data-testid="short-part" style={{ color: theme.muted, fontSize: 36, lineHeight: 1.2 }}>
        {`Phần ${part}/${total}`}
      </div>
      <div
        data-testid="short-hook"
        style={{ color: theme.accent2, fontSize: 48, lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", maxWidth: "100%" }}
      >
        {text}
      </div>
    </div>
  );
};

const ShortSubtitle: React.FC<{ timeline: Timeline2; frame: number; start: number }> = ({ timeline, frame, start }) => {
  const theme = useTheme();
  const beat = activeBeat2(timeline, frame);
  if (!beat) return null;
  const rel = frame - beat.startFrame;
  // glueVi: chỗ chia đoạn và chỗ xuống dòng không rơi vào giữa số với đơn vị hay giữa từ ghép.
  const seg = splitSubtitleShort(glueVi(beat.text), beat.durationFrames).find((s) => rel >= s.start && rel < s.start + s.durationFrames);
  if (!seg) return null;
  const fadeIn = beat.startFrame + seg.start > start ? clamp01((rel - seg.start) / 4) : 1;
  const opacity = Math.min(fadeIn, clamp01((seg.start + seg.durationFrames - rel) / 4));
  return (
    <div
      style={{
        position: "absolute",
        left: SHORT_SUBTITLE.x0,
        top: SHORT_SUBTITLE.y0,
        width: SHORT_SUBTITLE.x1 - SHORT_SUBTITLE.x0,
        height: SHORT_SUBTITLE.y1 - SHORT_SUBTITLE.y0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity,
        pointerEvents: "none",
      }}
    >
      <div
        data-testid="subtitle"
        style={{
          boxSizing: "border-box",
          maxWidth: SHORT_SUBTITLE.x1 - SHORT_SUBTITLE.x0,
          padding: "4px 18px",
          borderRadius: 16,
          background: "rgba(5, 8, 16, 0.78)",
          color: theme.fg,
          fontFamily: FONT,
          fontSize: SHORT_SUBTITLE_PX,
          fontWeight: 700,
          lineHeight: 1.15,
          textAlign: "center",
          textWrap: "balance",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {seg.text}
      </div>
    </div>
  );
};

const Body: React.FC<{ timeline: Timeline2; clip: ShortClip }> = ({ timeline, clip }) => {
  const theme = useTheme();
  const frame = useCurrentFrame();
  const { start, end } = clipRange(timeline, clip);
  const len = end - start;
  const opacity = shortOpacity(frame, len);
  const scenes = timeline.scenes.filter((s) => s.startFrame < end && s.startFrame + s.durationFrames > start);
  return (
    <AbsoluteFill style={{ backgroundColor: theme.bg }}>
      <Hook text={clip.hook} part={clip.part} total={clip.total} />
      <div
        style={{
          position: "absolute",
          left: SHORT_SCENE.x0,
          top: SHORT_SCENE.y0,
          width: SHORT_SCENE.x1 - SHORT_SCENE.x0,
          height: SHORT_SCENE.y1 - SHORT_SCENE.y0,
          overflow: "hidden",
          opacity,
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: SQUARE_BOX.w,
            height: SQUARE_BOX.h,
            transform: `scale(${SHORT_SCENE_SCALE})`,
            transformOrigin: "0 0",
          }}
        >
          <SceneBox layout="square">
            <Sequence from={-start} layout="none">
              {scenes.map((scene) => (
                <Sequence key={scene.id} from={scene.startFrame} durationInFrames={scene.durationFrames}>
                  <SceneFade scene={scene} fadeIn={scene.startFrame > start} />
                </Sequence>
              ))}
            </Sequence>
          </SceneBox>
        </div>
      </div>
      <div style={{ opacity }}>
        <ShortSubtitle timeline={timeline} frame={frame + start} start={start} />
      </div>
    </AbsoluteFill>
  );
};

export const Short: React.FC<ShortProps> = ({ timeline, clip }) => {
  if (!timeline || !clip) return <AbsoluteFill style={{ backgroundColor: getTheme("mau-a").bg }} />;
  return (
    <ThemeContext.Provider value={getTheme(timeline.theme)}>
      <Body timeline={timeline} clip={clip} />
    </ThemeContext.Provider>
  );
};
