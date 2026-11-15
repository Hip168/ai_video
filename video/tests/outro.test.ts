import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import {afterAll, beforeAll, describe, expect, test} from 'vitest';
import OUTRO from '../../assets/brand/outro.json';
import {LIKE_PRESS, OUTRO_FRAMES, OUTRO_SAFE_X, OUTRO_SIZE, OUTRO_VERTICAL_COLUMN, SUB_PRESS} from '../src/Outro';
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
  // Khung dọc: cột nội dung nằm gọn trong x ≤ 900 (dải nút UI bên phải của Shorts).
  expect(OUTRO_VERTICAL_COLUMN.x1).toBeLessThanOrEqual(OUTRO_SAFE_X);
  expect(OUTRO_SAFE_X).toBe(900);
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

/** Điểm sáng hơn nền: nền là chuyển màu panel → bg, mọi chữ/nút/ảnh đều sáng hơn hẳn. */
function brightCols(p: Pixels, x0: number): number[] {
  const limit = Math.max(...hex(THEME.panel)) + 24;
  const cols = new Set<number>();
  for (let y = 0; y < p.height; y++) {
    for (let x = x0; x < p.width; x++) {
      const i = (y * p.width + x) * 3;
      if (Math.max(p.data[i], p.data[i + 1], p.data[i + 2]) > limit) cols.add(x);
    }
  }
  return [...cols].sort((a, b) => a - b);
}

d('[21] khung dọc: mọi chữ nằm trong x ≤ 900, chừa dải nút bên phải của Shorts', () => {
  // Khung trước khi bấm, lúc chữ "Đăng ký" + tên kênh hiện đủ, và khung cuối ("Đã đăng ký", lời chào).
  for (const frame of [LIKE_PRESS - 10, SUB_PRESS + 10, OUTRO_FRAMES - 1]) {
    test(`OutroVertical frame ${frame}: không có điểm sáng ở x > ${OUTRO_SAFE_X}`, async () => {
      const p = await still('OutroVertical', frame);
      expect(brightCols(p, OUTRO_SAFE_X + 1)).toEqual([]);
      // Đối chứng: phép đo thấy được chữ ở nửa trái.
      expect(brightCols(p, 0).length).toBeGreaterThan(300);
    });
  }
});
