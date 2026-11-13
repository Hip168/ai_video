import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import {afterAll, beforeAll, describe, expect, test} from 'vitest';
import OUTRO from '../../assets/brand/outro.json';
import {LIKE_PRESS, OUTRO_FRAMES, OUTRO_SIZE, SUB_PRESS} from '../src/Outro';
import {THEMES} from '../src/lib/theme';
import {RENDER_TEST, decodePng, findColor, hex, type Pixels} from './helpers/render';
import {VIDEO_DIR} from './helpers/sample';

// [21] Đoạn kết thích + đăng ký dùng chung (D38). Phần render chỉ chạy khi RENDER_TEST=1.

test('[21] đoạn kết 5–7 giây, hai khung ngang và dọc toàn màn hình', () => {
  expect(OUTRO_FRAMES).toBe(OUTRO.frames);
  expect(OUTRO_FRAMES).toBeGreaterThanOrEqual(150);
  expect(OUTRO_FRAMES).toBeLessThanOrEqual(210);
  expect(OUTRO_SIZE).toEqual({wide: {w: 1920, h: 1080}, vertical: {w: 1080, h: 1920}});
  expect(LIKE_PRESS).toBeLessThan(SUB_PRESS);
  expect(SUB_PRESS).toBeLessThan(OUTRO_FRAMES);
});

const d = describe.skipIf(!RENDER_TEST);
const browserExecutable = process.env.REMOTION_BROWSER_EXECUTABLE ?? null;
const THEME = THEMES[OUTRO.theme];

let serveUrl = '';
let tmp = '';
beforeAll(async () => {
  if (!RENDER_TEST) return;
  tmp = mkdtempSync(path.join(tmpdir(), 'outro-'));
  serveUrl = await bundle({entryPoint: path.join(VIDEO_DIR, 'src', 'index.ts')});
}, 180_000);
afterAll(() => {
  if (tmp) rmSync(tmp, {recursive: true, force: true});
});

async function still(id: string, frame: number): Promise<Pixels> {
  const composition = await selectComposition({serveUrl, id, inputProps: {}, browserExecutable});
  const output = path.join(tmp, `${id}-${frame}.png`);
  await renderStill({composition, serveUrl, frame, output, imageFormat: 'png', browserExecutable});
  return decodePng(output);
}

d('[21] đoạn kết render thật', () => {
  for (const [id, size] of [['OutroWide', OUTRO_SIZE.wide], ['OutroVertical', OUTRO_SIZE.vertical]] as const) {
    test(`${id}: đúng kích thước, nút "Thích" đổi màu sau khi bấm`, async () => {
      const before = await still(id, LIKE_PRESS - 10);
      const after = await still(id, OUTRO_FRAMES - 1);
      expect([after.width, after.height]).toEqual([size.w, size.h]);
      // Nút "Thích" sau khi bấm tô kín màu accent: số điểm accent tăng rõ.
      const accent = (p: Pixels) => findColor(p, hex(THEME.accent)).length;
      expect(accent(after)).toBeGreaterThan(accent(before) + 5000);
    });
  }
});
