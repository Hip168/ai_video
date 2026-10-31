export type SceneId =
  | "phone"
  | "dns"
  | "packets"
  | "wifi"
  | "hops"
  | "server"
  | "receiver";

export const SCENE_IDS: readonly SceneId[] = [
  "phone",
  "dns",
  "packets",
  "wifi",
  "hops",
  "server",
  "receiver",
];

export interface Beat {
  id: string;
  startFrame: number;
  durationFrames: number;
  text: string;
  cue?: string;
}

export interface Scene {
  id: SceneId;
  startFrame: number;
  durationFrames: number;
  beats: Beat[];
}

export interface Timeline {
  version: 1;
  fps: 30;
  width: 1920;
  height: 1080;
  durationInFrames: number;
  audio: { src: string };
  scenes: Scene[];
}

const fail = (path: string, msg: string): never => {
  throw new Error(`timeline.json: ${path}: ${msg}`);
};

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const isFrame = (v: unknown): v is number =>
  typeof v === "number" && Number.isInteger(v) && v >= 0;

export function validateTimeline(json: unknown): Timeline {
  if (!isObj(json)) return fail("(gốc)", "phải là một đối tượng JSON");
  const t = json;

  if (t.version !== 1) fail("version", `phải bằng 1, nhận được ${JSON.stringify(t.version)}`);
  if (t.fps !== 30) fail("fps", `phải bằng 30, nhận được ${JSON.stringify(t.fps)}`);
  if (t.width !== 1920) fail("width", `phải bằng 1920, nhận được ${JSON.stringify(t.width)}`);
  if (t.height !== 1080) fail("height", `phải bằng 1080, nhận được ${JSON.stringify(t.height)}`);
  if (!isFrame(t.durationInFrames) || t.durationInFrames === 0)
    fail("durationInFrames", "phải là số nguyên dương");
  const total = t.durationInFrames as number;

  if (!isObj(t.audio)) fail("audio", "thiếu hoặc không phải đối tượng");
  const audio = t.audio as Record<string, unknown>;
  if (typeof audio.src !== "string" || audio.src.length === 0)
    fail("audio.src", "phải là chuỗi đường dẫn không rỗng");

  if (!Array.isArray(t.scenes) || t.scenes.length === 0)
    fail("scenes", "phải là mảng có ít nhất một cảnh");
  const scenes = t.scenes as unknown[];

  const seenScene = new Set<string>();
  const seenBeat = new Set<string>();
  let expectedStart = 0;

  scenes.forEach((s, i) => {
    const sp = `scenes[${i}]`;
    if (!isObj(s)) return fail(sp, "phải là đối tượng");
    if (!SCENE_IDS.includes(s.id as SceneId))
      fail(`${sp}.id`, `không thuộc ${SCENE_IDS.join(", ")} (nhận ${JSON.stringify(s.id)})`);
    if (seenScene.has(s.id as string)) fail(`${sp}.id`, `cảnh "${s.id}" xuất hiện nhiều hơn một lần`);
    seenScene.add(s.id as string);
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

    if (!Array.isArray(s.beats) || s.beats.length === 0)
      fail(`${sp}.beats`, "phải có ít nhất một beat");
    let prevEnd = sStart;
    (s.beats as unknown[]).forEach((b, j) => {
      const bp = `${sp}.beats[${j}]`;
      if (!isObj(b)) return fail(bp, "phải là đối tượng");
      if (typeof b.id !== "string" || b.id === "") fail(`${bp}.id`, "phải là chuỗi không rỗng");
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
      if (b.cue !== undefined && typeof b.cue !== "string")
        fail(`${bp}.cue`, "nếu có thì phải là chuỗi");
    });
  });

  if (expectedStart !== total)
    fail(
      `scenes[${scenes.length - 1}]`,
      `cảnh cuối kết thúc ở frame ${expectedStart}, phải bằng durationInFrames (${total})`,
    );

  return json as unknown as Timeline;
}

export function activeBeat(timeline: Timeline, frame: number): Beat | null {
  for (const scene of timeline.scenes) {
    for (const beat of scene.beats) {
      if (frame >= beat.startFrame && frame < beat.startFrame + beat.durationFrames) return beat;
    }
  }
  return null;
}
