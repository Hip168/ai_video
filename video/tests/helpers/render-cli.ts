import {spawn, spawnSync, type ChildProcess} from 'node:child_process';
import {existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {VIDEO_DIR} from './sample';
import {loadSample2} from './sample2';

// Hạ tầng test cho video/scripts/render-episode.ts (đề mục 10).
// Giao diện: .team/features/10-render-dai-giao-dien.md mục 2.

export const TSX = path.join(VIDEO_DIR, 'node_modules', '.bin', 'tsx');
export const SCRIPT = path.join(VIDEO_DIR, 'scripts', 'render-episode.ts');
export const GOLDEN = path.resolve(
  VIDEO_DIR,
  '..',
  'audio',
  'tests',
  'data',
  'template-timeline.json',
);
export const HEADLESS = path.join(
  process.env.HOME ?? '',
  '.cache',
  'aivideo',
  'chrome-headless-shell',
  'chrome-headless-shell',
);
/**
 * Trình duyệt dùng khi render thật: biến môi trường, rồi bản D23 trong ~/.cache,
 * rồi (CI) bản headless shell do `npx remotion browser ensure` tải vào
 * node_modules/.remotion.
 */
export function findBrowser(): string {
  if (process.env.REMOTION_BROWSER_EXECUTABLE) return process.env.REMOTION_BROWSER_EXECUTABLE;
  if (existsSync(HEADLESS)) return HEADLESS;
  const base = path.join(VIDEO_DIR, 'node_modules', '.remotion');
  const r = spawnSync('find', [base, '-name', 'chrome-headless-shell', '-type', 'f'], {
    encoding: 'utf8',
  });
  return r.stdout.split('\n').find(Boolean) ?? HEADLESS;
}
export const BROWSER = findBrowser();

const dirs: string[] = [];
export function tmp(prefix = 'rd-'): string {
  const d = mkdtempSync(path.join(tmpdir(), prefix));
  dirs.push(d);
  return d;
}
export function cleanup(): void {
  for (const d of dirs.splice(0)) rmSync(d, {recursive: true, force: true});
}

export type Plan = {id: string; startFrame: number; endFrame: number; frames: number}[];

export function golden(): any {
  return JSON.parse(readFileSync(GOLDEN, 'utf8'));
}

/** Timeline hợp lệ: các cảnh tiêu đề chương liền nhau, độ dài cho trước. */
export function staticTimeline(durations: number[]): any {
  const t = loadSample2();
  const base = t.scenes[1];
  let at = 0;
  t.scenes = durations.map((d, i) => {
    const sc = {
      ...structuredClone(base),
      id: `sc${String(i + 1).padStart(2, '0')}`,
      chapter: 'mo-dau',
      startFrame: at,
      durationFrames: d,
    };
    at += d;
    return sc;
  });
  t.chapters = [{id: 'mo-dau', title: 'Mở đầu', startFrame: 0}];
  t.durationInFrames = at;
  t.sfx = [];
  return t;
}

/** Tạo `<gốc>/out/episodes/<slug>/timeline.json`; trả về gốc. */
export function makeRoot(timeline: any, slug = 'tap-thu', root = tmp()): string {
  const out = path.join(root, 'out', 'episodes', slug);
  mkdirSync(out, {recursive: true});
  writeFileSync(path.join(out, 'timeline.json'), JSON.stringify(timeline));
  return root;
}

export const outDir = (root: string, slug = 'tap-thu') =>
  path.join(root, 'out', 'episodes', slug);

export type Run = {status: number | null; stdout: string; stderr: string};

/** Chạy render-episode.ts đồng bộ. `env` ghi đè; giá trị null xoá biến. */
export function runRender(
  args: string[],
  env: Record<string, string | null> = {},
  timeoutMs = 120_000,
): Run {
  const e: Record<string, string | undefined> = {...process.env};
  delete e.AIVIDEO_FREE_GB;
  delete e.AIVIDEO_MIN_FREE_GB;
  delete e.AIVIDEO_PROCS;
  for (const [k, v] of Object.entries(env)) {
    if (v === null) delete e[k];
    else e[k] = v;
  }
  const r = spawnSync(TSX, [SCRIPT, ...args], {
    cwd: VIDEO_DIR,
    encoding: 'utf8',
    env: e as NodeJS.ProcessEnv,
    timeout: timeoutMs,
    maxBuffer: 1 << 26,
  });
  return {status: r.status, stdout: r.stdout ?? '', stderr: r.stderr ?? ''};
}

export function plan(root: string, layout: 'main' | 'shift', slug = 'tap-thu'): Plan {
  const r = runRender([slug, '--root', root, '--layout', layout, '--plan'], {
    REMOTION_BROWSER_EXECUTABLE: '/khong/co/trinh-duyet',
  });
  if (r.status !== 0) throw new Error(`--plan lỗi (${r.status}): ${r.stderr}`);
  return JSON.parse(r.stdout);
}

/** Chạy bất đồng bộ để gửi tín hiệu giữa chừng. */
export function startRender(
  args: string[],
  env: Record<string, string> = {},
): {
  child: ChildProcess;
  out: () => string;
  err: () => string;
  waitFor: (re: RegExp, ms: number) => Promise<void>;
  signal: (sig: NodeJS.Signals) => void;
  exit: Promise<{code: number | null; signal: NodeJS.Signals | null}>;
} {
  const e: Record<string, string | undefined> = {...process.env, ...env};
  delete e.AIVIDEO_FREE_GB;
  // detached: tiến trình đứng đầu nhóm riêng, để gửi tín hiệu cho cả nhóm như
  // Ctrl-C ở terminal (tsx và node cùng nhận), không chỉ riêng tiến trình bọc.
  const child = spawn(TSX, [SCRIPT, ...args], {
    cwd: VIDEO_DIR,
    env: e as NodeJS.ProcessEnv,
    detached: true,
  });
  let out = '';
  let err = '';
  child.stdout!.on('data', (d) => (out += d));
  child.stderr!.on('data', (d) => (err += d));
  const exit = new Promise<{code: number | null; signal: NodeJS.Signals | null}>((res) =>
    child.on('exit', (code, signal) => res({code, signal})),
  );
  const waitFor = (re: RegExp, ms: number) =>
    new Promise<void>((resolve, reject) => {
      const t0 = Date.now();
      const tick = setInterval(() => {
        if (re.test(out)) {
          clearInterval(tick);
          resolve();
        } else if (child.exitCode !== null) {
          clearInterval(tick);
          reject(new Error(`tiến trình thoát (${child.exitCode}) trước khi thấy ${re}\n${out}\n${err}`));
        } else if (Date.now() - t0 > ms) {
          clearInterval(tick);
          process.kill(-child.pid!, 'SIGKILL');
          reject(new Error(`quá ${ms} ms chưa thấy ${re}\n${out}\n${err}`));
        }
      }, 200);
    });
  const signal = (sig: NodeJS.Signals) => process.kill(-child.pid!, sig);
  return {child, out: () => out, err: () => err, waitFor, signal, exit};
}

// ------------------------------------------------------------ tiến trình trình duyệt
export type Proc = {pid: number; ppid: number; cmd: string};
export function chromeProcs(): Proc[] {
  const r = spawnSync('ps', ['-axo', 'pid=,ppid=,command='], {encoding: 'utf8'});
  const out: Proc[] = [];
  for (const line of r.stdout.split('\n')) {
    const m = line.match(/^\s*(\d+)\s+(\d+)\s+(.*)$/);
    if (m && m[3].includes('chrome-headless-shell')) {
      out.push({pid: +m[1], ppid: +m[2], cmd: m[3]});
    }
  }
  return out;
}

/** Tiến trình chrome-headless-shell có cha là launchd/init (đã mồ côi). */
export function orphans(): Proc[] {
  return chromeProcs().filter((p) => p.ppid === 1);
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
