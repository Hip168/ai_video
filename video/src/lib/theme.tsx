import React from "react";
import { useCurrentFrame } from "remotion";
import { FONT_FAMILY } from "../font";
import { ThemeContext, useTheme } from "./hooks";
import type { Theme } from "./theme-data";

export { THEMES, THEME_IDS, getTheme } from "./theme-data";
export type { Theme } from "./theme-data";
export { useTheme };

export const ThemeProvider: React.FC<{ theme: Theme; children?: React.ReactNode }> = ({ theme, children }) => (
  <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
);

export type IconName = "chip" | "wifi" | "lock" | "cloud" | "bolt" | "gear" | "book" | "star";

const ICONS: Record<IconName, React.ReactNode> = {
  chip: (
    <>
      <rect x={-30} y={-30} width={60} height={60} rx={8} fill="none" stroke="currentColor" strokeWidth={6} />
      <rect x={-12} y={-12} width={24} height={24} rx={3} fill="currentColor" />
      {[-18, 0, 18].map((v) => (
        <g key={v} stroke="currentColor" strokeWidth={6} strokeLinecap="round">
          <line x1={v} y1={-30} x2={v} y2={-44} />
          <line x1={v} y1={30} x2={v} y2={44} />
          <line x1={-30} y1={v} x2={-44} y2={v} />
          <line x1={30} y1={v} x2={44} y2={v} />
        </g>
      ))}
    </>
  ),
  wifi: (
    <g fill="none" stroke="currentColor" strokeWidth={6} strokeLinecap="round">
      <path d="M-40 -8 A56 56 0 0 1 40 -8" />
      <path d="M-26 8 A34 34 0 0 1 26 8" />
      <circle cx={0} cy={28} r={5} fill="currentColor" />
    </g>
  ),
  lock: (
    <>
      <rect x={-30} y={-6} width={60} height={46} rx={8} fill="currentColor" />
      <path d="M-18 -6 V-20 A18 18 0 0 1 18 -20 V-6" fill="none" stroke="currentColor" strokeWidth={6} />
    </>
  ),
  cloud: <path d="M-34 20 A22 22 0 0 1 -28 -22 A30 30 0 0 1 28 -18 A22 22 0 0 1 34 20 Z" fill="currentColor" />,
  bolt: <polygon points="8,-44 -26,6 -2,6 -10,44 28,-8 4,-8" fill="currentColor" />,
  gear: (
    <>
      <circle r={22} fill="none" stroke="currentColor" strokeWidth={10} />
      {[0, 45, 90, 135].map((a) => (
        <rect key={a} x={-6} y={-40} width={12} height={80} rx={4} fill="currentColor" transform={`rotate(${a})`} />
      ))}
    </>
  ),
  book: (
    <g fill="none" stroke="currentColor" strokeWidth={6} strokeLinejoin="round">
      <path d="M0 -26 C-14 -34 -30 -34 -42 -28 V28 C-30 22 -14 22 0 30 Z" />
      <path d="M0 -26 C14 -34 30 -34 42 -28 V28 C30 22 14 22 0 30 Z" />
    </g>
  ),
  star: <polygon points="0,-40 12,-12 42,-10 18,10 26,40 0,24 -26,40 -18,10 -42,-10 -12,-12" fill="currentColor" />,
};

export const Icon: React.FC<{ name: IconName; x: number; y: number; size?: number; color?: string }> = ({
  name,
  x,
  y,
  size = 100,
  color,
}) => {
  const theme = useTheme();
  return (
    <g transform={`translate(${x} ${y}) scale(${size / 100})`} style={{ color: color ?? theme.accent }}>
      {ICONS[name]}
    </g>
  );
};

/** Hoạ tiết nền, chỉ trong y < 830. Chuyển động chậm theo frame. */
const Pattern: React.FC<{ theme: Theme; frame: number }> = ({ theme, frame }) => {
  const drift = (frame * 0.4) % 80;
  const stroke = theme.muted;
  const items: React.ReactNode[] = [];
  switch (theme.pattern) {
    case "grid":
      for (let x = -80; x <= 1920; x += 80) items.push(<line key={`v${x}`} x1={x + drift} y1={0} x2={x + drift} y2={830} />);
      for (let y = 80; y < 830; y += 80) items.push(<line key={`h${y}`} x1={0} y1={y} x2={1920} y2={y} />);
      break;
    case "dots":
      for (let x = 40; x < 1920; x += 80)
        for (let y = 40; y < 830; y += 80) items.push(<circle key={`${x}-${y}`} cx={x} cy={y + drift / 2} r={3} fill={stroke} stroke="none" />);
      break;
    case "diagonal":
      for (let k = -900; k < 1920; k += 90) items.push(<line key={k} x1={k + drift} y1={830} x2={k + 830 + drift} y2={0} />);
      break;
    case "rings":
      for (let r = 120; r < 1200; r += 140) items.push(<circle key={r} cx={960} cy={415} r={r + drift} fill="none" />);
      break;
  }
  return (
    <svg
      viewBox="0 0 1920 830"
      width={1920}
      height={830}
      style={{ position: "absolute", left: 0, top: 0 }}
    >
      <g stroke={stroke} strokeWidth={2} opacity={0.16}>
        {items}
      </g>
    </svg>
  );
};

/** Nền theme + SVG 1920x1080 cho cảnh. Dải y 830..1079 là màu nền phẳng. */
export const Stage: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const theme = useTheme();
  const frame = useCurrentFrame();
  return (
    <>
      <Pattern theme={theme} frame={frame} />
      <svg
        viewBox="0 0 1920 1080"
        width={1920}
        height={1080}
        style={{ position: "absolute", inset: 0, fontFamily: `${FONT_FAMILY}, sans-serif` }}
      >
        {children}
      </svg>
    </>
  );
};
