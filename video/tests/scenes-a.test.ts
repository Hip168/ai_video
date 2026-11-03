import {mkdtempSync, existsSync, readFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import {afterAll, beforeAll, describe, expect, test} from 'vitest';
import {validateProps} from '../src/lib/propsSpec';
import {CATALOG, specOf} from '../src/lib/registry';
import {THEMES} from '../src/lib/theme';
import type {PropSpec, PropsSpec} from '../src/lib/types';
import {validateTimeline2} from '../src/timeline2';
import {
  RENDER_TEST,
  decodePng,
  diffRatio,
  hex,
  nonColorRatio,
  px,
  type Pixels,
} from './helpers/render';
import {VIDEO_DIR} from './helpers/sample';

// Đề mục 7, nhóm A: big-number, compare, myth-fact, history-timeline,
// term-card, chart. Tiêu chí "Xong khi" ở .team/features/7-8-canh.md.
// Phần thuần chạy luôn. Phần render chỉ chạy khi RENDER_TEST=1, với
// REMOTION_BROWSER_EXECUTABLE=$HOME/.cache/aivideo/chrome-headless-shell/
// chrome-headless-shell (D23, .team/stack.md).
// Props lấy từ chính spec (example + propsSpec) nên test không đoán tên prop.
const TYPES = [
  'big-number',
  'compare',
  'myth-fact',
  'history-timeline',
  'term-card',
  'chart',
] as const;
type T = (typeof TYPES)[number];
const THEME_IDS = ['mau-a', 'mau-b', 'mau-c', 'mau-d'] as const;
type ThemeId = (typeof THEME_IDS)[number];

const MAIN_END = 830;
const MARGIN = 40;
const SCENE = 600;
const BEAT_AT = 10; // beat j bắt đầu ở 10 + 30 j trong cảnh, dài 30 frame
const SHIFT = 300; // dịch startFrame của mọi beat
const MID = 300; // giữa cảnh: mọi beat đã xong (beat cuối <= 250)
const BEFORE = 280; // frame so sánh: bản gốc đã xong hết, bản dịch chưa bắt đầu

const specAt = (t: T) => CATALOG[t].spec;

// ---- Dựng props từ spec ----
/** Chuỗi đúng n ký tự, toàn chữ hoa rộng có dấu, có khoảng trắng. */
function wide(n: number): string {
  const words = ['ƯỜM', 'WẮM', 'MỞW', 'ỨMW', 'WỀM'];
  let s = '';
  for (let i = 0; s.length < n; i++) s += (i ? ' ' : '') + words[i % 5];
  s = [...s].slice(0, n).join('');
  if (s.endsWith(' ')) s = s.slice(0, -1) + 'M';
  return s;
}

/**
 * Giữ cấu trúc của `example`; mọi chuỗi có maxLen (không oneOf) thành chuỗi
 * rộng đúng maxLen, kể cả khoá tuỳ chọn mà ví dụ bỏ trống. `full`: mảng đầy
 * tới maxItems (phần tử lặp vòng từ ví dụ).
 */
function fill(ps: PropSpec, ex: any, full: boolean): any {
  if (ps.kind === 'string') {
    if (ps.oneOf || ps.maxLen === undefined) return ex;
    return wide(ps.maxLen);
  }
  if (ps.kind === 'array') {
    if (!Array.isArray(ex) || ex.length === 0) return ex;
    const n = full ? (ps.maxItems ?? ex.length) : ex.length;
    return Array.from({length: n}, (_, i) =>
      fill(ps.of, ex[i % ex.length], full),
    );
  }
  if (ps.kind === 'object') return fillObject(ps.shape, ex ?? {}, full);
  return ex;
}
function fillObject(shape: PropsSpec, ex: any, full: boolean): any {
  const out: Record<string, any> = {};
  for (const [k, ps] of Object.entries(shape)) {
    const v = fill(ps, ex?.[k], full);
    if (v !== undefined) out[k] = v;
  }
  return out;
}
const exampleProps = (t: T) => specAt(t).example as Record<string, unknown>;
const wideProps = (t: T, full = false) =>
  fillObject(specAt(t).propsSpec, specAt(t).example, full);

// ---- Dựng timeline: một cảnh cho mỗi loại, tất cả cảnh dài 600 frame ----
const beatCount = (t: T) =>
  Math.min(8, Math.max(specAt(t).minBeats, specAt(t).cues.length, 3));

function timeline(
  theme: ThemeId,
  propsOf: (t: T) => Record<string, unknown>,
  shift = 0,
): any {
  return {
    version: 2, fps: 30, width: 1920, height: 1080,
    durationInFrames: SCENE * TYPES.length, theme,
    audio: {src: 'narration.wav'},
    chapters: [{id: 'c1', title: 'Chương một', startFrame: 0}],
    sfx: [],
    scenes: TYPES.map((t, i) => ({
      id: `sc0${i + 1}`, chapter: 'c1', type: t, props: propsOf(t),
      startFrame: i * SCENE, durationFrames: SCENE,
      beats: Array.from({length: beatCount(t)}, (_, j) => {
        const cue = specAt(t).cues[j];
        return {
          id: `b${String(i * 10 + j + 1).padStart(3, '0')}`,
          startFrame: i * SCENE + BEAT_AT + 30 * j + shift,
          durationFrames: 30,
          text: 'Câu ngắn.',
          ...(cue ? {cue} : {}),
        };
      }),
    })),
  };
}
const sceneFrame = (t: T, offset: number) => TYPES.indexOf(t) * SCENE + offset;

// ---- Phần thuần ----
describe('[7-A] spec của 6 loại cảnh nhóm A', () => {
  test('mẫu timeline dựng từ spec qua validateTimeline2 (đủ 6 loại)', () => {
    for (const shift of [0, SHIFT]) {
      const tl = timeline('mau-a', exampleProps, shift);
      expect(tl.scenes.map((s: any) => s.type)).toEqual([...TYPES]);
      expect(() => validateTimeline2(tl)).not.toThrow();
    }
  });

  test.each(TYPES)('%s: spec.type khớp, không còn cờ anyProps', (t) => {
    expect(specAt(t).type).toBe(t);
    expect(specOf(t)).toBe(specAt(t));
    expect(specAt(t).anyProps).toBeFalsy();
    expect(Object.keys(specAt(t).propsSpec).length).toBeGreaterThan(0);
  });

  test.each(TYPES)('%s: ví dụ trong spec qua validateProps', (t) => {
    expect(validateProps(specAt(t).propsSpec, specAt(t).example)).toEqual([]);
  });

  test.each(TYPES)(
    '%s: props rộng nhất (chuỗi đúng maxLen) cũng qua validateProps',
    (t) => {
      for (const full of [false, true]) {
        expect(validateProps(specAt(t).propsSpec, wideProps(t, full))).toEqual(
          [],
        );
      }
    },
  );

  test.each(TYPES)('%s: props rộng nhất thật sự dài hơn ví dụ', (t) => {
    const total = (o: unknown): number =>
      typeof o === 'string'
        ? [...o].length
        : Array.isArray(o)
          ? o.reduce((a: number, v) => a + total(v), 0)
          : o && typeof o === 'object'
            ? Object.values(o).reduce((a: number, v) => a + total(v), 0)
            : 0;
    expect(total(wideProps(t))).toBeGreaterThan(total(specAt(t).example));
  });

  test.each(TYPES)('%s: spec chặn khoá lạ và thiếu khoá bắt buộc', (t) => {
    const bad = {...exampleProps(t), khoaLa: 1};
    expect(
      validateProps(specAt(t).propsSpec, bad).some((e) => e.includes('khoaLa')),
    ).toBe(true);
    const req = Object.entries(specAt(t).propsSpec).find(
      ([, p]) => (p as any).required,
    );
    expect(req, `${t} không có khoá bắt buộc nào`).toBeDefined();
    const missing = {...exampleProps(t)};
    delete missing[req![0]];
    expect(
      validateProps(specAt(t).propsSpec, missing).some((e) =>
        e.startsWith(req![0]),
      ),
    ).toBe(true);
  });

  test.each(TYPES)('%s: minBeats hợp lý và cue là chuỗi không rỗng', (t) => {
    const s = specAt(t);
    expect(Number.isInteger(s.minBeats)).toBe(true);
    expect(s.minBeats).toBeGreaterThanOrEqual(0);
    expect(s.minBeats).toBeLessThanOrEqual(8);
    expect(new Set(s.cues).size).toBe(s.cues.length);
    for (const c of s.cues) expect(c.trim()).not.toBe('');
  });
});

describe('[7-A] luật nguồn: không blur, không URL, file đủ', () => {
  test.each(TYPES)('%s có scenes/<id>.tsx và specs/<id>.ts', (t) => {
    expect(existsSync(path.join(VIDEO_DIR, 'src/lib/scenes', `${t}.tsx`))).toBe(
      true,
    );
    expect(existsSync(path.join(VIDEO_DIR, 'src/lib/specs', `${t}.ts`))).toBe(
      true,
    );
  });

  test.each(TYPES)('%s: grep blur / filter / URL trong file của loại = 0', (t) => {
    const files = [
      path.join(VIDEO_DIR, 'src/lib/scenes', `${t}.tsx`),
      path.join(VIDEO_DIR, 'src/lib/specs', `${t}.ts`),
    ];
    const bad = [
      /\bblur\s*\(/i,
      /feGaussianBlur/i,
      /backdrop-?filter/i,
      /<filter\b/i,
      /\bfilter\s*[:=]/i,
      /https?:\/\//i,
      /\b\w+:\/\//,
    ];
    for (const f of files) {
      expect(existsSync(f), `${f} không tồn tại`).toBe(true);
      const text = readFileSync(f, 'utf8');
      expect(text.length).toBeGreaterThan(200); // không xanh vì file rỗng
      for (const re of bad) expect(text, `${f} khớp ${re}`).not.toMatch(re);
    }
  });
});

// ---- Phần render ----
const d = describe.skipIf(!RENDER_TEST);
const browserExecutable = process.env.REMOTION_BROWSER_EXECUTABLE ?? null;
const scratch = mkdtempSync(path.join(tmpdir(), 'scenes-a-'));
afterAll(() => rmSync(scratch, {recursive: true, force: true}));

let serveUrl = '';
beforeAll(async () => {
  if (!RENDER_TEST) return;
  serveUrl = await bundle({
    entryPoint: path.join(VIDEO_DIR, 'src', 'index.ts'),
    publicDir: path.join(VIDEO_DIR, 'public'),
  });
}, 300_000);

type Variant = 'example' | 'shifted' | 'wide' | 'full';
const tlOf = (v: Variant, theme: ThemeId): any =>
  v === 'example'
    ? timeline(theme, exampleProps)
    : v === 'shifted'
      ? timeline(theme, exampleProps, SHIFT)
      : timeline(theme, (t) => wideProps(t, v === 'full'));

const compositions = new Map<string, Promise<any>>();
const cache = new Map<string, Promise<{p: Pixels; ms: number}>>();
function stillOf(
  v: Variant, theme: ThemeId, frame: number,
): Promise<{p: Pixels; ms: number}> {
  const ck = `${v}:${theme}`;
  if (!compositions.has(ck)) {
    compositions.set(
      ck,
      selectComposition({
        serveUrl, id: 'Episode', inputProps: {timeline: tlOf(v, theme)},
        browserExecutable,
      }),
    );
  }
  const key = `${ck}:${frame}`;
  if (!cache.has(key)) {
    cache.set(
      key,
      (async () => {
        const composition = await compositions.get(ck)!;
        const output = path.join(scratch, `${v}-${theme}-${frame}.png`);
        const t0 = Date.now();
        await renderStill({
          composition, serveUrl, frame, output,
          imageFormat: 'png', browserExecutable,
        });
        const ms = Date.now() - t0;
        return {p: decodePng(output), ms};
      })(),
    );
  }
  return cache.get(key)!;
}

const inkOf = (id: ThemeId) => {
  const t = THEMES[id];
  return [t.fg, t.muted, t.accent, t.accent2].map(hex);
};
function isInk(c: number[], ink: number[][]): boolean {
  return ink.some(
    (k) =>
      Math.abs(c[0] - k[0]) <= 6 && Math.abs(c[1] - k[1]) <= 6 &&
      Math.abs(c[2] - k[2]) <= 6,
  );
}
/** Số điểm màu chữ của theme trong hộp, y < 830. */
function inkIn(
  p: Pixels, id: ThemeId, x0: number, x1: number, y0 = 0, y1 = MAIN_END,
): number {
  const ink = inkOf(id);
  let n = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) if (isInk(px(p, x, y), ink)) n++;
  }
  return n;
}

d('[7-A] cảnh thật: không đơn sắc, neo beat, tốc độ (theme mau-a)', () => {
  const BG = hex(THEMES['mau-a'].bg);

  test.each(TYPES)(
    '%s: still giữa cảnh có nội dung (chữ/hình màu theme ở vùng giữa), không đơn sắc',
    async (t) => {
      const {p} = await stillOf('example', 'mau-a', sceneFrame(t, MID));
      expect(nonColorRatio(p, BG, 0, MAIN_END)).toBeGreaterThan(0.005);
      // Hoạ tiết nền không mang màu chữ: chỉ nội dung cảnh mới có.
      expect(inkIn(p, 'mau-a', 240, 1680, 100, 760)).toBeGreaterThan(1500);
    },
    180_000,
  );

  test.each(TYPES)(
    '%s: dải y>=830 là nền phẳng (không vẽ ngoài y<830)',
    async (t) => {
      // Không có beat nào (phụ đề ẩn): cả dải y 830..1080 phải phẳng.
      for (const f of [5, MID, 570]) {
        const {p} = await stillOf('example', 'mau-a', sceneFrame(t, f));
        expect(nonColorRatio(p, BG, MAIN_END, 1080), `frame ${f}`).toBe(0);
      }
      // Đang có beat (phụ đề hiện từ khoảng y 865): 25 px đầu dải vẫn phẳng.
      for (const f of [25, 100]) {
        const {p} = await stillOf('example', 'mau-a', sceneFrame(t, f));
        expect(nonColorRatio(p, BG, MAIN_END, 855), `frame ${f}`).toBe(0);
      }
    },
    180_000,
  );

  test.each(TYPES)(
    '%s: dịch startFrame của mọi beat +300 làm đổi hình (cảnh neo beat)',
    async (t) => {
      const a = await stillOf('example', 'mau-a', sceneFrame(t, BEFORE));
      const b = await stillOf('shifted', 'mau-a', sceneFrame(t, BEFORE));
      // Khác trong vùng chính y<830 (không nhờ dải phụ đề).
      expect(diffRatio(a.p, b.p, 0, MAIN_END)).toBeGreaterThan(0.0005);
    },
    180_000,
  );

  test.each(TYPES)(
    '%s: một still giữa cảnh dựng dưới 5 giây',
    async (t) => {
      // Làm nóng trình duyệt bằng một cảnh khác để không tính lần khởi động đầu.
      await stillOf('example', 'mau-a', 5);
      const {ms} = await stillOf('example', 'mau-a', sceneFrame(t, MID));
      expect(ms).toBeLessThan(5000);
    },
    180_000,
  );
});

for (const id of THEME_IDS) {
  d(`[7-A] chữ dài nhất của spec không chạm lề 40px, không vẽ ngoài y<830 (${id})`, () => {
    const BG = hex(THEMES[id].bg);
    const variants: Variant[] = id === 'mau-a' ? ['wide', 'full'] : ['wide'];

    test.each(
      variants.flatMap((v) => TYPES.map((t) => ({v, t}))),
    )(
      '$t ($v): có nội dung, dải y>=830 phẳng',
      async ({v, t}) => {
        const {p} = await stillOf(v, id, sceneFrame(t, MID));
        expect(nonColorRatio(p, BG, 0, MAIN_END)).toBeGreaterThan(0.005);
        expect(inkIn(p, id, 240, 1680, 100, 760)).toBeGreaterThan(1500);
        expect(nonColorRatio(p, BG, MAIN_END, 1080)).toBe(0);
      },
      180_000,
    );

    test.each(
      variants.flatMap((v) => TYPES.map((t) => ({v, t}))),
    )(
      '$t ($v): không có chữ chạm lề (x<40, x>=1880)',
      async ({v, t}) => {
        const {p} = await stillOf(v, id, sceneFrame(t, MID));
        expect(inkIn(p, id, 0, MARGIN), 'mép trái').toBe(0);
        expect(inkIn(p, id, p.width - MARGIN, p.width), 'mép phải').toBe(0);
      },
      180_000,
    );
  });
}
