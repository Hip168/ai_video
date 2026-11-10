import {readFileSync} from 'node:fs';
import path from 'node:path';
import {describe, expect, test} from 'vitest';
import {validateProps} from '../src/lib/propsSpec';
import {CATALOG, resolveScene, specOf} from '../src/lib/registry';
import {validateTimeline2} from '../src/timeline2';
import {
  GROUP_B,
  THEME_IDS,
  allStrings,
  buildTimeline,
  hasVi,
  longProps,
  specB,
} from './helpers/scenes-b';
import {VIDEO_DIR} from './helpers/sample';

// Phần thuần (không cần trình duyệt) của 9 cảnh nhóm B, đề mục 8. Mọi kiểm tra
// đi qua giao diện công khai của đề mục 6: CATALOG / specOf / validateProps /
// validateTimeline2. Phần render nằm ở scenes-b-render.test.ts.

describe.each(GROUP_B)('[$task] spec và hợp đồng của cảnh $id', ({id}) => {
  test('đã thay giữ chỗ: spec có khoá props thật, ví dụ không rỗng, bỏ cờ anyProps', () => {
    const s = specB(id);
    expect(s.type).toBe(id);
    expect(s.anyProps).toBeFalsy();
    expect(Object.keys(s.propsSpec).length).toBeGreaterThan(0);
    expect(Object.keys(s.example).length).toBeGreaterThan(0);
    expect(specOf(id)).toBe(s);
    expect(resolveScene(id)).toBe(CATALOG[id].Component);
  });

  test('ví dụ trong spec qua validateProps (không lỗi)', () => {
    const s = specB(id);
    expect(Object.keys(s.example).length).toBeGreaterThan(0);
    expect(validateProps(s.propsSpec, s.example)).toEqual([]);
  });

  test('props lạ bị từ chối (khoá lạ), props rỗng bị từ chối nếu có khoá bắt buộc', () => {
    const s = specB(id);
    const withExtra = {...s.example, khoaLa_khongTonTai: 1};
    expect(validateProps(s.propsSpec, withExtra).length).toBeGreaterThan(0);
    const hasRequired = Object.values(s.propsSpec).some(
      (p) => (p as {required?: boolean}).required,
    );
    expect(hasRequired).toBe(true);
    expect(validateProps(s.propsSpec, {}).length).toBeGreaterThan(0);
  });

  test('mọi chuỗi tự do (không oneOf) của propsSpec đều có maxLen', () => {
    const s = specB(id);
    const walk = (spec: any, where: string): void => {
      if (spec.kind === 'string' && !spec.oneOf) {
        expect(spec.maxLen, `${where}: thiếu maxLen`).toBeTypeOf('number');
      } else if (spec.kind === 'array') {
        walk(spec.of, `${where}[]`);
      } else if (spec.kind === 'object') {
        for (const [k, v] of Object.entries(spec.shape)) {
          walk(v, `${where}.${k}`);
        }
      }
    };
    for (const [k, v] of Object.entries(s.propsSpec)) walk(v, k);
  });

  test('bản chuỗi dài đúng maxLen (dùng cho test tràn chữ) vẫn qua validateProps', () => {
    const s = specB(id);
    expect(Object.keys(longProps(s)).length).toBeGreaterThan(0);
    expect(validateProps(s.propsSpec, longProps(s))).toEqual([]);
  });

  test('số beat tối thiểu và cue: cue là chuỗi không rỗng, không trùng', () => {
    const s = specB(id);
    expect(Number.isInteger(s.minBeats)).toBe(true);
    expect(s.minBeats).toBeGreaterThanOrEqual(0);
    for (const c of s.cues) expect(c.trim()).not.toBe('');
    expect(new Set(s.cues).size).toBe(s.cues.length);
  });

  test.each(THEME_IDS)(
    'timeline một cảnh (ví dụ + beat theo spec, theme %s) qua validateTimeline2',
    (theme) => {
      const s = specB(id);
      expect(Object.keys(s.example).length).toBeGreaterThan(0);
      const b = buildTimeline(id, s, s.example, theme);
      const t = validateTimeline2(b.timeline);
      expect(t.scenes[0].type).toBe(id);
      expect(t.scenes[0].beats.length).toBeGreaterThanOrEqual(s.minBeats);
    },
  );
});

describe('[8-5] code-walk: chú thích tiếng Việt có dấu trong ví dụ', () => {
  test('ví dụ có ít nhất một chuỗi chứa chữ có dấu / đ tiếng Việt', () => {
    const strings = allStrings(specB('code-walk').example);
    expect(strings.some(hasVi)).toBe(true);
  });

  test('bản chuỗi dài nhất của code-walk chứa chữ có dấu (kiểm tra render dấu ở mức tối đa)', () => {
    const strings = allStrings(longProps(specB('code-walk')));
    expect(strings.some(hasVi)).toBe(true);
  });
});

describe('[8] nhóm B: luật mã nguồn cảnh (cấm blur, URL, mạng)', () => {
  const FILES = GROUP_B.flatMap(({id}) => [
    `src/lib/scenes/${id}.tsx`,
    `src/lib/specs/${id}.ts`,
  ]);
  const read = (f: string) => readFileSync(path.join(VIDEO_DIR, f), 'utf8');

  test.each(FILES)('%s tồn tại và không rỗng', (f) => {
    expect(read(f).trim().length).toBeGreaterThan(50);
  });

  test.each(FILES)('%s: không blur, không backdrop-filter, không feGaussianBlur', (f) => {
    const src = read(f);
    expect(src).not.toMatch(/blur\s*\(/i);
    expect(src).not.toMatch(/backdrop-?filter/i);
    expect(src).not.toMatch(/feGaussianBlur/i);
  });

  test.each(FILES)('%s: không chuỗi URL (http, https, ://, xmlns), không gọi mạng', (f) => {
    const src = read(f);
    expect(src).not.toMatch(/https?:/i);
    expect(src).not.toContain('://');
    expect(src).not.toMatch(/xmlns/i);
    expect(src).not.toMatch(/\bfetch\s*\(/);
    expect(src).not.toMatch(/XMLHttpRequest|WebSocket|sendBeacon/);
  });

  test.each(FILES)('%s: không dùng thời gian thật / ngẫu nhiên (hàm thuần của frame)', (f) => {
    const src = read(f);
    expect(src).not.toMatch(/Date\.now|new Date\(|Math\.random|performance\.now/);
  });
});
