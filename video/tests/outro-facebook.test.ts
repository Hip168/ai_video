import {createHash} from 'node:crypto';
import {mkdtempSync, readFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {afterAll, beforeAll, describe, expect, test} from 'vitest';
import FB from '../../assets/brand/outro-facebook.json';
import OUTRO from '../../assets/brand/outro.json';
import {OUTRO_FRAMES, OUTRO_SIZE, OUTRO_VERTICAL_COLUMN} from '../src/Outro';
import {
  FB_BLUE,
  FB_GAP,
  FB_OUTRO_FRAMES,
  FB_PRESS,
  FB_SCALE,
  FbButtonsView,
  fbButtons,
  fbRows,
} from '../src/OutroFacebook';
import {THEMES} from '../src/lib/theme';
import {RENDER_TEST, decodePng, findColor, hex, type Pixels} from './helpers/render';
import {VIDEO_DIR} from './helpers/sample';

// [32] Đoạn kết Facebook (thích, theo dõi, chia sẻ). Phần render chỉ chạy khi RENDER_TEST=1.

const THEME = THEMES[FB.theme];
const sha = (rel: string) => createHash('sha256').update(readFileSync(path.join(VIDEO_DIR, rel))).digest('hex');

describe('[32] bản YouTube không đổi', () => {
  test('Outro.tsx và outro.json giữ nguyên, Root vẫn có OutroWide/OutroVertical', () => {
    expect(sha('src/Outro.tsx')).toBe('55b7abb66d116d6157cff44c01b497a26e0ac91fcb6ea930cd848c8f576dab18');
    expect(sha('../assets/brand/outro.json')).toBe('7a142aabfa3d6fd425fcad9b83d54a142415e8c11d3f448e7d0b876c15b9fbda');
    const root = readFileSync(path.join(VIDEO_DIR, 'src/Root.tsx'), 'utf8');
    expect(root).toContain('"OutroWide" : "OutroVertical"');
    expect(root).toContain('"OutroFacebookWide" : "OutroFacebookVertical"');
  });
});

describe('[32] bản Facebook: chữ và biểu tượng', () => {
  test('cùng độ dài, giọng, chủ đề, tên kênh với đoạn kết YouTube', () => {
    expect(FB_OUTRO_FRAMES).toBe(OUTRO_FRAMES);
    for (const k of ['engine', 'voice', 'speed', 'theme', 'channel', 'headline', 'footer'] as const) {
      expect(FB[k]).toBe(OUTRO[k]);
    }
    expect(FB_PRESS.like).toBeLessThan(FB_PRESS.follow);
    expect(FB_PRESS.follow).toBeLessThan(FB_PRESS.share);
    expect(FB_PRESS.share).toBeLessThan(FB_OUTRO_FRAMES);
  });

  test('nhãn và biểu tượng trước và sau khi bấm', () => {
    const at = (f: number) => fbButtons(f).map((b) => [b.id, b.label, b.icon, b.pressed]);
    expect(at(0)).toEqual([
      ['like', 'Thích', 'thumb', false],
      ['follow', 'Theo dõi', 'person-plus', false],
      ['share', 'Chia sẻ', 'share', false],
    ]);
    expect(at(FB_OUTRO_FRAMES - 1)).toEqual([
      ['like', 'Thích', 'thumb', true],
      ['follow', 'Đang theo dõi', 'person-check', true],
      ['share', 'Chia sẻ', 'share', true],
    ]);
  });

  for (const layout of ['wide', 'vertical'] as const) {
    test(`${layout}: markup có đủ chữ, biểu tượng Facebook, không có "Đăng ký"/chuông`, () => {
      const html = (frame: number) =>
        renderToStaticMarkup(createElement(FbButtonsView, {layout, frame, fps: 30, theme: THEME}));
      const first = html(10);
      const last = html(FB_OUTRO_FRAMES - 1);
      for (const s of ['>Thích<', '>Theo dõi<', '>Chia sẻ<', 'data-icon="thumb"', 'data-icon="person-plus"', 'data-icon="share"']) {
        expect(first).toContain(s);
      }
      for (const s of ['>Đang theo dõi<', 'data-icon="person-check"']) expect(last).toContain(s);
      expect(last.toLowerCase()).toContain(FB_BLUE.toLowerCase());
      for (const s of [first, last]) {
        expect(s).not.toMatch(/Đăng ký|Subscribe|bell/i);
      }
    });
  }

  test('nguồn OutroFacebook.tsx không dùng chữ/biểu tượng YouTube', () => {
    const src = readFileSync(path.join(VIDEO_DIR, 'src/OutroFacebook.tsx'), 'utf8');
    expect(src).not.toMatch(/"Đăng ký"|"Đã đăng ký"|Bell/);
  });

  test('khung dọc: mỗi hàng nút (kể cả nảy 5%) vừa cột x 48–888', () => {
    const col = OUTRO_VERTICAL_COLUMN.x1 - OUTRO_VERTICAL_COLUMN.x0;
    expect(col).toBe(840);
    const widths = Object.fromEntries(fbButtons(FB_OUTRO_FRAMES - 1).map((b) => [b.id, b.w * FB_SCALE.vertical]));
    for (const row of fbRows('vertical')) {
      const w = row.reduce((s, id) => s + widths[id], 0) + FB_GAP.vertical * (row.length - 1);
      const last = widths[row[row.length - 1]];
      expect(w + 0.05 * last).toBeLessThanOrEqual(col);
    }
  });
});

const d = describe.skipIf(!RENDER_TEST);
const browserExecutable = process.env.REMOTION_BROWSER_EXECUTABLE ?? null;
let serveUrl = '';
let tmp = '';
beforeAll(async () => {
  if (!RENDER_TEST) return;
  tmp = mkdtempSync(path.join(tmpdir(), 'outro-fb-'));
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

/** Cột có điểm sáng hơn nền (chữ, nút, ảnh). */
function brightCols(p: Pixels): number[] {
  const limit = Math.max(...hex(THEME.panel)) + 24;
  const cols = new Set<number>();
  for (let y = 0; y < p.height; y++) {
    for (let x = 0; x < p.width; x++) {
      const i = (y * p.width + x) * 3;
      if (Math.max(p.data[i], p.data[i + 1], p.data[i + 2]) > limit) cols.add(x);
    }
  }
  return [...cols].sort((a, b) => a - b);
}

d('[32] đoạn kết Facebook render thật', () => {
  for (const [id, size] of [['OutroFacebookWide', OUTRO_SIZE.wide], ['OutroFacebookVertical', OUTRO_SIZE.vertical]] as const) {
    test(`${id}: đúng kích thước, có nút xanh Facebook, "Thích" tô xanh sau khi bấm`, async () => {
      const before = await still(id, FB_PRESS.like - 10);
      const after = await still(id, FB_OUTRO_FRAMES - 1);
      expect([after.width, after.height]).toEqual([size.w, size.h]);
      const blue = (p: Pixels) => findColor(p, hex(FB_BLUE)).length;
      expect(blue(before)).toBeGreaterThan(5000); // nút "Theo dõi" xanh
      expect(blue(after)).toBeGreaterThan(5000); // nút "Thích" đã tô xanh
    });
  }

  for (const frame of [FB_PRESS.like - 10, FB_PRESS.follow + 10, FB_OUTRO_FRAMES - 1]) {
    test(`OutroFacebookVertical frame ${frame}: mọi điểm sáng nằm trong x ${OUTRO_VERTICAL_COLUMN.x0}–${OUTRO_VERTICAL_COLUMN.x1}`, async () => {
      const cols = brightCols(await still('OutroFacebookVertical', frame));
      expect(cols.length).toBeGreaterThan(300);
      expect(cols[0]).toBeGreaterThanOrEqual(OUTRO_VERTICAL_COLUMN.x0);
      expect(cols[cols.length - 1]).toBeLessThanOrEqual(OUTRO_VERTICAL_COLUMN.x1);
    });
  }
});
