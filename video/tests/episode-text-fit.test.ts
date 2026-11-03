import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import {afterAll, beforeAll, describe, expect, test, vi} from 'vitest';
import {THEMES} from '../src/lib/theme';
import {
  MIN_FONT_SCALE,
  MIN_MARGIN,
  fitBlock,
  fitText,
  type MeasureWidth,
} from '../src/lib/text';
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
// Chạy với mọi theme: mỗi theme có hoạ tiết nền khác (lưới, chấm, chéo, vòng)
// và màu chữ khác, phép đo màu chữ không được báo giả với theme nào.
const THEME_IDS = ['mau-a', 'mau-b', 'mau-c', 'mau-d'] as const;
type ThemeId = (typeof THEME_IDS)[number];
const inkOf = (id: ThemeId) => {
  const t = THEMES[id];
  return [t.fg, t.muted, t.accent, t.accent2].map(hex);
};

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

function timeline(theme: ThemeId = 'mau-a'): any {
  return {
    version: 2, fps: 30, width: 1920, height: 1080,
    durationInFrames: SCENE * 6, theme,
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
function isInk(c: number[], ink: number[][]): boolean {
  return ink.some(
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
function edgeInk(p: Pixels, id: ThemeId): {left: number; right: number} {
  const ink = inkOf(id);
  let left = 0;
  let right = 0;
  for (let y = 0; y < MAIN_END; y++) {
    for (let x = 0; x < MARGIN; x++) if (isInk(px(p, x, y), ink)) left++;
    for (let x = p.width - MARGIN; x < p.width; x++) {
      if (isInk(px(p, x, y), ink)) right++;
    }
  }
  return {left, right};
}

/** Điểm màu chữ (fg hoặc accent) nằm ngoài bảng nền cold-open, y < 830. */
function inkOutsidePanel(p: Pixels, id: ThemeId): number {
  const close = (c: number[], k: number[]) =>
    Math.abs(c[0] - k[0]) <= 6 && Math.abs(c[1] - k[1]) <= 6 &&
    Math.abs(c[2] - k[2]) <= 6;
  const fg = hex(THEMES[id].fg);
  const ac = hex(THEMES[id].accent);
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
  if (!RENDER_TEST) return;
  serveUrl = await bundle({
    entryPoint: path.join(VIDEO_DIR, 'src', 'index.ts'),
    publicDir: path.join(VIDEO_DIR, 'public'),
  });
}, 300_000);

const cache = new Map<string, Pixels>();
async function still(id: ThemeId, frame: number): Promise<Pixels> {
  const key = `${id}:${frame}`;
  if (!cache.has(key)) {
    const composition = await selectComposition({
      serveUrl, id: 'Episode', inputProps: {timeline: timeline(id)},
      browserExecutable,
    });
    const output = path.join(scratch, `${id}-f${frame}.png`);
    await renderStill({
      composition, serveUrl, frame, output,
      imageFormat: 'png', browserExecutable,
    });
    cache.set(key, decodePng(output));
  }
  return cache.get(key)!;
}
const frameOf = (c: Case) => c.index * SCENE + OFFSET;

for (const id of THEME_IDS) {
d(`[6-1] chữ không tràn khung khi chuỗi dài đúng mức tối đa của spec (${id})`, () => {
  const BG = hex(THEMES[id].bg);
  test('mẫu dùng đúng độ dài tối đa của spec', () => {
    const t = timeline(id);
    expect([...t.scenes[0].props.hook]).toHaveLength(80);
    expect([...t.scenes[3].props.subtitle]).toHaveLength(80);
    expect([...t.scenes[5].props.points[0]]).toHaveLength(70);
  });

  test.each(CASES)(
    '$name: có chữ trong khung và dải y>=830 là nền phẳng',
    async (c) => {
      const p = await still(id, frameOf(c));
      expect(nonColorRatio(p, BG, 0, MAIN_END)).toBeGreaterThan(0.005);
      expect(nonColorRatio(p, BG, MAIN_END, 1080)).toBe(0);
    },
    180_000,
  );

  test.each(CASES)(
    '$name: không có chữ chạm lề 40px (x<40, x>=1880)',
    async (c) => {
      const e = edgeInk(await still(id, frameOf(c)), id);
      expect(e.left, 'mép trái').toBe(0);
      expect(e.right, 'mép phải').toBe(0);
    },
    180_000,
  );

  test.each(CASES.filter((c) => c.cold))(
    '$name: không có chữ ngoài bảng nền (x 140..1780)',
    async (c) => {
      expect(inkOutsidePanel(await still(id, frameOf(c)), id)).toBe(0);
    },
    180_000,
  );
});
}

// ---- Phần thuần (không cần trình duyệt): fitText / fitBlock với `measure` giả ----
// Độ rộng giả cố định: mỗi ký tự rộng `em` x cỡ chữ.
const fixed = (em: number): MeasureWidth => (t, size) =>
  [...t].length * size * em;
// Chữ hoa rộng (Ư, M, W, ...) 0,9 em, ký tự khác 0,5 em.
const WIDE = /[ƯỜMWẮỞỨỀ]/;
const uneven: MeasureWidth = (t, size) =>
  [...t].reduce((a, c) => a + size * (WIDE.test(c) ? 0.9 : 0.5), 0);

describe('[6-2] fitText / fitBlock (hàm thuần, measure giả)', () => {
  test('hằng số: lề 40px, cỡ chữ nhỏ nhất 70%', () => {
    expect(MIN_MARGIN).toBe(40);
    expect(MIN_FONT_SCALE).toBe(0.7);
  });

  test('chuỗi tiếng Việt thường ngắn giữ đúng cỡ gốc, 1 dòng, không cắt', () => {
    const r = fitBlock('Máy tính chỉ hiểu 0 và 1', {
      baseSize: 120, width: 1560, maxLines: 3, measure: fixed(0.5),
    });
    expect(r).toEqual({
      lines: ['Máy tính chỉ hiểu 0 và 1'], fontSize: 120, truncated: false,
    });
  });

  test('chuỗi dài vừa số dòng tối đa thì ngắt dòng, vẫn giữ cỡ gốc', () => {
    // 3 từ 10 ký tự; 2 từ ghép 21 ký tự x 50 = 1050 <= 1100: vừa 2 dòng
    const r = fitBlock('aaaaaaaaaa bbbbbbbbbb cccccccccc', {
      baseSize: 100, width: 1100, maxLines: 2, measure: fixed(0.5),
    });
    expect(r.fontSize).toBe(100);
    expect(r.truncated).toBe(false);
    expect(r.lines).toHaveLength(2);
    expect(r.lines.join(' ')).toBe('aaaaaaaaaa bbbbbbbbbb cccccccccc');
    expect(r.lines.length).toBeLessThanOrEqual(2);
    for (const l of r.lines) expect(fixed(0.5)(l, 100)).toBeLessThanOrEqual(1100);
  });

  test('một dòng quá rộng: giảm cỡ nhưng không dưới 70% cỡ gốc, không cắt', () => {
    // 20 ký tự x 0,6 em: vừa 1000px khi cỡ <= 83
    const text = 'abcdefghijklmnopqrst';
    const r = fitBlock(text, {
      baseSize: 100, width: 1000, maxLines: 1, measure: fixed(0.6),
    });
    expect(r.truncated).toBe(false);
    expect(r.fontSize).toBeLessThan(100);
    expect(r.fontSize).toBeGreaterThanOrEqual(70);
    expect(r.lines).toEqual([text]);
    expect(fixed(0.6)(text, r.fontSize)).toBeLessThanOrEqual(1000);
  });

  test('giảm cỡ từng bước 5% cỡ gốc, dừng ở bước đầu tiên vừa (không giảm dồn)', () => {
    // vừa khi cỡ <= 83,3: các bước 95, 90, 85 vẫn tràn, 80 là bước đầu vừa
    const r = fitBlock('abcdefghijklmnopqrst', {
      baseSize: 100, width: 1000, maxLines: 1, measure: fixed(0.6),
    });
    expect(r.fontSize).toBe(80);
  });

  test('chữ hoa rộng dài nhất: giảm cỡ, không dưới 70% cỡ gốc, vừa 3 dòng', () => {
    const text = [...Array(20)].map(() => 'ƯỜM').join(' ').slice(0, 79) + 'M';
    expect([...text]).toHaveLength(79 + 1);
    const r = fitBlock(text, {
      baseSize: 72, width: 1560, maxLines: 3, measure: uneven,
    });
    expect(r.truncated).toBe(false);
    expect(r.fontSize).toBeLessThan(72);
    expect(r.fontSize).toBeGreaterThanOrEqual(Math.floor(72 * 0.7));
    expect(r.lines.length).toBeLessThanOrEqual(3);
    for (const l of r.lines) {
      expect(uneven(l, r.fontSize)).toBeLessThanOrEqual(1560);
    }
  });

  test('quá dài so với số dòng tối đa: truncated, có "…", ở cỡ nhỏ nhất, cảnh báo text-fit', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const text = [...Array(12)].map(() => 'abcdefgh').join(' ');
      const r = fitBlock(text, {
        baseSize: 100, width: 1000, maxLines: 2, measure: fixed(0.6),
      });
      expect(r.truncated).toBe(true);
      expect(r.fontSize).toBe(70);
      expect(r.lines).toHaveLength(2);
      expect(r.lines[r.lines.length - 1].endsWith('…')).toBe(true);
      for (const l of r.lines) {
        expect(fixed(0.6)(l, r.fontSize)).toBeLessThanOrEqual(1000);
      }
      expect(warn).toHaveBeenCalled();
      expect(String(warn.mock.calls[0][0])).toContain('text-fit');
    } finally {
      warn.mockRestore();
    }
  });

  test('một từ dài hơn cả bề rộng ở cỡ nhỏ nhất: cắt "…", mọi dòng không vượt bề rộng', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const r = fitBlock('x'.repeat(60), {
        baseSize: 100, width: 1000, maxLines: 3, measure: fixed(0.6),
      });
      expect(r.truncated).toBe(true);
      expect(r.lines.some((l) => l.endsWith('…'))).toBe(true);
      for (const l of r.lines) expect(l.trim()).not.toBe('');
      expect(r.lines.length).toBeLessThanOrEqual(3);
      for (const l of r.lines) {
        expect(fixed(0.6)(l, r.fontSize)).toBeLessThanOrEqual(1000);
      }
    } finally {
      warn.mockRestore();
    }
  });

  test.each([1, 2, 3])(
    'số dòng không vượt maxLines=%i với chuỗi từ ngắn đến rất dài',
    (maxLines) => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      try {
        for (const n of [1, 5, 20, 60, 200]) {
          const text = [...Array(n)].map(() => 'tu').join(' ');
          const r = fitBlock(text, {
            baseSize: 60, width: 600, maxLines, measure: fixed(0.55),
          });
          expect(r.lines.length, `n=${n}`).toBeLessThanOrEqual(maxLines);
          expect(r.lines.length).toBeGreaterThanOrEqual(1);
          for (const l of r.lines) expect(l.trim(), `n=${n}`).not.toBe('');
          expect(r.fontSize).toBeLessThanOrEqual(60);
          expect(r.fontSize).toBeGreaterThanOrEqual(42);
        }
      } finally {
        warn.mockRestore();
      }
    },
  );

  test('minScale=1 không cho giảm cỡ: chuỗi quá rộng bị cắt ngay ở cỡ gốc', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const r = fitText({
        text: 'abcdefghijklmnopqrst', fontSize: 100, width: 1000,
        maxLines: 1, minScale: 1, measure: fixed(0.6),
      });
      expect(r.fontSize).toBe(100);
      expect(r.truncated).toBe(true);
      expect(r.lines[0].endsWith('…')).toBe(true);
    } finally {
      warn.mockRestore();
    }
  });

  test('fitBlock và fitText cho cùng kết quả', () => {
    const text = 'Máy tính lưu mọi thứ bằng bit và byte';
    const a = fitBlock(text, {
      baseSize: 48, width: 700, maxLines: 2, measure: fixed(0.5),
    });
    const b = fitText({
      text, fontSize: 48, width: 700, maxLines: 2, measure: fixed(0.5),
    });
    expect(a).toEqual(b);
  });

  test('chuỗi rỗng / chỉ khoảng trắng không ném lỗi, không báo cắt', () => {
    for (const t of ['', '   ']) {
      const r = fitBlock(t, {
        baseSize: 48, width: 700, maxLines: 2, measure: fixed(0.5),
      });
      expect(r.truncated).toBe(false);
      expect(r.fontSize).toBe(48);
      expect(r.lines.join('')).toBe('');
    }
  });
});
