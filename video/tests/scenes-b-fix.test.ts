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
    expect(t).not.toContain('256');
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

// ---------------- scale-ladder ----------------
const BAR_POWERS = [0, 1, 9]; // 3 bậc: bậc 0 chữ ngoài thanh, bậc 1 và 2 chữ trong thanh
const ladder = (n: number): Record<string, unknown> => {
  const pw = [0, 3, 6, 9, 12, 15];
  return {
    rungs: [...Array(n)].map((_, i) => ({
      label: `Bậc ${i + 1}`,
      value: wide(16),
      power: n === 3 ? BAR_POWERS[i] : pw[Math.floor((i * (pw.length - 1)) / (n - 1))],
    })),
  };
};
const withValue = (props: Record<string, unknown>, k: number, v: string) => ({
  rungs: (props.rungs as any[]).map((r, i) => (i === k ? {...r, value: v} : r)),
});
const PRESENT = 500; // chữ 16 ký tự rộng cho >= 4000 điểm khác; dấu chấm đối chứng chỉ ~40

describe('[8-3] scale-ladder: props 16 ký tự hợp lệ theo spec', () => {
  test('mọi value dài 16 ký tự, 3, 5, 6 bậc, qua validateProps', () => {
    const sp = specB('scale-ladder');
    for (const n of [3, 5, 6]) {
      expect(validateProps(sp.propsSpec, ladder(n))).toEqual([]);
    }
    expect(CATALOG['scale-ladder'].spec).toBe(sp);
  });
});

type Probe = {
  count: number;
  cols: Int32Array; // số điểm khác theo cột x
  minY: number;
  maxY: number;
  left: number; // mép trái viền thanh (màu accent) trong các hàng của chữ, -1 nếu không thấy
  right: number; // mép phải viền thanh
};
const minXFrom = (p: Probe, x0: number): number => {
  for (let x = x0; x < p.cols.length; x++) if (p.cols[x] > 0) return x;
  return -1;
};
const maxXOf = (p: Probe): number => {
  for (let x = p.cols.length - 1; x >= 0; x--) if (p.cols[x] > 0) return x;
  return -1;
};
const countFrom = (p: Probe, x0: number): number => {
  let c = 0;
  for (let x = x0; x < p.cols.length; x++) c += p.cols[x];
  return c;
};

d('[8-3] scale-ladder: chữ giá trị (khung hình thật)', () => {
  const s = () => specB('scale-ladder');
  const theme = THEMES['mau-a'];
  const probes = new Map<string, Probe>();
  let lastA: {key: string; px: Pixels} | null = null;

  /** Hai ảnh chỉ khác value của bậc k (chữ 16 ký tự với "."), đếm điểm khác theo cột. */
  async function probe(n: number, k: number, f: number): Promise<Probe> {
    const key = `${n}:${k}:${f}`;
    const got = probes.get(key);
    if (got) return got;
    const base = ladder(n);
    const tw = buildTimeline('scale-ladder', s(), base, 'mau-a', 0, {n});
    const to = buildTimeline(
      'scale-ladder', s(), withValue(base, k, '.'), 'mau-a', 0, {n},
    );
    const wk = `${n}:${f}`;
    if (lastA?.key !== wk) lastA = {key: wk, px: await shoot(tw.timeline, f)};
    const a = lastA.px;
    const b = await shoot(to.timeline, f);
    const r: Probe = {
      count: 0, cols: new Int32Array(a.width), minY: 1e9, maxY: -1,
      left: -1, right: -1,
    };
    for (let y = 0; y < MAIN_END; y++) {
      for (let x = 0; x < a.width; x++) {
        const p1 = px(a, x, y);
        const q = px(b, x, y);
        if (
          Math.abs(p1[0] - q[0]) > 40 || Math.abs(p1[1] - q[1]) > 40 ||
          Math.abs(p1[2] - q[2]) > 40
        ) {
          r.count++;
          r.cols[x]++;
          r.minY = Math.min(r.minY, y);
          r.maxY = Math.max(r.maxY, y);
        }
      }
    }
    if (r.count > 0) {
      const bar = findColor(
        b, hex(theme.accent), {y0: r.minY, y1: r.maxY + 1}, 6,
      ).map(([x]) => x);
      if (bar.length > 0) {
        r.left = Math.min(...bar);
        r.right = Math.max(...bar);
      }
    }
    probes.set(key, r);
    return r;
  }
  const endOf = (n: number) =>
    buildTimeline('scale-ladder', s(), ladder(n), 'mau-a', 0, {n}).endFrame;
  const startOf = (k: number) => 30 + k * BEAT_GAP;

  test.each([3, 5, 6])(
    '%i bậc, frame cuối: chữ giá trị của MỌI bậc có mặt (đổi value từng bậc: 16 ký tự so với ".")',
    async (n) => {
      for (let k = 0; k < n; k++) {
        const pr = await probe(n, k, endOf(n));
        expect(pr.count, `bậc ${k}: chữ giá trị mất`).toBeGreaterThan(PRESENT);
        expect(
          maxXOf(pr) - minXFrom(pr, 0),
          `bậc ${k}: chữ quá hẹp`,
        ).toBeGreaterThan(150);
      }
    },
    900_000,
  );

  test('3 bậc, từng frame 6..18 sau beat vào: chữ giá trị không nằm bên trái mép trái thanh (mỗi bậc có ít nhất 1 frame được xét)', async () => {
    for (let k = 0; k < 3; k++) {
      let seen = 0;
      for (let off = 6; off <= 18; off++) {
        const pr = await probe(3, k, startOf(k) + off);
        if (pr.count < PRESENT) continue; // chữ chưa hiện thì không thể tràn
        seen++;
        expect(pr.left, `bậc ${k} off ${off}: không thấy viền thanh`).toBeGreaterThanOrEqual(0);
        expect(
          minXFrom(pr, 0),
          `bậc ${k} off ${off}: chữ lấn trái thanh (mép trái thanh ${pr.left})`,
        ).toBeGreaterThanOrEqual(560 + 24 - 2);
      }
      expect(seen, `bậc ${k}: không frame nào có chữ để xét`).toBeGreaterThanOrEqual(1);
    }
  }, 1_800_000);

  test('bậc 0 (chữ ngoài thanh): từ lúc chữ hiện tới frame cuối, vị trí chữ ở bên phải đầu thanh không đổi', async () => {
    const fin = await probe(3, 0, endOf(3));
    expect(fin.count).toBeGreaterThan(PRESENT);
    // chỉ đo bên phải đầu thanh: dấu chấm đối chứng nằm TRONG thanh và trượt theo w
    const x0 = fin.right + 2;
    expect(countFrom(fin, x0), 'chữ giá trị phải nằm ngoài (bên phải) thanh').toBeGreaterThan(PRESENT);
    const endX = minXFrom(fin, x0);
    let seen = 0;
    for (let off = 6; off <= 26; off++) {
      const pr = await probe(3, 0, startOf(0) + off);
      if (countFrom(pr, x0) < PRESENT) continue;
      seen++;
      expect(
        Math.abs(minXFrom(pr, x0) - endX),
        `off ${off}: chữ ngoài thanh trượt (${minXFrom(pr, x0)} so với ${endX} ở frame cuối)`,
      ).toBeLessThanOrEqual(3);
    }
    expect(seen, 'phải thấy chữ ngoài thanh ở ít nhất 2 frame trước frame cuối').toBeGreaterThanOrEqual(2);
  }, 1_800_000);

  test('3 bậc power 0, 1, 9 (bậc giữa wFinal ~469 px): mép trái chữ giá trị không nhảy giữa hai frame có chữ (giữ vị trí cuối cùng có chữ)', async () => {
    // Nhảy lỗi là ~296..370 px trong 1 frame; thanh dài ra hợp lệ trượt tối đa vài chục px mỗi frame
    let prev: number | null = null;
    let seen = 0;
    const lefts: number[] = [];
    for (let off = 2; off <= 28; off++) {
      const pr = await probe(3, 1, startOf(1) + off);
      if (pr.count < PRESENT) continue; // chữ chưa hiện; giữ vị trí cuối cùng có chữ
      seen++;
      const x = minXFrom(pr, 0);
      lefts.push(x);
      if (prev !== null) {
        expect(
          Math.abs(x - prev),
          `off ${off}: mép trái chữ ${prev} -> ${x} (${lefts.join(', ')})`,
        ).toBeLessThanOrEqual(150);
      }
      prev = x;
    }
    expect(seen, lefts.join(',')).toBeGreaterThanOrEqual(3);
  }, 1_800_000);
});
