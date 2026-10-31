import {spawnSync} from 'node:child_process';
import {cpSync, existsSync, mkdirSync, mkdtempSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import {VIDEO_DIR} from './sample';

export const RENDER_TEST = process.env.RENDER_TEST === '1';

export type Pixels = {width: number; height: number; data: Buffer};

/** Tạo thư mục public tạm: timeline.json, audio im lặng, font thật. */
export function makePublicDir(timeline: any): string {
  const dir = mkdtempSync(path.join(tmpdir(), 'tl-public-'));
  mkdirSync(path.join(dir, 'audio'));
  writeFileSync(path.join(dir, 'timeline.json'), JSON.stringify(timeline));
  writeSilentWav(
    path.join(dir, timeline.audio.src),
    timeline.durationInFrames / timeline.fps,
  );
  const fonts = path.join(VIDEO_DIR, 'public', 'fonts');
  if (existsSync(fonts)) cpSync(fonts, path.join(dir, 'fonts'), {recursive: true});
  return dir;
}

export function writeSilentWav(file: string, seconds: number): void {
  const r = spawnSync(
    'ffmpeg',
    [
      '-y',
      '-f',
      'lavfi',
      '-i',
      'anullsrc=r=24000:cl=mono',
      '-t',
      String(seconds),
      file,
    ],
    {encoding: 'utf8'},
  );
  if (r.status !== 0) throw new Error(`ffmpeg lỗi: ${r.stderr}`);
}

export type Stage = {
  serveUrl: string;
  still: (frame: number) => Promise<Pixels>;
  composition: () => Promise<{
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
  const comp = () => selectComposition({serveUrl, id: 'Video'});
  return {
    serveUrl,
    composition: comp,
    still: async (frame: number) => {
      const composition = await comp();
      const output = path.join(
        mkdtempSync(path.join(tmpdir(), 'tl-still-')),
        `f${frame}.png`,
      );
      await renderStill({
        composition,
        serveUrl,
        frame,
        output,
        imageFormat: 'png',
      });
      return decodePng(output);
    },
  };
}

/** Giải mã PNG sang RGB thô bằng ffmpeg (không cần thêm thư viện). */
export function decodePng(file: string): Pixels {
  const r = spawnSync(
    'ffmpeg',
    ['-v', 'error', '-i', file, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'],
    {maxBuffer: 1 << 28},
  );
  if (r.status !== 0) throw new Error(`ffmpeg lỗi: ${r.stderr}`);
  const probe = spawnSync(
    'ffprobe',
    [
      '-v',
      'error',
      '-select_streams',
      'v:0',
      '-show_entries',
      'stream=width,height',
      '-of',
      'csv=p=0',
      file,
    ],
    {encoding: 'utf8'},
  );
  const [w, h] = probe.stdout.trim().split(',').map(Number);
  const data = r.stdout as Buffer;
  if (data.length !== w * h * 3) throw new Error('kích thước ảnh không khớp');
  return {width: w, height: h, data};
}

/** Số màu RGB khác nhau trong vùng hàng [y0, y1). */
export function distinctColors(p: Pixels, y0 = 0, y1 = p.height): number {
  const seen = new Set<number>();
  for (let i = y0 * p.width * 3; i < y1 * p.width * 3; i += 3) {
    seen.add((p.data[i] << 16) | (p.data[i + 1] << 8) | p.data[i + 2]);
  }
  return seen.size;
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
