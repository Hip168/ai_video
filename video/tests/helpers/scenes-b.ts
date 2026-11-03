import {CATALOG} from '../../src/lib/registry';
import type {PropSpec, SceneSpec} from '../../src/lib/types';
import type {CatalogType} from '../../src/timeline2';

/** Chín loại cảnh nhóm B, đúng thứ tự task [8-1]..[8-9] (issue #41..#49). */
export const GROUP_B: ReadonlyArray<{id: CatalogType; task: string}> = [
  {id: 'flow', task: '8-1'},
  {id: 'layers', task: '8-2'},
  {id: 'scale-ladder', task: '8-3'},
  {id: 'tree-graph', task: '8-4'},
  {id: 'code-walk', task: '8-5'},
  {id: 'terminal', task: '8-6'},
  {id: 'bits', task: '8-7'},
  {id: 'memory-array', task: '8-8'},
  {id: 'algo-bars', task: '8-9'},
];

export const THEME_IDS = ['mau-a', 'mau-b', 'mau-c', 'mau-d'] as const;
export type ThemeId = (typeof THEME_IDS)[number];

export const specB = (id: CatalogType): SceneSpec => CATALOG[id].spec;

/** Chuỗi đúng n ký tự, toàn chữ hoa rộng có dấu, có khoảng trắng để ngắt dòng. */
export function wide(n: number): string {
  const words = ['ƯỜM', 'WẮM', 'MỞW', 'ỨMW', 'WỀM'];
  let s = '';
  for (let i = 0; s.length < n; i++) s += (i ? ' ' : '') + words[i % 5];
  s = [...s].slice(0, n).join('');
  if (s.endsWith(' ')) s = s.slice(0, -1) + 'M';
  return s;
}

/**
 * Đi song song theo propsSpec và ví dụ: mọi chuỗi tự do (không có oneOf) có
 * maxLen được thay bằng chuỗi rộng dài đúng maxLen. Cấu trúc (số phần tử mảng,
 * số, cờ) giữ nguyên như ví dụ.
 */
export function fillMaxStrings(spec: PropSpec, ex: unknown): unknown {
  switch (spec.kind) {
    case 'string':
      return spec.oneOf || spec.maxLen === undefined ? ex : wide(spec.maxLen);
    case 'array':
      return Array.isArray(ex) ? ex.map((e) => fillMaxStrings(spec.of, e)) : ex;
    case 'object': {
      if (typeof ex !== 'object' || ex === null) return ex;
      const o = ex as Record<string, unknown>;
      return Object.fromEntries(
        Object.entries(o).map(([k, v]) => [
          k,
          spec.shape[k] ? fillMaxStrings(spec.shape[k], v) : v,
        ]),
      );
    }
    default:
      return ex;
  }
}

/** Flow nhiều nút nhất: 8 nút, 10 cạnh, 6 gói, nhãn dài đúng maxLen. */
export function flowMax(direction: 'LR' | 'TB' = 'LR'): Record<string, unknown> {
  const ids = [...Array(8)].map((_, i) => `n${i + 1}`);
  const pairs: Array<[number, number]> = [
    [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [0, 2], [1, 4], [3, 7],
  ];
  return {
    nodes: ids.map((id) => ({id, label: wide(24)})),
    edges: pairs.map(([a, b]) => ({from: ids[a], to: ids[b], label: wide(16)})),
    packets: [...Array(6)].map((_, i) => ({
      from: ids[i], to: ids[i + 1], label: wide(8),
    })),
    direction,
  };
}

/** Cây 15 nút: dạng 'binary' (độ sâu 4), 'star' (gốc + 14 con), 'chain' (xích 15). */
export function treeMax(
  shape: 'binary' | 'star' | 'chain' = 'binary',
): Record<string, unknown> {
  const nodes = [...Array(15)].map((_, i) => {
    const parent =
      i === 0 ? undefined
      : shape === 'binary' ? `t${Math.floor((i - 1) / 2) + 1}`
      : shape === 'star' ? 't1'
      : `t${i}`;
    return {id: `t${i + 1}`, ...(parent ? {parent} : {}), label: wide(16)};
  });
  return {nodes, path: ['t1', 't2', 't4', 't8']};
}

export function longProps(s: SceneSpec): Record<string, unknown> {
  if (s.type === 'flow') return flowMax();
  if (s.type === 'tree-graph') return treeMax();
  return Object.fromEntries(
    Object.entries(s.example).map(([k, v]) => [
      k,
      s.propsSpec[k] ? fillMaxStrings(s.propsSpec[k], v) : v,
    ]),
  );
}

/** Mọi chuỗi (lá) trong cây giá trị. */
export function allStrings(v: unknown): string[] {
  if (typeof v === 'string') return [v];
  if (Array.isArray(v)) return v.flatMap(allStrings);
  if (typeof v === 'object' && v !== null) {
    return Object.values(v).flatMap(allStrings);
  }
  return [];
}

export function mapStrings(v: unknown, f: (s: string) => string): unknown {
  if (typeof v === 'string') return f(v);
  if (Array.isArray(v)) return v.map((x) => mapStrings(x, f));
  if (typeof v === 'object' && v !== null) {
    return Object.fromEntries(
      Object.entries(v).map(([k, x]) => [k, mapStrings(x, f)]),
    );
  }
  return v;
}

const VI_MARKS = /[̀-ͯ]/g;
/** Bỏ dấu tiếng Việt (đ -> d). */
export const stripVi = (s: string): string =>
  s.normalize('NFD').replace(VI_MARKS, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
export const hasVi = (s: string): boolean =>
  /[\u0300-\u036fđĐ]/.test(s.normalize('NFD'));

export const BEAT_LEN = 60;
export const BEAT_GAP = 100; // beat i bắt đầu ở 30 + i*100

/** Số beat dùng cho cảnh: đủ cho minBeats và mọi cue của spec (tối đa 8). */
export function beatCount(s: SceneSpec): number {
  return Math.min(8, Math.max(s.minBeats, s.cues.length, 1));
}

export interface Built {
  timeline: any;
  /** frame sau mọi beat: hiệu ứng vào đã xong, phụ đề đã tắt */
  endFrame: number;
  /** frame 25 sau beat cuối bắt đầu: đang trong beat cuối */
  midFrame: number;
}

/**
 * Timeline một cảnh duy nhất. Beat i có cue = s.cues[i] (nếu có). `shift`
 * dịch startFrame của MỌI beat; `props` là props của cảnh.
 */
export function buildTimeline(
  id: CatalogType,
  s: SceneSpec,
  props: Record<string, unknown>,
  theme: ThemeId = 'mau-a',
  shift = 0,
  opts: {n?: number; from?: number} = {},
): Built {
  const n = opts.n ?? beatCount(s);
  const from = opts.from ?? 0;
  const starts = [...Array(n)].map((_, i) => 30 + i * BEAT_GAP);
  const lastEnd = starts[n - 1] + BEAT_LEN;
  const D = lastEnd + 100 + shift;
  const sh = (i: number) => (i >= from ? shift : 0);
  const beats = starts.map((st, i) => ({
    id: `b00${i + 1}`,
    startFrame: st + sh(i),
    durationFrames: BEAT_LEN,
    text: 'Câu ngắn.',
    ...(s.cues.length ? {cue: s.cues[i % s.cues.length]} : {}),
  }));
  return {
    timeline: {
      version: 2, fps: 30, width: 1920, height: 1080,
      durationInFrames: D, theme,
      audio: {src: 'narration.wav'},
      chapters: [{id: 'c1', title: 'Chương một', startFrame: 0}],
      sfx: [],
      scenes: [{
        id: 'sc01', chapter: 'c1', type: id, props,
        startFrame: 0, durationFrames: D, beats,
      }],
    },
    endFrame: D - 10,
    midFrame: starts[n - 1] + 25,
  };
}
