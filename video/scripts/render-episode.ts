// Render tập dài theo đoạn (D18, D23). Cách dùng và mã thoát: .team/features/10-render-dai-giao-dien.md
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { bundle } from "@remotion/bundler";
import { openBrowser, renderMedia, selectComposition } from "@remotion/renderer";
import { validateTimeline2 } from "../src/timeline2";
import {
  CRF,
  DEFAULT_BROWSER,
  DEFAULT_PROCS,
  diskProblem,
  hashSource,
  parseRange,
  planSegments,
  probeFrames,
  readManifest,
  resolveBrowser,
  segmentHash,
  writeManifest,
  type Layout,
  type Manifest,
  type Segment,
} from "./render-lib";

const VIDEO_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_ROOT = path.resolve(VIDEO_DIR, "..");

class Usage extends Error {}
class Fail extends Error {
  constructor(msg: string, readonly code = 1) {
    super(msg);
  }
}

interface Args {
  slug: string;
  root: string;
  layout: Layout;
  procs: number;
  frames: [number, number] | null;
  redo: string[];
  force: boolean;
  plan: boolean;
}

function parseArgs(argv: string[]): Args {
  const a: Args = {
    slug: "",
    root: DEFAULT_ROOT,
    layout: "main",
    procs: Number(process.env.AIVIDEO_PROCS) || DEFAULT_PROCS,
    frames: null,
    redo: [],
    force: false,
    plan: false,
  };
  const val = (i: number, name: string): string => {
    const v = argv[i + 1];
    if (v === undefined || v.startsWith("--")) throw new Usage(`${name} thiếu giá trị`);
    return v;
  };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t === "--root") a.root = path.resolve(val(i++, t));
    else if (t === "--layout") {
      const v = val(i++, t);
      if (v !== "main" && v !== "shift") throw new Usage(`--layout phải là main hoặc shift, nhận ${v}`);
      a.layout = v;
    } else if (t === "--procs") {
      a.procs = Number(val(i++, t));
      if (!Number.isInteger(a.procs) || a.procs < 1) throw new Usage("--procs phải là số nguyên >= 1");
    } else if (t === "--frames") {
      try {
        a.frames = parseRange(val(i++, t));
      } catch (e) {
        throw new Usage((e as Error).message);
      }
    } else if (t === "--redo") a.redo = val(i++, t).split(",").filter(Boolean);
    else if (t === "--force") a.force = true;
    else if (t === "--plan") a.plan = true;
    else if (t.startsWith("--")) throw new Usage(`cờ lạ: ${t}`);
    else if (!a.slug) a.slug = t;
    else throw new Usage(`tham số thừa: ${t}`);
  }
  if (!a.slug) throw new Usage("thiếu <slug>");
  return a;
}

const log = (s: string) => console.log(s);

async function main(): Promise<number> {
  let args: Args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (e) {
    console.error(`${(e as Error).message}\ncách dùng: render-episode.ts <slug> [--root d] [--layout main|shift] [--procs N] [--frames a-b] [--redo id,id] [--force] [--plan]`);
    return 2;
  }
  const outDir = path.join(args.root, "out", "episodes", args.slug);
  const tlFile = path.join(outDir, "timeline.json");
  if (!existsSync(tlFile)) throw new Fail(`thiếu ${tlFile} (chạy bước dựng tập trước)`);
  const timeline = validateTimeline2(JSON.parse(readFileSync(tlFile, "utf8")));
  const plan = planSegments(timeline.scenes, args.layout);

  if (args.plan) {
    console.log(JSON.stringify(plan));
    return 0;
  }

  const prob = diskProblem(outDir);
  if (prob) throw new Fail(prob, 3);
  const browser = resolveBrowser();
  const browserExe = browser.exe;
  if (!browser.ok) {
    throw new Fail(
      process.env.REMOTION_BROWSER_EXECUTABLE
        ? `REMOTION_BROWSER_EXECUTABLE không trỏ tới file có thật: ${process.env.REMOTION_BROWSER_EXECUTABLE}`
        : `không có trình duyệt ${DEFAULT_BROWSER} (xem .team/stack.md, D23) và chưa đặt REMOTION_BROWSER_EXECUTABLE`,
    );
  }

  const srcHash = hashSource(path.join(VIDEO_DIR, "src"));
  const rendererVersion = JSON.parse(readFileSync(path.join(VIDEO_DIR, "node_modules/@remotion/renderer/package.json"), "utf8")).version as string;
  const manifestFile = path.join(outDir, "manifest.json");
  const old = readManifest(manifestFile);
  const manifest: Manifest =
    old && old.slug === args.slug && old.durationInFrames === timeline.durationInFrames
      ? old
      : { version: 1, slug: args.slug, fps: timeline.fps, durationInFrames: timeline.durationInFrames, srcHash, layouts: {} };
  manifest.srcHash = srcHash;
  const dirName = args.layout === "main" ? "segments" : "segments-shift";
  mkdirSync(path.join(outDir, dirName), { recursive: true });

  const prev = new Map((manifest.layouts[args.layout] ?? []).map((s) => [s.id + ":" + s.startFrame + "-" + s.endFrame, s]));
  const segments: Segment[] = plan.map((p) => {
    const hash = segmentHash(timeline, p, srcHash, rendererVersion);
    const file = `${dirName}/${p.id}.mp4`;
    const before = prev.get(p.id + ":" + p.startFrame + "-" + p.endFrame);
    const reuse = before && before.hash === hash && before.status === "done" ? before : null;
    return { ...p, file, hash, status: reuse ? "done" : "pending", attempts: reuse?.attempts ?? 0, bytes: reuse?.bytes ?? 0 };
  });
  manifest.layouts[args.layout] = segments;

  // Chọn đoạn cần làm.
  const wanted = (s: Segment) => !args.frames || (s.startFrame <= args.frames[1] && s.endFrame >= args.frames[0]);
  const todo: Segment[] = [];
  for (const s of segments) {
    const abs = path.join(outDir, s.file);
    if (args.redo.includes(s.id) || args.force) {
      s.status = "pending";
      rmSync(abs, { force: true });
    }
    if (!wanted(s)) continue;
    if (s.status === "done") {
      if (probeFrames(abs) === s.frames) {
        log(`bỏ qua ${s.id} (đã xong, hash khớp)`);
        continue;
      }
      s.status = "pending";
    }
    todo.push(s);
  }
  for (const id of args.redo) if (!segments.some((s) => s.id === id)) throw new Fail(`--redo: không có đoạn ${id}`);
  writeManifest(manifestFile, manifest);
  if (todo.length === 0) {
    log("không còn đoạn nào cần render");
    return 0;
  }

  const browsers: Awaited<ReturnType<typeof openBrowser>>[] = [];
  const pids = new Set<number>();
  const browserPids: number[] = [];
  const parts = new Set<string>();
  // Remotion 4.0.539 spawn Chrome với `detached: true` (BrowserRunner.js:82-87) nên Chrome là
  // trưởng nhóm tiến trình; diệt cả nhóm bằng pid âm như killProcess của Remotion (BrowserRunner.js:118-121).
  const killAll = () => {
    for (const pid of pids) {
      try {
        process.kill(-pid, "SIGKILL");
      } catch {
        /* đã thoát */
      }
    }
  };
  process.on("exit", killAll);
  // Object Browser không lộ pid (runner không có proc), nên tìm con trực tiếp có --user-data-dir=
  // (open-browser.js:186 luôn thêm cờ này cho Chrome).
  const childBrowserPids = (): number[] =>
    spawnSync("pgrep", ["-P", String(process.pid), "-f", "user-data-dir="], { encoding: "utf8" })
      .stdout.split("\n")
      .map(Number)
      .filter((n) => n > 0);
  let interrupted = false;
  // Listener SIGINT của Remotion (BrowserRunner.js:191-194) gọi process.exit(130) ngay sau listener này
  // (đăng ký trước openBrowser nên chạy trước), nên mọi việc dọn phải làm đồng bộ ở đây.
  const onSignal = () => {
    if (interrupted) return;
    interrupted = true;
    console.error("nhận tín hiệu ngắt, đang dừng và đóng trình duyệt...");
    killAll();
    for (const part of parts) rmSync(part, { force: true });
    writeManifest(manifestFile, manifest);
    process.exit(130);
  };
  process.on("SIGINT", onSignal);
  process.on("SIGTERM", onSignal);

  try {
    const nWorkers = Math.min(args.procs, todo.length);
    for (let i = 0; i < nWorkers; i++) {
      const b = await openBrowser("chrome", { browserExecutable: browserExe, chromiumOptions: { headless: true } });
      browsers.push(b);
      const pid = childBrowserPids().find((p) => !pids.has(p));
      if (pid === undefined) throw new Fail("không tìm được pid trình duyệt vừa mở");
      browserPids.push(pid);
      pids.add(pid);
    }
    log(`bundle...`);
    const serveUrl = await bundle({ entryPoint: path.join(VIDEO_DIR, "src", "index.ts"), publicDir: path.join(VIDEO_DIR, "public") });
    const inputProps = { timeline, muted: true };
    const composition = await selectComposition({ serveUrl, id: "Episode", inputProps, puppeteerInstance: browsers[0], browserExecutable: browserExe });

    const queue = [...todo];
    let failure: Error | null = null;
    const worker = async (idx: number) => {
      while (!failure) {
        const seg = queue.shift();
        if (!seg) return;
        const abs = path.join(outDir, seg.file);
        const part = abs.replace(/\.mp4$/, ".part.mp4");
        rmSync(part, { force: true });
        parts.add(part);
        const t0 = Date.now();
        seg.attempts += 1;
        try {
          // Điểm móc cho test: gây lỗi trong tiến trình sau khi trình duyệt đã mở.
          if (process.env.AIVIDEO_FAIL_SEGMENT === seg.id) throw new Error(`lỗi giả lập ở ${seg.id} (AIVIDEO_FAIL_SEGMENT)`);
          await renderMedia({
            composition,
            serveUrl,
            codec: "h264",
            pixelFormat: "yuv420p",
            imageFormat: "png",
            crf: CRF,
            muted: true,
            concurrency: 1,
            frameRange: [seg.startFrame, seg.endFrame],
            outputLocation: part,
            inputProps,
            overwrite: true,
            puppeteerInstance: browsers[idx],
            browserExecutable: browserExe,
            logLevel: "warn",
          });
          const n = probeFrames(part);
          if (n !== seg.frames) throw new Error(`đoạn ${seg.id} có ${n} frame, cần ${seg.frames}`);
          renameSync(part, abs);
          seg.status = "done";
          seg.bytes = statSync(abs).size;
          log(`đoạn ${seg.id} xong (${seg.frames} frame, ${((Date.now() - t0) / 1000).toFixed(1)} s)`);
        } catch (e) {
          seg.status = "failed";
          rmSync(part, { force: true });
          failure ??= e as Error;
        } finally {
          parts.delete(part);
          writeManifest(manifestFile, manifest);
        }
      }
    };
    await Promise.all(browsers.map((_, i) => worker(i)));
    if (failure) throw new Fail(`render lỗi: ${(failure as Error).message}`);
    return 0;
  } finally {
    for (const [i, b] of browsers.entries()) {
      try {
        await b.close({ silent: true });
        pids.delete(browserPids[i]);
      } catch {
        /* còn sót thì killAll xử lý */
      }
    }
    killAll();
    pids.clear();
    writeManifest(manifestFile, manifest);
  }
}

main().then(
  (code) => process.exit(code),
  (e) => {
    console.error(`LỖI: ${(e as Error).message}`);
    process.exit(e instanceof Fail ? e.code : 1);
  },
);
