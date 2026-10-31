import {spawnSync} from 'node:child_process';
import {
  cpSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import {SAMPLE_PATH, VIDEO_DIR} from './sample';

export const RENDER_TEST = process.env.RENDER_TEST === '1';

/** Chrome của máy (stack.md); không đặt thì Remotion tự chọn. */
const browserExecutable = process.env.REMOTION_BROWSER_EXECUTABLE ?? null;

export type Pixels = {width: number; height: number; data: Buffer};

const tempDirs: string[] = [];
function tempDir(prefix: string): string {
  const d = mkdtempSync(path.join(tmpdir(), prefix));
  tempDirs.push(d);
  return d;
}
/** Gọi trong afterAll của mỗi file test render. */
export function cleanupTemp(): void {
  for (const d of tempDirs.splice(0)) rmSync(d, {recursive: true, force: true});
}

/** Độ dài wav im lặng như CI: durationInFrames / fps - 0,5 giây. */
export function silentSeconds(timeline: any): number {
  return timeline.durationInFrames / timeline.fps - 0.5;
}

export function writeSilentWav(file: string, seconds: number): void {
  const r = spawnSync(
    'ffmpeg',
    ['-y', '-f', 'lavfi', '-i', 'anullsrc=r=24000:cl=mono', '-t', String(seconds), file],
    {encoding: 'utf8', timeout: 60_000},
  );
  if (r.status !== 0) throw new Error(`ffmpeg lỗi: ${r.stderr}`);
}

/** Tạo thư mục public tạm: timeline.json, audio im lặng, font thật. */
export function makePublicDir(timeline: any): string {
  const dir = tempDir('tl-public-');
  mkdirSync(path.join(dir, 'audio'));
  writeFileSync(path.join(dir, 'timeline.json'), JSON.stringify(timeline));
  writeSilentWav(path.join(dir, timeline.audio.src), silentSeconds(timeline));
  const fonts = path.join(VIDEO_DIR, 'public', 'fonts');
  if (existsSync(fonts)) cpSync(fonts, path.join(dir, 'fonts'), {recursive: true});
  return dir;
}

export type Stage = {
  serveUrl: string;
  still: (frame: number) => Promise<Pixels>;
  composition: (inputProps?: Record<string, unknown>) => Promise<{
    id: string;
    durationInFrames: number;
    fps: number;
    width: number;
    height: number;
  }>;
};

/** Đóng gói dự án với timeline cho trước, trả hàm chụp still theo frame. */
export async function stage(timeline: any): Promise<Stage> {
  const publicDir = makePublicDir(timeline);
  const serveUrl = await bundle({
    entryPoint: path.join(VIDEO_DIR, 'src', 'index.ts'),
    publicDir,
  });
  const comp = (inputProps?: Record<string, unknown>) =>
    selectComposition({serveUrl, id: 'Video', inputProps, browserExecutable});
  let cached: Awaited<ReturnType<typeof comp>> | undefined;
  return {
    serveUrl,
    composition: comp,
    still: async (frame: number) => {
      cached ??= await comp();
      return renderTo(cached, serveUrl, frame, 'Video');
    },
  };
}

async function renderTo(
  composition: Awaited<ReturnType<typeof selectComposition>>,
  serveUrl: string,
  frame: number,
  id: string,
): Promise<Pixels> {
  const output = path.join(tempDir('tl-still-'), `${id}-${frame}.png`);
  await renderStill({
    composition,
    serveUrl,
    frame,
    output,
    imageFormat: 'png',
    browserExecutable,
  });
  return decodePng(output);
}

/** Chụp still của một composition bất kỳ theo id (vd KitDemo). */
export async function stillOf(
  serveUrl: string,
  id: string,
  frame: number,
): Promise<Pixels> {
  const composition = await selectComposition({serveUrl, id, browserExecutable});
  return renderTo(composition, serveUrl, frame, id);
}

/** Giải mã PNG sang RGB thô bằng ffmpeg (không cần thêm thư viện). */
export function decodePng(file: string): Pixels {
  const r = spawnSync(
    'ffmpeg',
    ['-v', 'error', '-i', file, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'],
    {maxBuffer: 1 << 28, timeout: 60_000},
  );
  if (r.status !== 0) throw new Error(`ffmpeg lỗi: ${r.stderr}`);
  const probe = spawnSync(
    'ffprobe',
    ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', file],
    {encoding: 'utf8', timeout: 60_000},
  );
  const [w, h] = probe.stdout.trim().split(',').map(Number);
  const data = r.stdout as Buffer;
  if (data.length !== w * h * 3) throw new Error('kích thước ảnh không khớp');
  return {width: w, height: h, data};
}

/** Nếu video/public thiếu timeline.json hoặc wav (gitignore) thì dựng như CI. */
export function ensureDefaultPublic(): void {
  const pub = path.join(VIDEO_DIR, 'public');
  const tl = path.join(pub, 'timeline.json');
  mkdirSync(path.join(pub, 'audio'), {recursive: true});
  if (!existsSync(tl)) copyFileSync(SAMPLE_PATH, tl);
  const t = JSON.parse(readFileSync(tl, 'utf8'));
  const wav = path.join(pub, t.audio.src);
  if (!existsSync(wav) || statSync(wav).size === 0) {
    writeSilentWav(wav, silentSeconds(t));
  }
}

export function readDefaultTimeline(): any {
  return JSON.parse(
    readFileSync(path.join(VIDEO_DIR, 'public', 'timeline.json'), 'utf8'),
  );
}

/** Điểm ảnh (x, y) dạng [r, g, b]. */
export function px(p: Pixels, x: number, y: number): [number, number, number] {
  const i = (y * p.width + x) * 3;
  return [p.data[i], p.data[i + 1], p.data[i + 2]];
}

export function hex(h: string): [number, number, number] {
  const n = parseInt(h.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Số màu RGB khác nhau trong vùng hàng [y0, y1). */
export function distinctColors(p: Pixels, y0 = 0, y1 = p.height): number {
  const seen = new Set<number>();
  for (let i = y0 * p.width * 3; i < y1 * p.width * 3; i += 3) {
    seen.add((p.data[i] << 16) | (p.data[i + 1] << 8) | p.data[i + 2]);
  }
  return seen.size;
}

const near = (a: number[], b: number[], tol: number) =>
  Math.abs(a[0] - b[0]) <= tol &&
  Math.abs(a[1] - b[1]) <= tol &&
  Math.abs(a[2] - b[2]) <= tol;

/** Các điểm ảnh có màu gần `color` (sai số mỗi kênh ≤ tol) trong hộp [x0,x1)×[y0,y1). */
export function findColor(
  p: Pixels,
  color: [number, number, number],
  box: {x0?: number; x1?: number; y0?: number; y1?: number} = {},
  tol = 6,
): Array<[number, number]> {
  const {x0 = 0, x1 = p.width, y0 = 0, y1 = p.height} = box;
  const out: Array<[number, number]> = [];
  for (let y = Math.max(0, y0); y < Math.min(p.height, y1); y++) {
    for (let x = Math.max(0, x0); x < Math.min(p.width, x1); x++) {
      if (near(px(p, x, y), color, tol)) out.push([x, y]);
    }
  }
  return out;
}

/** Tỉ lệ điểm ảnh khác màu `color` (sai số ≤ tol) trong hàng [y0, y1). */
export function nonColorRatio(
  p: Pixels,
  color: [number, number, number],
  y0 = 0,
  y1 = p.height,
  tol = 6,
): number {
  let n = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = 0; x < p.width; x++) {
      if (!near(px(p, x, y), color, tol)) n++;
    }
  }
  return n / ((y1 - y0) * p.width);
}

/** Tỉ lệ điểm ảnh khác nhau (chênh > tol ở bất kỳ kênh nào) trong hàng [y0, y1). */
export function diffRatio(
  a: Pixels,
  b: Pixels,
  y0 = 0,
  y1 = a.height,
  tol = 8,
): number {
  let diff = 0;
  const start = y0 * a.width * 3;
  const end = y1 * a.width * 3;
  for (let i = start; i < end; i += 3) {
    if (
      Math.abs(a.data[i] - b.data[i]) > tol ||
      Math.abs(a.data[i + 1] - b.data[i + 1]) > tol ||
      Math.abs(a.data[i + 2] - b.data[i + 2]) > tol
    ) {
      diff++;
    }
  }
  return diff / ((end - start) / 3);
}
