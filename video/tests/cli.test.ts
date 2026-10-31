import {spawnSync} from 'node:child_process';
import {beforeAll, describe, expect, test} from 'vitest';
import {
  RENDER_TEST,
  ensureDefaultPublic,
  readDefaultTimeline,
} from './helpers/render';
import {VIDEO_DIR} from './helpers/sample';

describe.skipIf(!RENDER_TEST)('[2-1] npx remotion compositions', () => {
  let out = '';
  let tl: any;
  beforeAll(() => {
    ensureDefaultPublic();
    tl = readDefaultTimeline();
    const r = spawnSync('npx', ['remotion', 'compositions', 'src/index.ts'], {
      cwd: VIDEO_DIR,
      encoding: 'utf8',
      maxBuffer: 1 << 26,
      timeout: 280_000,
      env: process.env,
    });
    expect(r.status, `${r.stdout}\n${r.stderr}`).toBe(0);
    out = r.stdout;
  }, 300_000);

  test('liệt kê Video với fps, kích thước, số frame đúng timeline đang dùng', () => {
    const re = new RegExp(
      `^Video\\s+${tl.fps}\\s+${tl.width}x${tl.height}\\s+${tl.durationInFrames}\\b`,
      'm',
    );
    expect(out).toMatch(re);
  });

  test('liệt kê KitDemo 90 frame', () => {
    expect(out).toMatch(/^KitDemo\s+30\s+1920x1080\s+90\b/m);
  });
});
