import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import {afterAll, beforeAll, describe, expect, test, vi} from 'vitest';
import {Bits} from '../src/lib/scenes/bits';
import {CATALOG} from '../src/lib/registry';
import {THEMES, ThemeProvider} from '../src/lib/theme';
import {validateProps} from '../src/lib/propsSpec';
import {
  RENDER_TEST,
  decodePng,
  findColor,
  hex,
  nonColorRatio,
  px,
  type Pixels,
} from './helpers/render';
import {VIDEO_DIR} from './helpers/sample';
import {BEAT_GAP, buildTimeline, specB, wide} from './helpers/scenes-b';

// Hai hành vi mới sau sửa review (đề mục 8): bits (`width` là số bit TỐI THIỂU)
// và scale-ladder (chữ giá trị không mất, không tràn trái thanh).
// Phần SSR: giả lập frame bằng cách thay `useCurrentFrame`. Phần render: chỉ chạy
// khi RENDER_TEST=1 (REMOTION_BROWSER_EXECUTABLE, D23). Chrome vẽ chữ không tất
// định (.team/stack.md) nên mọi phép so ảnh là so VI SAI giữa hai ảnh chỉ khác
// đúng một chuỗi, đếm điểm khác có dung sai màu 40, không so cả khung.
let FRAME = 0;
vi.mock('remotion', async (orig) => ({
  ...(await orig<typeof import('remotion')>()),
  useCurrentFrame: () => FRAME,
}));

function bitsTokens(props: Record<string, unknown>, warn?: string[]): string[] {
  FRAME = 5000;
  const scene: any = {
    id: 's1', chapter: 'c1', type: 'bits', props, startFrame: 0,
    durationFrames: 6000,
    beats: [0, 1, 2, 3].map((i) => ({
      id: `b00${i + 1}`, startFrame: 30 + i * 100, durationFrames: 60, text: 'x',
    })),
  };
  const spy = vi.spyOn(console, 'warn').mockImplementation((m) => {
    warn?.push(String(m));
  });
  try {
    const html = renderToStaticMarkup(
      createElement(
        ThemeProvider as any,
        {theme: THEMES['mau-a']},
        createElement(Bits, {scene}),
      ),
    );
    return html.split(/<[^>]+>/).map((t) => t.trim()).filter(Boolean);
  } finally {
    spy.mockRestore();
  }
}

/** Tokens có chứa các lũy thừa 2 từ 2^(w-1) xuống 1 theo đúng thứ tự (w ô). */
function hasWeights(tokens: string[], w: number): boolean {
  const want = [...Array(w)].map((_, i) => String(2 ** (w - 1 - i)));
  let j = 0;
  for (const t of tokens) if (j < want.length && t === want[j]) j++;
  return j === want.length;
}

describe('[8-7] bits: `width` là số bit tối thiểu (SSR)', () => {
  test('value=300 không có width: hiện 9 bit (256..1), công thức 256 + 32 + 8 + 4, tổng = 300', () => {
    const t = bitsTokens({value: 300});
    expect(hasWeights(t, 9)).toBe(true);
    expect(t).not.toContain('512');
    expect(t).toContain('256 + 32 + 8 + 4');
    expect(t[t.length - 1]).toBe('= 300');
  });

  test('value=300 width=8: vẫn 9 bit và tổng 300 (width chỉ là tối thiểu, không kẹp số)', () => {
    const t = bitsTokens({value: 300, width: 8});
    expect(hasWeights(t, 9)).toBe(true);
    expect(t[t.length - 1]).toBe('= 300');
  });

  test('width=4, value=65535: hiện 16 bit (32768..1), tổng = 65535', () => {
    const t = bitsTokens({value: 65535, width: 4});
    expect(hasWeights(t, 16)).toBe(true);
    expect(t).not.toContain('65536');
    expect(t[t.length - 1]).toBe('= 65535');
  });

  test('value=0: không lỗi, mặc định 8 ô, tổng = 0', () => {
    const t = bitsTokens({value: 0});
    expect(hasWeights(t, 8)).toBe(true);
    expect(t[t.length - 1]).toBe('= 0');
  });

  test('value=0, width=4: 4 ô (128 không có), tổng = 0', () => {
    const t = bitsTokens({value: 0, width: 4});
    expect(hasWeights(t, 4)).toBe(true);
    expect(t).not.toContain('16');
    expect(t[t.length - 1]).toBe('= 0');
  });

  test('value=5, width=12: đủ 12 ô (2048..1) dù value chỉ cần 3 bit, tổng = 5', () => {
    const t = bitsTokens({value: 5, width: 12});
    expect(hasWeights(t, 12)).toBe(true);
    expect(t).not.toContain('4096');
    expect(t[t.length - 1]).toBe('= 5');
  });

  test.each([
    [{value: 65535, width: 16}, 65535],
    [{value: 2730, width: 12}, 2730],
    [{value: 1, width: 4}, 1],
  ])('%j: công thức không bị cắt, không có cảnh báo text-fit', (props, sum) => {
    const warn: string[] = [];
    const t = bitsTokens(props, warn);
    expect(warn.filter((w) => w.includes('text-fit'))).toEqual([]);
    expect(t.some((x) => x.includes('…'))).toBe(false);
    expect(t[t.length - 1]).toBe(`= ${sum}`);
  });

  test('ví dụ và các props trên qua validateProps; width là số nguyên 4..16', () => {
    const s = specB('bits');
    for (const p of [{value: 300}, {value: 0}, {value: 65535, width: 4}]) {
      expect(validateProps(s.propsSpec, p)).toEqual([]);
    }
    expect(validateProps(s.propsSpec, {value: 5, width: 3}).length).toBeGreaterThan(0);
    expect(validateProps(s.propsSpec, {value: 5, width: 17}).length).toBeGreaterThan(0);
  });
});

// ---------------- render ----------------
const d = describe.skipIf(!RENDER_TEST);
const browserExecutable = process.env.REMOTION_BROWSER_EXECUTABLE ?? null;
const MAIN_END = 830;
const MARGIN = 40;
const scratch = mkdtempSync(path.join(tmpdir(), 'scenes-b-fix-'));
afterAll(() => rmSync(scratch, {recursive: true, force: true}));

let serveUrl = '';
beforeAll(async () => {
  if (!RENDER_TEST) return;
  serveUrl = await bundle({
    entryPoint: path.join(VIDEO_DIR, 'src', 'index.ts'),
    publicDir: path.join(VIDEO_DIR, 'public'),
  });
}, 300_000);

let seq = 0;
async function shoot(
  timeline: any,
  frame: number,
  logs: string[] = [],
): Promise<Pixels> {
  const composition = await selectComposition({
    serveUrl, id: 'Episode', inputProps: {timeline}, browserExecutable,
  });
  const output = path.join(scratch, `f${seq++}.png`);
  await renderStill({
    composition, serveUrl, frame, output, imageFormat: 'png',
    browserExecutable,
    onBrowserLog: (l) => logs.push(`${l.type}: ${l.text}`),
  });
  return decodePng(output);
}

type Diff = {count: number; minX: number; maxX: number; minY: number; maxY: number};
/** Điểm khác nhau (chênh > tol ở bất kỳ kênh nào) trong y<830 và hộp bao của chúng. */
function diffBox(a: Pixels, b: Pixels, tol = 40, x0 = 0): Diff {
  const r: Diff = {count: 0, minX: 1e9, maxX: -1, minY: 1e9, maxY: -1};
  for (let y = 0; y < MAIN_END; y++) {
    for (let x = x0; x < a.width; x++) {
      const p = px(a, x, y);
      const q = px(b, x, y);
      if (
        Math.abs(p[0] - q[0]) > tol || Math.abs(p[1] - q[1]) > tol ||
        Math.abs(p[2] - q[2]) > tol
      ) {
        r.count++;
        r.minX = Math.min(r.minX, x);
        r.maxX = Math.max(r.maxX, x);
        r.minY = Math.min(r.minY, y);
        r.maxY = Math.max(r.maxY, y);
      }
    }
  }
  return r;
}

/** Số ô trên một đường ngang: các đoạn màu panel/accent/muted/accent2 dài >= 15 px. */
function cellsAcross(p: Pixels, y: number): number {
  const t = THEMES['mau-a'];
  const cols = [t.panel, t.accent, t.muted, t.accent2].map(hex);
  const is = (x: number) => {
    const c = px(p, x, y);
    return cols.some((k) => c.every((v, i) => Math.abs(v - k[i]) <= 6));
  };
  let runs = 0;
  let len = 0;
  let gap = 0;
  for (let x = 0; x < p.width; x++) {
    if (is(x)) {
      len++;
      gap = 0;
    } else if (len > 0 && ++gap > 2) {
      if (len >= 15) runs++;
      len = 0;
      gap = 0;
    }
  }
  return runs + (len >= 15 ? 1 : 0);
}

function edgeInk(p: Pixels): number {
  const t = THEMES['mau-a'];
  const ink = [t.fg, t.muted, t.accent, t.accent2].map(hex);
  const isInk = (c: number[]) =>
    ink.some((k) => c.every((v, i) => Math.abs(v - k[i]) <= 6));
  let n = 0;
  for (let y = 0; y < MAIN_END; y++) {
    for (let x = 0; x < MARGIN; x++) if (isInk(px(p, x, y))) n++;
    for (let x = p.width - MARGIN; x < p.width; x++) if (isInk(px(p, x, y))) n++;
  }
  return n;
}

d('[8-7] bits: width tối thiểu, khung hình thật', () => {
  const s = () => specB('bits');
  const BG = hex(THEMES['mau-a'].bg);
  test.each([
    [{value: 2730, width: 12}, 12],
    [{value: 65535, width: 16}, 16],
    [{value: 300}, 9],
    [{value: 65535, width: 4}, 16],
  ])('%j: %i ô, nằm trong y<830, trong lề 40px, không cắt "…"', async (props, cells) => {
    const b = buildTimeline('bits', s(), props, 'mau-a', 0, {n: 4});
    const logs: string[] = [];
    const p = await shoot(b.timeline, b.endFrame, logs);
    expect(nonColorRatio(p, BG, 0, MAIN_END)).toBeGreaterThan(0.01);
    expect(nonColorRatio(p, BG, MAIN_END, 1080)).toBe(0);
    expect(edgeInk(p)).toBe(0);
    expect(logs.filter((l) => l.includes('text-fit'))).toEqual([]);
    // đường quét nằm ở 20% chiều cao ô: trên chữ số, dưới góc bo
    const cell = Math.min(150, Math.floor(1720 / cells) - 12);
    expect(cellsAcross(p, 300 + Math.round(cell * 0.2))).toBe(cells);
  }, 240_000);
});

d('[8-3] scale-ladder: chữ giá trị không mất, không tràn trái thanh', () => {
  const s = () => specB('scale-ladder');
  const powers = [0, 3, 6, 9, 12, 15];
  const props = (n: number, first: string): Record<string, unknown> => ({
    rungs: [...Array(n)].map((_, i) => ({
      label: `Bậc ${i + 1}`,
      value: i === 0 ? first : wide(16),
      power: powers[Math.floor((i * (powers.length - 1)) / (n - 1))],
    })),
  });
  const timeline = (n: number, first: string) =>
    buildTimeline('scale-ladder', s(), props(n, first), 'mau-a', 0, {n});

  test('mọi value dài 16 ký tự hợp lệ theo spec', () => {
    for (const n of [3, 5, 6]) {
      expect(validateProps(s().propsSpec, props(n, wide(16)))).toEqual([]);
    }
    expect(CATALOG['scale-ladder'].spec).toBe(s());
  });

  test.each([3, 5, 6])(
    '%i bậc, frame cuối: chữ giá trị của bậc thấp nhất có điểm ảnh (không bị mất)',
    async (n) => {
      const a = timeline(n, wide(16));
      const b = timeline(n, '.');
      const pa = await shoot(a.timeline, a.endFrame);
      const pb = await shoot(b.timeline, b.endFrame);
      const df = diffBox(pa, pb);
      // 16 chữ rộng cỡ ~34 px có hàng nghìn điểm; một dấu chấm chỉ vài chục
      expect(df.count).toBeGreaterThan(1500);
      expect(df.maxX - df.minX).toBeGreaterThan(150);
    },
    240_000,
  );

  test('5 bậc: khi thanh đang dài ra, chữ giá trị không nằm bên trái mép trái thanh', async () => {
    const n = 5;
    const theme = THEMES['mau-a'];
    for (let k = 0; k < n; k++) {
      const make = (v: string) =>
        buildTimeline(
          'scale-ladder', s(),
          {
            rungs: (props(n, wide(16)).rungs as any[]).map((r, i) =>
              i === k ? {...r, value: v} : r,
            ),
          },
          'mau-a', 0, {n},
        );
      for (const off of [8, 12, 16]) {
        const f = 30 + k * BEAT_GAP + off;
        const pa = await shoot(make(wide(16)).timeline, f);
        const pb = await shoot(make('.').timeline, f);
        const df = diffBox(pa, pb);
        if (df.count < 50) continue; // chữ chưa hiện thì không thể tràn
        // mép trái thanh: điểm màu accent (viền thanh) trái nhất trong các hàng của chữ
        const bar = findColor(
          pb, hex(theme.accent),
          {y0: df.minY, y1: df.maxY + 1}, 6,
        );
        expect(bar.length, `bậc ${k} frame ${f}: không thấy viền thanh`).toBeGreaterThan(0);
        const left = Math.min(...bar.map(([x]) => x));
        expect(df.minX, `bậc ${k} frame ${f}: chữ lấn trái thanh`).toBeGreaterThanOrEqual(left - 2);
      }
    }
  }, 600_000);

  test('3 bậc power 0, 1, 9 (bậc giữa wFinal ~469 px): mép trái chữ giá trị không nhảy giữa hai frame liền nhau', async () => {
    const rungs = [0, 1, 9].map((power, i) => ({
      label: `Bậc ${i + 1}`, value: wide(16), power,
    }));
    const make = (v: string) =>
      buildTimeline(
        'scale-ladder', s(),
        {rungs: rungs.map((r, i) => (i === 1 ? {...r, value: v} : r))},
        'mau-a', 0, {n: 3},
      );
    const withText = make(wide(16));
    const without = make('.');
    const start = 30 + BEAT_GAP; // bậc giữa vào ở beat 1
    let prev: number | null = null;
    let seen = 0;
    const lefts: number[] = [];
    // Nhảy lỗi là ~370 px trong 1 frame; thanh dài ra hợp lệ trượt tối đa vài chục px mỗi frame
    // Dung sai màu 12 (chữ đang mờ dần vẫn thấy), chỉ xét x >= 540 (vùng thanh,
    // bỏ nhãn bên trái); từng frame một để không lọt cú nhảy 1 frame.
    for (let off = 2; off <= 28; off++) {
      const f = start + off;
      const df = diffBox(
        await shoot(withText.timeline, f),
        await shoot(without.timeline, f),
        12, 540,
      );
      if (df.count < 50) {
        prev = null; // chữ chưa hiện
        continue;
      }
      seen++;
      lefts.push(df.minX);
      if (prev !== null) {
        expect(
          Math.abs(df.minX - prev),
          `frame ${f}: mép trái chữ ${prev} -> ${df.minX} (${lefts.join(', ')})`,
        ).toBeLessThanOrEqual(150);
      }
      prev = df.minX;
    }
    expect(seen, lefts.join(',')).toBeGreaterThanOrEqual(3); // chữ phải hiện trong khoảng khảo sát
  }, 900_000);
});
