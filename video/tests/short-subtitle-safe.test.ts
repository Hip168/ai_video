import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import {afterAll, beforeAll, describe, expect, test} from 'vitest';
import {OUTRO_SAFE_X, OUTRO_VERTICAL_COLUMN} from '../src/Outro';
import {SHORT_SUBTITLE} from '../src/Short';
import {THEMES} from '../src/lib/theme';
import {RENDER_TEST, decodePng, findColor, hex} from './helpers/render';
import {VIDEO_DIR} from './helpers/sample';
import {loadSample2} from './helpers/sample2';

// Phụ đề bản dọc 9:16 không lấn dải nút bên phải (QC: chữ tới x ≈ 1005). Hộp phụ đề nằm trong cột x 48–888,
// cùng cột với đoạn kết dọc (PR #88). Phụ đề bản ngang (lib/subtitle) giữ nguyên.

test('hộp phụ đề Short nằm trong cột 48–888, không qua x 900', () => {
  expect(SHORT_SUBTITLE.x0).toBe(OUTRO_VERTICAL_COLUMN.x0);
  expect(SHORT_SUBTITLE.x1).toBe(OUTRO_VERTICAL_COLUMN.x1);
  expect(SHORT_SUBTITLE.x1).toBeLessThanOrEqual(OUTRO_SAFE_X);
});

const d = describe.skipIf(!RENDER_TEST);
const browserExecutable = process.env.REMOTION_BROWSER_EXECUTABLE ?? null;
const THEME = THEMES['mau-a'];
const INK = [THEME.fg, THEME.accent, THEME.accent2, THEME.muted].map(hex);
const CLIP = {from: 'b001', to: 'b002', hook: 'Vì sao chỉ có 0 và 1?', part: 2, total: 6};

let serveUrl = '';
let tmp = '';
beforeAll(async () => {
  if (!RENDER_TEST) return;
  tmp = mkdtempSync(path.join(tmpdir(), 'short-sub-'));
  serveUrl = await bundle({entryPoint: path.join(VIDEO_DIR, 'src', 'index.ts')});
}, 180_000);
afterAll(() => {
  if (tmp) rmSync(tmp, {recursive: true, force: true});
});

d('phụ đề Short render thật', () => {
  test('chữ phụ đề chỉ nằm trong x 48–888 của dải phụ đề', async () => {
    // Một dòng gần đủ rộng hộp 984 cũ (dưới 52 ký tự nên không bị tách): hộp cũ để chữ chạy tới x ≈ 958.
    const timeline = loadSample2();
    timeline.scenes[0].beats[0].text = 'Mỗi bit chỉ có hai trạng thái bật tắt';
    const inputProps = {timeline, clip: CLIP, muted: true};
    const composition = await selectComposition({serveUrl, id: 'Short', inputProps, browserExecutable});
    const output = path.join(tmp, 'sub.png');
    await renderStill({composition, serveUrl, frame: 60, output, imageFormat: 'png', inputProps, browserExecutable});
    const p = decodePng(output);
    const band = {y0: SHORT_SUBTITLE.y0, y1: SHORT_SUBTITLE.y1};
    const ink = (box: {x0?: number; x1?: number}) => INK.reduce((n, c) => n + findColor(p, c, {...band, ...box}).length, 0);
    expect(ink({x0: 48, x1: 888})).toBeGreaterThan(200);
    expect(ink({x0: 888})).toBe(0);
  }, 180_000);
});
