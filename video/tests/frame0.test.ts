import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import {afterAll, beforeAll, describe, expect, test} from 'vitest';
import {sceneOpacity} from '../src/Episode';
import {shortOpacity, SHORT_FADE} from '../src/Short';
import {subtitleOpacity} from '../src/lib/subtitle';
import {THEMES} from '../src/lib/theme';
import {RENDER_TEST, decodePng, findColor, hex, type Pixels} from './helpers/render';
import {VIDEO_DIR} from './helpers/sample';
import {loadSample2} from './helpers/sample2';

// [23] Khung 0 không trống: cảnh đầu tập (wide) và đầu mỗi phần Short (dọc) hiện đủ ở frame 0;
// crossfade giữa các cảnh sau vẫn giữ.

describe('[23] độ mờ ở frame 0', () => {
  test('cảnh mở đầu: opacity 1 ở frame 0, vẫn fade ra cuối cảnh', () => {
    expect(sceneOpacity(0, 120, false)).toBe(1);
    expect(sceneOpacity(4, 120, false)).toBe(1);
    expect(sceneOpacity(120, 120, false)).toBe(0);
  });
  test('cảnh sau vẫn crossfade vào', () => {
    expect(sceneOpacity(0, 120)).toBe(0);
    expect(sceneOpacity(8, 120)).toBe(1);
  });
  test('Short: cả phần opacity 1 ở frame 0, fade ra SHORT_FADE frame cuối', () => {
    expect(shortOpacity(0, 300)).toBe(1);
    expect(shortOpacity(300 - SHORT_FADE, 300)).toBe(1);
    expect(shortOpacity(300, 300)).toBe(0);
  });
  test('phụ đề beat mở đầu: opacity 1 ở frame 0', () => {
    const beat = {id: 'b001', text: 'x', startFrame: 0, durationFrames: 60} as any;
    expect(subtitleOpacity(beat, 0, false)).toBe(1);
    expect(subtitleOpacity(beat, 0)).toBe(0);
  });
});

const d = describe.skipIf(!RENDER_TEST);
const browserExecutable = process.env.REMOTION_BROWSER_EXECUTABLE ?? null;
const THEME = THEMES['mau-a'];
const INK = [THEME.fg, THEME.accent, THEME.accent2, THEME.muted].map(hex);
const count = (p: Pixels, box: {x0?: number; x1?: number; y0?: number; y1?: number}) =>
  INK.reduce((n, c) => n + findColor(p, c, box).length, 0);

let serveUrl = '';
let tmp = '';
beforeAll(async () => {
  if (!RENDER_TEST) return;
  tmp = mkdtempSync(path.join(tmpdir(), 'frame0-'));
  serveUrl = await bundle({entryPoint: path.join(VIDEO_DIR, 'src', 'index.ts')});
}, 180_000);
afterAll(() => {
  if (tmp) rmSync(tmp, {recursive: true, force: true});
});

async function still(id: string, inputProps: Record<string, unknown>, frame: number): Promise<Pixels> {
  const composition = await selectComposition({serveUrl, id, inputProps, browserExecutable});
  const output = path.join(tmp, `${id}-${frame}.png`);
  await renderStill({composition, serveUrl, frame, output, imageFormat: 'png', browserExecutable});
  return decodePng(output);
}

d('[23] render frame 0', () => {
  test('Episode: frame 0 có chữ cảnh đầu và phụ đề', async () => {
    const p = await still('Episode', {timeline: loadSample2(), muted: true}, 0);
    expect(count(p, {y1: 900})).toBeGreaterThan(200);
    expect(count(p, {y0: 900})).toBeGreaterThan(200);
  }, 180_000);

  test('Short: frame 0 có chữ trong hộp cảnh và phụ đề', async () => {
    const clip = {from: 'b001', to: 'b002', hook: 'Vì sao chỉ có 0 và 1?', part: 1, total: 2};
    const p = await still('Short', {timeline: loadSample2(), clip, muted: true}, 0);
    expect(count(p, {x0: 48, x1: 1032, y0: 468, y1: 1452})).toBeGreaterThan(200);
    expect(count(p, {x0: 48, x1: 1032, y0: 1472, y1: 1602})).toBeGreaterThan(200);
  }, 180_000);
});
