import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe, expect, test, vi} from 'vitest';
import {SHORT_SCENE, SHORT_SCENE_SCALE, SHORT_W} from '../src/Short';
import {BigNumber} from '../src/lib/scenes/big-number';
import {COLD_OPEN_SQUARE, ColdOpen} from '../src/lib/scenes/cold-open';
import {Compare} from '../src/lib/scenes/compare';
import {TermCard} from '../src/lib/scenes/term-card';
import {CHAR_EM, MIN_MARGIN} from '../src/lib/text';
import {SceneBox, THEMES, ThemeProvider} from '../src/lib/theme';

// Khung Short (9:16): bốn cảnh catalog đã sửa lề ở a416494 (term-card, cold-open, big-number, compare).
// Mọi hộp nền và mọi dòng chữ phải cách hai mép khung 1080 ít nhất 96 px (hộp cảnh 840 phóng lên 984 tại x 48).
// Chữ cold-open còn phải cách mép bảng nền ít nhất MIN_MARGIN (lề trong, sửa: textW = 752 - 2*MIN_MARGIN).
// SSR, không render ảnh: bề rộng chữ ước theo CHAR_EM như fitText khi không có DOM (cùng cách đo nên kiểm được khớp).

let FRAME = 0;
vi.mock('remotion', async (orig) => ({
  ...(await orig<typeof import('remotion')>()),
  useCurrentFrame: () => FRAME,
}));

const MARGIN = 96;
/** Mép trái, phải cho phép trong toạ độ cảnh vuông 840. */
const LO = (MARGIN - SHORT_SCENE.x0) / SHORT_SCENE_SCALE;
const HI = (SHORT_W - MARGIN - SHORT_SCENE.x0) / SHORT_SCENE_SCALE;
const EPS = 0.5;

function scene(type: string, props: Record<string, unknown>, nBeats: number): any {
  return {
    id: 's1', chapter: 'c1', type, props, startFrame: 0, durationFrames: 900,
    beats: [...Array(nBeats)].map((_, i) => ({id: `b${i}`, startFrame: i * 120, durationFrames: 110, text: 'x', cue: i === 0 ? 'hook' : undefined})),
  };
}

function markup(comp: any, sc: any): string {
  FRAME = 880; // cuối cảnh: mọi phần tử đã hiện
  const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  try {
    return renderToStaticMarkup(
      createElement(ThemeProvider as any, {theme: THEMES['mau-a']}, createElement(SceneBox as any, {layout: 'square'}, createElement(comp, {scene: sc}))),
    );
  } finally {
    spy.mockRestore();
  }
}

const num = (attrs: string, name: string): number | null => {
  const m = attrs.match(new RegExp(`\\s${name}="(-?[\\d.]+)"`));
  return m ? Number(m[1]) : null;
};

/** Các dòng chữ: [trái, phải] ước lượng theo neo chữ. */
function textSpans(html: string): {text: string; x0: number; x1: number}[] {
  const out: {text: string; x0: number; x1: number}[] = [];
  for (const m of html.matchAll(/<text([^>]*)>([^<]*)<\/text>/g)) {
    const attrs = m[1];
    const text = m[2].replace(/&amp;/g, '&').replace(/&#x27;/g, "'").replace(/&quot;/g, '"');
    if (text.trim() === '') continue;
    const x = num(attrs, 'x') ?? 0;
    const fs = num(attrs, 'font-size') ?? 0;
    const w = [...text].length * fs * CHAR_EM;
    const anchor = attrs.match(/text-anchor="(\w+)"/)?.[1] ?? 'start';
    const x0 = anchor === 'middle' ? x - w / 2 : anchor === 'end' ? x - w : x;
    out.push({text, x0, x1: x0 + w});
  }
  return out;
}

/** Hộp nền (rect), bỏ rect trong clipPath. */
function rects(html: string): {x0: number; x1: number}[] {
  const noClip = html.replace(/<clipPath[\s\S]*?<\/clipPath>/g, '');
  const out: {x0: number; x1: number}[] = [];
  for (const m of noClip.matchAll(/<rect([^>]*)\/?>/g)) {
    const x = num(m[1], 'x');
    const w = num(m[1], 'width');
    if (x === null || w === null) continue;
    out.push({x0: x, x1: x + w});
  }
  return out;
}

const LONG = 'Một câu dẫn khá dài để chữ phải xuống nhiều dòng trong khung vuông của Short';
const CASES: [string, any, any][] = [
  ['term-card', TermCard, scene('term-card', {term: 'Bộ giải nén Kraken', tag: 'Gắn trong chip của máy', definition: LONG + ' và còn dài thêm nữa', example: 'Ví dụ ngắn cũng có thể khá dài ra như thế này'}, 3)],
  ['cold-open', ColdOpen, scene('cold-open', {hook: LONG, kicker: 'Một dòng mở đầu ngắn gọn'}, 1)],
  ['big-number', BigNumber, scene('big-number', {value: 1795132800, from: 1795132800, suffix: ' giây', label: LONG, note: 'Ghi chú thêm một dòng dài để kiểm lề phải'}, 2)],
  ['compare', Compare, scene('compare', {titleA: 'Bên trái dài', titleB: 'Bên phải dài', rows: [{label: 'Chép trùng tới mức không vừa đĩa Blu-ray', a: true, b: false}, {label: 'Hàng hai', a: false, b: true}]}, 2)],
];

describe('khung Short: lề hai bên >= 96 px (a416494)', () => {
  test.each(CASES)('%s: mọi hộp nền và dòng chữ cách mép khung 1080 >= 96 px', (_n, comp, sc) => {
    const html = markup(comp, sc);
    const spans = textSpans(html);
    expect(spans.length).toBeGreaterThan(0);
    for (const s of spans) {
      expect(s.x0, `trái: ${s.text}`).toBeGreaterThanOrEqual(LO - EPS);
      expect(s.x1, `phải: ${s.text}`).toBeLessThanOrEqual(HI + EPS);
    }
    for (const r of rects(html)) {
      expect(r.x0).toBeGreaterThanOrEqual(LO - EPS);
      expect(r.x1).toBeLessThanOrEqual(HI + EPS);
    }
  });

  test('cold-open: bề rộng chữ = bảng nền trừ hai lề MIN_MARGIN (bảng 752, không phải 780)', () => {
    const G = COLD_OPEN_SQUARE;
    expect(G.textW).toBeLessThanOrEqual(G.panelW - 2 * MIN_MARGIN);
    expect(G.panelX).toBeGreaterThanOrEqual(LO - EPS);
    expect(G.panelX + G.panelW).toBeLessThanOrEqual(HI + EPS);
  });

  test('cold-open: chữ hook cách mép bảng nền ít nhất MIN_MARGIN', () => {
    const html = markup(ColdOpen, CASES[1][2]);
    const panel = rects(html).find((r) => r.x1 - r.x0 > 600)!;
    expect(panel).toBeDefined();
    const hook = textSpans(html).filter((s) => !s.text.startsWith('Một dòng mở đầu'));
    expect(hook.length).toBeGreaterThan(0);
    for (const s of hook) {
      expect(s.x0, s.text).toBeGreaterThanOrEqual(panel.x0 + MIN_MARGIN - EPS);
      expect(s.x1, s.text).toBeLessThanOrEqual(panel.x1 - MIN_MARGIN + EPS);
    }
  });
});
