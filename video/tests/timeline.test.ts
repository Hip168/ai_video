import {describe, expect, test} from 'vitest';
import {activeBeat, validateTimeline} from '../src/timeline';
import {loadSample} from './helpers/sample';

describe('[2-1] validateTimeline: file mẫu hợp lệ', () => {
  test('file mẫu của hợp đồng được chấp nhận, giữ nguyên số liệu chính', () => {
    const sample = loadSample();
    const t: any = validateTimeline(sample);
    expect(t.version).toBe(1);
    expect(t.fps).toBe(30);
    expect(t.width).toBe(1920);
    expect(t.height).toBe(1080);
    expect(t.durationInFrames).toBe(2307);
    expect(t.audio.src).toBe('audio/narration.wav');
    expect(t).toEqual(loadSample());
    expect(t.scenes.map((s: any) => s.id)).toEqual([
      'phone',
      'dns',
      'packets',
      'wifi',
      'hops',
      'server',
      'receiver',
    ]);
    const beatCount = t.scenes.reduce(
      (n: number, s: any) => n + s.beats.length,
      0,
    );
    expect(beatCount).toBe(19);
  });

  test('beat giữ nguyên id, startFrame, durationFrames, text và cue', () => {
    const t: any = validateTimeline(loadSample());
    expect(t.scenes[0].beats[0]).toMatchObject({
      id: 's01',
      startFrame: 0,
      durationFrames: 153,
      cue: 'send',
    });
    expect(t.scenes[0].beats[1].id).toBe('s02');
    expect(t.scenes[0].beats[1].cue).toBeUndefined();
    expect(t.scenes[0].beats[0].text).toContain('Bạn vừa bấm gửi');
  });

  test('beat không có cue vẫn hợp lệ (luật 8)', () => {
    const s = loadSample();
    for (const sc of s.scenes) for (const b of sc.beats) delete b.cue;
    expect(() => validateTimeline(s)).not.toThrow();
  });

  test('khoảng hở giữa các beat trong cảnh vẫn hợp lệ (luật 5)', () => {
    const s = loadSample();
    // s01 kết thúc 153, s02 bắt đầu 161: có hở 8 frame trong mẫu.
    expect(s.scenes[0].beats[1].startFrame).toBeGreaterThan(153);
    expect(() => validateTimeline(s)).not.toThrow();
  });
});

type Mutate = (t: any) => void;

// [tên ca, hàm làm hỏng, regex vị trí phải có trong thông báo lỗi]
const BROKEN: Array<[string, Mutate, RegExp]> = [
  ['version khác 1', (t) => (t.version = 2), /version/],
  ['fps khác 30', (t) => (t.fps = 24), /fps/],
  ['width khác 1920', (t) => (t.width = 1280), /width/],
  ['height khác 1080', (t) => (t.height = 720), /height/],
  [
    'id cảnh không thuộc tập cho phép',
    (t) => (t.scenes[2].id = 'khong-co'),
    /scenes\[2\]\.id/,
  ],
  [
    'id cảnh trùng lặp',
    (t) => (t.scenes[3].id = 'dns'),
    /scenes\[3\]\.id/,
  ],
  [
    'cảnh đầu không bắt đầu ở frame 0',
    (t) => {
      t.scenes[0].startFrame = 1;
    },
    /scenes\[0\]\.startFrame/,
  ],
  [
    'cảnh hở (cảnh sau bắt đầu muộn hơn cuối cảnh trước)',
    (t) => {
      t.scenes[1].startFrame += 5;
    },
    /scenes\[1\]\.startFrame/,
  ],
  [
    'cảnh chồng (cảnh sau bắt đầu sớm hơn cuối cảnh trước)',
    (t) => {
      t.scenes[2].startFrame -= 5;
    },
    /scenes\[2\]\.startFrame/,
  ],
  [
    'cảnh cuối không kết thúc đúng durationInFrames',
    (t) => {
      t.durationInFrames += 10;
    },
    /durationInFrames/,
  ],
  [
    'beat chồng beat trước',
    (t) => {
      t.scenes[0].beats[1].startFrame = 100;
    },
    /scenes\[0\]\.beats\[1\]/,
  ],
  [
    'beat tràn ra ngoài cảnh',
    (t) => {
      t.scenes[0].beats[2].durationFrames = 500;
    },
    /scenes\[0\]\.beats\[2\]/,
  ],
  [
    'beat id trùng toàn file',
    (t) => {
      t.scenes[1].beats[0].id = 's01';
    },
    /scenes\[1\]\.beats\[0\]\.id/,
  ],
  [
    'cảnh không có beat nào',
    (t) => {
      t.scenes[4].beats = [];
    },
    /scenes\[4\]\.beats/,
  ],
  [
    'text rỗng',
    (t) => {
      t.scenes[0].beats[0].text = '';
    },
    /scenes\[0\]\.beats\[0\]\.text/,
  ],
  [
    'text dài hơn 100 ký tự',
    (t) => {
      t.scenes[0].beats[0].text = 'a'.repeat(101);
    },
    /scenes\[0\]\.beats\[0\]\.text/,
  ],
  [
    'text không ở dạng NFC',
    (t) => {
      // dạng NFD: dấu tách rời khỏi chữ cái
      const nfd = 'Tin nhắn đi tới'.normalize('NFD');
      expect(nfd).not.toBe(nfd.normalize('NFC')); // đúng là NFD thật
      t.scenes[0].beats[0].text = nfd;
    },
    /scenes\[0\]\.beats\[0\]\.text/,
  ],
  [
    'text chỉ có khoảng trắng',
    (t) => {
      t.scenes[0].beats[0].text = '   \t ';
    },
    /scenes\[0\]\.beats\[0\]\.text/,
  ],
  [
    'beat có durationFrames = 0',
    (t) => {
      t.scenes[0].beats[2].durationFrames = 0;
    },
    /scenes\[0\]\.beats\[2\]\.durationFrames/,
  ],
  [
    'cảnh có durationFrames = 0',
    (t) => {
      t.scenes[1].durationFrames = 0;
    },
    /scenes\[1\]\.durationFrames/,
  ],
  [
    'cảnh có durationFrames không nguyên',
    (t) => {
      t.scenes[1].durationFrames = 371.5;
    },
    /scenes\[1\]\.durationFrames/,
  ],
  [
    'beat bắt đầu trước đầu cảnh',
    (t) => {
      t.scenes[1].beats[0].startFrame = 348; // cảnh dns bắt đầu ở 349
    },
    /scenes\[1\]\.beats\[0\]/,
  ],
  [
    'cue không phải chuỗi',
    (t) => {
      t.scenes[0].beats[0].cue = 5;
    },
    /scenes\[0\]\.beats\[0\]\.cue/,
  ],
  [
    'số frame âm',
    (t) => {
      t.scenes[0].beats[0].startFrame = -1;
    },
    /scenes\[0\]\.beats\[0\]\.startFrame/,
  ],
  [
    'số frame không nguyên',
    (t) => {
      t.scenes[0].beats[2].durationFrames = 55.5;
    },
    /scenes\[0\]\.beats\[2\]\.durationFrames/,
  ],
  [
    'thiếu audio.src',
    (t) => {
      delete t.audio.src;
    },
    /audio\.src/,
  ],
  [
    'thiếu scenes',
    (t) => {
      delete t.scenes;
    },
    /scenes/,
  ],
];

describe('[2-1] validateTimeline: timeline hỏng bị từ chối bằng lỗi tiếng Việt có vị trí', () => {
  test.each(BROKEN)('%s', (_name, mutate, where) => {
    const s = loadSample();
    mutate(s);
    let message = '';
    try {
      validateTimeline(s);
    } catch (e) {
      expect(e).toBeInstanceOf(Error);
      message = (e as Error).message;
    }
    expect(message, 'phải ném lỗi').not.toBe('');
    // tiếng Việt: có ít nhất một ký tự có dấu ngoài ASCII
    expect(message).toMatch(/[^\u0000-\u007f]/);
    expect(message).toMatch(where);
  });

  test.each([[null], [undefined], ['chuỗi'], [42], [[]]])(
    'đầu vào không phải đối tượng %j bị từ chối',
    (input) => {
      expect(() => validateTimeline(input)).toThrow(Error);
    },
  );

  test('audio.src rỗng hoặc không phải chuỗi bị từ chối', () => {
    for (const bad of ['', 5, null]) {
      const s = loadSample();
      s.audio.src = bad;
      expect(() => validateTimeline(s)).toThrow(/audio\.src/);
    }
  });

  test('validateTimeline không sửa đối tượng đầu vào', () => {
    const s = loadSample();
    const copy = JSON.stringify(s);
    validateTimeline(s);
    expect(JSON.stringify(s)).toBe(copy);
  });
});

describe('[2-1] validateTimeline: biên hợp lệ phải được nhận', () => {
  test('text đúng 100 ký tự (ASCII và có dấu NFC) được nhận', () => {
    for (const ch of ['a', 'ế']) {
      const s = loadSample();
      s.scenes[0].beats[0].text = ch.repeat(100);
      expect(() => validateTimeline(s)).not.toThrow();
    }
  });

  test('beat kết thúc đúng cuối cảnh và hai beat liền nhau được nhận', () => {
    const s = loadSample();
    // s02: 161..280 liền s03 (280); s03 kéo tới 349 = cuối cảnh phone
    s.scenes[0].beats[1].durationFrames = 119;
    s.scenes[0].beats[2].durationFrames = 69;
    expect(() => validateTimeline(s)).not.toThrow();
  });

  test('timeline ngắn (< 1800 frame, 2 cảnh) vẫn được nhận', () => {
    const s = loadSample();
    s.scenes = s.scenes.slice(0, 2);
    s.durationInFrames = 720;
    const t = validateTimeline(s);
    expect(t.scenes).toHaveLength(2);
    expect(t.durationInFrames).toBe(720);
  });

  test('chỉ một cảnh, một beat dài đúng bằng cảnh được nhận', () => {
    const s = loadSample();
    s.scenes = [s.scenes[0]];
    s.scenes[0].beats = [s.scenes[0].beats[0]];
    s.scenes[0].beats[0].durationFrames = 349;
    s.durationInFrames = 349;
    expect(() => validateTimeline(s)).not.toThrow();
  });
});

describe('[2-2] activeBeat', () => {
  const t: any = validateTimeline(loadSample());
  const id = (frame: number) => activeBeat(t, frame)?.id ?? null;

  test('tại start của beat: trả đúng beat đó', () => {
    expect(id(0)).toBe('s01');
    expect(id(161)).toBe('s02');
    expect(id(349)).toBe('s04'); // đầu cảnh dns
  });

  test('tại start+dur-1 (frame cuối của beat): vẫn trả beat đó', () => {
    expect(id(152)).toBe('s01'); // 0 + 153 - 1
    expect(id(272)).toBe('s02'); // 161 + 112 - 1
    expect(id(453)).toBe('s04'); // 349 + 105 - 1
  });

  test('tại start+dur (ngay sau beat, trong khoảng hở): null', () => {
    expect(activeBeat(t, 153)).toBeNull(); // s01 hết, s02 bắt đầu 161
    expect(activeBeat(t, 273)).toBeNull(); // s02 hết, s03 bắt đầu 280
    expect(activeBeat(t, 454)).toBeNull(); // s04 hết, s05 bắt đầu 462
  });

  test('toàn bộ khoảng hở giữa hai beat đều là null', () => {
    for (let f = 153; f < 161; f++) expect(activeBeat(t, f)).toBeNull();
  });

  test('khoảng hở ở cuối cảnh (trước cảnh sau) là null', () => {
    // s03 hết ở 336, cảnh phone hết ở 349
    expect(id(335)).toBe('s03');
    expect(activeBeat(t, 336)).toBeNull();
    expect(activeBeat(t, 348)).toBeNull();
  });

  test('trả về chính là đối tượng beat của timeline (đủ text, cue)', () => {
    const b = activeBeat(t, 10)!;
    expect(b.id).toBe('s01');
    expect(b.startFrame).toBe(0);
    expect(b.durationFrames).toBe(153);
    expect(b.text).toBe(t.scenes[0].beats[0].text);
    expect(b.cue).toBe('send');
  });

  test('frame cuối cùng của video và frame ngoài video', () => {
    expect(id(2291)).toBe('s19'); // 2194 + 98 - 1 = 2291
    expect(activeBeat(t, 2292)).toBeNull();
    expect(activeBeat(t, 2306)).toBeNull();
    expect(activeBeat(t, 2307)).toBeNull();
    expect(activeBeat(t, 99999)).toBeNull();
  });

  test('mỗi beat trong mẫu: start và start+dur-1 đúng, start+dur không phải chính nó', () => {
    for (const sc of t.scenes) {
      for (const b of sc.beats) {
        expect(id(b.startFrame)).toBe(b.id);
        expect(id(b.startFrame + b.durationFrames - 1)).toBe(b.id);
        expect(id(b.startFrame + b.durationFrames)).not.toBe(b.id);
      }
    }
  });

  test('frame âm: null', () => {
    expect(activeBeat(t, -1)).toBeNull();
    expect(activeBeat(t, -100)).toBeNull();
  });

  test('hai beat liền nhau: ranh giới chuyển đúng beat, không có null', () => {
    const s = loadSample();
    s.scenes[0].beats[1].durationFrames = 119; // 161..280, liền s03
    const adj: any = validateTimeline(s);
    expect(activeBeat(adj, 279)?.id).toBe('s02');
    expect(activeBeat(adj, 280)?.id).toBe('s03');
  });
});
