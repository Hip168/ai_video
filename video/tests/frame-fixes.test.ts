import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import {afterAll, describe, expect, test} from 'vitest';
import {monoStyle} from '../src/lib/b-kit';
import {FLOW_AREA, flowSizes, layoutFlow} from '../src/lib/layout-flow';
import {Subtitle, subtitleFontSize} from '../src/lib/subtitle';
import {THEMES} from '../src/lib/theme';
import {MIN_FONT_SCALE} from '../src/lib/text';
import {RENDER_TEST, decodePng, findColor, hex} from './helpers/render';
import {VIDEO_DIR} from './helpers/sample';

// [16] Sửa khung sau QC tập 2: phụ đề không cắt chữ, tắt ligature mã, flow to hơn.

const TOKEN = '0,1000000000000000055511151231257827021181583404541015625.';
const B041 = `Đúng bằng con số này: ${TOKEN}`;
const DIGITS60 = '1234567890'.repeat(6);
/** Bề rộng chữ trong hộp phụ đề: max-width 1500 trừ lề trong 2 x 28. */
const INNER = 1500 - 2 * 28;
/** Đo giả: chữ số rộng 0,6 em, ký tự khác 0,55 em (gần Be Vietnam Pro đậm). */
const measure = (t: string, size: number) =>
  [...t].reduce((s, c) => s + (/[0-9]/.test(c) ? 0.6 : 0.55), 0) * size;

describe('[16-1] phụ đề không cắt token dài', () => {
  test('câu thường giữ cỡ 52', () => {
    expect(subtitleFontSize('Tin nhắn đi qua mạng.', measure)).toBe(52);
  });
  test.each([
    ['b041', B041, TOKEN],
    ['token 60 chữ số', `Số này: ${DIGITS60}`, DIGITS60],
  ])('%s: giảm cỡ để token nằm trọn một dòng, không dưới 70%%', (_n, text, token) => {
    const size = subtitleFontSize(text, measure);
    expect(size).toBeLessThan(52);
    expect(size).toBeGreaterThanOrEqual(Math.floor(52 * MIN_FONT_SCALE));
    expect(measure(token, size)).toBeLessThanOrEqual(INNER);
  });
  test('chỉ một token 60 chữ số: ngắt giữa token thành tối đa 2 dòng', () => {
    const size = subtitleFontSize(DIGITS60, measure);
    expect(size).toBeGreaterThanOrEqual(Math.floor(52 * MIN_FONT_SCALE));
    expect(measure(DIGITS60, size)).toBeLessThanOrEqual(2 * INNER);
  });
  test('markup cho phép ngắt giữa từ (overflow-wrap:anywhere), cỡ đã giảm', () => {
    const out = renderToStaticMarkup(createElement(Subtitle, {text: `Số này: ${DIGITS60}`}));
    expect(out).toContain('overflow-wrap:anywhere');
    const px = Number(/font-size:(\d+)px/.exec(out)![1]);
    expect(px).toBeLessThan(52);
    expect(px).toBeGreaterThanOrEqual(36);
  });
});

describe('[16-2] chữ mã tắt ligature', () => {
  test('monoStyle: font-variant-ligatures none, liga 0, calt 0', () => {
    expect(monoStyle.fontVariantLigatures).toBe('none');
    expect(String(monoStyle.fontFeatureSettings)).toMatch(/"liga" 0/);
    expect(String(monoStyle.fontFeatureSettings)).toMatch(/"calt" 0/);
  });
});

describe('[16-3] flow ít nút phủ khung', () => {
  const chain = {
    nodes: [
      {id: 'a', label: 'Một bit'},
      {id: 'b', label: 'Một mức điện áp'},
      {id: 'c', label: 'Trên dây dẫn'},
    ],
    edges: [{from: 'a', to: 'b'}, {from: 'b', to: 'c'}],
    direction: 'LR',
  };
  const fan = {
    nodes: [
      {id: 'dt', label: 'Điện thoại'},
      {id: 'lap', label: 'Máy tính xách tay'},
      {id: 'chu', label: 'Máy chủ'},
      {id: 'kq', label: 'Cùng số 4 ở cuối'},
    ],
    edges: [{from: 'dt', to: 'kq'}, {from: 'lap', to: 'kq'}, {from: 'chu', to: 'kq'}],
    direction: 'LR',
  };
  test.each([['chuỗi 3 nút', chain], ['3 vào 1', fan]])(
    '%s: sơ đồ rộng quá nửa vùng, nút >= 380 px, chữ nút >= 40 px, vẫn trong vùng',
    (_n, p) => {
      const l = layoutFlow(p);
      const x0 = Math.min(...l.boxes.map((b) => b.x));
      const x1 = Math.max(...l.boxes.map((b) => b.x + b.w));
      expect(x1 - x0).toBeGreaterThan(FLOW_AREA.w / 2);
      expect(l.boxes[0].w).toBeGreaterThanOrEqual(380);
      expect(flowSizes(l.scale).nodeFont).toBeGreaterThanOrEqual(40);
      for (const b of l.boxes) {
        expect(b.x).toBeGreaterThanOrEqual(FLOW_AREA.x);
        expect(b.y).toBeGreaterThanOrEqual(FLOW_AREA.y);
        expect(b.x + b.w).toBeLessThanOrEqual(FLOW_AREA.x + FLOW_AREA.w);
        expect(b.y + b.h).toBeLessThanOrEqual(FLOW_AREA.y + FLOW_AREA.h);
      }
    },
  );
  test('nhãn cạnh lớn theo sơ đồ khi phóng to', () => {
    const z = flowSizes(layoutFlow(chain).scale);
    expect(z.lblFont).toBeGreaterThan(24);
  });
});

// Render thật: phụ đề b041 trên khung 1920x1080, chữ không chạm mép phải hộp (x 1710).
const d = describe.skipIf(!RENDER_TEST);
const browserExecutable = process.env.REMOTION_BROWSER_EXECUTABLE ?? null;
const scratch = mkdtempSync(path.join(tmpdir(), 'frame-fixes-'));
afterAll(() => rmSync(scratch, {recursive: true, force: true}));

function timeline(text: string): any {
  return {
    version: 2, fps: 30, width: 1920, height: 1080, durationInFrames: 90,
    theme: 'mau-a', audio: {src: 'narration.wav'},
    chapters: [{id: 'c1', title: 'Chương một', startFrame: 0}],
    sfx: [],
    scenes: [{
      id: 'sc01', chapter: 'c1', type: 'chapter-title',
      props: {title: 'Chương một', number: 1},
      startFrame: 0, durationFrames: 90,
      beats: [{id: 'b041', startFrame: 0, durationFrames: 90, text}],
    }],
  };
}

let serve: Promise<string> | undefined;
d('[16-1] render phụ đề token dài', () => {
  test.each([['b041', B041], ['token 60 chữ số', `Số này: ${DIGITS60}`]])(
    '%s: chữ nằm trong hộp, cách mép trái/phải hộp >= 20 px',
    async (key, text) => {
      serve ??= bundle({
        entryPoint: path.join(VIDEO_DIR, 'src', 'index.ts'),
        publicDir: path.join(VIDEO_DIR, 'public'),
      });
      const serveUrl = await serve;
      const inputProps = {timeline: timeline(text)};
      const composition = await selectComposition({serveUrl, id: 'Episode', inputProps, browserExecutable});
      const output = path.join(scratch, `${key}.png`);
      await renderStill({composition, serveUrl, frame: 45, output, inputProps, imageFormat: 'png', browserExecutable});
      const p = decodePng(output);
      const ink = findColor(p, hex(THEMES['mau-a'].fg), {y0: 830}, 40);
      expect(ink.length).toBeGreaterThan(500);
      const xs = ink.map(([x]) => x);
      expect(Math.min(...xs)).toBeGreaterThanOrEqual(210 + 20);
      expect(Math.max(...xs)).toBeLessThanOrEqual(1710 - 20);
    },
    300_000,
  );
});
