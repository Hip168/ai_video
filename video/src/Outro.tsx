import React from "react";
import { AbsoluteFill, Img, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { FONT_FAMILY } from "./font";
import { getTheme, type Theme } from "./lib/theme-data";
import avatar from "../../assets/brand/avatar-chip.png";
import OUTRO from "../../assets/brand/outro.json";

/** Đoạn kết dùng chung (D38): ảnh kênh, tên kênh, nút "Thích" và "Đăng ký" tự vẽ. Lời đọc gắn bằng FFmpeg. */
export const OUTRO_FRAMES: number = OUTRO.frames;
export type OutroLayout = "wide" | "vertical";
export const OUTRO_SIZE: Record<OutroLayout, { w: number; h: number }> = {
  wide: { w: 1920, h: 1080 },
  vertical: { w: 1080, h: 1920 },
};
/** Frame bấm nút: hai nút đổi trạng thái ngay sau mốc này. */
export const LIKE_PRESS = 60;
export const SUB_PRESS = 95;

export interface OutroProps extends Record<string, unknown> {
  layout: OutroLayout;
}

const press = (frame: number, at: number) =>
  interpolate(frame, [at - 4, at, at + 6], [1, 0.9, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

/** Ngón cái giơ lên, vẽ trong hộp 24x24. */
const Thumb: React.FC<{ x: number; y: number; size: number; color: string; filled: boolean }> = ({ x, y, size, color, filled }) => (
  <g transform={`translate(${x} ${y}) scale(${size / 24})`}>
    <path
      d="M2 10h4v11H2z M8 21h9.2a2 2 0 0 0 2-1.6l1.6-7.4A2 2 0 0 0 18.8 9.6H14l.8-4.2A2.2 2.2 0 0 0 12.6 3L8 9.8z"
      fill={filled ? color : "none"}
      stroke={color}
      strokeWidth={1.8}
      strokeLinejoin="round"
    />
  </g>
);

/** Chuông nhỏ trên nút "Đăng ký", vẽ trong hộp 24x24. */
const Bell: React.FC<{ x: number; y: number; size: number; color: string }> = ({ x, y, size, color }) => (
  <g transform={`translate(${x} ${y}) scale(${size / 24})`} fill="none" stroke={color} strokeWidth={1.8} strokeLinejoin="round">
    <path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z" />
    <path d="M10 20a2 2 0 0 0 4 0" />
  </g>
);

const Pill: React.FC<{
  w: number;
  h: number;
  bg: string;
  border: string;
  scale: number;
  opacity: number;
  children?: React.ReactNode;
}> = ({ w, h, bg, border, scale, opacity, children }) => (
  <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ transform: `scale(${scale})`, opacity, overflow: "visible" }}>
    <rect x={2} y={2} width={w - 4} height={h - 4} rx={(h - 4) / 2} fill={bg} stroke={border} strokeWidth={4} />
    {children}
  </svg>
);

const Buttons: React.FC<{ theme: Theme; k: number; gap: number }> = ({ theme, k, gap }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const inLike = spring({ frame: frame - 20, fps, config: { damping: 14 } });
  const inSub = spring({ frame: frame - 32, fps, config: { damping: 14 } });
  const liked = frame >= LIKE_PRESS;
  const subbed = frame >= SUB_PRESS;
  const h = 120 * k;
  const font = { fontFamily: `${FONT_FAMILY}, sans-serif`, fontWeight: 700, fontSize: 48 * k } as const;
  const likeW = 330 * k;
  const subW = 430 * k;
  return (
    <div style={{ display: "flex", gap, justifyContent: "center" }}>
      <Pill
        w={likeW}
        h={h}
        bg={liked ? theme.accent : theme.panel}
        border={theme.accent}
        scale={inLike * press(frame, LIKE_PRESS)}
        opacity={inLike}
      >
        <Thumb x={36 * k} y={h / 2 - 30 * k} size={60 * k} color={liked ? theme.bg : theme.accent} filled={liked} />
        <text x={118 * k} y={h / 2} dominantBaseline="central" fill={liked ? theme.bg : theme.fg} style={font}>
          Thích
        </text>
      </Pill>
      <Pill
        w={subW}
        h={h}
        bg={subbed ? theme.panel : theme.accent2}
        border={subbed ? theme.muted : theme.accent2}
        scale={inSub * press(frame, SUB_PRESS)}
        opacity={inSub}
      >
        <Bell x={34 * k} y={h / 2 - 28 * k} size={56 * k} color={subbed ? theme.fg : theme.bg} />
        <text x={110 * k} y={h / 2} dominantBaseline="central" fill={subbed ? theme.fg : theme.bg} style={font}>
          {subbed ? "Đã đăng ký" : "Đăng ký"}
        </text>
      </Pill>
    </div>
  );
};

export const Outro: React.FC<OutroProps> = ({ layout }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const theme = getTheme(OUTRO.theme);
  const v = layout === "vertical";
  const k = v ? 1 : 0.9;
  const pop = spring({ frame, fps, config: { damping: 12 } });
  const fade = (a: number) => interpolate(frame, [a, a + 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const avatarPx = v ? 340 : 230;
  const text = (size: number, color: string, weight = 700): React.CSSProperties => ({
    fontFamily: `${FONT_FAMILY}, sans-serif`,
    fontWeight: weight,
    fontSize: size,
    color,
    textAlign: "center",
    lineHeight: 1.25,
  });
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at 50% 42%, ${theme.panel} 0%, ${theme.bg} 70%)`,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: v ? 64 : 34,
        padding: v ? "0 60px" : "0 120px",
      }}
    >
      <div style={{ ...text(v ? 64 : 56, theme.accent), opacity: fade(0) }}>{OUTRO.headline}</div>
      <Img
        src={avatar}
        style={{
          width: avatarPx,
          height: avatarPx,
          borderRadius: "50%",
          border: `${v ? 10 : 8}px solid ${theme.accent}`,
          transform: `scale(${pop})`,
        }}
      />
      <div
        style={{
          ...text(v ? 66 : 64, theme.fg),
          opacity: fade(8),
          transform: `translateY(${(1 - fade(8)) * 30}px)`,
        }}
      >
        {OUTRO.channel}
      </div>
      <Buttons theme={theme} k={k} gap={v ? 40 : 48} />
      <div style={{ ...text(v ? 46 : 38, theme.muted, 400), opacity: fade(110) }}>{OUTRO.footer}</div>
    </AbsoluteFill>
  );
};
