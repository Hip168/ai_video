// Phần thuần của render-episode: chia đoạn, hash, manifest, đĩa. Không mở trình duyệt.
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

export const TARGET_FRAMES = 1800;
export const MAX_SCENE_FRAMES = 2700;
export const CRF = 18;
export const DEFAULT_PROCS = 3;
export const DEFAULT_MIN_FREE_GB = 6;
export const DEFAULT_BROWSER = path.join(os.homedir(), ".cache", "aivideo", "chrome-headless-shell", "chrome-headless-shell");

export type Layout = "main" | "shift";
export interface Segment {
  id: string;
  startFrame: number;
  endFrame: number; // tính cả
  frames: number;
  file: string;
  hash: string;
  status: "pending" | "done" | "failed";
  attempts: number;
  bytes: number;
}
export interface PlanItem {
  id: string;
  startFrame: number;
  endFrame: number;
  frames: number;
}
interface SceneLike {
  startFrame: number;
  durationFrames: number;
}

/** Các biên không chia được: biên cảnh, cộng điểm chia đều trong cảnh dài hơn maxScene. */
function boundaries(scenes: SceneLike[], target: number, maxScene: number): { cuts: number[]; total: number } {
  const cuts: number[] = [];
  let pos = 0;
  for (const s of scenes) {
    if (s.durationFrames > maxScene) {
      const n = Math.ceil(s.durationFrames / target);
      const base = Math.floor(s.durationFrames / n);
      for (let i = 1; i < n; i++) cuts.push(pos + base * i);
    }
    pos += s.durationFrames;
    cuts.push(pos);
  }
  cuts.pop(); // bỏ biên cuối (tổng)
  return { cuts, total: pos };
}

function greedy(cuts: number[], total: number, target: number, maxSeg: number, banned: Set<number>): number[] {
  const chosen: number[] = [];
  let start = 0;
  while (total - start > maxSeg || (total - start > target && total - start > target * 1.5)) {
    const cand = cuts.filter((c) => c > start && c - start <= maxSeg && !banned.has(c));
    let best = -1;
    let bestD = Infinity;
    for (const c of cand) {
      const d = Math.abs(c - start - target);
      if (d < bestD) {
        best = c;
        bestD = d;
      }
    }
    if (best < 0) best = start + target; // không có biên hợp lệ: cắt giữa khối (chỉ lượt shift)
    chosen.push(best);
    start = best;
  }
  return chosen;
}

/**
 * Chia [0, total) thành đoạn ~target frame ở biên cảnh; cảnh dài hơn maxScene cắt đều.
 * Lượt "shift" tránh mọi biên của lượt "main" để mỗi frame nằm ở vị trí khác trong đoạn.
 */
export function planSegments(
  scenes: SceneLike[],
  layout: Layout = "main",
  target = TARGET_FRAMES,
  maxScene = MAX_SCENE_FRAMES,
): PlanItem[] {
  const { cuts, total } = boundaries(scenes, target, maxScene);
  const main = greedy(cuts, total, target, maxScene, new Set());
  const chosen = layout === "main" ? main : greedy(cuts, total, target, maxScene, new Set(main));
  const edges = [0, ...chosen, total];
  const out: PlanItem[] = [];
  for (let i = 0; i + 1 < edges.length; i++) {
    out.push({
      id: `seg-${String(i).padStart(3, "0")}`,
      startFrame: edges[i],
      endFrame: edges[i + 1] - 1,
      frames: edges[i + 1] - edges[i],
    });
  }
  return out;
}

export function sha256(data: string | Buffer): string {
  return createHash("sha256").update(data).digest("hex");
}

function stable(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(stable).join(",")}]`;
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    return `{${Object.keys(o).sort().map((k) => `${JSON.stringify(k)}:${stable(o[k])}`).join(",")}}`;
  }
  return JSON.stringify(v);
}

/** Hash mã nguồn video/src (đường dẫn tương đối + nội dung, theo thứ tự tên). */
export function hashSource(dir: string): string {
  const h = createHash("sha256");
  const walk = (d: string) => {
    for (const name of readdirSync(d).sort()) {
      const p = path.join(d, name);
      const st = statSync(p);
      if (st.isDirectory()) walk(p);
      else {
        h.update(path.relative(dir, p));
        h.update("\0");
        h.update(readFileSync(p));
        h.update("\0");
      }
    }
  };
  walk(dir);
  return h.digest("hex");
}

export function segmentHash(
  timeline: { scenes: SceneLike[]; theme: string; fps: number; width: number; height: number },
  item: PlanItem,
  srcHash: string,
  rendererVersion: string,
  /** Short (đề mục 14): đoạn clip (part, hook...) để đổi hook thì render lại. Không có thì hash như cũ. */
  clip?: unknown,
): string {
  const scenes = timeline.scenes.filter((s) => s.startFrame <= item.endFrame && s.startFrame + s.durationFrames - 1 >= item.startFrame);
  return sha256(
    stable({
      scenes,
      theme: timeline.theme,
      fps: timeline.fps,
      w: timeline.width,
      h: timeline.height,
      start: item.startFrame,
      end: item.endFrame,
      crf: CRF,
      src: srcHash,
      renderer: rendererVersion,
      ...(clip === undefined ? {} : { clip }),
    }),
  );
}

export interface Manifest {
  version: 1;
  slug: string;
  fps: number;
  durationInFrames: number;
  srcHash: string;
  layouts: Partial<Record<Layout, Segment[]>>;
  assembled?: { silent?: string; final?: string };
}

export function readManifest(file: string): Manifest | null {
  if (!existsSync(file)) return null;
  try {
    const m = JSON.parse(readFileSync(file, "utf8"));
    return m && m.version === 1 ? (m as Manifest) : null;
  } catch {
    return null;
  }
}

export function writeManifest(file: string, m: Manifest): void {
  const tmp = `${file}.tmp`;
  writeFileSync(tmp, JSON.stringify(m, null, 2) + "\n");
  renameSync(tmp, file);
}

/** Số frame video bằng ffprobe; -1 nếu không đọc được. */
export function probeFrames(file: string): number {
  if (!existsSync(file)) return -1;
  try {
    const out = execFileSync(
      "ffprobe",
      ["-v", "error", "-count_frames", "-select_streams", "v:0", "-show_entries", "stream=nb_read_frames", "-of", "csv=p=0", file],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    );
    const n = parseInt(out.trim(), 10);
    return Number.isFinite(n) ? n : -1;
  } catch {
    return -1;
  }
}

export function freeGb(dir: string): number {
  const forced = process.env.AIVIDEO_FREE_GB;
  if (forced !== undefined && forced !== "") {
    const v = Number(forced);
    if (Number.isFinite(v)) return v;
  }
  mkdirSync(dir, { recursive: true });
  const out = execFileSync("df", ["-k", dir], { encoding: "utf8" }).trim().split("\n").pop()!.split(/\s+/);
  return parseInt(out[3], 10) / (1024 * 1024);
}

export function minFreeGb(): number {
  const v = Number(process.env.AIVIDEO_MIN_FREE_GB);
  return Number.isFinite(v) && process.env.AIVIDEO_MIN_FREE_GB ? v : DEFAULT_MIN_FREE_GB;
}

/** Trả thông báo lỗi nếu đĩa thiếu, ngược lại null. */
export function diskProblem(dir: string): string | null {
  const free = freeGb(dir);
  const need = minFreeGb();
  return free < need ? `đĩa trống ${free.toFixed(1)} GB < ${need} GB` : null;
}

export function parseRange(s: string): [number, number] {
  const m = /^(\d+)-(\d+)$/.exec(s);
  if (!m || Number(m[1]) > Number(m[2])) throw new Error(`--frames phải dạng a-b với a <= b, nhận ${JSON.stringify(s)}`);
  return [Number(m[1]), Number(m[2])];
}

/**
 * Trình duyệt render. Có REMOTION_BROWSER_EXECUTABLE thì dùng (phải tồn tại). Không có:
 * macOS dùng đường D23; Linux (CI) để Remotion tự chọn (exe = null). ok = false là thiếu trình duyệt.
 */
export function resolveBrowser(): { ok: boolean; exe: string | null } {
  const env = process.env.REMOTION_BROWSER_EXECUTABLE;
  if (env) return existsSync(env) ? { ok: true, exe: env } : { ok: false, exe: null };
  if (process.platform !== "darwin") return { ok: true, exe: null };
  return existsSync(DEFAULT_BROWSER) ? { ok: true, exe: DEFAULT_BROWSER } : { ok: false, exe: null };
}
