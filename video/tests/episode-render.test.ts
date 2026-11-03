import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import {afterAll, beforeAll, describe, expect, test} from 'vitest';
import {THEMES} from '../src/lib/theme';
import {
  RENDER_TEST,
  decodePng,
  diffRatio,
  distinctColors,
  hex,
  nonColorRatio,
  type Pixels,
} from './helpers/render';
import {VIDEO_DIR} from './helpers/sample';
import {loadSample2} from './helpers/sample2';

// Chỉ chạy khi RENDER_TEST=1. Trên máy này đặt REMOTION_BROWSER_EXECUTABLE=
// $HOME/.cache/aivideo/chrome-headless-shell/chrome-headless-shell (D23,
// .team/stack.md); không dùng Google Chrome.
const d = describe.skipIf(!RENDER_TEST);
const browserExecutable = process.env.REMOTION_BROWSER_EXECUTABLE ?? null;
const MAIN_END = 830;
const BG = hex(THEMES['mau-a'].bg);

const scratch = mkdtempSync(path.join(tmpdir(), 'ep-render-'));
afterAll(() => rmSync(scratch, {recursive: true, force: true}));

const POINTS = ['Một', 'Hai', 'Ba', 'Bốn', 'Năm'].map(
  (w) => `Điểm ${w} cần nhớ`,
);

/** 720 frame: cold-open, chapter-title (có số), custom:mo-phong, recap-outro (5 điểm). */
function timeline(shiftCold = 0, shiftRecap = 0): any {
  return {
    version: 2,
    fps: 30,
    width: 1920,
    height: 1080,
    durationInFrames: 720,
    theme: 'mau-a',
    audio: {src: 'narration.wav'},
    chapters: [
      {id: 'mo-dau', title: 'Mở đầu', startFrame: 0},
      {id: 'chuong-1', title: 'Chương một', startFrame: 300},
    ],
    sfx: [],
    scenes: [
      {
        id: 'sc01', chapter: 'mo-dau', type: 'cold-open',
        props: {hook: 'Máy tính chỉ hiểu 0 và 1', kicker: 'Bạn có biết?'},
        startFrame: 0, durationFrames: 300,
        beats: [
          {id: 'b001', startFrame: shiftCold, durationFrames: 80,
           text: 'Mọi thứ bạn đang xem chỉ là số 0 và 1.', cue: 'hook'},
          {id: 'b002', startFrame: 150, durationFrames: 100,
           text: 'Vậy làm sao chúng tạo ra hình ảnh?'},
        ],
      },
      {
        id: 'sc02', chapter: 'chuong-1', type: 'chapter-title',
        props: {title: 'Chương một', number: 1, subtitle: 'Từ công tắc đến con số'},
        startFrame: 300, durationFrames: 90, beats: [],
      },
      {
        id: 'sc03', chapter: 'chuong-1', type: 'custom:mo-phong', props: {},
        startFrame: 390, durationFrames: 120,
        beats: [
          {id: 'b003', startFrame: 390, durationFrames: 100,
           text: 'Hãy bắt đầu từ một công tắc.', cue: 'pop'},
        ],
      },
      {
        id: 'sc04', chapter: 'chuong-1', type: 'recap-outro',
        props: {points: POINTS, next: 'Tập sau: bộ nhớ'},
        startFrame: 510, durationFrames: 210,
        beats: [
          {id: 'b004', startFrame: 510 + shiftRecap, durationFrames: 40,
           text: 'Nhắc lại điểm đầu.'},
          {id: 'b005', startFrame: 590, durationFrames: 40,
           text: 'Và điểm thứ hai.'},
        ],
      },
    ],
  };
}

let serveUrl = '';
beforeAll(async () => {
  serveUrl = await bundle({
    entryPoint: path.join(VIDEO_DIR, 'src', 'index.ts'),
    publicDir: path.join(VIDEO_DIR, 'public'),
  });
}, 300_000);

const comp = (inputProps?: Record<string, unknown>) =>
  selectComposition({serveUrl, id: 'Episode', inputProps, browserExecutable});

const cache = new Map<string, Pixels>();
async function still(tl: any, frame: number, key: string): Promise<Pixels> {
  const k = `${key}:${frame}`;
  if (!cache.has(k)) {
    const composition = await comp({timeline: tl});
    const output = path.join(scratch, `${key}-${frame}.png`);
    await renderStill({
      composition, serveUrl, frame, output,
      imageFormat: 'png', browserExecutable,
    });
    cache.set(k, decodePng(output));
  }
  return cache.get(k)!;
}
const base = (f: number) => still(timeline(), f, 'base');

d('[6-1] composition Episode', () => {
  test('theo timeline: 720 frame, 30 fps, 1920x1080', async () => {
    const c = await comp({timeline: timeline()});
    expect(c.id).toBe('Episode');
    expect(c.durationInFrames).toBe(720);
    expect(c.fps).toBe(30);
    expect(c.width).toBe(1920);
    expect(c.height).toBe(1080);
  }, 120_000);

  test('file mẫu hợp đồng v2 đi qua Episode: 600 frame', async () => {
    const c = await comp({timeline: loadSample2()});
    expect(c.durationInFrames).toBe(600);
  }, 120_000);

  test('không có timeline: 30 frame, không ném lỗi', async () => {
    const c = await comp();
    expect(c.durationInFrames).toBe(30);
    expect(c.width).toBe(1920);
    expect(c.height).toBe(1080);
  }, 120_000);

  test('timeline hỏng qua inputProps: lỗi tiếng Việt nêu trường', async () => {
    const bad = timeline();
    bad.version = 1;
    const err = await comp({timeline: bad}).then(() => null, (e: Error) => e);
    expect(err).not.toBeNull();
    expect(err!.message).toMatch(/version/);
    expect(err!.message).toMatch(/[^\u0000-\u007f]/);
  }, 120_000);

  test('loại cảnh custom: chưa đăng ký -> render lỗi nêu tên', async () => {
    const bad = timeline();
    bad.scenes[2].type = 'custom:chua-dang-ky';
    const err = await still(bad, 450, 'chua-dang-ky').then(
      () => null,
      (e: Error) => e,
    );
    expect(err).not.toBeNull();
    expect(String(err!.message)).toMatch(/chua-dang-ky/);
  }, 180_000);
});

// Khung hình giữa cảnh, không có beat nào hiện: dải y >= 830 phải phẳng.
const SCENE_FRAMES: Array<[string, number]> = [
  ['cold-open', 135],
  ['chapter-title', 350],
  ['custom:mo-phong', 500],
  ['recap-outro', 700],
];

d('[6-2] still của cảnh cấu trúc và custom', () => {
  test.each(SCENE_FRAMES)('%s: 1920x1080, không đơn sắc, có nội dung ở y<830', async (_n, f) => {
    const p = await base(f);
    expect(p.width).toBe(1920);
    expect(p.height).toBe(1080);
    expect(distinctColors(p, 0, MAIN_END)).toBeGreaterThan(5);
    expect(nonColorRatio(p, BG, 0, MAIN_END)).toBeGreaterThan(0.005);
  }, 180_000);

  test.each(SCENE_FRAMES)('%s: dải y 830..1079 là màu nền phẳng khi không có phụ đề', async (_n, f) => {
    const p = await base(f);
    expect(nonColorRatio(p, BG, MAIN_END, 1080)).toBe(0);
  }, 180_000);

  test('bốn cảnh vẽ khác nhau từng đôi', async () => {
    const imgs: Pixels[] = [];
    for (const [, f] of SCENE_FRAMES) imgs.push(await base(f));
    for (let i = 0; i < imgs.length; i++) {
      for (let j = i + 1; j < imgs.length; j++) {
        expect(
          diffRatio(imgs[i], imgs[j], 0, MAIN_END),
          `${SCENE_FRAMES[i][0]} vs ${SCENE_FRAMES[j][0]}`,
        ).toBeGreaterThan(0.01);
      }
    }
  }, 180_000);

  test('phụ đề hiện trong dải 830..989, hàng 990..1079 vẫn là nền; beat khác chữ khác', async () => {
    const a = await base(60); // b001
    const b = await base(200); // b002
    for (const p of [a, b]) {
      expect(nonColorRatio(p, BG, MAIN_END, 990)).toBeGreaterThan(0.0005);
      expect(nonColorRatio(p, BG, 990, 1080)).toBe(0);
    }
    expect(diffRatio(a, b, MAIN_END, 990)).toBeGreaterThan(0.0005);
  }, 180_000);
});

d('[6-2] cảnh neo theo beat (dịch startFrame của beat thì hình đổi)', () => {
  test('cold-open: dịch beat cue hook +40 frame làm đổi hình ở frame 20', async () => {
    const a = await base(20);
    const b = await still(timeline(40, 0), 20, 'cold-shift');
    expect(diffRatio(a, b, 0, MAIN_END)).toBeGreaterThan(0.001);
  }, 180_000);

  test('recap-outro: dịch beat đầu +20 frame làm đổi hình ở frame 520', async () => {
    const a = await base(520);
    const b = await still(timeline(0, 20), 520, 'recap-shift');
    expect(diffRatio(a, b, 0, MAIN_END)).toBeGreaterThan(0.001);
  }, 180_000);

  test('recap-outro: cuối cảnh (đủ 5 điểm) có nhiều nội dung hơn đầu cảnh (1 điểm)', async () => {
    const early = await base(520);
    const late = await base(700);
    expect(nonColorRatio(late, BG, 0, MAIN_END)).toBeGreaterThan(
      nonColorRatio(early, BG, 0, MAIN_END),
    );
  }, 180_000);
});
