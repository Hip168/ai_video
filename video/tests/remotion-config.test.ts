import {mkdirSync, mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {afterEach, beforeEach, expect, test, vi} from 'vitest';

// remotion.config.ts (dùng cho mọi lệnh `npx remotion ...`, kể cả aivideo.outro): không đặt
// REMOTION_BROWSER_EXECUTABLE thì tự dùng ~/.cache/aivideo/chrome-headless-shell/chrome-headless-shell nếu có (D23).

const setBrowserExecutable = vi.fn();
vi.mock('@remotion/cli/config', () => ({
  Config: new Proxy({}, {get: (_t, k) => (k === 'setBrowserExecutable' ? setBrowserExecutable : () => {})}),
}));

const saved = {home: process.env.HOME, exe: process.env.REMOTION_BROWSER_EXECUTABLE};
let home = '';

beforeEach(() => {
  home = mkdtempSync(path.join(tmpdir(), 'rcfg-'));
  process.env.HOME = home;
  delete process.env.REMOTION_BROWSER_EXECUTABLE;
  setBrowserExecutable.mockClear();
  vi.resetModules();
});
afterEach(() => {
  process.env.HOME = saved.home;
  if (saved.exe === undefined) delete process.env.REMOTION_BROWSER_EXECUTABLE;
  else process.env.REMOTION_BROWSER_EXECUTABLE = saved.exe;
  rmSync(home, {recursive: true, force: true});
});

function placeShell(): string {
  const dir = path.join(home, '.cache', 'aivideo', 'chrome-headless-shell');
  mkdirSync(dir, {recursive: true});
  const exe = path.join(dir, 'chrome-headless-shell');
  writeFileSync(exe, '');
  return exe;
}

test('có bản headless shell ở ~/.cache thì tự dùng, không cần biến môi trường', async () => {
  const exe = placeShell();
  await import('../remotion.config');
  expect(setBrowserExecutable).toHaveBeenCalledWith(exe);
});

test('không có bản ở ~/.cache và không đặt biến thì để Remotion tự chọn', async () => {
  await import('../remotion.config');
  expect(setBrowserExecutable).not.toHaveBeenCalled();
});

test('REMOTION_BROWSER_EXECUTABLE vẫn được ưu tiên', async () => {
  placeShell();
  process.env.REMOTION_BROWSER_EXECUTABLE = '/duong/rieng/chrome';
  await import('../remotion.config');
  expect(setBrowserExecutable).toHaveBeenCalledWith('/duong/rieng/chrome');
});
