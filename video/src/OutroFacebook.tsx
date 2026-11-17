import React from "react";
import { AbsoluteFill, Img, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { FONT_FAMILY } from "./font";
import { getTheme, type Theme } from "./lib/theme-data";
import { OUTRO_SIZE, OUTRO_VERTICAL_COLUMN, type OutroLayout } from "./Outro";
import avatar from "../../assets/brand/avatar-chip.png";
import FB from "../../assets/brand/outro-facebook.json";

/**
 * Đoạn kết cho bản Facebook (đề mục 32): cùng bố cục, nền, ảnh kênh, nhịp với đoạn kết YouTube (`Outro.tsx`),
 * nhưng lời kêu gọi theo kiểu Facebook: "Thích" (ngón cái), "Theo dõi" (người + dấu cộng), "Chia sẻ" (mũi tên).
 * Không có nút đăng ký kênh hay chuông của YouTube. `Outro.tsx` giữ nguyên để cache đoạn kết YouTube không đổi.
 */
export const FB_OUTRO_FRAMES: number = FB.frames;
export const FB_BLUE: string = FB.brand;
export const FB_PRESS = { like: FB.likePress, follow: FB.followPress, share: FB.sharePress } as const;

export type FbIcon = "thumb" | "person-plus" | "person-check" | "share";
export interface FbButtonState {
  id: "like" | "follow" | "share";
  label: string;
  icon: FbIcon;
  /** Chiều rộng nút ở tỉ lệ 1 (cao 120). */
  w: number;
  pressed: boolean;
}

/** Trạng thái ba nút ở frame cho trước: nhãn, biểu tượng, đã bấm chưa. Hàm thuần để test. */
export function fbButtons(frame: number): FbButtonState[] {
  const liked = frame >= FB_PRESS.like;
  const followed = frame >= FB_PRESS.follow;
  const shared = frame >= FB_PRESS.share;
  return [
    { id: "like", label: "Thích", icon: "thumb", w: 300, pressed: liked },
    { id: "follow", label: followed ? "Đang theo dõi" : "Theo dõi", icon: followed ? "person-check" : "person-plus", w: 540, pressed: followed },
    { id: "share", label: "Chia sẻ", icon: "share", w: 350, pressed: shared },
  ];
}

/** Hàng nút theo khung: ngang một hàng; dọc hai hàng (Thích + Theo dõi, rồi Chia sẻ) để nằm gọn cột x 48–888. */
export function fbRows(layout: OutroLayout): FbButtonState["id"][][] {
  return layout === "vertical" ? [["like", "follow"], ["share"]] : [["like", "follow", "share"]];
}
export const FB_SCALE: Record<OutroLayout, number> = { wide: 0.9, vertical: 0.9 };
export const FB_GAP: Record<OutroLayout, number> = { wide: 48, vertical: 32 };

const ICON_PATHS: Record<FbIcon, string[]> = {
  thumb: ["M2 10h4v11H2z M8 21h9.2a2 2 0 0 0 2-1.6l1.6-7.4A2 2 0 0 0 18.8 9.6H14l.8-4.2A2.2 2.2 0 0 0 12.6 3L8 9.8z"],
  "person-plus": ["M9 4a4 4 0 1 1 0 8a4 4 0 1 1 0-8z", "M2 21v-1a6 6 0 0 1 6-6h2a6 6 0 0 1 6 6v1", "M19 7v6 M16 10h6"],
  "person-check": ["M9 4a4 4 0 1 1 0 8a4 4 0 1 1 0-8z", "M2 21v-1a6 6 0 0 1 6-6h2a6 6 0 0 1 6 6v1", "M16 10l2 2 4-4"],
  share: ["M13 5l8 7-8 7v-4C7.5 15 4.5 16.5 2 20c.8-5.6 4-10 11-11z"],
};

/** Biểu tượng kiểu Facebook vẽ trong hộp 24x24. `filled`: tô kín (ngón cái đã thích, mũi tên chia sẻ). */
export const FbGlyph: React.FC<{ icon: FbIcon; x: number; y: number; size: number; color: string; filled: boolean }> = ({
  icon,
  x,
  y,
  size,
  color,
  filled,
}) => (
  <g data-icon={icon} transform={`translate(${x} ${y}) scale(${size / 24})`}>
    {ICON_PATHS[icon].map((d, i) => (
      <path
        key={i}
        d={d}
        fill={filled && i === 0 ? color : "none"}
        stroke={color}
        strokeWidth={1.8}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    ))}
  </g>
);

const press = (frame: number, at: number) =>
  interpolate(frame, [at - 4, at, at + 6], [1, 0.9, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

/** Màu của nút theo trạng thái. Thích/Chia sẻ: viền xanh Facebook, bấm thì tô xanh. Theo dõi: xanh, bấm thì chìm. */
function colors(b: FbButtonState, theme: Theme): { bg: string; border: string; ink: string; filled: boolean } {
  if (b.id === "follow") {
    return b.pressed
      ? { bg: theme.panel, border: theme.muted, ink: theme.fg, filled: false }
      : { bg: FB_BLUE, border: FB_BLUE, ink: "#ffffff", filled: false };
  }
  if (b.id === "like") {
    return b.pressed
      ? { bg: FB_BLUE, border: FB_BLUE, ink: "#ffffff", filled: true }
      : { bg: theme.panel, border: FB_BLUE, ink: theme.fg, filled: false };
  }
  return { bg: theme.panel, border: b.pressed ? FB_BLUE : theme.muted, ink: b.pressed ? FB_BLUE : theme.fg, filled: b.pressed };
}

const ENTER: Record<FbButtonState["id"], number> = { like: 20, follow: 32, share: 44 };

/** Hàng nút, không dùng hook (nhận frame, fps) để test bằng renderToStaticMarkup. */
export const FbButtonsView: React.FC<{ layout: OutroLayout; frame: number; fps: number; theme: Theme }> = ({
  layout,
  frame,
  fps,
  theme,
}) => {
  const k = FB_SCALE[layout];
  const h = 120 * k;
  const font = { fontFamily: `${FONT_FAMILY}, sans-serif`, fontWeight: 700, fontSize: 48 * k } as const;
  const all = fbButtons(frame);
  const at = { like: FB_PRESS.like, follow: FB_PRESS.follow, share: FB_PRESS.share };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, alignItems: "center" }}>
      {fbRows(layout).map((row, r) => (
        <div key={r} style={{ display: "flex", gap: FB_GAP[layout], justifyContent: "center" }}>
          {row.map((id) => {
            const b = all.find((x) => x.id === id)!;
            const c = colors(b, theme);
            const enter = spring({ frame: frame - ENTER[id], fps, config: { damping: 14 } });
            const w = b.w * k;
            return (
              <svg
                key={id}
                data-button={id}
                width={w}
                height={h}
                viewBox={`0 0 ${w} ${h}`}
                style={{ transform: `scale(${enter * press(frame, at[id])})`, opacity: enter, overflow: "visible" }}
              >
                <rect x={2} y={2} width={w - 4} height={h - 4} rx={(h - 4) / 2} fill={c.bg} stroke={c.border} strokeWidth={4} />
                <FbGlyph icon={b.icon} x={34 * k} y={h / 2 - 30 * k} size={60 * k} color={c.ink} filled={c.filled} />
                <text x={112 * k} y={h / 2} dominantBaseline="central" fill={c.ink} style={font}>
                  {b.label}
                </text>
              </svg>
            );
          })}
        </div>
      ))}
    </div>
  );
};

export interface OutroFacebookProps extends Record<string, unknown> {
  layout: OutroLayout;
}

export const OutroFacebook: React.FC<OutroFacebookProps> = ({ layout }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const theme = getTheme(FB.theme);
  const v = layout === "vertical";
  const pop = spring({ frame, fps, config: { damping: 12 } });
  const fade = (a: number) => interpolate(frame, [a, a + 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const avatarPx = v ? 340 : 220;
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
        background: `radial-gradient(circle at ${v ? (100 * (OUTRO_VERTICAL_COLUMN.x0 + OUTRO_VERTICAL_COLUMN.x1)) / 2 / OUTRO_SIZE.vertical.w : 50}% 42%, ${theme.panel} 0%, ${theme.bg} 70%)`,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: v ? 56 : 26,
        // Như đoạn kết YouTube: khung dọc chỉ dùng cột x 48–888, chừa dải nút bên phải của Reels/Shorts.
        padding: v ? `0 ${OUTRO_SIZE.vertical.w - OUTRO_VERTICAL_COLUMN.x1}px 0 ${OUTRO_VERTICAL_COLUMN.x0}px` : "0 120px",
      }}
    >
      <div style={{ ...text(v ? 64 : 56, theme.accent), opacity: fade(0) }}>{FB.headline}</div>
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
      <div style={{ opacity: fade(8), transform: `translateY(${(1 - fade(8)) * 30}px)` }}>
        <div style={text(v ? 58 : 62, theme.fg)}>{FB.channel}</div>
        <div style={{ ...text(v ? 40 : 34, theme.muted, 400), marginTop: 6 }}>{FB.page}</div>
      </div>
      <FbButtonsView layout={layout} frame={frame} fps={fps} theme={theme} />
      <div style={{ ...text(v ? 46 : 38, theme.muted, 400), opacity: fade(140) }}>{FB.footer}</div>
    </AbsoluteFill>
  );
};
