import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { FONT_FAMILY } from "./font";
import { getTheme } from "./lib/theme-data";
import { OUTRO_SIZE } from "./Outro";
import CARD from "../../assets/brand/tiktok-endcard.json";

/**
 * Thẻ kết cho bản TikTok (đề mục 33, D42): chỉ có chữ "Xem full tại diu tiu bé @bitstory168", không giọng đọc,
 * không logo. Tên nền tảng viết lái theo ý người dùng để TikTok không bắt duyệt hay hạn chế video (D42).
 * Khung dọc 1080x1920, nền và phông của kênh (cùng chủ đề màu với `Outro.tsx`, không sửa file đó).
 * Chữ nằm trong hộp `CARD.safe` (x 48–888, y 220–1400): tránh dải nút bên phải và dải chữ, nhạc ở đáy.
 */
export const TT_CARD_FRAMES: number = CARD.frames;
export const TT_CARD_SIZE = OUTRO_SIZE.vertical;
export const TT_SAFE: { x0: number; x1: number; y0: number; y1: number } = CARD.safe;
export const TT_CARD_TEXT: string = CARD.text;
export const TT_CARD_LINES: string[] = CARD.lines;

/** Khối chữ, không dùng hook (nhận frame, fps) để test bằng renderToStaticMarkup. */
export const TiktokEndCardView: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const theme = getTheme(CARD.theme);
  const text = (size: number, color: string): React.CSSProperties => ({
    fontFamily: `${FONT_FAMILY}, sans-serif`,
    fontWeight: 800,
    fontSize: size,
    color,
    textAlign: "center",
    lineHeight: 1.15,
  });
  const last = TT_CARD_LINES.length - 1;
  return (
    <div
      data-safe-box
      style={{
        position: "absolute",
        left: TT_SAFE.x0,
        top: TT_SAFE.y0,
        width: TT_SAFE.x1 - TT_SAFE.x0,
        height: TT_SAFE.y1 - TT_SAFE.y0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 28,
        overflow: "hidden",
      }}
    >
      {TT_CARD_LINES.map((l, i) => {
        const at = i * 5;
        const k = spring({ frame: frame - at, fps, config: { damping: 13 } });
        const o = interpolate(frame, [at, at + 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        const handle = i === last;
        return (
          <div
            key={i}
            data-line={i}
            style={{
              ...text(handle ? 92 : 104, handle ? theme.accent : theme.fg),
              opacity: o,
              transform: `translateY(${(1 - k) * 40}px)`,
              ...(handle
                ? { marginTop: 24, padding: "12px 44px", borderRadius: 999, border: `6px solid ${theme.accent}`, background: theme.panel }
                : {}),
            }}
          >
            {l}
          </div>
        );
      })}
    </div>
  );
};

export const TiktokEndCard: React.FC<Record<string, unknown>> = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const theme = getTheme(CARD.theme);
  const cx = (100 * (TT_SAFE.x0 + TT_SAFE.x1)) / 2 / TT_CARD_SIZE.w;
  const cy = (100 * (TT_SAFE.y0 + TT_SAFE.y1)) / 2 / TT_CARD_SIZE.h;
  return (
    <AbsoluteFill style={{ background: `radial-gradient(circle at ${cx}% ${cy}%, ${theme.panel} 0%, ${theme.bg} 70%)` }}>
      <TiktokEndCardView frame={frame} fps={fps} />
    </AbsoluteFill>
  );
};
