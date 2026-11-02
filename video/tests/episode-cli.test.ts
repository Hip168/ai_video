import {spawnSync} from 'node:child_process';
import {beforeAll, describe, expect, test} from 'vitest';
import {RENDER_TEST, ensureDefaultPublic} from './helpers/render';
import {VIDEO_DIR} from './helpers/sample';

describe('[6-1] tsc sạch', () => {
  test('npx tsc --noEmit thoát 0, không in lỗi', () => {
    const r = spawnSync('npx', ['tsc', '--noEmit'], {
      cwd: VIDEO_DIR,
      encoding: 'utf8',
      maxBuffer: 1 << 26,
      timeout: 170_000,
    });
    expect(r.status, `${r.stdout}\n${r.stderr}`).toBe(0);
    expect(r.stdout.trim()).toBe('');
  }, 180_000);
});

describe.skipIf(!RENDER_TEST)('[6-1] npx remotion compositions', () => {
  let out = '';
  beforeAll(() => {
    ensureDefaultPublic();
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

  test('liệt kê Episode 30 fps 1920x1080', () => {
    expect(out).toMatch(/^Episode\s+30\s+1920x1080\s+\d+\b/m);
  });

  test('vẫn liệt kê Video và KitDemo như v1', () => {
    expect(out).toMatch(/^Video\s+30\s+1920x1080\s+\d+\b/m);
    expect(out).toMatch(/^KitDemo\s+30\s+1920x1080\s+90\b/m);
  });
});
