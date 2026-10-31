import {beforeAll, describe, expect, test} from 'vitest';
import {COLORS, POS} from '../src/kit';
import {
  RENDER_TEST,
  diffRatio,
  distinctColors,
  px,
  stage,
  stillOf,
  type Pixels,
  type Stage,
} from './helpers/render';
import {loadSample} from './helpers/sample';

// Chỉ chạy khi RENDER_TEST=1 (cần Chrome của Remotion: npx remotion browser ensure).
const d = describe.skipIf(!RENDER_TEST);

// Vùng hình chính (hàng 0..879) và dải đáy dành cho phụ đề (880..1079).
const MAIN_END = 880;

d('[2-1] composition Video theo timeline mẫu', () => {
  let st: Stage;
  beforeAll(async () => {
    st = await stage(loadSample());
  }, 300_000);

  test('Video có thời lượng đúng durationInFrames của mẫu, 30 fps, 1920x1080', async () => {
    const c = await st.composition();
    const sample = loadSample();
    expect(c.id).toBe('Video');
    expect(c.durationInFrames).toBe(sample.durationInFrames);
    expect(c.durationInFrames).toBe(2307);
    expect(c.fps).toBe(30);
    expect(c.width).toBe(1920);
    expect(c.height).toBe(1080);
  }, 120_000);
});

d('[2-3] linh kiện SVG qua composition KitDemo', () => {
  let st: Stage;
  const hex = (h: string): [number, number, number] => {
    const n = parseInt(h.replace('#', ''), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const frames = [0, 30, 59];
  const imgs: Pixels[] = [];
  beforeAll(async () => {
    st = await stage(loadSample());
    for (const f of frames) imgs.push(await stillOf(st.serveUrl, 'KitDemo', f));
  }, 300_000);

  test('KitDemo: 1920x1080, nền COLORS.bg ở góc, có vẽ linh kiện (không đơn sắc)', () => {
    for (const p of imgs) {
      expect(p.width).toBe(1920);
      expect(p.height).toBe(1080);
      expect(px(p, 2, 2)).toEqual(hex(COLORS.bg));
      expect(distinctColors(p)).toBeGreaterThan(5);
    }
  });

  test('ba mốc frame (đầu, giữa, cuối) cho ba ảnh đôi một khác nhau', () => {
    expect(diffRatio(imgs[0], imgs[1])).toBeGreaterThan(0.0002);
    expect(diffRatio(imgs[1], imgs[2])).toBeGreaterThan(0.0002);
    expect(diffRatio(imgs[0], imgs[2])).toBeGreaterThan(0.0002);
  });

  test('gói tin ở giữa nằm trong hộp bao của đoạn Link, khác ảnh đầu quanh điểm giữa', () => {
    const mx = Math.round((POS.phone.x + POS.server.x) / 2);
    const my = Math.round((POS.phone.y + POS.server.y) / 2);
    // vùng 80x80 quanh điểm giữa Link: khung giữa có Packet, khung đầu thì không
    const cut = (p: Pixels) => ({
      width: 80,
      height: 80,
      data: Buffer.concat(
        Array.from({length: 80}, (_, r) =>
          p.data.subarray(
            ((my - 40 + r) * p.width + (mx - 40)) * 3,
            ((my - 40 + r) * p.width + (mx + 40)) * 3,
          ),
        ),
      ),
    });
    expect(diffRatio(cut(imgs[0]), cut(imgs[1]))).toBeGreaterThan(0.01);
  });

  test('không tràn khung: viền 2 px quanh ảnh giữ màu nền ở mọi mốc', () => {
    const bg = hex(COLORS.bg);
    for (const p of imgs) {
      for (let k = 0; k < 2; k++) {
        for (let x = 0; x < p.width; x++) {
          expect(px(p, x, k)).toEqual(bg);
          expect(px(p, x, p.height - 1 - k)).toEqual(bg);
        }
        for (let y = 0; y < p.height; y++) {
          expect(px(p, k, y)).toEqual(bg);
          expect(px(p, p.width - 1 - k, y)).toEqual(bg);
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

  test('trong beat có phụ đề ở dải đáy; ở khoảng nghỉ (frame 158) dải đáy khác hẳn', async () => {
    const inBeat = await get(60); // s01 hiện
    const gap = await get(158); // s01 hết ở 153, s02 bắt đầu 161
    expect(diffRatio(inBeat, gap, MAIN_END, 1080)).toBeGreaterThan(0.01);
  }, 120_000);

  test('hai frame cùng nằm trong khoảng nghỉ có dải đáy giống nhau (không phụ đề)', async () => {
    const a = await get(157);
    const b = await get(159);
    expect(diffRatio(a, b, MAIN_END, 1080)).toBeLessThan(0.001);
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

  test('có đúng 7 cảnh theo thứ tự hợp đồng', () => {
    expect(scenes.map((s) => s.id)).toEqual([
      'phone',
      'dns',
      'packets',
      'wifi',
      'hops',
      'server',
      'receiver',
    ]);
    expect(mids).toHaveLength(7);
  });

  test.each(scenes.map((s, i) => [s.id, i] as const))(
    'still giữa cảnh %s: đúng kích thước và không đơn sắc ở vùng hình chính',
    (_id, i) => {
      const p = mids[i];
      expect(p.width).toBe(1920);
      expect(p.height).toBe(1080);
      expect(distinctColors(p, 0, MAIN_END)).toBeGreaterThan(30);
    },
  );

  test('still giữa mọi cặp cảnh khác nhau ở vùng hình chính', () => {
    for (let i = 0; i < mids.length; i++) {
      for (let j = i + 1; j < mids.length; j++) {
        expect(
          diffRatio(mids[i], mids[j], 0, MAIN_END),
          `${scenes[i].id} và ${scenes[j].id} giống nhau`,
        ).toBeGreaterThan(0.01);
      }
    }
  });

  test('animation neo theo cue: dịch startFrame của beat đầu mỗi cảnh làm đổi still ở cùng frame', async () => {
    // Beat đầu mỗi cảnh lùi 20 frame (rút bớt thời lượng, vẫn nằm trong cảnh).
    const shifted = loadSample();
    for (const sc of shifted.scenes) {
      sc.beats[0].startFrame += 20;
      sc.beats[0].durationFrames -= 20;
    }
    const st2 = await stage(shifted);
    for (let i = 0; i < scenes.length; i++) {
      const frame = scenes[i].startFrame + 25;
      const [before, after] = [await st.still(frame), await st2.still(frame)];
      expect(
        diffRatio(before, after, 0, MAIN_END),
        `cảnh ${scenes[i].id} không đổi khi dịch beat đầu`,
      ).toBeGreaterThan(0.001);
    }
  }, 600_000);

  test.todo(
    'KHÔNG TỰ ĐỘNG ĐƯỢC: người dùng xem từng cảnh và xác nhận sơ đồ diễn đạt đúng ý (ý nghĩa cue trong kich-ban-mau.md)',
  );
});
