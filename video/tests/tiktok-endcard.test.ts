import {createHash} from 'node:crypto';
import {mkdtempSync, readFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {afterAll, beforeAll, describe, expect, test} from 'vitest';
import CARD from '../../assets/brand/tiktok-endcard.json';
import {OUTRO_VERTICAL_COLUMN} from '../src/Outro';
import {TT_CARD_FRAMES, TT_CARD_LINES, TT_CARD_SIZE, TT_CARD_TEXT, TT_SAFE, TiktokEndCardView} from '../src/TiktokEndCard';
import {THEMES} from '../src/lib/theme';
import {RENDER_TEST, decodePng, hex, type Pixels} from './helpers/render';
import {VIDEO_DIR} from './helpers/sample';

// [33] Thẻ kết TikTok (D42): chỉ chữ "Xem full tại diu tiu bé @bitstory168". Phần render chỉ chạy khi RENDER_TEST=1.

const TEXT = 'Xem full tại diu tiu bé @bitstory168';
const THEME = THEMES[CARD.theme];
const sha = (rel: string) => createHash('sha256').update(readFileSync(path.join(VIDEO_DIR, rel))).digest('hex');

describe('[33] thẻ kết TikTok: chữ', () => {
  test('đúng nguyên văn, 2–3 giây, khung dọc 1080x1920', () => {
    expect(TT_CARD_TEXT).toBe(TEXT);
    expect(TT_CARD_LINES.join(' ')).toBe(TEXT);
    expect(TT_CARD_FRAMES).toBeGreaterThanOrEqual(60);
    expect(TT_CARD_FRAMES).toBeLessThanOrEqual(90);
    expect([TT_CARD_SIZE.w, TT_CARD_SIZE.h]).toEqual([1080, 1920]);
  });

  test('markup có đủ từng dòng theo thứ tự, không có chữ YouTube, không logo, không đỏ YouTube', () => {
    const html = renderToStaticMarkup(createElement(TiktokEndCardView, {frame: TT_CARD_FRAMES - 1, fps: 30}));
    const lines = [...html.matchAll(/data-line="\d+"[^>]*>([^<]*)</g)].map((m) => m[1]);
    expect(lines.join(' ')).toBe(TEXT);
    expect(html.toLowerCase()).not.toContain('youtube');
    expect(html).not.toMatch(/<svg|<img|data-icon/i);
    expect(html.toLowerCase()).not.toMatch(/#ff0000|#ff0033|rgb\(255, ?0, ?0\)/);
  });

  test('nguồn và cấu hình không nhắc YouTube, không có lời đọc', () => {
    const src = readFileSync(path.join(VIDEO_DIR, 'src/TiktokEndCard.tsx'), 'utf8');
    const cfg = readFileSync(path.join(VIDEO_DIR, '../assets/brand/tiktok-endcard.json'), 'utf8');
    expect((src + cfg).toLowerCase()).not.toContain('youtube');
    expect(Object.keys(CARD)).not.toContain('line');
    expect(Object.keys(CARD)).not.toContain('voice');
  });

  test('hộp chữ nằm trong vùng an toàn: cột x 48–888, tránh dải trên và dải đáy TikTok', () => {
    expect(TT_SAFE.x0).toBeGreaterThanOrEqual(OUTRO_VERTICAL_COLUMN.x0);
    expect(TT_SAFE.x1).toBeLessThanOrEqual(OUTRO_VERTICAL_COLUMN.x1);
    expect(TT_SAFE.y0).toBeGreaterThanOrEqual(200);
    expect(TT_SAFE.y1).toBeLessThanOrEqual(TT_CARD_SIZE.h - 480);
  });

  test('Root có composition TiktokEndCard; đoạn kết YouTube và Facebook không đổi', () => {
    const root = readFileSync(path.join(VIDEO_DIR, 'src/Root.tsx'), 'utf8');
    expect(root).toContain('id="TiktokEndCard"');
    expect(sha('src/Outro.tsx')).toBe('55b7abb66d116d6157cff44c01b497a26e0ac91fcb6ea930cd848c8f576dab18');
    expect(sha('src/OutroFacebook.tsx')).toBe('a82e918f6ec67710f6f6ad010e93572fe0401a1323d94078705c9cdfa6c9b963');
    expect(sha('../assets/brand/outro.json')).toBe('7a142aabfa3d6fd425fcad9b83d54a142415e8c11d3f448e7d0b876c15b9fbda');
    expect(sha('../assets/brand/outro-facebook.json')).toBe('7e61f8fadcfb190d1c7e04aaf12d7d75cb699cfd0f68ea1c7c48958dd26d93be');
  });
});

const d = describe.skipIf(!RENDER_TEST);
const browserExecutable = process.env.REMOTION_BROWSER_EXECUTABLE ?? null;
let serveUrl = '';
let tmp = '';
beforeAll(async () => {
  if (!RENDER_TEST) return;
  tmp = mkdtempSync(path.join(tmpdir(), 'tt-card-'));
  serveUrl = await bundle({entryPoint: path.join(VIDEO_DIR, 'src', 'index.ts')});
}, 180_000);
afterAll(() => {
  if (tmp) rmSync(tmp, {recursive: true, force: true});
});

async function still(frame: number): Promise<Pixels> {
  const id = 'TiktokEndCard';
  const composition = await selectComposition({serveUrl, id, inputProps: {}, browserExecutable});
  const output = path.join(tmp, `${id}-${frame}.png`);
  await renderStill({composition, serveUrl, frame, output, imageFormat: 'png', browserExecutable});
  return decodePng(output);
}

d('[33] thẻ kết TikTok render thật', () => {
  for (const frame of [12, TT_CARD_FRAMES - 1]) {
    test(`frame ${frame}: mọi điểm sáng (chữ) nằm trong hộp an toàn, không có điểm đỏ thuần`, async () => {
      const p = await still(frame);
      expect([p.width, p.height]).toEqual([1080, 1920]);
      const limit = Math.max(...hex(THEME.panel)) + 24;
      let n = 0;
      let red = 0;
      const box = {x0: p.width, x1: 0, y0: p.height, y1: 0};
      for (let y = 0; y < p.height; y++) {
        for (let x = 0; x < p.width; x++) {
          const i = (y * p.width + x) * 3;
          const [r, g, b] = [p.data[i], p.data[i + 1], p.data[i + 2]];
          if (r > 200 && g < 60 && b < 80) red++;
          if (Math.max(r, g, b) > limit) {
            n++;
            box.x0 = Math.min(box.x0, x);
            box.x1 = Math.max(box.x1, x);
            box.y0 = Math.min(box.y0, y);
            box.y1 = Math.max(box.y1, y);
          }
        }
      }
      expect(n).toBeGreaterThan(5000);
      expect(red).toBe(0);
      expect(box.x0).toBeGreaterThanOrEqual(TT_SAFE.x0);
      expect(box.x1).toBeLessThanOrEqual(TT_SAFE.x1);
      expect(box.y0).toBeGreaterThanOrEqual(TT_SAFE.y0);
      expect(box.y1).toBeLessThanOrEqual(TT_SAFE.y1);
    }, 120_000);
  }
});
