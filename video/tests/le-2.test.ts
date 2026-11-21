import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe, expect, test, vi} from 'vitest';
import {lintEpisode, RECAP_MIN_TAIL_FRAMES, type LintScene} from '../scripts/lint-core';
import {CHAPTER_SIDE_MARGIN, CHAPTER_WIDTH_WITH_NUMBER, ChapterTitle} from '../src/lib/scenes/chapter-title';
import {Layers} from '../src/lib/scenes/layers';
import {THEMES, ThemeProvider} from '../src/lib/theme';

// QC tập ảnh mờ (MINOR, phần dùng chung): chữ thẻ chương sát mép phải, gói chạy của `layers` ở x 60,
// ý cuối của thẻ "Tóm lại" hiện quá ngắn trước đoạn kết. Khung ngang 1920: lề trái, phải >= 96 px.

let FRAME = 0;
vi.mock('remotion', async (orig) => ({
  ...(await orig<typeof import('remotion')>()),
  useCurrentFrame: () => FRAME,
}));

const html = (comp: any, scene: any, frame: number) => {
  FRAME = frame;
  return renderToStaticMarkup(createElement(ThemeProvider as any, {theme: THEMES['mau-a']}, createElement(comp, {scene})));
};
const num = (a: string, n: string) => Number(a.match(new RegExp(`\\s${n}="(-?[\\d.]+)"`))?.[1] ?? NaN);

describe('chapter-title khung ngang: chữ cách mép phải >= 96 px', () => {
  test('bề rộng chữ bên phải số = 1920 - 780 - 96', () => {
    expect(CHAPTER_SIDE_MARGIN).toBe(96);
    expect(780 + CHAPTER_WIDTH_WITH_NUMBER).toBeLessThanOrEqual(1920 - 96);
  });
});

describe('layers khung ngang: hộp tầng và gói chạy trong x 96..1824', () => {
  test('mọi rect nằm trong lề 96 px', () => {
    const scene = {
      id: 's', chapter: 'c', type: 'layers', startFrame: 0, durationFrames: 600,
      props: {layers: [{name: 'Một', detail: 'a'}, {name: 'Hai', detail: 'b'}, {name: 'Ba', detail: 'c'}], highlight: 1},
      beats: [{id: 'b1', startFrame: 0, durationFrames: 100, text: 'x'}],
    };
    for (const f of [60, 100, 140, 200]) {
      const out = html(Layers, scene, f);
      const rects = [...out.matchAll(/<rect([^>]*)\/?>/g)].map((m) => m[1]).filter((a) => !Number.isNaN(num(a, 'x')));
      expect(rects.length).toBeGreaterThan(3);
      for (const a of rects) {
        expect(num(a, 'x')).toBeGreaterThanOrEqual(96);
        expect(num(a, 'x') + num(a, 'width')).toBeLessThanOrEqual(1824);
      }
      for (const m of out.matchAll(/<polygon points="([^"]+)"/g)) {
        for (const p of m[1].trim().split(/\s+/)) expect(Number(p.split(',')[0])).toBeGreaterThanOrEqual(96);
      }
    }
  });

  test('thẻ chương render được (SSR)', () => {
    const out = html(ChapterTitle, {id: 'c', chapter: 'c', type: 'chapter-title', startFrame: 0, durationFrames: 45, props: {title: 'Một tiêu đề chương khá dài để xuống hai dòng', number: 3}, beats: []}, 40);
    expect(out).toContain('03');
  });
});

describe('lint recap-last-point', () => {
  const base = (scenes: LintScene[]) =>
    lintEpisode({slug: 'x', scenes, index: [], hasDurations: true}).filter((f) => f.rule === 'recap-last-point');
  const recap = (dur: number, beats: {offset: number}[]) => ({
    id: 'r', type: 'recap-outro', props: {points: ['a', 'b', 'c'], next: 'n'}, durationFrames: dur, beats,
  });
  test('1 beat ngắn: ý cuối hiện chưa tới 3 s là cảnh báo', () => {
    const f = base([recap(70, [{offset: 0}])]);
    expect(f).toHaveLength(1);
    expect(f[0].level).toBe('warn');
  });
  test('đủ dài: không cảnh báo', () => {
    expect(base([recap(20 + 14 + RECAP_MIN_TAIL_FRAMES + 1, [{offset: 0}])])).toHaveLength(0);
  });
  test('nhiều beat: ý cuối neo vào beat thứ 3', () => {
    expect(base([recap(400, [{offset: 0}, {offset: 100}, {offset: 300}])])).toHaveLength(1);
    expect(base([recap(500, [{offset: 0}, {offset: 100}, {offset: 300}])])).toHaveLength(0);
  });
  test('chưa có thời lượng thì bỏ qua', () => {
    expect(lintEpisode({slug: 'x', scenes: [recap(10, [{offset: 0}])], index: [], hasDurations: false}).filter((f) => f.rule === 'recap-last-point')).toHaveLength(0);
  });
});
