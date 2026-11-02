export interface Theme {
  id: string;
  bg: string;
  panel: string;
  fg: string;
  accent: string;
  accent2: string;
  muted: string;
  ok: string;
  warn: string;
  pattern: "grid" | "dots" | "diagonal" | "rings";
}

export const THEMES: Record<string, Theme> = {
  "mau-a": { id: "mau-a", bg: "#0b1220", panel: "#16223a", fg: "#e8eefc", accent: "#4cc9f0", accent2: "#ffb703", muted: "#6b7a99", ok: "#52d6a0", warn: "#ff6b6b", pattern: "grid" },
  "mau-b": { id: "mau-b", bg: "#140f1f", panel: "#251a3a", fg: "#f3eaff", accent: "#c77dff", accent2: "#ffd166", muted: "#8a76a8", ok: "#6ee7b7", warn: "#ff7b9c", pattern: "dots" },
  "mau-c": { id: "mau-c", bg: "#0e1a14", panel: "#17302a", fg: "#e9f7ee", accent: "#5eead4", accent2: "#f9c74f", muted: "#6f9486", ok: "#86efac", warn: "#fb7185", pattern: "diagonal" },
  "mau-d": { id: "mau-d", bg: "#1c1209", panel: "#33220f", fg: "#fff3e0", accent: "#ff9f1c", accent2: "#2ec4b6", muted: "#a08560", ok: "#a3e635", warn: "#ff5d5d", pattern: "rings" },
};

export const THEME_IDS: string[] = Object.keys(THEMES);

export function getTheme(id: string): Theme {
  const t = THEMES[id];
  if (!t) throw new Error(`theme "${id}" không có (có: ${THEME_IDS.join(", ")})`);
  return t;
}
