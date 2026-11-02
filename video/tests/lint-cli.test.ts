import {spawnSync} from 'node:child_process';
import {mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {afterAll, beforeAll, describe, expect, test} from 'vitest';
import {VIDEO_DIR} from './helpers/sample';

// [6-3] npm run lint:episode -- <slug> [--script] [--timeline] [--index] [--json]
const MIDDLE = [
  'big-number', 'compare', 'custom:mo-phong', 'myth-fact', 'flow', 'chart',
  'custom:mo-phong', 'term-card', 'layers', 'history-timeline', 'bits',
  'tree-graph', 'code-walk',
];
const TYPES = ['cold-open', ...MIDDLE, ...MIDDLE, 'recap-outro'];

function propsFor(type: string): Record<string, unknown> {
  if (type === 'cold-open') return {hook: 'Máy tính chỉ hiểu 0 và 1'};
  if (type === 'chapter-title') return {title: 'Chương'};
  if (type === 'recap-outro') return {points: ['Một điểm']};
  return {};
}

function script(types = TYPES, theme = 'mau-b'): any {
  return {
    meta: {title: 'Tập thử', theme},
    chapters: [],
    scenes: types.map((type, i) => ({
      id: `sc${i}`,
      chapter: `c${Math.floor(i / 7)}`,
      type,
      props: propsFor(type),
      holdMs: 0,
      beats:
        type === 'cold-open'
          ? [{id: 'b0', text: 'x', cue: 'hook'}]
          : type === 'recap-outro'
            ? [{id: 'b1', text: 'y'}]
            : [],
    })),
  };
}

function timeline(frames: (i: number) => number = () => 600): any {
  return {scenes: TYPES.map((_, i) => ({id: `sc${i}`, durationFrames: frames(i)}))};
}

let dir = '';
const files: Record<string, string> = {};
function put(name: string, data: unknown): string {
  const f = path.join(dir, name);
  writeFileSync(f, typeof data === 'string' ? data : JSON.stringify(data));
  files[name] = f;
  return f;
}

function lint(slug: string | null, args: string[], env: Record<string, string> = {}) {
  const r = spawnSync(
    'npm',
    ['run', '--silent', 'lint:episode', '--', ...(slug ? [slug] : []), ...args],
    {
      cwd: VIDEO_DIR,
      encoding: 'utf8',
      timeout: 60_000,
      env: {...process.env, ...env},
    },
  );
  return {code: r.status, out: r.stdout ?? '', err: r.stderr ?? ''};
}

beforeAll(() => {
  dir = mkdtempSync(path.join(tmpdir(), 'lint-cli-'));
  put('script.json', script());
  put('timeline.json', timeline());
  put('index-empty.json', []);
  put('index-same.json', [
    {slug: 'tap-cu', title: 'Cũ', theme: 'mau-c', sceneTypes: TYPES},
  ]);
  put('index-theme.json', [
    {slug: 'tap-cu', title: 'Cũ', theme: 'mau-b', sceneTypes: ['x']},
  ]);
  put('script-bad.json', script(['big-number', ...TYPES.slice(1)]));
  put('script-warn.json', (() => {
    const s = script();
    s.scenes[0].beats = [];
    return s;
  })());
  put('timeline-short.json', timeline(() => 300));
  put('timeline-chapter.json', (() => {
    // cảnh cuối là chương riêng c3 trong script? giữ script gốc: chương c3 = sc21..sc27
    return timeline((i) => (i >= 21 ? 40 : 600));
  })());
  put('broken.json', '{ không phải json');
}, 30_000);

afterAll(() => rmSync(dir, {recursive: true, force: true}));

const base = () => ['--script', files['script.json'], '--index', files['index-empty.json']];

describe('[6-3] lint:episode CLI', () => {
  test('tập hợp lệ có timeline: mã 0, không có dòng LỖI', () => {
    const r = lint('tap-moi', [...base(), '--timeline', files['timeline.json']]);
    expect(r.code, r.out + r.err).toBe(0);
    expect(r.out).not.toContain('[LỖI]');
  });

  test('chưa có timeline: mã 0 và in dòng "bỏ qua: chưa có timeline"', () => {
    const r = lint('tap-moi', [
      ...base(),
      '--timeline',
      path.join(dir, 'khong-co.json'),
    ]);
    expect(r.code, r.out + r.err).toBe(0);
    expect(r.out).toMatch(/bỏ qua.*chưa có timeline/);
  });

  test('cảnh đầu sai: mã 1 và dòng "[LỖI] first-cold-open:"', () => {
    const r = lint('tap-moi', [
      '--script',
      files['script-bad.json'],
      '--index',
      files['index-empty.json'],
      '--timeline',
      files['timeline.json'],
    ]);
    expect(r.code).toBe(1);
    expect(r.out).toMatch(/\[LỖI\] first-cold-open: /);
  });

  test('chỉ có cảnh báo: mã 0 và dòng "[CẢNH BÁO] min-beats:"', () => {
    const r = lint('tap-moi', [
      '--script',
      files['script-warn.json'],
      '--index',
      files['index-empty.json'],
      '--timeline',
      files['timeline.json'],
    ]);
    expect(r.code, r.out + r.err).toBe(0);
    expect(r.out).toMatch(/\[CẢNH BÁO\] min-beats: /);
  });

  test('tổng thời lượng dưới 9 phút từ timeline: mã 1, min-duration', () => {
    const r = lint('tap-moi', [...base(), '--timeline', files['timeline-short.json']]);
    expect(r.code).toBe(1);
    expect(r.out).toMatch(/\[LỖI\] min-duration: /);
  });

  test('chương ngắn từ timeline: mã 1', () => {
    const r = lint('tap-moi', [...base(), '--timeline', files['timeline-chapter.json']]);
    expect(r.code).toBe(1);
    expect(r.out).toMatch(/\[LỖI\] /);
    expect(r.out).toContain('c3');
  });

  test('--index với tập cũ cùng chuỗi cảnh: mã 1, sequence-similarity', () => {
    const r = lint('tap-moi', [
      '--script',
      files['script.json'],
      '--index',
      files['index-same.json'],
      '--timeline',
      files['timeline.json'],
    ]);
    expect(r.code).toBe(1);
    expect(r.out).toMatch(/\[LỖI\] sequence-similarity: /);
  });

  test('--index với tập cũ cùng theme: mã 1, theme-differs', () => {
    const r = lint('tap-moi', [
      '--script',
      files['script.json'],
      '--index',
      files['index-theme.json'],
      '--timeline',
      files['timeline.json'],
    ]);
    expect(r.code).toBe(1);
    expect(r.out).toMatch(/\[LỖI\] theme-differs: /);
  });

  test('biến môi trường LINT_SCRIPT, LINT_TIMELINE, LINT_INDEX có tác dụng như cờ', () => {
    const r = lint('tap-moi', [], {
      LINT_SCRIPT: files['script-bad.json'],
      LINT_TIMELINE: files['timeline.json'],
      LINT_INDEX: files['index-empty.json'],
    });
    expect(r.code).toBe(1);
    expect(r.out).toMatch(/first-cold-open/);
  });

  test('--json in mảng Finding {rule, level, message}', () => {
    const r = lint('tap-moi', [
      '--script',
      files['script-bad.json'],
      '--index',
      files['index-empty.json'],
      '--timeline',
      files['timeline.json'],
      '--json',
    ]);
    expect(r.code).toBe(1);
    const arr = JSON.parse(r.out);
    expect(Array.isArray(arr)).toBe(true);
    expect(arr.length).toBeGreaterThan(0);
    for (const f of arr) {
      expect(Object.keys(f).sort()).toEqual(['level', 'message', 'rule']);
    }
    expect(arr.some((f: any) => f.rule === 'first-cold-open' && f.level === 'error')).toBe(true);
  });

  test('--json của tập hợp lệ là mảng rỗng, mã 0', () => {
    const r = lint('tap-moi', [...base(), '--timeline', files['timeline.json'], '--json']);
    expect(r.code, r.out + r.err).toBe(0);
    expect(JSON.parse(r.out)).toEqual([]);
  });

  test('thiếu script.json: mã 2', () => {
    const r = lint('tap-moi', [
      '--script',
      path.join(dir, 'khong-co.json'),
      '--index',
      files['index-empty.json'],
    ]);
    expect(r.code).toBe(2);
  });

  test('JSON hỏng: mã 2', () => {
    const r = lint('tap-moi', ['--script', files['broken.json'], '--index', files['index-empty.json']]);
    expect(r.code).toBe(2);
  });

  test('thiếu <slug>: mã 2', () => {
    const r = lint(null, base());
    expect(r.code).toBe(2);
  });

  test('index.json không tồn tại coi như chưa có tập nào: mã 0', () => {
    const r = lint('tap-moi', [
      '--script',
      files['script.json'],
      '--index',
      path.join(dir, 'khong-co-index.json'),
      '--timeline',
      files['timeline.json'],
    ]);
    expect(r.code, r.out + r.err).toBe(0);
  });
});
