import {existsSync, readdirSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {afterAll, describe, expect, test} from 'vitest';
import {
  cleanup,
  golden,
  makeRoot,
  outDir,
  plan,
  runRender,
  staticTimeline,
  tmp,
  type Plan,
} from './helpers/render-cli';
import {loadSample2} from './helpers/sample2';

// [10-1] [10-3] Chia đoạn, tham số, chặn đĩa, chọn trình duyệt của
// video/scripts/render-episode.ts. Không mở trình duyệt, không render:
// chạy được trên CI. Giao diện: .team/features/10-render-dai-giao-dien.md.

afterAll(cleanup);

const NO_BROWSER = {REMOTION_BROWSER_EXECUTABLE: '/khong/co/trinh-duyet'};

function checkTiling(p: Plan, duration: number) {
  expect(p.length).toBeGreaterThan(0);
  expect(p[0].startFrame).toBe(0);
  expect(p[p.length - 1].endFrame).toBe(duration - 1);
  p.forEach((s, i) => {
    expect(s.id).toBe(`seg-${String(i).padStart(3, '0')}`);
    expect(s.frames).toBe(s.endFrame - s.startFrame + 1);
    expect(s.frames).toBeGreaterThan(0);
    if (i > 0) expect(s.startFrame).toBe(p[i - 1].endFrame + 1);
  });
  expect(p.reduce((a, s) => a + s.frames, 0)).toBe(duration);
}

describe('[10-1] chia đoạn của tập _template (Python sinh, 17661 frame)', () => {
  const tl = golden();
  const root = makeRoot(tl, '_template');
  const sceneStarts = new Set<number>(tl.scenes.map((s: any) => s.startFrame));
  const main = plan(root, 'main', '_template');
  const shift = plan(root, 'shift', '_template');

  test('đoạn lát kín cả tập, liền nhau, không hở không chồng', () => {
    checkTiling(main, tl.durationInFrames);
    checkTiling(shift, tl.durationInFrames);
  });

  test('lượt main cắt ở biên cảnh, mỗi đoạn không quá 2700 frame, cỡ khoảng 1800', () => {
    for (const s of main) {
      expect(sceneStarts.has(s.startFrame), `${s.id} @${s.startFrame}`).toBe(true);
      expect(s.frames).toBeLessThanOrEqual(2700);
    }
    expect(main.length).toBeGreaterThanOrEqual(8);
    expect(main.length).toBeLessThanOrEqual(14);
    const mean = tl.durationInFrames / main.length;
    expect(mean).toBeGreaterThan(1200);
    expect(mean).toBeLessThan(2300);
  });

  test('lượt shift: đoạn đầu chỉ 900 frame trở xuống và ranh giới lệch hẳn lượt main', () => {
    expect(shift[0].frames).toBeLessThanOrEqual(900);
    const mainEdges = new Set(main.slice(1).map((s) => s.startFrame));
    const shared = shift.slice(1).filter((s) => mainEdges.has(s.startFrame));
    expect(shared.map((s) => s.startFrame)).toEqual([]);
  });

  test('--plan lặp lại cho kết quả giống hệt (xác định)', () => {
    expect(plan(root, 'main', '_template')).toEqual(main);
    expect(plan(root, 'shift', '_template')).toEqual(shift);
  });
});

describe('[10-1] cảnh dài: cắt đều thành khúc không quá 1800 frame', () => {
  test.each([
    [2700, 1],
    [2701, 2],
    [3600, 2],
    [5400, 3],
    [9000, 5],
  ])('một cảnh %i frame cho %i đoạn', (frames, count) => {
    const root = makeRoot(staticTimeline([frames]));
    const p = plan(root, 'main');
    checkTiling(p, frames);
    expect(p).toHaveLength(count);
    for (const s of p) expect(s.frames).toBeLessThanOrEqual(frames > 2700 ? 1800 : 2700);
    if (frames > 2700) {
      const sizes = p.map((s) => s.frames);
      expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1);
    }
  });

  test('cảnh dài nằm giữa các cảnh thường: vẫn lát kín, không đoạn nào quá 2700', () => {
    const tl = staticTimeline([600, 4000, 600]);
    const p = plan(makeRoot(tl), 'main');
    checkTiling(p, 5200);
    for (const s of p) expect(s.frames).toBeLessThanOrEqual(2700);
  });

  test('tập ngắn một cảnh nhỏ: đúng một đoạn phủ cả tập', () => {
    const p = plan(makeRoot(staticTimeline([90])), 'main');
    expect(p).toEqual([{id: 'seg-000', startFrame: 0, endFrame: 89, frames: 90}]);
  });
});

describe('[10-1] --plan và tham số', () => {
  test('--plan không cần trình duyệt: trình duyệt hỏng vẫn thoát 0', () => {
    const root = makeRoot(staticTimeline([300]));
    const r = runRender(['tap-thu', '--root', root, '--plan'], NO_BROWSER);
    expect(r.status, r.stderr).toBe(0);
    expect(JSON.parse(r.stdout)).toHaveLength(1);
    expect(existsSync(path.join(outDir(root), 'manifest.json'))).toBe(false);
    expect(existsSync(path.join(outDir(root), 'segments'))).toBe(false);
  });

  test.each([
    ['thiếu slug', []],
    ['--layout sai', ['tap-thu', '--layout', 'xx']],
    ['--procs 0', ['tap-thu', '--procs', '0']],
    ['--procs không phải số', ['tap-thu', '--procs', 'ba']],
    ['--frames sai dạng', ['tap-thu', '--frames', '5']],
    ['cờ lạ', ['tap-thu', '--khong-co']],
    ['hai slug', ['tap-thu', 'tap-khac']],
    ['--root thiếu giá trị', ['tap-thu', '--root']],
  ])('tham số sai (%s) thoát mã 2 và có hướng dẫn', (_n, args) => {
    const root = makeRoot(staticTimeline([300]));
    const a = args.at(-1) === '--root' ? args : [...args, '--root', root];
    const r = runRender(a, NO_BROWSER);
    expect(r.status, `${r.stdout}\n${r.stderr}`).toBe(2);
    expect(r.stderr.trim().length).toBeGreaterThan(0);
  });

  test('thiếu timeline.json thoát mã 1 và nêu đường dẫn thiếu', () => {
    const root = tmp();
    const r = runRender(['tap-thu', '--root', root, '--plan'], NO_BROWSER);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('timeline.json');
  });

  test('timeline sai (tên SFX ngoài danh sách) bị validator chặn, mã 1, không render', () => {
    const t = loadSample2();
    t.sfx[0].name = 'chime';
    const root = makeRoot(t);
    const r = runRender(['tap-thu', '--root', root, '--plan'], NO_BROWSER);
    expect(r.status, r.stdout).toBe(1);
    expect(r.stderr).toContain('sfx');
    expect(r.stdout.trim()).toBe('');
  });

  test('timeline không phải JSON thoát mã 1', () => {
    const root = makeRoot(staticTimeline([300]));
    writeFileSync(path.join(outDir(root), 'timeline.json'), '{hong');
    const r = runRender(['tap-thu', '--root', root, '--plan'], NO_BROWSER);
    expect(r.status).toBe(1);
  });
});

describe('[10-3] chặn đĩa dưới 6 GB (AIVIDEO_FREE_GB giả lập)', () => {
  const root = makeRoot(staticTimeline([300]));
  const run = (env: Record<string, string | null>) =>
    runRender(['tap-thu', '--root', root], {...NO_BROWSER, ...env});

  test.each(['5.9', '5', '0', '0.5'])('trống %s GB: thoát mã 3, báo đĩa, không tạo gì', (gb) => {
    const r = run({AIVIDEO_FREE_GB: gb});
    expect(r.status, `${r.stdout}\n${r.stderr}`).toBe(3);
    expect(r.stderr).toContain('LỖI: đĩa trống');
    expect(r.stderr).toContain('6');
    expect(existsSync(path.join(outDir(root), 'manifest.json'))).toBe(false);
    expect(existsSync(path.join(outDir(root), 'segments'))).toBe(false);
    expect(readdirSync(outDir(root))).toEqual(['timeline.json']);
  });

  test('đĩa kiểm trước trình duyệt: đĩa thiếu và trình duyệt hỏng thì báo đĩa (mã 3)', () => {
    const r = run({AIVIDEO_FREE_GB: '1'});
    expect(r.status).toBe(3);
  });

  test.each(['6', '6.0', '50'])('trống %s GB: qua cửa đĩa, dừng ở trình duyệt hỏng (mã 1)', (gb) => {
    const r = run({AIVIDEO_FREE_GB: gb});
    expect(r.status, `${r.stdout}\n${r.stderr}`).toBe(1);
    expect(r.stderr).toContain('REMOTION_BROWSER_EXECUTABLE');
  });

  test('AIVIDEO_MIN_FREE_GB đổi ngưỡng', () => {
    const lo = run({AIVIDEO_MIN_FREE_GB: '10', AIVIDEO_FREE_GB: '9.9'});
    expect(lo.status).toBe(3);
    expect(lo.stderr).toContain('10');
    const ok = run({AIVIDEO_MIN_FREE_GB: '10', AIVIDEO_FREE_GB: '10'});
    expect(ok.status).toBe(1);
    const low = run({AIVIDEO_MIN_FREE_GB: '1', AIVIDEO_FREE_GB: '2'});
    expect(low.status).toBe(1);
  });

  test('--plan không bị chặn đĩa (chỉ in kế hoạch)', () => {
    const r = runRender(['tap-thu', '--root', root, '--plan'], {
      ...NO_BROWSER,
      AIVIDEO_FREE_GB: '1',
    });
    expect(r.status).toBe(0);
  });
});

describe('[10-3] chọn trình duyệt theo D23', () => {
  const root = makeRoot(staticTimeline([300]));

  test('REMOTION_BROWSER_EXECUTABLE trỏ file không có: lỗi mã 1 nêu biến đó', () => {
    const r = runRender(['tap-thu', '--root', root], {
      AIVIDEO_FREE_GB: '50',
      ...NO_BROWSER,
    });
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('REMOTION_BROWSER_EXECUTABLE');
    expect(r.stderr).toContain('/khong/co/trinh-duyet');
  });

  test('không đặt biến và không có bản trong ~/.cache: lỗi mã 1 nêu đường dẫn mặc định', () => {
    const home = tmp('home-');
    const r = runRender(['tap-thu', '--root', root], {
      AIVIDEO_FREE_GB: '50',
      REMOTION_BROWSER_EXECUTABLE: null,
      HOME: home,
    });
    expect(r.status, `${r.stdout}\n${r.stderr}`).toBe(1);
    expect(r.stderr).toContain('chrome-headless-shell');
    expect(existsSync(path.join(outDir(root), 'segments'))).toBe(false);
  });
});
