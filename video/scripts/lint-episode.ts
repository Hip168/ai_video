// npm run lint:episode -- <slug> [--script f] [--timeline f] [--index f] [--json] [--short n]
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { lintEpisode, type Finding, type IndexEntry, type LintScene } from "./lint-core";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

function usage(msg: string): never {
  console.error(`lint-episode: ${msg}\ncách dùng: npm run lint:episode -- <slug> [--script f] [--timeline f] [--index f] [--json]`);
  process.exit(2);
}

function readJson(file: string, what: string): any {
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch (e) {
    return usage(`không đọc được ${what} ${file}: ${(e as Error).message}`);
  }
}

const args = process.argv.slice(2);
const opt = (name: string, env: string): string | undefined => {
  const i = args.indexOf(`--${name}`);
  if (i !== -1) return args[i + 1] ?? usage(`--${name} thiếu giá trị`);
  return process.env[env] || undefined;
};
const valueFlags = new Set(["--script", "--timeline", "--index", "--short"]);
const positional = args.filter((a, i) => !a.startsWith("--") && !valueFlags.has(args[i - 1]));
const slug = positional[0] ?? usage("thiếu <slug>");

// --short n: lint một phần Short (đề mục 14) thay cho lint tập.
const shortArg = opt("short", "LINT_SHORT");
if (shortArg !== undefined) {
  if (!/^[1-8]$/.test(shortArg)) usage(`--short phải là số 1..8, nhận ${shortArg}`);
  const { lintShort } = await import("./lint-short");
  process.exit(await lintShort(ROOT, slug, Number(shortArg)));
}
const asJson = args.includes("--json");

const scriptFile = path.resolve(opt("script", "LINT_SCRIPT") ?? path.join(ROOT, "episodes", slug, "script.json"));
const timelineFile = path.resolve(opt("timeline", "LINT_TIMELINE") ?? path.join(ROOT, "out", "episodes", slug, "timeline.json"));
const indexFile = path.resolve(opt("index", "LINT_INDEX") ?? path.join(ROOT, "episodes", "index.json"));

if (!existsSync(scriptFile)) usage(`không có script.json: ${scriptFile}`);
const script = readJson(scriptFile, "script.json");
if (!Array.isArray(script?.scenes)) usage("script.json thiếu mảng scenes");

const hasTimeline = existsSync(timelineFile);
const dur = new Map<string, number>();
const offs = new Map<string, number>();
if (hasTimeline) {
  const tl = readJson(timelineFile, "timeline.json");
  for (const s of tl?.scenes ?? []) {
    dur.set(s.id, s.durationFrames);
    for (const b of s.beats ?? []) offs.set(b.id, b.startFrame - s.startFrame);
  }
}

let index: IndexEntry[] = [];
if (existsSync(indexFile)) {
  const raw = readJson(indexFile, "index.json");
  index = Array.isArray(raw) ? raw : usage("index.json phải là mảng");
}

const scenes: LintScene[] = script.scenes.map((s: any) => ({
  id: s.id,
  type: s.type,
  chapter: s.chapter,
  props: s.props ?? {},
  durationFrames: dur.get(s.id),
  beats: Array.isArray(s.beats) ? s.beats.map((b: any) => ({ cue: b?.cue ?? undefined, offset: offs.get(b?.id) })) : [],
}));

const findings: Finding[] = lintEpisode({
  slug,
  scenes,
  theme: script?.meta?.theme,
  index,
  hasDurations: hasTimeline && scenes.every((s) => s.durationFrames !== undefined),
});

if (asJson) {
  console.log(JSON.stringify(findings, null, 2));
} else {
  if (!hasTimeline) console.log("bỏ qua: chưa có timeline.json, không kiểm luật thời lượng (min-duration, max-scene-duration)");
  else if (!scenes.every((s) => s.durationFrames !== undefined))
    console.log("bỏ qua: timeline.json không khớp id cảnh với script.json, không kiểm luật thời lượng");
  for (const f of findings) console.log(`[${f.level === "error" ? "LỖI" : "CẢNH BÁO"}] ${f.rule}: ${f.message}`);
  const n = findings.filter((f) => f.level === "error").length;
  console.log(n === 0 ? "lint: ĐẠT" : `lint: KHÔNG ĐẠT (${n} lỗi)`);
}
process.exit(findings.some((f) => f.level === "error") ? 1 : 0);
