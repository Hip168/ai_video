import {describe, expect, test} from 'vitest';
import {CUSTOM_SQUARE} from '../src/episodes/registry';
import {clipRange} from '../src/Short';
import {validateShorts} from '../src/shorts';
import type {Timeline2} from '../src/timeline2';
import {loadSample2} from './helpers/sample2';

// [14-3] validateShorts (video/src/shorts.ts): cùng luật với
// `python -m aivideo.shorts validate`. Giao diện: .team/features/14-shorts-
// giao-dien.md mục 5 (D33). Các phần KHÔNG cần phủ kín tập.

/** Mỗi phần tử của plan: số frame của cảnh; âm = cảnh không beat; chuỗi = custom. */
type Item = number | {frames: number; type: string};
function timeline(plan: Item[]): {tl: Timeline2; ids: Array<[string, string] | null>} {
  const t = loadSample2();
  const base = t.scenes[0];
  const chap = t.scenes[1];
  let pos = 0;
  let n = 0;
  const ids: Array<[string, string] | null> = [];
  t.scenes = plan.map((it, k) => {
    const frames = typeof it === 'number' ? Math.abs(it) : it.frames;
    const noBeat = typeof it === 'number' && it < 0;
    const sc = structuredClone(noBeat ? chap : base);
    Object.assign(sc, {id: `sc${k}`, chapter: 'mo-dau', startFrame: pos, durationFrames: frames});
    if (typeof it !== 'number') {
      sc.type = `custom:${it.type}`;
      sc.props = {};
    }
    if (noBeat) {
      sc.beats = [];
      ids.push(null);
    } else {
      const h = Math.floor(frames / 2);
      n += 2;
      sc.beats = [
        {id: `b${n - 1}`, startFrame: pos, durationFrames: h - 1, text: 'a'},
        {id: `b${n}`, startFrame: pos + h, durationFrames: frames - h - 1, text: 'b'},
      ];
      ids.push([`b${n - 1}`, `b${n}`]);
    }
    pos += frames;
    return sc;
  });
  t.chapters = [{id: 'mo-dau', title: 'Mở đầu', startFrame: 0}];
  t.durationInFrames = pos;
  t.sfx = [];
  return {tl: t as Timeline2, ids};
}

type Env = ReturnType<typeof timeline>;
function parts(e: Env, spans: Array<[number, number]>, over: Record<string, unknown> = {}) {
  const total = spans.length;
  return {
    version: 1,
    shorts: spans.map(([a, b], i) => ({
      part: i + 1,
      total,
      from: e.ids[a]![0],
      to: e.ids[b]![1],
      title: 'Tiêu đề',
      hook: 'Móc',
      ...over,
    })),
  };
}
const SIX = [600, 600, 600, 600, 600, 600];

describe('[14-3] validateShorts: phần hợp lệ', () => {
  test('3 phần đầu của tập 6 cảnh: không lỗi, không cảnh báo (không cần phủ kín tập)', () => {
    const e = timeline(SIX);
    expect(validateShorts(parts(e, [[0, 1], [2, 2], [3, 3]]), e.tl)).toEqual({errors: [], warnings: []});
  });
  test('1 phần và 8 phần đều đạt', () => {
    const e = timeline(SIX);
    expect(validateShorts(parts(e, [[0, 5]]), e.tl).errors).toEqual([]);
    const f = timeline([300, 300, 300, 300, 300, 300, 300, 300]);
    expect(validateShorts(parts(f, [0, 1, 2, 3, 4, 5, 6, 7].map((i) => [i, i] as [number, number])), f.tl).errors).toEqual([]);
  });
  test('cảnh tiêu đề không beat nằm giữa hai phần: không bị tính là chồng', () => {
    const e = timeline([600, 600, -90, 600, 600]);
    expect(validateShorts(parts(e, [[0, 1], [3, 4]]), e.tl).errors).toEqual([]);
  });
  test('đúng 5400 frame đạt; 5402 bị từ chối', () => {
    const a = timeline([5400, 600]);
    expect(validateShorts(parts(a, [[0, 0]]), a.tl).errors).toEqual([]);
    const b = timeline([5402, 600]);
    expect(validateShorts(parts(b, [[0, 0]]), b.tl).errors.length).toBeGreaterThan(0);
  });
  test('trên 150 s chỉ cảnh báo, không lỗi', () => {
    const e = timeline([4600, 600]);
    const r = validateShorts(parts(e, [[0, 0]]), e.tl);
    expect(r.errors).toEqual([]);
    expect(r.warnings.length).toBe(1);
  });
});

describe('[14-3] validateShorts: lỗi', () => {
  const bad = (e: Env, raw: unknown) => {
    // điều kiện cần: bản hợp lệ của cùng timeline đạt
    const k = e.ids
      .map((x, i) => [x, i] as const)
      .filter(([x]) => x !== null)
      .sort((a, b) => e.tl.scenes[a[1]].durationFrames - e.tl.scenes[b[1]].durationFrames)[0][1];
    expect(validateShorts(parts(e, [[k, k]]), e.tl).errors).toEqual([]);
    const r = validateShorts(raw, e.tl);
    expect(r.errors.length).toBeGreaterThan(0);
    return r.errors.join('\n');
  };
  test('0 phần và 9 phần', () => {
    const e = timeline(SIX);
    bad(e, {version: 1, shorts: []});
    const f = timeline(Array(9).fill(300));
    bad(f, parts(f, Array.from({length: 9}, (_, i) => [i, i] as [number, number])));
  });
  test('không phải object có mảng shorts', () => {
    const e = timeline(SIX);
    bad(e, null);
    bad(e, {shorts: 'x'});
  });
  test('part sai thứ tự và total sai', () => {
    const e = timeline(SIX);
    const p = parts(e, [[0, 0], [1, 1]]);
    p.shorts[1].part = 3;
    bad(e, p);
    const q = parts(e, [[0, 0], [1, 1]]);
    q.shorts[0].total = 3;
    bad(e, q);
  });
  test('from không phải beat đầu của cảnh; to không phải beat cuối', () => {
    const e = timeline(SIX);
    const p = parts(e, [[0, 0]]);
    p.shorts[0].from = e.ids[0]![1];
    expect(bad(e, p)).toContain(p.shorts[0].from);
    const q = parts(e, [[0, 0]]);
    q.shorts[0].to = e.ids[0]![0];
    expect(bad(e, q)).toContain(q.shorts[0].to);
  });
  test('beat không có trong timeline; to đứng trước from', () => {
    const e = timeline(SIX);
    const p = parts(e, [[0, 0]]);
    p.shorts[0].to = 'b999';
    bad(e, p);
    const q = parts(e, [[2, 2]]);
    q.shorts[0].to = e.ids[0]![1];
    bad(e, q);
  });
  test('hai phần chồng nhau; sai thứ tự', () => {
    const e = timeline(SIX);
    expect(validateShorts(parts(e, [[0, 1], [2, 3]]), e.tl).errors).toEqual([]);
    bad(e, parts(e, [[0, 2], [2, 3]]));
    bad(e, parts(e, [[2, 3], [0, 1]]));
  });
  test('clipRange lùi qua cảnh tiêu đề ngay trước from: 500 + 5000 > 5400', () => {
    const e = timeline([-500, 5000, 600]);
    bad(e, parts(e, [[1, 1]]));
  });
  test('hook 1..40 ký tự (đếm ký tự, không đếm byte)', () => {
    const e = timeline(SIX);
    expect(validateShorts(parts(e, [[0, 0]], {hook: 'Ư'.repeat(40)}), e.tl).errors).toEqual([]);
    bad(e, parts(e, [[0, 0]], {hook: ''}));
    bad(e, parts(e, [[0, 0]], {hook: 'x'.repeat(41)}));
  });
  test('title rỗng; title + " (Phần k/N) #Shorts" tối đa 100', () => {
    const e = timeline(SIX);
    bad(e, parts(e, [[0, 0]], {title: ''}));
    const suffix = ' (Phần 1/1) #Shorts';
    expect(validateShorts(parts(e, [[0, 0]], {title: 'a'.repeat(100 - suffix.length)}), e.tl).errors).toEqual([]);
    bad(e, parts(e, [[0, 0]], {title: 'a'.repeat(101 - suffix.length)}));
  });
});

describe('[14-3] validateShorts: cảnh custom và CUSTOM_SQUARE', () => {
  test('5 cảnh của tập đầu đã khai là hỗ trợ khung vuông', () => {
    for (const n of ['mach-den', 'bite-byte', 'dien-ap', 'bon-muoi-bit', 'bo-dem-vong']) {
      expect(CUSTOM_SQUARE.has(n), n).toBe(true);
    }
  });
  test('cảnh custom có trong CUSTOM_SQUARE: phần chứa nó đạt', () => {
    const e = timeline([600, {frames: 600, type: 'mach-den'}, 600]);
    expect(validateShorts(parts(e, [[0, 2]]), e.tl).errors).toEqual([]);
  });
  test('cảnh custom không có trong CUSTOM_SQUARE: lỗi nêu tên cảnh; ngoài phần thì không sao', () => {
    const e = timeline([600, {frames: 600, type: 'khong-ho-tro-vuong'}, 600]);
    const r = validateShorts(parts(e, [[0, 2]]), e.tl);
    expect(r.errors.length).toBe(1);
    expect(r.errors[0]).toContain('khong-ho-tro-vuong');
    expect(validateShorts(parts(e, [[0, 0]]), e.tl).errors).toEqual([]);
  });
});

describe('[14-1] clipRange', () => {
  test('start lùi qua cảnh không beat đứng ngay trước; end là cuối CẢNH chứa to', () => {
    const e = timeline([600, -90, 600]);
    expect(clipRange(e.tl, {from: e.ids[2]![0], to: e.ids[2]![1]})).toEqual({start: 600, end: 1290});
    expect(clipRange(e.tl, {from: e.ids[0]![0], to: e.ids[0]![0]})).toEqual({start: 0, end: 600});
  });
  test('beat không có hoặc to đứng trước from: ném lỗi nêu id', () => {
    const e = timeline([600, 600]);
    expect(() => clipRange(e.tl, {from: 'b999', to: e.ids[0]![1]})).toThrow(/b999/);
    expect(() => clipRange(e.tl, {from: e.ids[1]![0], to: e.ids[0]![1]})).toThrow();
  });
});
