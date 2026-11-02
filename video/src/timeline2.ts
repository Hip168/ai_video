// Validator timeline.json v2 (hợp đồng .team/features/0b-hop-dong-timeline-v2.md).

export const CATALOG_TYPES = [
  "cold-open",
  "chapter-title",
  "recap-outro",
  "big-number",
  "compare",
  "myth-fact",
  "history-timeline",
  "term-card",
  "chart",
  "flow",
  "layers",
  "scale-ladder",
  "tree-graph",
  "code-walk",
  "terminal",
  "bits",
  "memory-array",
  "algo-bars",
] as const;

export type CatalogType = (typeof CATALOG_TYPES)[number];
export type SceneType = CatalogType | `custom:${string}`;

export const isCustomType = (type: string): boolean => type.startsWith("custom:");

export interface Beat2 {
  id: string;
  startFrame: number;
  durationFrames: number;
  text: string;
  cue?: string;
}

export interface Scene2 {
  id: string;
  chapter: string;
  type: string;
  props: Record<string, unknown>;
  startFrame: number;
  durationFrames: number;
  beats: Beat2[];
}

export interface Chapter {
  id: string;
  title: string;
  startFrame: number;
}

export interface SfxEvent {
  frame: number;
  name: string;
  gainDb: number;
}

export interface Timeline2 {
  version: 2;
  fps: 30;
  width: 1920;
  height: 1080;
  durationInFrames: number;
  theme: string;
  audio: { src: string };
  chapters: Chapter[];
  sfx: SfxEvent[];
  scenes: Scene2[];
}

const fail = (path: string, msg: string): never => {
  throw new Error(`timeline.json: ${path}: ${msg}`);
};

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const isFrame = (v: unknown): v is number =>
  typeof v === "number" && Number.isInteger(v) && v >= 0;

const isNonEmptyString = (v: unknown): v is string => typeof v === "string" && v !== "";

export function validateTimeline2(json: unknown): Timeline2 {
  if (!isObj(json)) return fail("(gốc)", "phải là một đối tượng JSON");
  const t = json;

  // Luật 1
  if (t.version !== 2) fail("version", `phải bằng 2, nhận được ${JSON.stringify(t.version)}`);
  if (t.fps !== 30) fail("fps", `phải bằng 30, nhận được ${JSON.stringify(t.fps)}`);
  if (t.width !== 1920) fail("width", `phải bằng 1920, nhận được ${JSON.stringify(t.width)}`);
  if (t.height !== 1080) fail("height", `phải bằng 1080, nhận được ${JSON.stringify(t.height)}`);
  // Luật 2
  if (!isFrame(t.durationInFrames) || t.durationInFrames === 0)
    fail("durationInFrames", "phải là số nguyên dương");
  const total = t.durationInFrames as number;

  // Luật 12
  if (!isNonEmptyString(t.theme)) fail("theme", "phải là chuỗi không rỗng");
  if (!isObj(t.audio)) fail("audio", "thiếu hoặc không phải đối tượng");
  const audio = t.audio as Record<string, unknown>;
  if (!isNonEmptyString(audio.src)) fail("audio.src", "phải là chuỗi đường dẫn không rỗng");
  const src = audio.src as string;
  if (src.startsWith("/") || src.includes("://"))
    fail("audio.src", `phải là đường dẫn tương đối, nhận ${JSON.stringify(src)}`);

  // Luật 3, 4, 5, 6, 7, 8
  if (!Array.isArray(t.scenes) || t.scenes.length === 0)
    fail("scenes", "phải là mảng có ít nhất một cảnh");
  const scenes = t.scenes as unknown[];

  const seenScene = new Set<string>();
  const seenBeat = new Set<string>();
  const sceneStartByChapter = new Map<string, number>();
  const sceneChapters: string[] = [];
  let expectedStart = 0;

  scenes.forEach((s, i) => {
    const sp = `scenes[${i}]`;
    if (!isObj(s)) return fail(sp, "phải là đối tượng");
    if (!isNonEmptyString(s.id)) fail(`${sp}.id`, "phải là chuỗi không rỗng");
    if (seenScene.has(s.id as string)) fail(`${sp}.id`, `cảnh "${s.id}" xuất hiện nhiều hơn một lần`);
    seenScene.add(s.id as string);
    if (!isNonEmptyString(s.type)) fail(`${sp}.type`, "phải là chuỗi không rỗng");
    const type = s.type as string;
    if (isCustomType(type)) {
      if (type.length === "custom:".length) fail(`${sp}.type`, "custom: thiếu tên");
    } else if (!(CATALOG_TYPES as readonly string[]).includes(type)) {
      fail(`${sp}.type`, `không thuộc catalog và không phải custom:<tên> (nhận ${JSON.stringify(type)})`);
    }
    if (!isObj(s.props)) fail(`${sp}.props`, "phải là đối tượng");
    if (!isNonEmptyString(s.chapter)) fail(`${sp}.chapter`, "phải là chuỗi không rỗng");
    if (!isFrame(s.startFrame)) fail(`${sp}.startFrame`, "phải là số nguyên ≥ 0");
    if (!isFrame(s.durationFrames) || s.durationFrames === 0)
      fail(`${sp}.durationFrames`, "phải là số nguyên dương");
    const sStart = s.startFrame as number;
    const sDur = s.durationFrames as number;
    if (sStart !== expectedStart)
      fail(
        `${sp}.startFrame`,
        `phải bằng ${expectedStart} (cảnh liền nhau, không hở, không chồng), nhận ${sStart}`,
      );
    expectedStart = sStart + sDur;
    sceneChapters.push(s.chapter as string);
    if (!sceneStartByChapter.has(s.chapter as string)) sceneStartByChapter.set(s.chapter as string, sStart);

    if (!Array.isArray(s.beats)) fail(`${sp}.beats`, "phải là mảng (được rỗng)");
    let prevEnd = sStart;
    (s.beats as unknown[]).forEach((b, j) => {
      const bp = `${sp}.beats[${j}]`;
      if (!isObj(b)) return fail(bp, "phải là đối tượng");
      if (!isNonEmptyString(b.id)) fail(`${bp}.id`, "phải là chuỗi không rỗng");
      if (seenBeat.has(b.id as string)) fail(`${bp}.id`, `"${b.id}" bị trùng trong toàn file`);
      seenBeat.add(b.id as string);
      if (!isFrame(b.startFrame)) fail(`${bp}.startFrame`, "phải là số nguyên ≥ 0");
      if (!isFrame(b.durationFrames) || b.durationFrames === 0)
        fail(`${bp}.durationFrames`, "phải là số nguyên dương");
      const bStart = b.startFrame as number;
      const bDur = b.durationFrames as number;
      if (bStart < prevEnd)
        fail(
          `${bp}.startFrame`,
          `beat phải bắt đầu từ frame ${prevEnd} trở đi (không chồng beat trước, không ra ngoài đầu cảnh), nhận ${bStart}`,
        );
      if (bStart + bDur > sStart + sDur)
        fail(`${bp}.durationFrames`, `beat kết thúc ở frame ${bStart + bDur}, vượt cuối cảnh (${sStart + sDur})`);
      prevEnd = bStart + bDur;
      if (typeof b.text !== "string" || b.text.trim() === "") fail(`${bp}.text`, "không được rỗng");
      const text = b.text as string;
      if ([...text].length > 100) fail(`${bp}.text`, `dài ${[...text].length} ký tự, tối đa 100`);
      if (text !== text.normalize("NFC")) fail(`${bp}.text`, "phải ở dạng Unicode NFC");
      if (b.cue !== undefined && !isNonEmptyString(b.cue))
        fail(`${bp}.cue`, "nếu có thì phải là chuỗi không rỗng");
    });
  });

  if (expectedStart !== total)
    fail(
      `scenes[${scenes.length - 1}]`,
      `cảnh cuối kết thúc ở frame ${expectedStart}, phải bằng durationInFrames (${total})`,
    );

  // Luật 9
  if (!Array.isArray(t.chapters) || t.chapters.length === 0)
    fail("chapters", "phải là mảng có ít nhất một chương");
  const seenChapter = new Set<string>();
  let prevChapterStart = -1;
  (t.chapters as unknown[]).forEach((c, i) => {
    const cp = `chapters[${i}]`;
    if (!isObj(c)) return fail(cp, "phải là đối tượng");
    if (!isNonEmptyString(c.id)) fail(`${cp}.id`, "phải là chuỗi không rỗng");
    if (seenChapter.has(c.id as string)) fail(`${cp}.id`, `"${c.id}" bị trùng`);
    seenChapter.add(c.id as string);
    if (!isNonEmptyString(c.title) || (c.title as string).trim() === "")
      fail(`${cp}.title`, "phải là chuỗi không rỗng");
    if (!isFrame(c.startFrame)) fail(`${cp}.startFrame`, "phải là số nguyên ≥ 0");
    const cs = c.startFrame as number;
    if (i === 0 && cs !== 0) fail(`${cp}.startFrame`, `chương đầu phải bắt đầu ở frame 0, nhận ${cs}`);
    if (cs <= prevChapterStart)
      fail(`${cp}.startFrame`, `phải lớn hơn chương trước (${prevChapterStart}), nhận ${cs}`);
    prevChapterStart = cs;
    const first = sceneStartByChapter.get(c.id as string);
    if (first === undefined) fail(cp, `chương "${c.id}" không có cảnh nào`);
    else if (first !== cs)
      fail(`${cp}.startFrame`, `phải bằng startFrame của cảnh đầu thuộc chương (${first}), nhận ${cs}`);
  });
  sceneChapters.forEach((ch, i) => {
    if (!seenChapter.has(ch)) fail(`scenes[${i}].chapter`, `"${ch}" không có trong chapters`);
  });

  // Luật 10
  if (!Array.isArray(t.sfx)) fail("sfx", "phải là mảng (được rỗng)");
  let prevSfx = 0;
  (t.sfx as unknown[]).forEach((e, i) => {
    const ep = `sfx[${i}]`;
    if (!isObj(e)) return fail(ep, "phải là đối tượng");
    if (!isFrame(e.frame) || (e.frame as number) >= total)
      fail(`${ep}.frame`, `phải là số nguyên trong [0, ${total}), nhận ${JSON.stringify(e.frame)}`);
    if ((e.frame as number) < prevSfx) fail(`${ep}.frame`, `không được giảm (trước đó ${prevSfx})`);
    prevSfx = e.frame as number;
    if (!isNonEmptyString(e.name)) fail(`${ep}.name`, "phải là chuỗi không rỗng");
    if (typeof e.gainDb !== "number" || !Number.isFinite(e.gainDb) || e.gainDb > 0)
      fail(`${ep}.gainDb`, `phải là số ≤ 0, nhận ${JSON.stringify(e.gainDb)}`);
  });

  return json as unknown as Timeline2;
}

export function activeBeat2(timeline: Timeline2, frame: number): Beat2 | null {
  for (const scene of timeline.scenes) {
    for (const beat of scene.beats) {
      if (frame >= beat.startFrame && frame < beat.startFrame + beat.durationFrames) return beat;
    }
  }
  return null;
}
