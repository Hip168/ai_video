// lint của một phần Short (đề mục 14, D32, D33): kiểm shorts.json rồi render một still cuối mỗi cảnh trong phần;
// chữ dưới ngưỡng ở khung vuông làm component chữ ném lỗi `short-text-size`. Gọi từ lint-episode.ts --short <n>.
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { openBrowser, renderStill, selectComposition } from "@remotion/renderer";
import { clipRange, SHORT_FADE } from "../src/Short";
import { validateShorts } from "../src/shorts";
import { validateTimeline2 } from "../src/timeline2";
import { resolveBrowser } from "./render-lib";

export async function lintShort(root: string, slug: string, n: number): Promise<number> {
  const shortsFile = path.join(root, "episodes", slug, "shorts.json");
  const tlFile = path.join(root, "out", "episodes", slug, "timeline.json");
  for (const f of [shortsFile, tlFile]) if (!existsSync(f)) return fail(`thiếu ${f}`);
  const raw = JSON.parse(readFileSync(shortsFile, "utf8"));
  const timeline = validateTimeline2(JSON.parse(readFileSync(tlFile, "utf8")));
  const { errors, warnings } = validateShorts(raw, timeline);
  for (const w of warnings) console.log(`[CẢNH BÁO] shorts-json: ${w}`);
  for (const e of errors) console.log(`[LỖI] shorts-json: ${e}`);
  if (errors.length > 0) return done(errors.length);
  const list = raw.shorts as { part: number; total: number; from: string; to: string; hook: string }[];
  if (n < 1 || n > list.length) return fail(`không có phần ${n} (shorts.json có ${list.length} phần)`);
  const e = list[n - 1];
  const clip = { from: e.from, to: e.to, hook: e.hook, part: e.part, total: e.total };
  const { start, end } = clipRange(timeline, clip);
  const scenes = timeline.scenes.filter((s) => s.startFrame >= start && s.startFrame < end);

  const browser = resolveBrowser();
  if (!browser.ok) return fail("không có trình duyệt render (xem .team/stack.md, D23)");
  const exe = browser.exe;
  const serveUrl = await bundle({ entryPoint: path.resolve(import.meta.dirname, "../src/index.ts"), publicDir: path.resolve(import.meta.dirname, "../public") });
  const b = await openBrowser("chrome", { browserExecutable: exe, chromiumOptions: { headless: true } });
  let bad = 0;
  try {
    const inputProps = { timeline, clip, muted: true };
    const composition = await selectComposition({ serveUrl, id: "Short", inputProps, puppeteerInstance: b, browserExecutable: exe });
    for (const s of scenes) {
      // Khung cuối trước khi cảnh mờ đi: mọi phần tử đã hiện.
      const frame = Math.max(s.startFrame - start, s.startFrame + s.durationFrames - start - SHORT_FADE - 2);
      try {
        await renderStill({ composition, serveUrl, inputProps, frame, output: undefined, puppeteerInstance: b, browserExecutable: exe, logLevel: "error" });
      } catch (err) {
        bad++;
        const msg = (err as Error).message.split("\n")[0];
        const rule = msg.includes("short-text-size") ? "short-text-size" : "short-render";
        console.log(`[LỖI] ${rule}: cảnh ${s.id} (${s.type}), khung ${frame} của phần ${n}: ${msg}`);
      }
    }
  } finally {
    await b.close({ silent: true });
  }
  return done(bad);
}

function fail(msg: string): number {
  console.error(`lint-short: ${msg}`);
  return 2;
}

function done(errors: number): number {
  console.log(errors === 0 ? "lint short: ĐẠT" : `lint short: KHÔNG ĐẠT (${errors} lỗi)`);
  return errors === 0 ? 0 : 1;
}
