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
  diffRatio,
  distinctColors,
  findColor,
  hex,
  nonColorRatio,
  px,
  type Pixels,
} from './helpers/render';
import {VIDEO_DIR} from './helpers/sample';
import {tokenizeCode} from '../src/lib/code-highlight';
import {
  GROUP_B,
  THEME_IDS,
  BEAT_GAP,
  buildTimeline,
  hasVi,
  allStrings,
  longProps,
  mapStrings,
  specB,
  stripVi,
  type ThemeId,
} from './helpers/scenes-b';

// Khung hình thật của 9 cảnh nhóm B (đề mục 8). Chỉ chạy khi RENDER_TEST=1, với
// REMOTION_BROWSER_EXECUTABLE=$HOME/.cache/aivideo/chrome-headless-shell/
// chrome-headless-shell (D23, .team/stack.md). Props lấy từ chính spec.example
// của từng loại (qua CATALOG), nên không phụ thuộc tên khoá riêng của cảnh.
const d = describe.skipIf(!RENDER_TEST);
const browserExecutable = process.env.REMOTION_BROWSER_EXECUTABLE ?? null;
const MAIN_END = 830;
const MARGIN = 40;
const STILL_BUDGET_MS = 5000;

const scratch = mkdtempSync(path.join(tmpdir(), 'scenes-b-'));
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
const logs: string[] = [];
/** Chụp một still của Episode với timeline cho trước, không cache. */
async function shoot(
  timeline: any,
  frame: number,
): Promise<{pixels: Pixels; ms: number}> {
  const composition = await selectComposition({
    serveUrl, id: 'Episode', inputProps: {timeline}, browserExecutable,
  });
  const output = path.join(scratch, `s${seq++}.png`);
  const t0 = Date.now();
  await renderStill({
    composition, serveUrl, frame, output,
    imageFormat: 'png', browserExecutable,
    onBrowserLog: (l) => logs.push(`${l.type}: ${l.text}`),
  });
  const ms = Date.now() - t0;
  return {pixels: decodePng(output), ms};
}

const cache = new Map<string, Pixels>();
async function still(key: string, timeline: any, frame: number) {
  const k = `${key}:${frame}`;
  if (!cache.has(k)) cache.set(k, (await shoot(timeline, frame)).pixels);
  return cache.get(k)!;
}

/** Điểm ảnh có màu chữ của theme (fg, muted, accent, accent2; sai số <= 6). */
function edgeInk(p: Pixels, id: ThemeId): {left: number; right: number} {
  const t = THEMES[id];
  const ink = [t.fg, t.muted, t.accent, t.accent2].map(hex);
  const isInk = (c: number[]) =>
    ink.some((k) => c.every((v, i) => Math.abs(v - k[i]) <= 6));
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

for (const {id, task} of GROUP_B) {
  d(`[${task}] cảnh ${id}: khung hình thật`, () => {
    const s = () => specB(id);
    const BG = hex(THEMES['mau-a'].bg);
    const base = () => buildTimeline(id, s(), s().example);

    test('still giữa cảnh (ví dụ của spec) không đơn sắc trong y<830 và có nhiều màu', async () => {
      const b = base();
      const p = await still(`${id}:base`, b.timeline, b.endFrame);
      expect(nonColorRatio(p, BG, 0, MAIN_END)).toBeGreaterThan(0.01);
      expect(distinctColors(p, 0, MAIN_END)).toBeGreaterThan(5);
    }, 180_000);

    test('dải y>=830 là nền phẳng sau khi hết beat (không vẽ ngoài y<830)', async () => {
      const b = base();
      const p = await still(`${id}:base`, b.timeline, b.endFrame);
      expect(nonColorRatio(p, BG, MAIN_END, 1080)).toBe(0);
    }, 180_000);

    test('dịch startFrame của mọi beat +40 frame làm đổi hình (cảnh neo beat)', async () => {
      const a = base();
      const sh = buildTimeline(id, s(), s().example, 'mau-a', 40);
      const p1 = await still(`${id}:mid`, a.timeline, a.midFrame);
      const p2 = await still(`${id}:midshift`, sh.timeline, a.midFrame);
      expect(diffRatio(p1, p2, 0, MAIN_END)).toBeGreaterThan(0.0005);
    }, 180_000);

    test('still dưới 5 giây (bundle và composition đã có sẵn)', async () => {
      const b = base();
      let ms = (await shoot(b.timeline, b.endFrame)).ms;
      if (ms >= STILL_BUDGET_MS) {
        ms = (await shoot(b.timeline, b.endFrame)).ms; // lần đầu có thể nóng máy
      }
      expect(ms).toBeLessThan(STILL_BUDGET_MS);
    }, 180_000);

    test('render không gọi mạng: không có log tải tài nguyên lỗi (net::, Failed to load)', async () => {
      const b = base();
      logs.length = 0;
      await shoot(b.timeline, b.endFrame);
      const bad = logs.filter((l) =>
        /net::|Failed to load resource|ERR_|https?:\/\//i.test(l),
      );
      expect(bad).toEqual([]);
    }, 180_000);

    test('chuỗi dài nhất làm đổi hình so với ví dụ (props thật sự được vẽ, không phải màn rỗng)', async () => {
      const b = base();
      const l = buildTimeline(id, s(), longProps(s()));
      const p1 = await still(`${id}:base`, b.timeline, b.endFrame);
      const p2 = await still(`${id}:long:mau-a`, l.timeline, l.endFrame);
      expect(diffRatio(p1, p2, 0, MAIN_END)).toBeGreaterThan(0.0005);
    }, 180_000);

    for (const theme of THEME_IDS) {
      test(`chuỗi dài nhất của spec không chạm lề 40px, nền dưới phẳng (${theme})`, async () => {
        const b = buildTimeline(id, s(), longProps(s()), theme);
        const p = await still(`${id}:long:${theme}`, b.timeline, b.endFrame);
        const e = edgeInk(p, theme);
        expect(e.left, 'mép trái').toBe(0);
        expect(e.right, 'mép phải').toBe(0);
        expect(
          nonColorRatio(p, hex(THEMES[theme].bg), 0, MAIN_END),
        ).toBeGreaterThan(0.005);
        expect(
          nonColorRatio(p, hex(THEMES[theme].bg), MAIN_END, 1080),
        ).toBe(0);
      }, 180_000);
    }
  });
}

d('[8-5] code-walk: dấu tiếng Việt và tô màu tất định', () => {
  const id = 'code-walk' as const;
  const s = () => specB(id);

  test('render hai lần cùng props cho hai ảnh giống hệt từng điểm (tô màu tất định)', async () => {
    const b = buildTimeline(id, s(), s().example);
    const a = (await shoot(b.timeline, b.endFrame)).pixels;
    const c = (await shoot(b.timeline, b.endFrame)).pixels;
    expect(diffRatio(a, c, 0, 1080, 0)).toBe(0);
  }, 240_000);

  test('bỏ dấu tiếng Việt ở các chuỗi có dấu làm đổi hình: dấu thật sự được vẽ', async () => {
    const strings = allStrings(s().example).filter(hasVi);
    expect(strings.length).toBeGreaterThan(0);
    const stripped = mapStrings(s().example, (x) =>
      hasVi(x) ? stripVi(x) : x,
    ) as Record<string, unknown>;
    const a = buildTimeline(id, s(), s().example);
    const b = buildTimeline(id, s(), stripped);
    const p1 = await still('cw:vi', a.timeline, a.endFrame);
    const p2 = await still('cw:novi', b.timeline, b.endFrame);
    expect(diffRatio(p1, p2, 0, MAIN_END)).toBeGreaterThan(0);
  }, 240_000);

  test('bỏ dấu chỉ ở chú thích (notes[].text) làm đổi hình: dấu của chú thích được vẽ', async () => {
    const ex = s().example as any;
    expect(ex.notes.some((n: any) => hasVi(n.text))).toBe(true);
    const stripped = {
      ...ex,
      notes: ex.notes.map((n: any) => ({...n, text: stripVi(n.text)})),
    };
    const a = buildTimeline(id, s(), ex);
    const b = buildTimeline(id, s(), stripped);
    const p1 = await still('cw:notes', a.timeline, a.endFrame);
    const p2 = await still('cw:nonotes', b.timeline, b.endFrame);
    expect(diffRatio(p1, p2, 0, MAIN_END)).toBeGreaterThan(0);
  }, 240_000);

  test('ảnh có ít nhất hai màu token của shiki (tô màu thật, không chỉ một màu chữ)', async () => {
    const ex = s().example as any;
    const colors = [
      ...new Set(
        tokenizeCode(ex.lines.join('\n'), ex.lang).flatMap((r) =>
          r.map((t) => t.color),
        ),
      ),
    ];
    expect(colors.length).toBeGreaterThan(1);
    const b = buildTimeline(id, s(), ex);
    const p = await still(`${id}:base`, b.timeline, b.endFrame);
    const found = colors.filter(
      (c) => findColor(p, hex(c.slice(0, 7)), {y1: MAIN_END}, 4).length >= 20,
    );
    expect(found.length).toBeGreaterThanOrEqual(2);
  }, 240_000);
});

// ---- Mục k neo đúng beat k (chống "mọi mục theo beat 0 + 20k") ----
// Nhiễu chữ Chrome giữa hai lần render khác timeline đo được tới 0,047% (layers);
// tín hiệu thật của mục k thấp nhất đo được vài % -> ngưỡng 0,5%.
const startOf = (k: number) => 30 + k * BEAT_GAP;
for (const {id, task} of GROUP_B) {
  d(`[${task}] cảnh ${id}: mục k chỉ hiện từ beat k`, () => {
    const s = () => specB(id);
    const n = Math.max(s().minBeats, 2);
    const ks = [...Array(n - 1)].map((_, i) => i + 1);
    const base = () => buildTimeline(id, s(), s().example, 'mau-a', 0, {n});

    test.each(ks)('mục %d chưa hiện trước beat của nó và đã hiện sau beat đó', async (k) => {
      const b = base();
      const before = await still(`${id}:k:${k}:b`, b.timeline, startOf(k) - 5);
      const after = await still(`${id}:k:${k}:a`, b.timeline, startOf(k) + 40);
      expect(diffRatio(before, after, 0, MAIN_END)).toBeGreaterThan(0.0003);
    }, 240_000);

    test.each(ks)('chỉ dịch beat %d và các beat sau +150 frame: hình đổi (mục chưa tới)', async (k) => {
      const b = base();
      const sh = buildTimeline(id, s(), s().example, 'mau-a', 150, {n, from: k});
      const f = startOf(k) + 40;
      const p1 = await still(`${id}:k:${k}:a`, b.timeline, f);
      const p2 = await still(`${id}:k:${k}:sh`, sh.timeline, f);
      expect(diffRatio(p1, p2, 0, MAIN_END)).toBeGreaterThan(0.005);
    }, 240_000);
  });
}

d('[8-9] algo-bars: hình theo algoBarsAt với đúng beat step', () => {
  const id = 'algo-bars' as const;
  const s = () => specB(id);
  const STEPS = 5;
  const S = (k: number) => startOf(k);
  const full = () =>
    buildTimeline(id, s(), s().example, 'mau-a', 0, {n: STEPS});

  test('ví dụ có đúng 5 bước và mọi beat là step', () => {
    expect((s().example as any).states).toHaveLength(STEPS);
    const b = full();
    expect(b.timeline.scenes[0].beats.map((x: any) => x.cue)).toEqual(
      Array(STEPS).fill('step'),
    );
  });

  test.each([1, 2, 3, 4])(
    'sau beat step %d: hình giống hệt cảnh mà các states trước đó đều bằng states[k] (cột đúng trạng thái k)',
    async (k) => {
      const ex = s().example as any;
      const states = ex.states.map((x: any, i: number) =>
        i < k ? ex.states[k] : x,
      );
      const same = buildTimeline(
        id, s(), {...ex, states}, 'mau-a', 0, {n: STEPS},
      );
      const f = S(k) + 40;
      const a = await still(`ab:full`, full().timeline, f);
      const b = await still(`ab:same:${k}`, same.timeline, f);
      expect(diffRatio(a, b, 0, MAIN_END, 0)).toBeLessThan(0.0005);
      // và khác ảnh khi vẫn ở trạng thái 0 (cảnh thật sự đã sang trạng thái k)
      const z = await still(`ab:z:${k}`, full().timeline, S(1) - 5);
      expect(diffRatio(b, z, 0, MAIN_END)).toBeGreaterThan(0.0003);
    },
    240_000,
  );

  test.each([1, 2, 3, 4])(
    'trước và sau beat step %d hình khác nhau (trạng thái đổi theo beat)',
    async (k) => {
      const a = await still(`ab:pre:${k}`, full().timeline, S(k) - 5);
      const b = await still(`ab:post:${k}`, full().timeline, S(k) + 40);
      expect(diffRatio(a, b, 0, MAIN_END)).toBeGreaterThan(0.0003);
    },
    240_000,
  );

  test('dịch mọi beat step +40 làm đổi hình ở frame sau beat 1 gốc', async () => {
    const sh = buildTimeline(id, s(), s().example, 'mau-a', 40, {n: STEPS});
    const f = S(1) + 20;
    const a = await still('ab:ref', full().timeline, f);
    const b = await still('ab:shift', sh.timeline, f);
    expect(diffRatio(a, b, 0, MAIN_END)).toBeGreaterThan(0.0003);
  }, 240_000);
});
