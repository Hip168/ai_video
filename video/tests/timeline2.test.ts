import {describe, expect, test} from 'vitest';
import {
  CATALOG_TYPES,
  activeBeat2,
  isCustomType,
  validateTimeline2,
} from '../src/timeline2';
import {loadSample2} from './helpers/sample2';

type Mutate = (t: any) => void;

describe('[6-1] validateTimeline2: file mẫu hợp đồng v2', () => {
  test('mẫu được nhận, trả về đúng nội dung và số liệu chính', () => {
    const t: any = validateTimeline2(loadSample2());
    expect(t).toEqual(loadSample2());
    expect(t.version).toBe(2);
    expect(t.fps).toBe(30);
    expect(t.width).toBe(1920);
    expect(t.height).toBe(1080);
    expect(t.durationInFrames).toBe(600);
    expect(t.theme).toBe('mau-a');
    expect(t.audio.src).toBe('narration.wav');
    expect(t.chapters.map((c: any) => c.id)).toEqual(['mo-dau', 'chuong-1']);
    expect(t.sfx).toHaveLength(2);
    expect(t.scenes.map((s: any) => s.type)).toEqual([
      'cold-open',
      'chapter-title',
      'custom:mo-phong',
    ]);
    expect(t.scenes[1].beats).toEqual([]);
  });

  test('không sửa đầu vào', () => {
    const s = loadSample2();
    validateTimeline2(s);
    expect(s).toEqual(loadSample2());
  });

  test('cảnh câm (beats rỗng) hợp lệ (luật 6)', () => {
    const s = loadSample2();
    expect(s.scenes[1].beats).toEqual([]);
    expect(() => validateTimeline2(s)).not.toThrow();
  });

  test('beat không cue hợp lệ (luật 8); khoảng hở giữa beat hợp lệ (luật 5)', () => {
    const s = loadSample2();
    for (const sc of s.scenes) for (const b of sc.beats) delete b.cue;
    expect(s.scenes[0].beats[1].startFrame).toBeGreaterThan(
      s.scenes[0].beats[0].startFrame + s.scenes[0].beats[0].durationFrames,
    );
    expect(() => validateTimeline2(s)).not.toThrow();
  });

  test('sfx rỗng hợp lệ (luật 13); gainDb = 0 và frame cuối hợp lệ (luật 10)', () => {
    const a = loadSample2();
    a.sfx = [];
    expect(() => validateTimeline2(a)).not.toThrow();
    const b = loadSample2();
    b.sfx = [{frame: 599, name: 'pop', gainDb: 0}];
    expect(() => validateTimeline2(b)).not.toThrow();
  });

  test('custom:<tên> hợp lệ (luật 3)', () => {
    const s = loadSample2();
    s.scenes[2].type = 'custom:ten-khac_1';
    expect(() => validateTimeline2(s)).not.toThrow();
  });

  test('cả 18 loại catalog đều được nhận làm type', () => {
    expect(CATALOG_TYPES).toHaveLength(18);
    expect(new Set(CATALOG_TYPES).size).toBe(18);
    for (const type of CATALOG_TYPES) {
      const s = loadSample2();
      s.scenes[2].type = type;
      expect(() => validateTimeline2(s), type).not.toThrow();
    }
  });

  test('CATALOG_TYPES đúng 18 id của hợp đồng', () => {
    expect([...CATALOG_TYPES].sort()).toEqual(
      [
        'cold-open',
        'chapter-title',
        'recap-outro',
        'big-number',
        'compare',
        'myth-fact',
        'history-timeline',
        'term-card',
        'chart',
        'flow',
        'layers',
        'scale-ladder',
        'tree-graph',
        'code-walk',
        'terminal',
        'bits',
        'memory-array',
        'algo-bars',
      ].sort(),
    );
  });

  test('isCustomType', () => {
    expect(isCustomType('custom:abc')).toBe(true);
    expect(isCustomType('cold-open')).toBe(false);
    expect(isCustomType('customabc')).toBe(false);
  });

  test('biên hợp lệ: text đúng 100 ký tự; beat kết thúc đúng cuối cảnh', () => {
    const s = loadSample2();
    s.scenes[0].beats[0].text = 'a'.repeat(100);
    s.scenes[2].beats[0].durationFrames = 210;
    expect(() => validateTimeline2(s)).not.toThrow();
  });
});

// [tên ca, hàm làm hỏng, regex vị trí phải có trong thông báo lỗi]
const BROKEN: Array<[string, Mutate, RegExp]> = [
  // Luật 1
  ['luật 1: version khác 2', (t) => (t.version = 1), /version/],
  ['luật 1: fps khác 30', (t) => (t.fps = 24), /fps/],
  ['luật 1: width khác 1920', (t) => (t.width = 1280), /width/],
  ['luật 1: height khác 1080', (t) => (t.height = 720), /height/],
  // Luật 2
  ['luật 2: durationInFrames không nguyên', (t) => (t.durationInFrames = 600.5), /durationInFrames/],
  ['luật 2: durationInFrames = 0', (t) => (t.durationInFrames = 0), /durationInFrames/],
  ['luật 2: startFrame cảnh không nguyên', (t) => (t.scenes[1].startFrame = 300.5), /scenes\[1\]\.startFrame/],
  ['luật 2: startFrame cảnh âm', (t) => (t.scenes[0].startFrame = -1), /scenes\[0\]\.startFrame/],
  ['luật 2: durationFrames cảnh = 0', (t) => (t.scenes[1].durationFrames = 0), /scenes\[1\]\.durationFrames/],
  ['luật 2: durationFrames cảnh không nguyên', (t) => (t.scenes[1].durationFrames = 90.5), /scenes\[1\]\.durationFrames/],
  ['luật 2: startFrame beat không nguyên', (t) => (t.scenes[0].beats[0].startFrame = 0.5), /beats\[0\]\.startFrame/],
  ['luật 2: startFrame beat âm', (t) => (t.scenes[0].beats[0].startFrame = -1), /beats\[0\]\.startFrame/],
  ['luật 2: durationFrames beat = 0', (t) => (t.scenes[0].beats[0].durationFrames = 0), /beats\[0\]\.durationFrames/],
  ['luật 2: durationFrames beat không nguyên', (t) => (t.scenes[0].beats[0].durationFrames = 10.5), /beats\[0\]\.durationFrames/],
  // Luật 3
  ['luật 3: id cảnh rỗng', (t) => (t.scenes[1].id = ''), /scenes\[1\]\.id/],
  ['luật 3: id cảnh trùng', (t) => (t.scenes[2].id = 'sc01'), /scenes\[2\]\.id/],
  ['luật 3: thiếu type', (t) => delete t.scenes[1].type, /scenes\[1\]\.type/],
  ['luật 3: type không thuộc catalog', (t) => (t.scenes[1].type = 'khong-co'), /scenes\[1\]\.type/],
  ['luật 3: type custom: không có tên', (t) => (t.scenes[2].type = 'custom:'), /scenes\[2\]\.type/],
  ['luật 3: props là mảng', (t) => (t.scenes[0].props = []), /scenes\[0\]\.props/],
  ['luật 3: props là null', (t) => (t.scenes[0].props = null), /scenes\[0\]\.props/],
  ['luật 3: thiếu props', (t) => delete t.scenes[0].props, /scenes\[0\]\.props/],
  // Luật 4
  ['luật 4: cảnh đầu không bắt đầu ở 0', (t) => (t.scenes[0].startFrame = 1), /scenes\[0\]\.startFrame/],
  ['luật 4: hở giữa hai cảnh', (t) => (t.scenes[1].startFrame = 301), /scenes\[1\]\.startFrame/],
  ['luật 4: chồng giữa hai cảnh', (t) => (t.scenes[1].startFrame = 299), /scenes\[1\]\.startFrame/],
  ['luật 4: cảnh cuối kết thúc sau durationInFrames', (t) => (t.durationInFrames = 599), /scenes\[2\]|durationInFrames/],
  ['luật 4: cảnh cuối kết thúc trước durationInFrames', (t) => (t.durationInFrames = 601), /scenes\[2\]|durationInFrames/],
  ['luật 4: thiếu scenes', (t) => delete t.scenes, /scenes/],
  ['luật 4: scenes rỗng', (t) => (t.scenes = []), /scenes/],
  // Luật 5
  ['luật 5: beat chồng beat trước', (t) => (t.scenes[0].beats[1].startFrame = 100), /beats\[1\]\.startFrame/],
  ['luật 5: beat bắt đầu trước đầu cảnh', (t) => (t.scenes[2].beats[0].startFrame = 389), /beats\[0\]\.startFrame/],
  ['luật 5: beat vượt cuối cảnh', (t) => (t.scenes[2].beats[0].durationFrames = 211), /beats\[0\]\.durationFrames/],
  [
    'luật 5: beat không tăng dần (đảo thứ tự)',
    (t) => t.scenes[0].beats.reverse(),
    /beats\[1\]\.startFrame/,
  ],
  // Luật 6
  ['luật 6: beat id trùng trong cùng cảnh', (t) => (t.scenes[0].beats[1].id = 'b001'), /beats\[1\]\.id/],
  ['luật 6: beat id trùng giữa hai cảnh', (t) => (t.scenes[2].beats[0].id = 'b001'), /beats\[0\]\.id/],
  ['luật 6: beat id rỗng', (t) => (t.scenes[0].beats[0].id = ''), /beats\[0\]\.id/],
  ['luật 6: beats không phải mảng', (t) => (t.scenes[1].beats = null), /scenes\[1\]\.beats/],
  ['luật 6: thiếu beats', (t) => delete t.scenes[0].beats, /scenes\[0\]\.beats/],
  // Luật 7
  ['luật 7: text rỗng', (t) => (t.scenes[0].beats[0].text = ''), /beats\[0\]\.text/],
  ['luật 7: text chỉ khoảng trắng', (t) => (t.scenes[0].beats[0].text = '   \t'), /beats\[0\]\.text/],
  ['luật 7: text 101 ký tự', (t) => (t.scenes[0].beats[0].text = 'a'.repeat(101)), /beats\[0\]\.text/],
  ['luật 7: text không phải NFC (NFD)', (t) => (t.scenes[0].beats[0].text = 'Việt'.normalize('NFD')), /beats\[0\]\.text/],
  ['luật 7: text không phải chuỗi', (t) => (t.scenes[0].beats[0].text = 5), /beats\[0\]\.text/],
  // Luật 8
  ['luật 8: cue là chuỗi rỗng', (t) => (t.scenes[0].beats[0].cue = ''), /beats\[0\]\.cue/],
  ['luật 8: cue là số', (t) => (t.scenes[0].beats[0].cue = 5), /beats\[0\]\.cue/],
  // Luật 9
  ['luật 9: chương đầu không ở frame 0', (t) => (t.chapters[0].startFrame = 1), /chapters\[0\]/],
  ['luật 9: id chương trùng', (t) => (t.chapters[1].id = 'mo-dau'), /chapters\[1\]/],
  ['luật 9: title chương rỗng', (t) => (t.chapters[0].title = ''), /chapters\[0\]\.title/],
  ['luật 9: title chương chỉ khoảng trắng', (t) => (t.chapters[0].title = '  '), /chapters\[0\]\.title/],
  ['luật 9: startFrame chương không tăng', (t) => (t.chapters[1].startFrame = 0), /chapters\[1\]/],
  ['luật 9: startFrame chương không nguyên', (t) => (t.chapters[1].startFrame = 300.5), /chapters\[1\]/],
  ['luật 9: cảnh trỏ chương không có', (t) => (t.scenes[2].chapter = 'ma'), /scenes\[2\]\.chapter/],
  ['luật 9: thiếu chapter của cảnh', (t) => delete t.scenes[2].chapter, /scenes\[2\]\.chapter/],
  ['luật 9: startFrame chương khác cảnh đầu của chương', (t) => (t.chapters[1].startFrame = 301), /chapters\[1\]/],
  [
    'luật 9: chương không có cảnh nào',
    (t) => t.chapters.push({id: 'mo-coi', title: 'Mồ côi', startFrame: 599}),
    /chapters\[2\]/,
  ],
  // Luật 10
  ['luật 10: sfx.frame = durationInFrames', (t) => (t.sfx[1].frame = 600), /sfx\[1\]\.frame/],
  ['luật 10: sfx.frame âm', (t) => (t.sfx[0].frame = -1), /sfx\[0\]\.frame/],
  ['luật 10: sfx.frame không nguyên', (t) => (t.sfx[0].frame = 0.5), /sfx\[0\]\.frame/],
  ['luật 10: sfx.frame giảm', (t) => (t.sfx[0].frame = 400), /sfx\[1\]\.frame/],
  ['luật 10: sfx.name rỗng', (t) => (t.sfx[0].name = ''), /sfx\[0\]\.name/],
  ['luật 10: sfx.gainDb dương', (t) => (t.sfx[0].gainDb = 1), /sfx\[0\]\.gainDb/],
  ['luật 10: sfx.gainDb không phải số', (t) => (t.sfx[0].gainDb = '-18'), /sfx\[0\]\.gainDb/],
  // Luật 12
  ['luật 12: theme rỗng', (t) => (t.theme = ''), /theme/],
  ['luật 12: thiếu theme', (t) => delete t.theme, /theme/],
  ['luật 12: thiếu audio', (t) => delete t.audio, /audio/],
  ['luật 12: audio.src rỗng', (t) => (t.audio.src = ''), /audio\.src/],
  ['luật 12: audio.src tuyệt đối', (t) => (t.audio.src = '/tmp/x.wav'), /audio\.src/],
  ['luật 12: audio.src là URL', (t) => (t.audio.src = 'https://x.vn/a.wav'), /audio\.src/],
  // Chuỗi (hợp đồng): chuỗi bắt buộc không được chỉ gồm khoảng trắng; audio.src không chứa ..
  ['chuỗi: id cảnh chỉ khoảng trắng', (t) => (t.scenes[1].id = '  '), /scenes\[1\]\.id/],
  ['chuỗi: type chỉ khoảng trắng', (t) => (t.scenes[1].type = ' '), /scenes\[1\]\.type/],
  ['chuỗi: chapter của cảnh chỉ khoảng trắng', (t) => (t.scenes[2].chapter = ' '), /scenes\[2\]\.chapter/],
  ['chuỗi: id beat chỉ khoảng trắng', (t) => (t.scenes[0].beats[0].id = ' \t'), /beats\[0\]\.id/],
  ['chuỗi: id chương chỉ khoảng trắng', (t) => (t.chapters[0].id = ' '), /chapters\[0\]\.id/],
  ['chuỗi: cue chỉ khoảng trắng', (t) => (t.scenes[0].beats[0].cue = '  '), /beats\[0\]\.cue/],
  ['chuỗi: sfx.name chỉ khoảng trắng', (t) => (t.sfx[0].name = ' '), /sfx\[0\]\.name/],
  ['chuỗi: theme chỉ khoảng trắng', (t) => (t.theme = '   '), /theme/],
  ['chuỗi: audio.src chỉ khoảng trắng', (t) => (t.audio.src = '  '), /audio\.src/],
  ['chuỗi: audio.src chứa ..', (t) => (t.audio.src = '../narration.wav'), /audio\.src/],
  ['chuỗi: audio.src chứa .. ở giữa', (t) => (t.audio.src = 'a/../b.wav'), /audio\.src/],
  // Luật 13
  ['luật 13: chapters rỗng', (t) => (t.chapters = []), /chapters/],
  ['luật 13: thiếu chapters', (t) => delete t.chapters, /chapters/],
  ['luật 13: thiếu khoá sfx', (t) => delete t.sfx, /sfx/],
  ['luật 13: sfx không phải mảng', (t) => (t.sfx = {}), /sfx/],
];

describe('[6-1] validateTimeline2: mỗi luật có mẫu sai', () => {
  test.each(BROKEN)('%s', (_name, mutate, where) => {
    const s = loadSample2();
    mutate(s);
    let err: Error | null = null;
    try {
      validateTimeline2(s);
    } catch (e) {
      err = e as Error;
    }
    expect(err, 'phải ném lỗi').not.toBeNull();
    expect(err!.message).toMatch(/^timeline\.json: /);
    expect(err!.message).toMatch(where);
    expect(err!.message).toMatch(/[^\u0000-\u007f]/); // tiếng Việt có dấu
  });

  test.each([
    ['null', null],
    ['undefined', undefined],
    ['chuỗi', 'x'],
    ['số', 5],
    ['mảng', []],
  ])('đầu vào %s không phải đối tượng bị từ chối', (_n, v) => {
    expect(() => validateTimeline2(v)).toThrow(/^timeline\.json: /);
  });

  test('mỗi luật 1-10, 12, 13 có ít nhất một mẫu sai trong bảng', () => {
    for (const n of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 13]) {
      expect(
        BROKEN.some(([name]) => name.startsWith(`luật ${n}:`)),
        `luật ${n}`,
      ).toBe(true);
    }
  });
});

describe('[6-1] activeBeat2', () => {
  const t: any = validateTimeline2(loadSample2());
  test.each([
    [0, 'b001'],
    [119, 'b001'],
    [150, 'b002'],
    [269, 'b002'],
    [390, 'b003'],
    [569, 'b003'],
  ])('frame %i -> beat %s', (f, id) => {
    expect(activeBeat2(t, f)?.id).toBe(id);
  });

  test.each([120, 135, 149, 270, 299, 300, 389, 570, 599, 600, 5000, -1])(
    'frame %i không có beat (khoảng hở, cảnh câm, ngoài video)',
    (f) => {
      expect(activeBeat2(t, f)).toBeNull();
    },
  );
});
