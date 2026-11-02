import { createContext, useContext } from "react";
import { spring, useCurrentFrame } from "remotion";
import type { Beat2, Scene2 } from "../timeline2";
import { getTheme, type Theme } from "./theme-data";

export const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));

/** Làm mượt 0..1 (smoothstep), hàm thuần. */
export const ease = (v: number): number => {
  const t = clamp01(v);
  return t * t * (3 - 2 * t);
};

export const ThemeContext = createContext<Theme | null>(null);

export function useTheme(): Theme {
  return useContext(ThemeContext) ?? getTheme("mau-a");
}

function findBeat(scene: Scene2, cue: string | number): Beat2 | undefined {
  if (typeof cue === "number") return scene.beats[cue] ?? scene.beats[scene.beats.length - 1];
  return scene.beats.find((b) => b.cue === cue) ?? scene.beats[0];
}

/** Frame (tương đối cảnh) mà beat bắt đầu; cảnh không beat thì 0. */
export function beatStartIn(scene: Scene2, cue: string | number): number {
  const beat = findBeat(scene, cue);
  return beat ? beat.startFrame - scene.startFrame : 0;
}

/** Frame tương đối so với đầu beat (âm nếu chưa tới). Gọi bên trong cảnh (Sequence). */
export function useBeat(scene: Scene2, cue: string | number): number {
  return useCurrentFrame() - beatStartIn(scene, cue);
}

/** Frame (tương đối cảnh) mà beat bắt đầu. */
export function useBeatStart(scene: Scene2, cue: string | number): number {
  return beatStartIn(scene, cue);
}

/** Tiến độ 0..1 kiểu lò xo, bắt đầu tại frame `at` (hàm thuần của frame). */
export function useSpring(frame: number, at = 0): number {
  return spring({ frame: frame - at, fps: 30, config: { damping: 200 } });
}
