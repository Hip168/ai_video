// Lint chống lặp khuôn (D16). Hàm thuần, không đọc file.
import { CATALOG_TYPES, isCustomType } from "../src/timeline2";
import { CUSTOM_SCENES } from "../src/episodes/registry";
import { specOf } from "../src/lib/registry";
import { validateProps } from "../src/lib/propsSpec";
import { THEME_IDS } from "../src/lib/theme-data";
import { flowSizes, layoutFlow, type Pt } from "../src/lib/layout-flow";
import { pointAlong } from "../src/lib/b-kit";

export interface Finding {
  rule: string;
  level: "error" | "warn";
  message: string;
}

export interface IndexEntry {
  slug: string;
  title?: string;
  theme?: string;
  sceneTypes?: string[];
}

export interface LintScene {
  id: string;
  type: string;
  chapter?: string;
  props?: unknown;
  durationFrames?: number;
  beats?: { cue?: string }[];
}

export interface LintInput {
  slug: string;
  scenes: LintScene[];
  theme?: string;
  index: IndexEntry[];
  /** false: bỏ luật thời lượng. */
  hasDurations: boolean;
}

export const FPS = 30;
export const MIN_TOTAL_FRAMES = 9 * 60 * FPS;
export const MAX_SCENE_FRAMES = 20 * FPS;
export const MIN_CHAPTER_FRAMES = 10 * FPS;
export const MIN_TYPES = 10;
export const MIN_CUSTOM = 3;
export const SIMILARITY_LIMIT = 0.6;
export const FLOW_MIN_NODE_FONT = 24;
export const FLOW_MIN_LABEL_FONT = 20;
export const FLOW_MAX_LABEL_OVERLAP = 4;

export function levenshtein(a: string[], b: string[]): number {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
}

/** 1 - levenshtein / độ dài dài hơn. Hai chuỗi rỗng = 1. */
export function similarity(a: string[], b: string[]): number {
  const m = Math.max(a.length, b.length);
  if (m === 0) return 1;
  return 1 - levenshtein(a, b) / m;
}

const norm = (t: string): string => (isCustomType(t) ? "custom" : t);

export function lintEpisode(input: LintInput): Finding[] {
  const out: Finding[] = [];
  const err = (rule: string, message: string) => out.push({ rule, level: "error", message });
  const warn = (rule: string, message: string) => out.push({ rule, level: "warn", message });
  const { scenes } = input;
  const types = scenes.map((s) => s.type);

  const distinct = new Set(types.map(norm));
  if (distinct.size < MIN_TYPES) err("min-types", `chỉ có ${distinct.size} loại cảnh khác nhau, cần ít nhất ${MIN_TYPES}`);

  const limit = Math.max(1, Math.floor((scenes.length * 9) / 48));
  const counts = new Map<string, number>();
  for (const t of types) counts.set(norm(t), (counts.get(norm(t)) ?? 0) + 1);
  for (const [t, n] of counts) {
    if (n > limit) err("max-same-type", `loại "${t}" xuất hiện ${n} lần, tối đa ${limit} với ${scenes.length} cảnh`);
  }

  for (let i = 2; i < types.length; i++) {
    if (norm(types[i]) === norm(types[i - 1]) && norm(types[i]) === norm(types[i - 2])) {
      err("no-three-in-row", `3 cảnh liền nhau cùng loại "${norm(types[i])}": ${scenes[i - 2].id}, ${scenes[i - 1].id}, ${scenes[i].id}`);
    }
  }

  const customN = types.filter(isCustomType).length;
  if (customN < MIN_CUSTOM) err("min-custom", `chỉ có ${customN} cảnh custom, cần ít nhất ${MIN_CUSTOM}`);

  if (types[0] !== "cold-open") err("first-cold-open", `cảnh đầu là "${types[0] ?? "(không có)"}", phải là cold-open`);
  if (types[types.length - 1] !== "recap-outro")
    err("last-recap-outro", `cảnh cuối là "${types[types.length - 1] ?? "(không có)"}", phải là recap-outro`);

  // Theme
  if (input.theme !== undefined) {
    if (!THEME_IDS.includes(input.theme)) err("theme-known", `theme "${input.theme}" không có (có: ${THEME_IDS.join(", ")})`);
    const at = input.index.findIndex((e) => e.slug === input.slug);
    const prev = at === -1 ? input.index[input.index.length - 1] : input.index[at - 1];
    if (prev?.theme !== undefined && prev.theme === input.theme)
      err("theme-differs", `theme "${input.theme}" trùng tập liền trước (${prev.slug})`);
  }

  // Giống chuỗi tập cũ
  const mine = types.map(norm);
  for (const e of input.index) {
    if (e.slug === input.slug || !e.sceneTypes || e.sceneTypes.length === 0) continue;
    const s = similarity(mine, e.sceneTypes.map(norm));
    if (s >= SIMILARITY_LIMIT)
      err("sequence-similarity", `chuỗi loại cảnh giống tập "${e.slug}" ${(s * 100).toFixed(1)}% (phải dưới ${SIMILARITY_LIMIT * 100}%)`);
  }

  // Thời lượng
  if (input.hasDurations) {
    const total = scenes.reduce((a, s) => a + (s.durationFrames ?? 0), 0);
    if (total < MIN_TOTAL_FRAMES)
      err("min-duration", `tổng ${total} frame (${(total / FPS / 60).toFixed(2)} phút), cần ít nhất ${MIN_TOTAL_FRAMES} frame (9 phút)`);
    for (const s of scenes) {
      if ((s.durationFrames ?? 0) > MAX_SCENE_FRAMES)
        err("max-scene-duration", `cảnh ${s.id} dài ${s.durationFrames} frame, tối đa ${MAX_SCENE_FRAMES} (20 giây)`);
    }
  }

  // Chương dưới 10 giây (YouTube yêu cầu)
  if (input.hasDurations) {
    const byChapter = new Map<string, number>();
    for (const s of scenes) if (s.chapter !== undefined) byChapter.set(s.chapter, (byChapter.get(s.chapter) ?? 0) + (s.durationFrames ?? 0));
    for (const [c, n] of byChapter)
      if (n < MIN_CHAPTER_FRAMES) err("min-chapter-duration", `chương "${c}" dài ${n} frame, cần ít nhất ${MIN_CHAPTER_FRAMES} (10 giây)`);
  }

  // Props, loại, cue
  for (const s of scenes) {
    if (isCustomType(s.type)) {
      const name = s.type.slice("custom:".length);
      if (name === "" || !CUSTOM_SCENES[name]) err("props", `cảnh ${s.id}: "${s.type}" chưa đăng ký trong episodes/registry.ts`);
      continue;
    }
    if (!(CATALOG_TYPES as readonly string[]).includes(s.type)) {
      err("props", `cảnh ${s.id}: loại "${s.type}" không có trong catalog`);
      continue;
    }
    const spec = specOf(s.type);
    if (!spec) continue;
    if (spec.anyProps) {
      if (typeof s.props !== "object" || s.props === null || Array.isArray(s.props)) err("props", `cảnh ${s.id}: props phải là đối tượng`);
    } else {
      const bad = validateProps(spec.propsSpec, s.props ?? {});
      for (const m of bad) err("props", `cảnh ${s.id} (${s.type}): ${m}`);
      if (s.type === "flow" && bad.length === 0) lintFlow(s, err, warn);
    }
    const nb = s.beats?.length ?? 0;
    if (s.beats !== undefined && nb < spec.minBeats) warn("min-beats", `cảnh ${s.id} (${s.type}) có ${nb} beat, nên có ít nhất ${spec.minBeats}`);
    for (const b of s.beats ?? []) {
      if (b.cue !== undefined && b.cue !== null && !spec.cues.includes(b.cue) && !spec.anyProps)
        warn("unknown-cue", `cảnh ${s.id} (${s.type}): cue "${b.cue}" không có trong ${JSON.stringify(spec.cues)}`);
    }
  }
  return out;
}

type Rect = { x: number; y: number; w: number; h: number };

/** Đoạn a-b có đi qua phần trong của khung r không (Liang–Barsky). */
function segHitsRect(a: Pt, b: Pt, r: Rect): boolean {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  let t0 = 0;
  let t1 = 1;
  for (const [p, q] of [[-dx, a.x - r.x], [dx, r.x + r.w - a.x], [-dy, a.y - r.y], [dy, r.y + r.h - a.y]]) {
    if (p === 0) {
      if (q <= 0) return false;
    } else if (p < 0) t0 = Math.max(t0, q / p);
    else t1 = Math.min(t1, q / p);
  }
  return t0 < t1;
}

/** Cảnh `flow`: chữ nút, chữ nhãn cạnh, nhãn đè nhau, tính từ bố cục như cảnh vẽ (không render). */
function lintFlow(s: LintScene, err: (rule: string, message: string) => void, warn: (rule: string, message: string) => void): void {
  const props = s.props as Record<string, unknown>;
  const lay = layoutFlow(props);
  const z = flowSizes(lay.scale);
  const split = "tách thành hai cảnh `flow`";
  const where = `cảnh ${s.id} (flow, ${lay.boxes.length} nút, hướng ${props.direction === "TB" ? "TB" : "LR"})`;
  if (z.nodeFont < FLOW_MIN_NODE_FONT)
    err("flow-node-font", `${where}: chữ nút ${z.nodeFont.toFixed(1)} px, cần ít nhất ${FLOW_MIN_NODE_FONT} px; ${split}`);
  const labelled = lay.edges.filter((e) => e.label !== undefined && e.label !== "");
  if (labelled.length > 0 && z.lblFont < FLOW_MIN_LABEL_FONT)
    err("flow-edge-label-font", `${where}: chữ nhãn cạnh ${z.lblFont.toFixed(1)} px, cần ít nhất ${FLOW_MIN_LABEL_FONT} px; ${split}`);
  const boxes = labelled.map((e) => {
    const k = `${e.from}>${e.to}`;
    const m = pointAlong(lay.paths[k], 0.5);
    return { k, r: { x: m.x - z.lblW / 2, y: m.y - z.lblH / 2, w: z.lblW, h: z.lblH } };
  });
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i].r;
      const b = boxes[j].r;
      const d = Math.min(Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x), Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
      if (d > FLOW_MAX_LABEL_OVERLAP)
        err("flow-label-overlap", `${where}: nhãn cạnh "${boxes[i].k}" và "${boxes[j].k}" đè nhau ${d.toFixed(1)} px, tối đa ${FLOW_MAX_LABEL_OVERLAP} px; ${split}`);
    }
  }
  for (const { k, r } of boxes) {
    const hit = lay.edges
      .map((e) => `${e.from}>${e.to}`)
      .filter((o) => o !== k && lay.paths[o].some((p, i) => i > 0 && segHitsRect(lay.paths[o][i - 1], p, r)));
    if (hit.length > 0) warn("flow-label-covers-edge", `${where}: nhãn cạnh "${k}" che cạnh ${hit.map((o) => `"${o}"`).join(", ")}`);
  }
}
