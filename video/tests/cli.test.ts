import {spawnSync} from 'node:child_process';
import {beforeAll, describe, expect, test} from 'vitest';
import {RENDER_TEST, ensureDefaultPublic} from './helpers/render';
import {VIDEO_DIR} from './helpers/sample';

describe.skipIf(!RENDER_TEST)('[2-1] npx remotion compositions', () => {
  let out = '';
  beforeAll(() => {
    ensureDefaultPublic();
    const r = spawnSync('npx', ['remotion', 'compositions', 'src/index.ts'], {
      cwd: VIDEO_DIR,
      encoding: 'utf8',
      maxBuffer: 1 << 26,
    });
    expect(r.status, `${r.stdout}\n${r.stderr}`).toBe(0);
    out = r.stdout;
  }, 300_000);

  test('liệt kê Video 30 fps 1920x1080 dài 2307 frame', () => {
    expect(out).toMatch(/^Video\s+30\s+1920x1080\s+2307\b/m);
  });

  test('liệt kê KitDemo 90 frame', () => {
    expect(out).toMatch(/^KitDemo\s+30\s+1920x1080\s+90\b/m);
  });
});
