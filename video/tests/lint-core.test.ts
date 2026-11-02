import {describe, expect, test} from 'vitest';
import {
  levenshtein,
  lintEpisode,
  similarity,
  type Finding,
  type LintInput,
} from '../scripts/lint-core';

// Tập hợp lệ: 28 cảnh, 14 loại, 4 cảnh custom:mo-phong (đã đăng ký), 4 chương,
// mỗi cảnh 600 frame (= 20 giây, đúng biên) nên tổng 16800 >= 16200.
const MIDDLE = [
  'big-number',
  'compare',
  'custom:mo-phong',
  'myth-fact',
  'flow',
  'chart',
  'custom:mo-phong',
  'term-card',
  'layers',
  'history-timeline',
  'bits',
  'tree-graph',
  'code-walk',
];

function propsFor(type: string): Record<string, unknown> {
  if (type === 'cold-open') return {hook: 'Máy tính chỉ hiểu 0 và 1'};
  if (type === 'chapter-title') return {title: 'Chương'};
  if (type === 'recap-outro') return {points: ['Một điểm']};
  return {};
}

function good(): LintInput {
  const types = ['cold-open', ...MIDDLE, ...MIDDLE, 'recap-outro'];
  return {
    slug: 'tap-moi',
    theme: 'mau-b',
    index: [],
    hasDurations: true,
    scenes: types.map((type, i) => ({
      id: `sc${i}`,
      type,
      chapter: `c${Math.floor(i / 7)}`,
      props: propsFor(type),
      durationFrames: 600,
      beats:
        type === 'cold-open'
          ? [{cue: 'hook'}]
          : type === 'recap-outro'
            ? [{}]
            : [],
    })),
  };
}

const errors = (f: Finding[]) => f.filter((x) => x.level === 'error');
const rules = (f: Finding[]) => f.map((x) => x.rule);
const errRules = (f: Finding[]) => errors(f).map((x) => x.rule);

describe('[6-3] lintEpisode: tập hợp lệ', () => {
  test('tập mẫu không có phát hiện nào (kể cả cảnh báo)', () => {
    expect(lintEpisode(good())).toEqual([]);
  });
  test('không sửa đầu vào', () => {
    const a = good();
    lintEpisode(a);
    expect(a).toEqual(good());
  });
});

describe('[6-3] lintEpisode: mỗi luật có mẫu sai', () => {
  const only = (input: LintInput, rule: string) => {
    const f = lintEpisode(input);
    expect(errRules(f)).toContain(rule);
    return f;
  };

  test('min-types: dưới 10 loại (9 loại lỗi, 10 loại đạt)', () => {
    const a = good();
    // Gộp về 9 loại: đổi mọi cảnh giữa thuộc 4 loại cuối thành loại khác.
    const drop = new Set(['tree-graph', 'code-walk', 'bits', 'history-timeline']);
    for (const s of a.scenes) if (drop.has(s.type)) s.type = 'flow';
    // 4 loại bị gộp -> còn 14 - 4 = 10; thêm một loại nữa để thành 9
    for (const s of a.scenes) if (s.type === 'layers') s.type = 'flow';
    const f = lintEpisode(a);
    expect(errRules(f)).toContain('min-types');
    // đúng 10 loại thì không báo min-types
    const b = good();
    for (const s of b.scenes) if (s.type === 'tree-graph') s.type = 'flow';
    for (const s of b.scenes) if (s.type === 'code-walk') s.type = 'flow';
    for (const s of b.scenes) if (s.type === 'bits') s.type = 'flow';
    for (const s of b.scenes) if (s.type === 'history-timeline') s.type = 'flow';
    expect(new Set(b.scenes.map((s) => s.type)).size).toBe(10);
    expect(errRules(lintEpisode(b))).not.toContain('min-types');
  });

  test('max-same-type: 28 cảnh cho tối đa 5 mỗi loại (5 đạt, 6 lỗi)', () => {
    const mk = (n: number) => {
      const a = good();
      // đặt n cảnh 'flow' không liền nhau: các vị trí 2,4,6,... (cách nhau ≥ 1 cảnh)
      const at = [2, 4, 6, 8, 10, 12, 14].slice(0, n);
      for (const s of a.scenes) if (s.type === 'flow') s.type = 'chart';
      for (const i of at) a.scenes[i].type = 'flow';
      return a;
    };
    expect(errRules(lintEpisode(mk(5)))).not.toContain('max-same-type');
    only(mk(6), 'max-same-type');
  });

  test('max-same-type: ngưỡng co giãn theo số cảnh (10 cảnh -> tối đa 1)', () => {
    const a = good();
    a.scenes = a.scenes.slice(0, 9); // cold-open + 8 cảnh giữa
    a.scenes.push({
      id: 'z',
      type: 'recap-outro',
      chapter: 'c0',
      props: {points: ['x']},
      durationFrames: 600,
      beats: [{}],
    });
    // 10 cảnh: floor(10*9/48)=1, mà 'custom' xuất hiện 2 lần trong 8 cảnh giữa
    const f = lintEpisode(a);
    expect(errRules(f)).toContain('max-same-type');
  });

  test('custom:* gộp làm một loại: min-types (8 loại catalog + 3 tên custom = 9 loại)', () => {
    const a = good();
    const keep = new Set([
      'cold-open', 'recap-outro', 'big-number', 'compare',
      'myth-fact', 'flow', 'chart', 'term-card',
    ]);
    const names = ['custom:a', 'custom:b', 'custom:c'];
    let n = 0;
    for (const s of a.scenes) {
      if (s.type.startsWith('custom:')) s.type = names[n++ % 3];
      else if (!keep.has(s.type)) s.type = 'flow';
    }
    expect(new Set(a.scenes.map((s) => s.type)).size).toBe(11); // nếu không gộp
    only(a, 'min-types');
  });

  test('custom:* gộp làm một loại: max-same-type (6 cảnh custom tên khác nhau, tối đa 5)', () => {
    const a = good();
    const repl = ['big-number', 'compare'];
    let r = 0;
    for (const s of a.scenes) if (s.type.startsWith('custom:')) s.type = repl[r++ % 2];
    const at = [2, 5, 8, 11, 14, 17];
    at.forEach((i, k) => (a.scenes[i].type = `custom:ten${k % 3}`));
    expect(a.scenes.filter((s) => s.type.startsWith('custom:'))).toHaveLength(6);
    for (const t of ['big-number', 'compare', 'chart', 'flow', 'bits']) {
      expect(a.scenes.filter((s) => s.type === t).length, t).toBeLessThanOrEqual(5);
    }
    only(a, 'max-same-type');
  });

  test('no-three-in-row: ba cảnh liền nhau cùng loại lỗi, hai thì không', () => {
    const a = good();
    a.scenes[8].type = 'flow';
    a.scenes[9].type = 'flow';
    expect(errRules(lintEpisode(a))).not.toContain('no-three-in-row');
    a.scenes[10].type = 'flow';
    only(a, 'no-three-in-row');
  });

  test('no-three-in-row: ba cảnh custom liền nhau bị tính cùng loại custom', () => {
    const a = good();
    a.scenes[8].type = 'custom:mo-phong';
    a.scenes[9].type = 'custom:mo-phong';
    a.scenes[10].type = 'custom:mo-phong';
    only(a, 'no-three-in-row');
  });

  test('min-custom: 2 cảnh custom lỗi, 3 đạt', () => {
    const mk = (n: number) => {
      const a = good();
      let left = n;
      for (const s of a.scenes) {
        if (s.type.startsWith('custom:')) {
          if (left-- <= 0) s.type = 'chart';
        }
      }
      return a;
    };
    expect(errRules(lintEpisode(mk(3)))).not.toContain('min-custom');
    only(mk(2), 'min-custom');
    only(mk(0), 'min-custom');
  });

  test('first-cold-open: cảnh đầu không phải cold-open', () => {
    const a = good();
    a.scenes[0].type = 'big-number';
    only(a, 'first-cold-open');
  });

  test('last-recap-outro: cảnh cuối không phải recap-outro', () => {
    const a = good();
    a.scenes[27].type = 'chart';
    only(a, 'last-recap-outro');
  });

  test('first/last: danh sách cảnh rỗng không làm lint sập, báo lỗi', () => {
    const a = good();
    a.scenes = [];
    const f = lintEpisode(a);
    expect(errRules(f)).toEqual(
      expect.arrayContaining(['first-cold-open', 'last-recap-outro']),
    );
  });

  test('theme-differs: trùng theme tập liền trước (mục đứng trước slug trong index)', () => {
    const a = good();
    a.theme = 'mau-b';
    a.index = [
      {slug: 'tap-1', theme: 'mau-a', sceneTypes: []},
      {slug: 'tap-2', theme: 'mau-b', sceneTypes: []},
      {slug: 'tap-moi', theme: 'mau-b'},
    ];
    only(a, 'theme-differs');
    a.index[1].theme = 'mau-c'; // tập liền trước khác theme: đạt
    expect(errRules(lintEpisode(a))).not.toContain('theme-differs');
  });

  test('theme-differs: slug chưa có trong index thì so với mục cuối; theme trùng tập xa hơn thì được', () => {
    const a = good();
    a.theme = 'mau-b';
    a.index = [
      {slug: 'tap-1', theme: 'mau-b', sceneTypes: []},
      {slug: 'tap-2', theme: 'mau-a', sceneTypes: []},
    ];
    expect(errRules(lintEpisode(a))).not.toContain('theme-differs');
    a.index[1].theme = 'mau-b';
    only(a, 'theme-differs');
  });

  test('theme-differs: index rỗng thì đạt', () => {
    expect(errRules(lintEpisode(good()))).not.toContain('theme-differs');
  });

  test('theme-known: theme không có trong THEMES', () => {
    const a = good();
    a.theme = 'mau-khong-co';
    only(a, 'theme-known');
  });

  test('sequence-similarity: chuỗi y hệt tập cũ lỗi; hoàn toàn khác thì đạt', () => {
    const a = good();
    const same = a.scenes.map((s) => s.type);
    a.index = [{slug: 'tap-cu', theme: 'mau-c', sceneTypes: same}];
    only(a, 'sequence-similarity');
    a.index = [
      {slug: 'tap-cu', theme: 'mau-c', sceneTypes: same.map(() => 'khac')},
    ];
    expect(errRules(lintEpisode(a))).not.toContain('sequence-similarity');
  });

  test('sequence-similarity: biên 0,6 (10 cảnh: đổi 4 -> 0,6 lỗi; đổi 5 -> 0,5 đạt)', () => {
    const base = good();
    base.hasDurations = false;
    base.scenes = base.scenes.slice(0, 10);
    const mine = base.scenes.map((s) => s.type);
    const change = (n: number) =>
      mine.map((t, i) => (i < n ? `loai-khac-${i}` : t));
    const a1: LintInput = {
      ...base,
      index: [{slug: 'cu', theme: 'mau-c', sceneTypes: change(4)}],
    };
    expect(rules(lintEpisode(a1))).toContain('sequence-similarity');
    const a2: LintInput = {
      ...base,
      index: [{slug: 'cu', theme: 'mau-c', sceneTypes: change(5)}],
    };
    expect(rules(lintEpisode(a2))).not.toContain('sequence-similarity');
  });

  test('sequence-similarity: mọi custom:* gộp thành custom (tên khác vẫn giống)', () => {
    const a = good();
    const other = a.scenes.map((s) =>
      s.type.startsWith('custom:') ? 'custom:ten-khac' : s.type,
    );
    a.index = [{slug: 'tap-cu', theme: 'mau-c', sceneTypes: other}];
    only(a, 'sequence-similarity');
  });

  test('sequence-similarity: so với bất kỳ tập cũ, không chỉ tập liền trước; bỏ qua chính slug đó', () => {
    const a = good();
    const same = a.scenes.map((s) => s.type);
    a.index = [
      {slug: 'tap-1', theme: 'mau-c', sceneTypes: same},
      {slug: 'tap-2', theme: 'mau-d', sceneTypes: ['x']},
    ];
    only(a, 'sequence-similarity');
    a.index = [{slug: 'tap-moi', theme: 'mau-c', sceneTypes: same}];
    expect(errRules(lintEpisode(a))).not.toContain('sequence-similarity');
  });

  test('min-duration: tổng 16199 frame lỗi, 16200 đạt', () => {
    const a = good();
    for (const s of a.scenes) s.durationFrames = 600;
    a.scenes[0].durationFrames = 600 - (16800 - 16199);
    // 16800 - 601 = 16199
    expect(a.scenes.reduce((n, s) => n + (s.durationFrames ?? 0), 0)).toBe(16199);
    only(a, 'min-duration');
    a.scenes[0].durationFrames! += 1;
    expect(errRules(lintEpisode(a))).not.toContain('min-duration');
  });

  test('max-scene-duration: 600 frame đạt, 601 lỗi', () => {
    const a = good();
    expect(errRules(lintEpisode(a))).not.toContain('max-scene-duration');
    a.scenes[5].durationFrames = 601;
    only(a, 'max-scene-duration');
  });

  test('hasDurations=false bỏ cả hai luật thời lượng và luật chương ngắn', () => {
    const a = good();
    a.hasDurations = false;
    for (const s of a.scenes) s.durationFrames = undefined;
    expect(lintEpisode(a)).toEqual([]);
    a.scenes[5].durationFrames = 99999;
    a.scenes[6].durationFrames = 1;
    expect(errRules(lintEpisode(a))).toEqual([]);
  });

  test('chương dưới 10 giây là lỗi (299 frame lỗi, 300 đạt) và nêu id chương', () => {
    const a = good();
    // chương c3 gồm cảnh 21..27: thu còn 1 cảnh (c3 chỉ còn sc21 thuộc c3)
    for (const s of a.scenes) if (s.chapter === 'c3') s.chapter = 'c2';
    a.scenes[27].chapter = 'c3';
    a.scenes[27].durationFrames = 299;
    const f = lintEpisode(a);
    const hit = errors(f).filter((x) => x.message.includes('c3'));
    expect(hit.length).toBeGreaterThan(0);
    a.scenes[27].durationFrames = 300;
    expect(errors(lintEpisode(a)).filter((x) => x.message.includes('c3'))).toEqual([]);
    expect(errors(lintEpisode(a))).toEqual([]);
  });

  describe('props', () => {
    const withProps = (idx: number, props: unknown, type?: string) => {
      const a = good();
      if (type) a.scenes[idx].type = type;
      a.scenes[idx].props = props;
      return a;
    };
    test('cold-open thiếu hook', () => {
      const a = good();
      a.scenes[0].props = {};
      const f = only(a, 'props');
      expect(errors(f).some((x) => x.message.includes('sc0'))).toBe(true);
    });
    test('cold-open hook 81 ký tự', () => {
      const a = good();
      a.scenes[0].props = {hook: 'a'.repeat(81)};
      only(a, 'props');
    });
    test('khoá lạ trong props bị từ chối', () => {
      const a = good();
      a.scenes[0].props = {hook: 'x', la: 1};
      only(a, 'props');
    });
    test('chapter-title number 1.5', () => {
      only(withProps(1, {title: 'x', number: 1.5}, 'chapter-title'), 'props');
    });
    test('recap-outro 6 điểm', () => {
      const a = good();
      a.scenes[27].props = {points: ['a', 'b', 'c', 'd', 'e', 'f']};
      only(a, 'props');
    });
    test('loại cảnh không có trong catalog', () => {
      only(withProps(3, {}, 'khong-co-loai-nay'), 'props');
    });
    test('custom: chưa đăng ký trong episodes/registry.ts', () => {
      const f = only(withProps(2, {}, 'custom:chua-dang-ky'), 'props');
      expect(errors(f).some((x) => x.message.includes('chua-dang-ky'))).toBe(true);
    });
    test('custom: không có tên', () => {
      only(withProps(2, {}, 'custom:'), 'props');
    });
    test('props không phải đối tượng', () => {
      only(withProps(0, 'chuoi'), 'props');
      only(withProps(0, null), 'props');
      only(withProps(3, [], 'big-number'), 'props');
    });
    test('hợp lệ: props của custom: không bị kiểm khoá (tuỳ ý)', () => {
      const a = good();
      a.scenes[2].props = {bat_ky: 1};
      expect(errRules(lintEpisode(a))).toEqual([]);
    });
  });

  describe('cảnh báo (không phải lỗi)', () => {
    test('min-beats: cold-open không beat -> cảnh báo, không lỗi', () => {
      const a = good();
      a.scenes[0].beats = [];
      const f = lintEpisode(a);
      expect(f.filter((x) => x.rule === 'min-beats').map((x) => x.level)).toEqual([
        'warn',
      ]);
      expect(errors(f)).toEqual([]);
    });
    test('unknown-cue: cue ngoài danh sách -> cảnh báo; cue hook thì không', () => {
      const a = good();
      a.scenes[0].beats = [{cue: 'khong-biet'}];
      const f = lintEpisode(a);
      expect(f.filter((x) => x.rule === 'unknown-cue').map((x) => x.level)).toEqual([
        'warn',
      ]);
      expect(errors(f)).toEqual([]);
      a.scenes[0].beats = [{cue: 'hook'}];
      expect(lintEpisode(a)).toEqual([]);
    });
    test('unknown-cue: bỏ qua cảnh custom: và loại giữ chỗ', () => {
      const a = good();
      a.scenes[2].beats = [{cue: 'tuy-y'}];
      a.scenes[3].beats = [{cue: 'tuy-y'}];
      expect(lintEpisode(a)).toEqual([]);
    });
  });

  test('mỗi phát hiện có rule, level hợp lệ và thông điệp tiếng Việt', () => {
    const a = good();
    a.scenes[0].type = 'big-number';
    const f = lintEpisode(a);
    expect(f.length).toBeGreaterThan(0);
    for (const x of f) {
      expect(x.rule).toMatch(/^[a-z-]+$/);
      expect(['error', 'warn']).toContain(x.level);
      expect(x.message).toMatch(/[^\u0000-\u007f]/);
    }
  });
});

describe('[6-3] levenshtein và similarity', () => {
  test('levenshtein trên mảng chuỗi', () => {
    expect(levenshtein([], [])).toBe(0);
    expect(levenshtein(['a'], [])).toBe(1);
    expect(levenshtein([], ['a', 'b'])).toBe(2);
    expect(levenshtein(['a', 'b', 'c'], ['a', 'b', 'c'])).toBe(0);
    expect(levenshtein(['a', 'b', 'c'], ['a', 'x', 'c'])).toBe(1);
    expect(levenshtein(['a', 'b', 'c'], ['a', 'c'])).toBe(1);
    expect(levenshtein(['k', 'i', 't', 't', 'e', 'n'], ['s', 'i', 't', 't', 'i', 'n', 'g'])).toBe(3);
    expect(levenshtein(['ab', 'cd'], ['a', 'b', 'c', 'd'])).toBe(4); // phần tử là chuỗi, không phải ký tự
  });
  test('levenshtein đối xứng', () => {
    const a = ['x', 'y', 'z', 'x'];
    const b = ['y', 'x', 'z'];
    expect(levenshtein(a, b)).toBe(levenshtein(b, a));
  });
  test('similarity: 1 - levenshtein / độ dài lớn hơn; hai chuỗi rỗng = 1', () => {
    expect(similarity([], [])).toBe(1);
    expect(similarity(['a'], ['a'])).toBe(1);
    expect(similarity(['a'], ['b'])).toBe(0);
    expect(similarity(['a', 'b', 'c', 'd'], ['a', 'b', 'x', 'd'])).toBeCloseTo(0.75, 10);
    expect(similarity(['a', 'b'], [])).toBe(0);
    expect(similarity(['a', 'b', 'c', 'd'], ['a', 'b'])).toBeCloseTo(0.5, 10);
  });
});
