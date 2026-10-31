import {afterAll, beforeAll, describe, expect, test} from 'vitest';
import {COLORS, POS, packetPosition} from '../src/kit';
import {
  RENDER_TEST,
  cleanupTemp,
  diffRatio,
  distinctColors,
  findColor,
  hex,
  nonColorRatio,
  px,
  stage,
  stillOf,
  type Pixels,
  type Stage,
} from './helpers/render';
import {loadSample} from './helpers/sample';

// Chỉ chạy khi RENDER_TEST=1 (cần Chrome: xem .team/stack.md, biến
// REMOTION_BROWSER_EXECUTABLE).
const d = describe.skipIf(!RENDER_TEST);

// Hình chính nằm trong y < 830; dải 830..1079 chỉ dành cho phụ đề.
const MAIN_END = 830;
const BG = hex(COLORS.bg);

afterAll(cleanupTemp);

d('[2-1] composition Video theo timeline mẫu', () => {
  let st: Stage;
  beforeAll(async () => {
    st = await stage(loadSample());
  }, 300_000);

  test('Video: đúng durationInFrames của mẫu, 30 fps, 1920x1080', async () => {
    const c = await st.composition();
    expect(c.id).toBe('Video');
    expect(c.durationInFrames).toBe(loadSample().durationInFrames);
    expect(c.durationInFrames).toBe(2307);
    expect(c.fps).toBe(30);
    expect(c.width).toBe(1920);
    expect(c.height).toBe(1080);
  }, 120_000);

  test('inputProps.timeline được dùng thẳng (không fetch): timeline ngắn 2 cảnh', async () => {
    const short = loadSample();
    short.scenes = short.scenes.slice(0, 2);
    short.durationInFrames = 720;
    const c = await st.composition({timeline: short});
    expect(c.durationInFrames).toBe(720);
    expect(c.fps).toBe(30);
  }, 120_000);

  test('inputProps.timeline hỏng: lỗi tiếng Việt từ validateTimeline nổi lên', async () => {
    const bad = loadSample();
    bad.version = 2;
    const err = await st
      .composition({timeline: bad})
      .then(() => null, (e: Error) => e);
    expect(err).not.toBeNull();
    expect(err!.message).toMatch(/version/);
    expect(err!.message).toMatch(/[^\u0000-\u007f]/); // tiếng Việt: có ký tự có dấu
  }, 120_000);
});

d('[2-3] linh kiện SVG qua composition KitDemo', () => {
  let st: Stage;
  const frames = [0, 30, 59];
  const imgs: Pixels[] = [];
  beforeAll(async () => {
    st = await stage(loadSample());
    for (const f of frames) imgs.push(await stillOf(st.serveUrl, 'KitDemo', f));
  }, 300_000);

  test('KitDemo: 1920x1080, góc là COLORS.bg, không đơn sắc', () => {
    for (const p of imgs) {
      expect(p.width).toBe(1920);
      expect(p.height).toBe(1080);
      expect(px(p, 2, 2)).toEqual(BG);
      expect(distinctColors(p)).toBeGreaterThan(5);
    }
  });

  test('ba mốc frame (đầu, giữa, cuối) cho ba ảnh đôi một khác nhau', () => {
    expect(diffRatio(imgs[0], imgs[1])).toBeGreaterThan(0.0002);
    expect(diffRatio(imgs[1], imgs[2])).toBeGreaterThan(0.0002);
    expect(diffRatio(imgs[0], imgs[2])).toBeGreaterThan(0.0002);
  });

  test.each([0, 30, 59].map((f, i) => [f, i] as const))(
    'Packet: pixel màu COLORS.packet có tâm khớp packetPosition tại frame %i',
    (f, i) => {
      const pts = findColor(imgs[i], hex(COLORS.packet));
      // hình chữ nhật 56x40 trừ nét polyline: còn rất nhiều điểm
      expect(pts.length).toBeGreaterThan(800);
      const cx = pts.reduce((s, q) => s + q[0], 0) / pts.length;
      const cy = pts.reduce((s, q) => s + q[1], 0) / pts.length;
      const want = packetPosition(POS.phone, POS.server, 0, 60, f);
      expect(Math.abs(cx - want.x)).toBeLessThan(8);
      expect(Math.abs(cy - want.y)).toBeLessThan(12);
    },
  );

  test('Link: tại frame 59 có điểm màu COLORS.muted ở 1/4 đường phone→server', () => {
    const qx = Math.round(POS.phone.x + (POS.server.x - POS.phone.x) / 4);
    const qy = Math.round(POS.phone.y + (POS.server.y - POS.phone.y) / 4);
    const hit = findColor(imgs[2], hex(COLORS.muted), {
      x0: qx - 4,
      x1: qx + 5,
      y0: qy - 6,
      y1: qy + 7,
    });
    expect(hit.length).toBeGreaterThan(5);
  });

  test('Link chưa vẽ hết ở frame 0: tại 3/4 đường không có COLORS.muted, frame 59 thì có', () => {
    const qx = Math.round(POS.phone.x + ((POS.server.x - POS.phone.x) * 3) / 4);
    const box = {x0: qx - 4, x1: qx + 5, y0: POS.phone.y - 6, y1: POS.phone.y + 7};
    expect(findColor(imgs[0], hex(COLORS.muted), box)).toHaveLength(0);
    expect(findColor(imgs[2], hex(COLORS.muted), box).length).toBeGreaterThan(5);
  });

  test('Node: tại frame 30 (Packet chưa tới máy chủ) có điểm ảnh khác nền quanh POS.phone và POS.server', () => {
    for (const pos of [POS.phone, POS.server]) {
      const w = 160;
      const h = 220;
      let nonBg = 0;
      for (let y = pos.y - h / 2; y < pos.y + h / 2; y++) {
        for (let x = pos.x - w / 2; x < pos.x + w / 2; x++) {
          const c = px(imgs[1], x, y);
          if (c[0] !== BG[0] || c[1] !== BG[1] || c[2] !== BG[2]) nonBg++;
        }
      }
      expect(nonBg).toBeGreaterThan(2000);
    }
  });

  test('không tràn khung: viền 2 px quanh ảnh giữ màu nền ở mọi mốc', () => {
    for (const p of imgs) {
      for (let k = 0; k < 2; k++) {
        for (let x = 0; x < p.width; x++) {
          expect(px(p, x, k)).toEqual(BG);
          expect(px(p, x, p.height - 1 - k)).toEqual(BG);
        }
        for (let y = 0; y < p.height; y++) {
          expect(px(p, k, y)).toEqual(BG);
          expect(px(p, p.width - 1 - k, y)).toEqual(BG);
        }
      }
    }
  });
});

d('[2-2] phụ đề trên khung hình', () => {
  let st: Stage;
  const stills = new Map<number, Pixels>();
  const get = async (f: number) => {
    if (!stills.has(f)) stills.set(f, await st.still(f));
    return stills.get(f)!;
  };
  beforeAll(async () => {
    st = await stage(loadSample());
  }, 300_000);

  test('khung hình đúng 1920x1080 và không đơn sắc', async () => {
    const p = await get(60);
    expect(p.width).toBe(1920);
    expect(p.height).toBe(1080);
    expect(distinctColors(p)).toBeGreaterThan(50);
  }, 120_000);

  test('trong beat: dải đáy 830..1079 có phụ đề, hàng 990..1079 (dưới 90 px) là nền', async () => {
    const inBeat = await get(60); // s01 hiện
    expect(nonColorRatio(inBeat, BG, MAIN_END, 1080)).toBeGreaterThan(0.01);
    expect(distinctColors(inBeat, 990, 1080)).toBe(1);
    expect(px(inBeat, 960, 1050)).toEqual(BG);
    // beat s01 dài nên hộp phụ đề cao 2 dòng: nền hộp (đậm hơn COLORS.bg một
    // chút) phủ cả hàng 840..900, không chỉ một dòng
    expect(nonColorRatio(inBeat, BG, 840, 900)).toBeGreaterThan(0.2);
  }, 120_000);

  test('ở khoảng nghỉ (frame 158): dải đáy 830..1079 chỉ có đúng một màu và là COLORS.bg', async () => {
    const gap = await get(158); // s01 hết ở 153, s02 bắt đầu 161
    expect(distinctColors(gap, MAIN_END, 1080)).toBe(1);
    expect(px(gap, 960, 900)).toEqual(BG);
  }, 120_000);

  test('hai beat khác nhau cho phụ đề khác nhau', async () => {
    const s01 = await get(60);
    const s02 = await get(200); // s02: 161..272
    expect(diffRatio(s01, s02, MAIN_END, 1080)).toBeGreaterThan(0.005);
  }, 120_000);

  test.todo(
    'KHÔNG TỰ ĐỘNG ĐƯỢC: người xem still ở một beat, xác nhận chữ hiện đủ dấu ă â ê ô ơ ư đ và các thanh, không ô vuông',
  );
});

// Frame nằm trong khoảng nghỉ của từng cảnh (đã đối chiếu với mẫu).
const GAP_FRAMES: Array<[string, number]> = [
  ['phone', 157],
  ['dns', 458],
  ['packets', 849],
  ['wifi', 1093],
  ['hops', 1330],
  ['server', 1729],
  ['receiver', 2085],
  // khoảng nghỉ cuối mỗi cảnh (beat cuối hết, cảnh chưa hết)
  ['phone', 336],
  ['dns', 706],
  ['packets', 971],
  ['wifi', 1216],
  ['hops', 1579],
  ['server', 1949],
  ['receiver', 2292],
];

d('[2-4] bảy cảnh', () => {
  const sample = loadSample();
  const scenes: Array<{id: string; startFrame: number; durationFrames: number}> =
    sample.scenes;
  let st: Stage;
  const mids: Pixels[] = [];
  beforeAll(async () => {
    st = await stage(sample);
    for (const sc of scenes) {
      mids.push(
        await st.still(sc.startFrame + Math.floor(sc.durationFrames / 2)),
      );
    }
  }, 600_000);

  test.each(scenes.map((s, i) => [s.id, i] as const))(
    'still giữa cảnh %s: đúng kích thước, vùng hình chính (y<830) không đơn sắc và có nội dung',
    (_id, i) => {
      const p = mids[i];
      expect(p.width).toBe(1920);
      expect(p.height).toBe(1080);
      expect(distinctColors(p, 0, MAIN_END)).toBeGreaterThan(30);
      expect(nonColorRatio(p, BG, 0, MAIN_END)).toBeGreaterThan(0.003);
    },
  );

  test('still giữa mọi cặp cảnh khác nhau ở vùng hình chính (y<830)', () => {
    for (let i = 0; i < mids.length; i++) {
      for (let j = i + 1; j < mids.length; j++) {
        expect(
          diffRatio(mids[i], mids[j], 0, MAIN_END),
          `${scenes[i].id} và ${scenes[j].id} giống nhau`,
        ).toBeGreaterThan(0.01);
      }
    }
  });

  test.each(GAP_FRAMES)(
    'cảnh %s: ở khoảng nghỉ (frame %i) không vẽ gì dưới y=830',
    async (_id, frame) => {
      const p = await st.still(frame);
      expect(distinctColors(p, MAIN_END, 1080)).toBe(1);
      expect(px(p, 960, 1000)).toEqual(BG);
    },
  );

  test('animation neo theo cue: dịch +20 frame mọi beat (19 beat) làm đổi still', async () => {
    const shifted = loadSample();
    for (const sc of shifted.scenes) {
      for (const b of sc.beats) {
        b.startFrame += 20;
        b.durationFrames -= 20;
      }
    }
    const st2 = await stage(shifted);
    let checked = 0;
    for (const sc of sample.scenes) {
      for (const b of sc.beats) {
        // K lấy mốc nào đổi nhiều hơn trong hai mốc +25 và +45
        let best = 0;
        for (const k of [25, 45]) {
          const f = b.startFrame + k;
          const [a, c] = [await st.still(f), await st2.still(f)];
          best = Math.max(best, diffRatio(a, c, 0, MAIN_END));
        }
        expect(best, `beat ${b.id} (${sc.id}) không đổi khi dịch +20`).toBeGreaterThan(
          0.0005,
        );
        checked++;
      }
    }
    expect(checked).toBe(19);
  }, 1_800_000);

  test.todo(
    'KHÔNG TỰ ĐỘNG ĐƯỢC: người dùng xem từng cảnh và xác nhận sơ đồ diễn đạt đúng ý (ý nghĩa cue trong kich-ban-mau.md)',
  );
});
