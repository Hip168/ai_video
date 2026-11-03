import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import {afterAll, beforeAll, describe, expect, test} from 'vitest';
import {THEMES} from '../src/lib/theme';
import {
  RENDER_TEST,
  decodePng,
  hex,
  nonColorRatio,
  px,
  type Pixels,
} from './helpers/render';
import {VIDEO_DIR} from './helpers/sample';

// Chữ không được tràn khỏi khung / bảng nền / lề 40px khi chuỗi dài đúng mức tối đa
// của spec, dùng chữ rộng (Ư, M, W có dấu). Chỉ chạy khi RENDER_TEST=1, với
// REMOTION_BROWSER_EXECUTABLE=$HOME/.cache/aivideo/chrome-headless-shell/
// chrome-headless-shell (D23, .team/stack.md).
const d = describe.skipIf(!RENDER_TEST);
const browserExecutable = process.env.REMOTION_BROWSER_EXECUTABLE ?? null;
const MAIN_END = 830;
const MARGIN = 40; // lề tối thiểu: chữ không được chạm x < 40 hoặc x >= 1880
const PANEL_X0 = 140; // cold-open: bảng nền x 140..1780 (rộng 1640)
const PANEL_X1 = 1780;
const THEME = THEMES['mau-a'];
const BG = hex(THEME.bg);
const INK = [THEME.fg, THEME.muted, THEME.accent, THEME.accent2].map(hex);

/** Chuỗi đúng n ký tự, toàn chữ hoa rộng có dấu, có khoảng trắng để ngắt dòng. */
function wide(n: number): string {
  const words = ['ƯỜM', 'WẮM', 'MỞW', 'ỨMW', 'WỀM'];
  let s = '';
  for (let i = 0; s.length < n; i++) s += (i ? ' ' : '') + words[i % 5];
  s = [...s].slice(0, n).join('');
  if (s.endsWith(' ')) s = s.slice(0, -1) + 'M';
  expect([...s].length).toBe(n);
  return s;
}

const SCENE = 120;
const OFFSET = 100; // frame trong cảnh: mọi hiệu ứng vào đã xong
type Case = {name: string; index: number; cold?: boolean};
const CASES: Case[] = [
  {name: 'cold-open hook 80 ký tự (cỡ 72)', index: 0, cold: true},
  {name: 'cold-open hook 48 ký tự (cỡ 92)', index: 1, cold: true},
  {name: 'cold-open hook 24 ký tự (cỡ 120)', index: 2, cold: true},
  {name: 'chapter-title có số, phụ đề 80 ký tự', index: 3},
  {name: 'chapter-title không số, phụ đề 80 ký tự', index: 4},
  {name: 'recap-outro 5 điểm 70 ký tự, next 80 ký tự', index: 5},
];

function scene(i: number, type: string, props: any, beats: any[]): any {
  return {
    id: `sc0${i + 1}`, chapter: 'c1', type, props,
    startFrame: i * SCENE, durationFrames: SCENE, beats,
  };
}
const beat = (i: number, cue?: string): any => ({
  id: `b00${i + 1}`, startFrame: i * SCENE, durationFrames: 60,
  text: 'Câu ngắn.', ...(cue ? {cue} : {}),
});

function timeline(): any {
  return {
    version: 2, fps: 30, width: 1920, height: 1080,
    durationInFrames: SCENE * 6, theme: 'mau-a',
    audio: {src: 'narration.wav'},
    chapters: [{id: 'c1', title: 'Chương một', startFrame: 0}],
    sfx: [],
    scenes: [
      scene(0, 'cold-open', {hook: wide(80), kicker: wide(40)}, [beat(0, 'hook')]),
      scene(1, 'cold-open', {hook: wide(48)}, [beat(1, 'hook')]),
      scene(2, 'cold-open', {hook: wide(24)}, [beat(2, 'hook')]),
      scene(3, 'chapter-title',
        {title: 'Chương một', number: 99, subtitle: wide(80)}, []),
      scene(4, 'chapter-title', {title: 'Chương một', subtitle: wide(80)}, []),
      scene(5, 'recap-outro',
        {points: [0, 1, 2, 3, 4].map(() => wide(70)), next: wide(80)},
        [beat(5)]),
    ],
  };
}

/** Điểm ảnh có màu chữ của theme (sai số mỗi kênh <= 6). */
function isInk(c: number[]): boolean {
  return INK.some(
    (k) =>
      Math.abs(c[0] - k[0]) <= 6 && Math.abs(c[1] - k[1]) <= 6 &&
      Math.abs(c[2] - k[2]) <= 6,
  );
}

/**
 * Số điểm chữ trong hai dải lề trái x < MARGIN và phải x >= 1920 - MARGIN,
 * y < 830. Chỉ đếm đúng màu chữ (fg, muted, accent, accent2) nên không tính
 * lưới nền mờ, vòng xung (đã pha mờ) hay các hình khác sát mép.
 */
function edgeInk(p: Pixels): {left: number; right: number} {
  let left = 0;
  let right = 0;
  for (let y = 0; y < MAIN_END; y++) {
    for (let x = 0; x < MARGIN; x++) if (isInk(px(p, x, y))) left++;
    for (let x = p.width - MARGIN; x < p.width; x++) {
      if (isInk(px(p, x, y))) right++;
    }
  }
  return {left, right};
}

/** Điểm màu chữ (fg hoặc accent) nằm ngoài bảng nền cold-open, y < 830. */
function inkOutsidePanel(p: Pixels): number {
  const close = (c: number[], k: number[]) =>
    Math.abs(c[0] - k[0]) <= 6 && Math.abs(c[1] - k[1]) <= 6 &&
    Math.abs(c[2] - k[2]) <= 6;
  const fg = hex(THEME.fg);
  const ac = hex(THEME.accent);
  let n = 0;
  for (let y = 0; y < MAIN_END; y++) {
    for (let x = 0; x < p.width; x++) {
      if (x >= PANEL_X0 && x < PANEL_X1) continue;
      const c = px(p, x, y);
      if (close(c, fg) || close(c, ac)) n++;
    }
  }
  return n;
}

const scratch = mkdtempSync(path.join(tmpdir(), 'ep-textfit-'));
afterAll(() => rmSync(scratch, {recursive: true, force: true}));

let serveUrl = '';
beforeAll(async () => {
  serveUrl = await bundle({
    entryPoint: path.join(VIDEO_DIR, 'src', 'index.ts'),
    publicDir: path.join(VIDEO_DIR, 'public'),
  });
}, 300_000);

const cache = new Map<number, Pixels>();
async function still(frame: number): Promise<Pixels> {
  if (!cache.has(frame)) {
    const composition = await selectComposition({
      serveUrl, id: 'Episode', inputProps: {timeline: timeline()},
      browserExecutable,
    });
    const output = path.join(scratch, `f${frame}.png`);
    await renderStill({
      composition, serveUrl, frame, output,
      imageFormat: 'png', browserExecutable,
    });
    cache.set(frame, decodePng(output));
  }
  return cache.get(frame)!;
}
const frameOf = (c: Case) => c.index * SCENE + OFFSET;

d('[6-1] chữ không tràn khung khi chuỗi dài đúng mức tối đa của spec', () => {
  test('mẫu dùng đúng độ dài tối đa của spec', () => {
    const t = timeline();
    expect([...t.scenes[0].props.hook]).toHaveLength(80);
    expect([...t.scenes[3].props.subtitle]).toHaveLength(80);
    expect([...t.scenes[5].props.points[0]]).toHaveLength(70);
  });

  test.each(CASES)(
    '$name: có chữ trong khung và dải y>=830 là nền phẳng',
    async (c) => {
      const p = await still(frameOf(c));
      expect(nonColorRatio(p, BG, 0, MAIN_END)).toBeGreaterThan(0.005);
      expect(nonColorRatio(p, BG, MAIN_END, 1080)).toBe(0);
    },
    180_000,
  );

  test.each(CASES)(
    '$name: không có chữ chạm lề 40px (x<40, x>=1880)',
    async (c) => {
      const e = edgeInk(await still(frameOf(c)));
      expect(e.left, 'mép trái').toBe(0);
      expect(e.right, 'mép phải').toBe(0);
    },
    180_000,
  );

  test.each(CASES.filter((c) => c.cold))(
    '$name: không có chữ ngoài bảng nền (x 140..1780)',
    async (c) => {
      expect(inkOutsidePanel(await still(frameOf(c)))).toBe(0);
    },
    180_000,
  );
});
