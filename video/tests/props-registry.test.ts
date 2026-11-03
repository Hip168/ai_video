import {describe, expect, test} from 'vitest';
import {CUSTOM_SCENES} from '../src/episodes/registry';
import {validateProps} from '../src/lib/propsSpec';
import {CATALOG, resolveScene, specOf} from '../src/lib/registry';
import type {PropsSpec} from '../src/lib/types';
import {CATALOG_TYPES} from '../src/timeline2';

describe('[6-2] validateProps: từng kiểu và biên', () => {
  const str: PropsSpec = {
    s: {kind: 'string', required: true, minLen: 2, maxLen: 5},
  };
  test('string: biên minLen/maxLen, đếm ký tự (không đếm byte)', () => {
    expect(validateProps(str, {s: 'ab'})).toEqual([]);
    expect(validateProps(str, {s: 'abcde'})).toEqual([]);
    expect(validateProps(str, {s: 'đạịởữ'})).toEqual([]); // 5 ký tự, nhiều byte
    expect(validateProps(str, {s: 'a'}).length).toBeGreaterThan(0);
    expect(validateProps(str, {s: 'abcdef'}).length).toBeGreaterThan(0);
  });
  test('string: sai kiểu bị từ chối, lỗi bắt đầu bằng đường dẫn', () => {
    for (const bad of [5, null, true, [], {}]) {
      const e = validateProps(str, {s: bad});
      expect(e.length, JSON.stringify(bad)).toBeGreaterThan(0);
      expect(e[0].startsWith('s')).toBe(true);
    }
  });
  test('string: oneOf', () => {
    const spec: PropsSpec = {k: {kind: 'string', oneOf: ['a', 'b']}};
    expect(validateProps(spec, {k: 'a'})).toEqual([]);
    expect(validateProps(spec, {k: 'c'}).length).toBeGreaterThan(0);
  });
  test('required: thiếu bị báo; không required thì được vắng', () => {
    expect(validateProps(str, {})[0]).toMatch(/^s/);
    expect(validateProps({x: {kind: 'string'}}, {})).toEqual([]);
  });
  test('number: min, max, integer, NaN, Infinity, sai kiểu', () => {
    const spec: PropsSpec = {n: {kind: 'number', min: 1, max: 99, integer: true}};
    for (const ok of [1, 50, 99]) expect(validateProps(spec, {n: ok})).toEqual([]);
    for (const bad of [0, 100, 1.5, NaN, Infinity, '5', null]) {
      expect(validateProps(spec, {n: bad}).length, String(bad)).toBeGreaterThan(0);
    }
    expect(validateProps({n: {kind: 'number'}}, {n: 1.5})).toEqual([]);
  });
  test('boolean', () => {
    const spec: PropsSpec = {b: {kind: 'boolean', required: true}};
    expect(validateProps(spec, {b: false})).toEqual([]);
    expect(validateProps(spec, {b: 0}).length).toBeGreaterThan(0);
    expect(validateProps(spec, {}).length).toBeGreaterThan(0);
  });
  test('array: minItems, maxItems, đường dẫn phần tử points[2]', () => {
    const spec: PropsSpec = {
      points: {
        kind: 'array',
        minItems: 1,
        maxItems: 3,
        of: {kind: 'string', minLen: 1},
      },
    };
    expect(validateProps(spec, {points: ['a']})).toEqual([]);
    expect(validateProps(spec, {points: ['a', 'b', 'c']})).toEqual([]);
    expect(validateProps(spec, {points: []}).length).toBeGreaterThan(0);
    expect(validateProps(spec, {points: ['a', 'b', 'c', 'd']}).length).toBeGreaterThan(0);
    expect(validateProps(spec, {points: 'a'}).length).toBeGreaterThan(0);
    const e = validateProps(spec, {points: ['a', 'b', '']});
    expect(e).toHaveLength(1);
    expect(e[0].startsWith('points[2]')).toBe(true);
  });
  test('object lồng nhau: đường dẫn a.b, phần tử mảng chứa đối tượng', () => {
    const spec: PropsSpec = {
      a: {kind: 'object', shape: {b: {kind: 'number', required: true}}},
      list: {
        kind: 'array',
        of: {kind: 'object', shape: {v: {kind: 'string', required: true}}},
      },
    };
    expect(validateProps(spec, {a: {b: 1}, list: [{v: 'x'}]})).toEqual([]);
    expect(validateProps(spec, {a: {}})[0].startsWith('a.b')).toBe(true);
    expect(validateProps(spec, {a: 5}).length).toBeGreaterThan(0);
    expect(validateProps(spec, {list: [{v: 'x'}, {}]})[0].startsWith('list[1].v')).toBe(true);
  });
  test('khoá lạ bị từ chối và nêu tên khoá', () => {
    const e = validateProps(str, {s: 'abc', la: 1});
    expect(e).toHaveLength(1);
    expect(e[0]).toContain('la');
  });
  test('props không phải đối tượng bị từ chối', () => {
    for (const bad of [null, undefined, 'x', 5, []]) {
      expect(validateProps(str, bad).length, String(bad)).toBeGreaterThan(0);
    }
  });
  test('trả về mọi lỗi, không dừng ở lỗi đầu', () => {
    const spec: PropsSpec = {
      a: {kind: 'string', required: true},
      b: {kind: 'number', required: true},
    };
    expect(validateProps(spec, {}).length).toBe(2);
  });
});

describe('[6-2] registry: catalog 18 loại, resolveScene, specOf', () => {
  test('CATALOG có đúng 18 khoá của hợp đồng, mỗi loại có Component và spec cùng type', () => {
    expect(Object.keys(CATALOG).sort()).toEqual([...CATALOG_TYPES].sort());
    for (const type of CATALOG_TYPES) {
      const e = CATALOG[type];
      expect(typeof e.Component, type).toBe('function');
      expect(e.spec.type, type).toBe(type);
      expect(Array.isArray(e.spec.cues)).toBe(true);
      expect(Number.isInteger(e.spec.minBeats)).toBe(true);
      expect(e.spec.minBeats).toBeGreaterThanOrEqual(0);
    }
  });

  test('ví dụ trong spec qua validateProps (trừ spec giữ chỗ anyProps)', () => {
    for (const type of CATALOG_TYPES) {
      const s = CATALOG[type].spec;
      if (s.anyProps) continue;
      expect(validateProps(s.propsSpec, s.example), type).toEqual([]);
    }
  });

  test('resolveScene: catalog trả component; loại lạ ném lỗi', () => {
    for (const type of CATALOG_TYPES) {
      expect(resolveScene(type)).toBe(CATALOG[type].Component);
    }
    expect(() => resolveScene('khong-co')).toThrow(/khong-co/);
  });

  test('resolveScene: custom:mo-phong đã đăng ký; chưa đăng ký hoặc thiếu tên ném lỗi', () => {
    expect(typeof CUSTOM_SCENES['mo-phong']).toBe('function');
    expect(resolveScene('custom:mo-phong')).toBe(CUSTOM_SCENES['mo-phong']);
    expect(() => resolveScene('custom:chua-dang-ky')).toThrow(/chua-dang-ky/);
    expect(() => resolveScene('custom:')).toThrow();
  });

  test('khoá CUSTOM_SCENES không có tiền tố custom:', () => {
    for (const k of Object.keys(CUSTOM_SCENES)) expect(k.startsWith('custom:')).toBe(false);
  });

  test('specOf: custom: trả null; loại catalog trả spec', () => {
    expect(specOf('custom:mo-phong')).toBeNull();
    expect(specOf('cold-open')).toBe(CATALOG['cold-open'].spec);
  });
});

describe('[6-2] ba cảnh cấu trúc: propsSpec đúng bảng thiết kế', () => {
  const ok = (type: 'cold-open' | 'chapter-title' | 'recap-outro', p: unknown) =>
    validateProps(CATALOG[type].spec.propsSpec, p);
  const s = (n: number) => 'a'.repeat(n);

  test('minBeats và cues', () => {
    expect(CATALOG['cold-open'].spec.minBeats).toBe(1);
    expect(CATALOG['chapter-title'].spec.minBeats).toBe(0);
    expect(CATALOG['recap-outro'].spec.minBeats).toBe(1);
    expect(CATALOG['cold-open'].spec.cues).toEqual(['hook']);
  });
  test('cold-open: hook 1..80 bắt buộc, kicker <= 40', () => {
    expect(ok('cold-open', {hook: s(1)})).toEqual([]);
    expect(ok('cold-open', {hook: s(80), kicker: s(40)})).toEqual([]);
    expect(ok('cold-open', {}).length).toBeGreaterThan(0);
    expect(ok('cold-open', {hook: ''}).length).toBeGreaterThan(0);
    expect(ok('cold-open', {hook: s(81)}).length).toBeGreaterThan(0);
    expect(ok('cold-open', {hook: 'x', kicker: s(41)}).length).toBeGreaterThan(0);
    expect(ok('cold-open', {hook: 'x', la: 1}).length).toBeGreaterThan(0);
  });
  test('chapter-title: title 1..80 bắt buộc, number nguyên 1..99, subtitle <= 80', () => {
    expect(ok('chapter-title', {title: s(80), number: 99, subtitle: s(80)})).toEqual([]);
    expect(ok('chapter-title', {title: 'x', number: 1})).toEqual([]);
    expect(ok('chapter-title', {}).length).toBeGreaterThan(0);
    expect(ok('chapter-title', {title: s(81)}).length).toBeGreaterThan(0);
    for (const n of [0, 100, 1.5]) {
      expect(ok('chapter-title', {title: 'x', number: n}).length, String(n)).toBeGreaterThan(0);
    }
    expect(ok('chapter-title', {title: 'x', subtitle: s(81)}).length).toBeGreaterThan(0);
  });
  test('recap-outro: points 1..5 chuỗi 1..70 bắt buộc, next <= 80', () => {
    expect(ok('recap-outro', {points: [s(70)], next: s(80)})).toEqual([]);
    expect(ok('recap-outro', {points: ['a', 'b', 'c', 'd', 'e']})).toEqual([]);
    expect(ok('recap-outro', {}).length).toBeGreaterThan(0);
    expect(ok('recap-outro', {points: []}).length).toBeGreaterThan(0);
    expect(ok('recap-outro', {points: ['a', 'b', 'c', 'd', 'e', 'f']}).length).toBeGreaterThan(0);
    expect(ok('recap-outro', {points: [s(71)]}).length).toBeGreaterThan(0);
    expect(ok('recap-outro', {points: ['']}).length).toBeGreaterThan(0);
    expect(ok('recap-outro', {points: ['a'], next: s(81)}).length).toBeGreaterThan(0);
  });
});
