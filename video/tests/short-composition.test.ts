import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import {createElement, type FC} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {afterAll, beforeAll, describe, expect, test} from 'vitest';
import {TextBlock} from '../src/lib/b-kit';
import {T} from '../src/lib/scenes/a-common';
import {SceneBox, THEMES, useBox} from '../src/lib/theme';
import {
  RENDER_TEST,
  decodePng,
  diffRatio,
  findColor,
  hex,
  type Pixels,
} from './helpers/render';
import {VIDEO_DIR} from './helpers/sample';
import {loadSample2} from './helpers/sample2';

// [14-1] [14-2] Composition Short 1080x1920, hộp cảnh 840, vùng an toàn, ngưỡng
// chữ khung vuông. Giao diện: .team/features/14-shorts-giao-dien.md mục 1-4.
// Phần render chỉ chạy khi RENDER_TEST=1 (REMOTION_BROWSER_EXECUTABLE theo
// stack.md, D23).

const props = {x: 0, y: 0, width: 800, maxLines: 1, fill: '#fff'};
const html = (el: ReturnType<typeof createElement>) =>
  renderToStaticMarkup(createElement('svg', null, el));

function inBox(layout: 'wide' | 'square' | null, child: ReturnType<typeof createElement>) {
  return layout === null ? child : createElement(SceneBox, {layout}, child);
}

describe('[14-1] useBox và SceneBox', () => {
  const Probe: FC = () => {
    const b = useBox();
    return createElement('i', {'data-box': JSON.stringify(b)});
  };
  const read = (layout: 'wide' | 'square' | null) =>
    JSON.parse(
      /data-box="([^"]*)"/.exec(renderToStaticMarkup(inBox(layout, createElement(Probe))))![1].replaceAll('&quot;', '"'),
    );
  test('không bọc (Episode): wide 1920x830', () => {
    expect(read(null)).toEqual({w: 1920, h: 830, layout: 'wide'});
  });
  test('SceneBox wide: 1920x830', () => {
    expect(read('wide')).toEqual({w: 1920, h: 830, layout: 'wide'});
  });
  test('SceneBox square: hệ toạ độ 840x840', () => {
    expect(read('square')).toEqual({w: 840, h: 840, layout: 'square'});
  });
});

describe('[14-2] ngưỡng chữ ở khung vuông: 30 px (chữ thường)', () => {
  const t = (size: number, layout: 'wide' | 'square' | null, text = 'Xin chào') =>
    html(inBox(layout, createElement(T, {...props, text, size})));
  const tb = (size: number, layout: 'wide' | 'square' | null, text = 'Xin chào') =>
    html(inBox(layout, createElement(TextBlock, {...props, text, fontSize: size})));

  test('T: 29 px ném lỗi nêu cỡ chữ; 30 px thì không', () => {
    expect(() => t(29, 'square')).toThrow(/29/);
    expect(() => t(30, 'square')).not.toThrow();
    expect(t(30, 'square')).toContain('font-size="30"');
  });
  test('T: lỗi nêu chữ vi phạm', () => {
    expect(() => t(20, 'square', 'Nhãn nhỏ xíu')).toThrow(/Nhãn nhỏ xíu/);
  });
  test('TextBlock: 29 px ném lỗi; 30 px thì không', () => {
    expect(() => tb(29, 'square')).toThrow(/29/);
    expect(() => tb(30, 'square')).not.toThrow();
  });
  test('wide và không bọc: chữ 20 px vẫn vẽ bình thường (không đổi)', () => {
    for (const layout of ['wide', null] as const) {
      expect(() => t(20, layout)).not.toThrow();
      expect(() => tb(20, layout)).not.toThrow();
      expect(t(20, layout)).toContain('font-size="20"');
    }
  });
});

const d = describe.skipIf(!RENDER_TEST);
const browserExecutable = process.env.REMOTION_BROWSER_EXECUTABLE ?? null;
const THEME = THEMES['mau-a'];
const INK = [THEME.fg, THEME.accent, THEME.accent2, THEME.muted].map(hex);
const CLIP = {from: 'b001', to: 'b002', hook: 'Vì sao chỉ có 0 và 1?', part: 2, total: 6};
const FRAME = 60; // sau fade 8 frame, beat b001 (0..119) đang hiện

let serveUrl = '';
let tmp = '';
beforeAll(async () => {
  if (!RENDER_TEST) return;
  tmp = mkdtempSync(path.join(tmpdir(), 'short-'));
  serveUrl = await bundle({entryPoint: path.join(VIDEO_DIR, 'src', 'index.ts')});
}, 180_000);
afterAll(() => {
  if (tmp) rmSync(tmp, {recursive: true, force: true});
});

async function comp(id: string, inputProps: Record<string, unknown>) {
  return selectComposition({serveUrl, id, inputProps, browserExecutable});
}
async function still(clip: typeof CLIP, frame = FRAME): Promise<Pixels> {
  const composition = await comp('Short', {timeline: loadSample2(), clip, muted: true});
  const output = path.join(tmp, `s-${clip.part}-${clip.hook.length}-${frame}.png`);
  await renderStill({composition, serveUrl, frame, output, imageFormat: 'png', browserExecutable});
  return decodePng(output);
}
const count = (p: Pixels, box: {x0?: number; x1?: number; y0?: number; y1?: number}) =>
  INK.reduce((n, c) => n + findColor(p, c, box).length, 0);

d('[14-1] Short render thật', () => {
  test('metadata: 1080x1920, 30 fps, dài = cuối cảnh chứa `to` trừ đầu cảnh chứa `from`', async () => {
    const c = await comp('Short', {timeline: loadSample2(), clip: CLIP, muted: true});
    expect([c.width, c.height, c.fps]).toEqual([1080, 1920, 30]);
    expect(c.durationInFrames).toBe(300);
  }, 120_000);

  test('Episode vẫn 1920x1080 (layout wide không đổi)', async () => {
    const c = await comp('Episode', {timeline: loadSample2(), muted: true});
    expect([c.width, c.height]).toEqual([1920, 1080]);
  }, 120_000);

  test('mọi chữ nằm trong x 48..888 và y 150..1248; có chữ ở hook, hộp cảnh và phụ đề', async () => {
    const p = await still(CLIP);
    expect([p.width, p.height]).toEqual([1080, 1920]);
    expect(count(p, {x1: 48})).toBe(0);
    expect(count(p, {x0: 888})).toBe(0);
    expect(count(p, {y1: 150})).toBe(0);
    expect(count(p, {y0: 1248})).toBe(0);
    expect(count(p, {x0: 48, x1: 888, y0: 150, y1: 280})).toBeGreaterThan(200);
    expect(count(p, {x0: 48, x1: 888, y0: 288, y1: 1128})).toBeGreaterThan(200);
    expect(count(p, {x0: 48, x1: 888, y0: 1128, y1: 1248})).toBeGreaterThan(200);
  }, 180_000);

  test('"Phần k/N" đổi theo part/total và chỉ ở dải hook; phần còn lại giống hệt', async () => {
    const a = await still(CLIP);
    const b = await still({...CLIP, part: 5});
    expect(diffRatio(a, b, 150, 290)).toBeGreaterThan(0);
    expect(diffRatio(a, b, 290, 1920)).toBe(0);
    expect(diffRatio(a, b, 0, 150)).toBe(0);
  }, 180_000);

  test('hook đổi chữ thì chỉ dải hook đổi', async () => {
    const a = await still(CLIP);
    const b = await still({...CLIP, hook: 'Một câu khác hẳn'});
    expect(diffRatio(a, b, 150, 290)).toBeGreaterThan(0);
    expect(diffRatio(a, b, 290, 1920)).toBe(0);
  }, 180_000);
});
