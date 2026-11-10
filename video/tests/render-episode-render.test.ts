import {spawnSync} from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
} from 'node:fs';
import path from 'node:path';
import {afterAll, beforeAll, describe, expect, test} from 'vitest';
import {
  BROWSER,
  chromeProcs,
  cleanup,
  golden,
  makeRoot,
  orphans,
  outDir,
  plan,
  runRender,
  sleep,
  staticTimeline,
  startRender,
  type Proc,
} from './helpers/render-cli';
import {RENDER_TEST} from './helpers/render';

// [10-1] Render thật bằng `render-episode.ts`: resume, ngắt, không tiến trình
// mồ côi. Chỉ chạy khi RENDER_TEST=1. Dùng cảnh tiêu đề chương tĩnh (rẻ):
// 2701 frame = hai đoạn 1350 + 1351; 90 frame = một đoạn.
// Giao diện: .team/features/10-render-dai-giao-dien.md mục 2.

const d = describe.skipIf(!RENDER_TEST);
afterAll(cleanup);

const ENV = {REMOTION_BROWSER_EXECUTABLE: BROWSER, AIVIDEO_FREE_GB: '50'};
const SEG0 = 1350;
const SEG1 = 1351;

function manifest(root: string): any {
  return JSON.parse(readFileSync(path.join(outDir(root), 'manifest.json'), 'utf8'));
}
function main(root: string): any[] {
  return manifest(root).layouts.main;
}
function segFile(root: string, id: string): string {
  return path.join(outDir(root), 'segments', `${id}.mp4`);
}
function frames(file: string): number {
  const r = spawnSync(
    'ffprobe',
    ['-v', 'error', '-count_frames', '-select_streams', 'v:0', '-show_entries',
     'stream=nb_read_frames', '-of', 'csv=p=0', file],
    {encoding: 'utf8'},
  );
  return Number(r.stdout.trim());
}
function probe(file: string): any {
  const r = spawnSync(
    'ffprobe',
    ['-v', 'error', '-show_streams', '-of', 'json', file],
    {encoding: 'utf8'},
  );
  return JSON.parse(r.stdout);
}
function partFiles(root: string): string[] {
  const dir = path.join(outDir(root), 'segments');
  return existsSync(dir) ? readdirSync(dir).filter((f) => f.includes('.part')) : [];
}
const pidsOf = (ps: Proc[]) => new Set(ps.map((p) => p.pid));

/** Đợi tới khi không còn tiến trình mồ côi mới (ngoài `before`), tối đa `ms`. */
async function newOrphans(before: Set<number>, ms = 10_000): Promise<Proc[]> {
  const t0 = Date.now();
  for (;;) {
    const now = orphans().filter((p) => !before.has(p.pid));
    if (now.length === 0 || Date.now() - t0 > ms) return now;
    await sleep(500);
  }
}

/**
 * Ghi lại mọi pid chrome-headless-shell xuất hiện (ngoài `before`) trong lúc
 * chạy, để sau đó kiểm CHÍNH các pid đó đã chết, không chỉ "ppid = 1".
 */
function trackPids(before: Set<number>) {
  const seen = new Set<number>();
  const tick = setInterval(() => {
    for (const p of chromeProcs()) if (!before.has(p.pid)) seen.add(p.pid);
  }, 250);
  const alive = (pid: number) => {
    try {
      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  };
  return {
    seen: () => [...seen],
    stop: () => clearInterval(tick),
    /** Đợi tối đa `ms` cho các pid đã thấy chết hết; trả về pid còn sống. */
    async survivors(ms = 3000) {
      const t0 = Date.now();
      for (;;) {
        const live = [...seen].filter(alive);
        if (live.length === 0 || Date.now() - t0 > ms) return live;
        await sleep(250);
      }
    },
  };
}
const allPids = () => new Set(chromeProcs().map((p) => p.pid));

d('[10-1] tập 2 đoạn: ngắt giữa chừng rồi chạy lại chỉ render đoạn thiếu', () => {
  const root = makeRoot(staticTimeline([2701]));
  const args = ['tap-thu', '--root', root, '--procs', '1'];
  let mtime0 = 0;

  test('SIGINT sau khi đoạn 0 xong: thoát 130, đoạn 0 giữ nguyên, đoạn 1 không giả "done", không mồ côi', async () => {
    const before = pidsOf(orphans());
    const run = startRender(args, ENV);
    await run.waitFor(/đoạn seg-000 xong/, 300_000);
    run.signal('SIGINT');
    const done = await Promise.race([
      run.exit,
      sleep(90_000).then(() => 'treo' as const),
    ]);
    if (done === 'treo') run.signal('SIGKILL');
    expect(done, 'tiến trình phải thoát sau SIGINT').not.toBe('treo');
    expect((done as any).code, `${run.out()}\n${run.err()}`).toBe(130);

    const m = main(root);
    expect(m.map((s) => s.id)).toEqual(['seg-000', 'seg-001']);
    expect(m[0].status).toBe('done');
    expect(m[1].status).not.toBe('done');
    expect(frames(segFile(root, 'seg-000'))).toBe(SEG0);
    expect(existsSync(segFile(root, 'seg-001'))).toBe(false);
    expect(partFiles(root)).toEqual([]);
    expect(await newOrphans(before)).toEqual([]);
    mtime0 = statSync(segFile(root, 'seg-000')).mtimeMs;
  }, 420_000);

  test('--frames 0-0 chỉ chạm đoạn giao với dải: đoạn 0 bỏ qua, đoạn 1 (ngoài dải, đang thiếu) không bị render', () => {
    const r = runRender([...args, '--frames', '0-0'], ENV, 200_000);
    expect(r.status, `${r.stdout}\n${r.stderr}`).toBe(0);
    expect(r.stdout).toContain('bỏ qua seg-000');
    expect(r.stdout).not.toMatch(/đoạn seg-00\d xong/);
    expect(existsSync(segFile(root, 'seg-001'))).toBe(false);
    expect(statSync(segFile(root, 'seg-000')).mtimeMs).toBe(mtime0);
  }, 240_000);

  test('chạy lại đầy đủ: bỏ qua đoạn 0, chỉ render đoạn 1', () => {
    const r = runRender(args, ENV, 300_000);
    expect(r.status, `${r.stdout}\n${r.stderr}`).toBe(0);
    expect(r.stdout).toContain('bỏ qua seg-000');
    expect(r.stdout).toMatch(/đoạn seg-001 xong \(1351 frame/);
    expect(r.stdout).not.toMatch(/đoạn seg-000 xong/);
    expect(statSync(segFile(root, 'seg-000')).mtimeMs).toBe(mtime0);
    expect(frames(segFile(root, 'seg-001'))).toBe(SEG1);
    const m = main(root);
    expect(m.map((s) => s.status)).toEqual(['done', 'done']);
    expect(m.map((s) => s.frames)).toEqual([SEG0, SEG1]);
    for (const s of m) {
      expect(s.hash).toMatch(/^[0-9a-f]{64}$/);
      expect(s.bytes).toBe(statSync(path.join(outDir(root), s.file)).size);
    }
    expect(partFiles(root)).toEqual([]);
  }, 360_000);

  test('đoạn đã đủ rồi thì chạy lại không render gì (mọi đoạn bỏ qua)', () => {
    const r = runRender(args, ENV, 120_000);
    expect(r.status, `${r.stdout}\n${r.stderr}`).toBe(0);
    expect(r.stdout).toContain('bỏ qua seg-000');
    expect(r.stdout).toContain('bỏ qua seg-001');
    expect(r.stdout).not.toMatch(/đoạn seg-00\d xong/);
  }, 150_000);

  test('đoạn "done" nhưng file sai số frame (ffprobe) thì bị render lại, đoạn kia giữ', () => {
    const f = segFile(root, 'seg-000');
    const bad = f.replace('.mp4', '.cut.mp4');
    const cut = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', f, '-frames:v', '100',
      '-c', 'copy', bad]);
    expect(cut.status).toBe(0);
    copyFileSync(bad, f);
    expect(frames(f)).toBe(100);
    const t1 = statSync(segFile(root, 'seg-001')).mtimeMs;
    const r = runRender([...args, '--frames', '0-0'], ENV, 300_000);
    expect(r.status, `${r.stdout}\n${r.stderr}`).toBe(0);
    expect(r.stdout).toMatch(/đoạn seg-000 xong \(1350 frame/);
    expect(frames(f)).toBe(SEG0);
    expect(statSync(segFile(root, 'seg-001')).mtimeMs).toBe(t1);
  }, 360_000);
});

d('[10-1] tập một đoạn 90 frame: --redo, --force, đầu ra đúng chuẩn', () => {
  const root = makeRoot(staticTimeline([90]));
  const args = ['tap-thu', '--root', root, '--procs', '1'];
  const seg = () => segFile(root, 'seg-000');

  test('lần đầu: ra đúng một đoạn h264 yuv420p 1920x1080 30 fps, không âm thanh, 90 frame', () => {
    const r = runRender(args, ENV, 200_000);
    expect(r.status, `${r.stdout}\n${r.stderr}`).toBe(0);
    expect(r.stdout).toMatch(/đoạn seg-000 xong \(90 frame/);
    const info = probe(seg());
    const v = info.streams.find((s: any) => s.codec_type === 'video');
    expect(v.codec_name).toBe('h264');
    expect(v.pix_fmt).toBe('yuv420p');
    expect([v.width, v.height]).toEqual([1920, 1080]);
    expect(v.r_frame_rate).toBe('30/1');
    expect(info.streams.filter((s: any) => s.codec_type === 'audio')).toEqual([]);
    expect(frames(seg())).toBe(90);
    expect(manifest(root)).toMatchObject({
      version: 1,
      slug: 'tap-thu',
      fps: 30,
      durationInFrames: 90,
    });
    expect(manifest(root).srcHash).toMatch(/^[0-9a-f]{64}$/);
  }, 240_000);

  test('chạy lại không đổi gì thì bỏ qua; --redo seg-000 và --force thì render lại', async () => {
    const t0 = statSync(seg()).mtimeMs;
    let r = runRender(args, ENV, 120_000);
    expect(r.status, r.stderr).toBe(0);
    expect(r.stdout).toContain('bỏ qua seg-000');
    expect(statSync(seg()).mtimeMs).toBe(t0);

    await sleep(1100);
    r = runRender([...args, '--redo', 'seg-000'], ENV, 200_000);
    expect(r.status, `${r.stdout}\n${r.stderr}`).toBe(0);
    expect(r.stdout).toMatch(/đoạn seg-000 xong/);
    const t1 = statSync(seg()).mtimeMs;
    expect(t1).toBeGreaterThan(t0);
    expect(main(root)[0].attempts).toBeGreaterThanOrEqual(1);

    await sleep(1100);
    r = runRender([...args, '--force'], ENV, 200_000);
    expect(r.status, `${r.stdout}\n${r.stderr}`).toBe(0);
    expect(r.stdout).toMatch(/đoạn seg-000 xong/);
    expect(statSync(seg()).mtimeMs).toBeGreaterThan(t1);
  }, 600_000);

  test('--redo với đoạn không có thoát mã 1 và nêu tên đoạn', () => {
    const r = runRender([...args, '--redo', 'seg-999'], ENV, 120_000);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('seg-999');
  }, 150_000);

  test('đổi timeline (đổi hash đoạn) thì render lại dù file còn nguyên', () => {
    const tl = staticTimeline([90]);
    tl.scenes[0].props.title = 'Tiêu đề khác hẳn';
    const root2 = makeRoot(tl, 'tap-thu', root);
    expect(root2).toBe(root);
    const r = runRender(args, ENV, 200_000);
    expect(r.status, `${r.stdout}\n${r.stderr}`).toBe(0);
    expect(r.stdout).toMatch(/đoạn seg-000 xong/);
    expect(r.stdout).not.toContain('bỏ qua seg-000');
  }, 240_000);
});

d('[10-1] không để tiến trình chrome-headless-shell mồ côi', () => {
  test('render lỗi (cảnh riêng không tồn tại): mã 1, đóng trình duyệt, đoạn không là done', async () => {
    const tl = staticTimeline([90]);
    tl.scenes[0].type = 'custom:khong-co-canh-nay';
    const root = makeRoot(tl);
    const before = pidsOf(orphans());
    const r = runRender(['tap-thu', '--root', root, '--procs', '2'], ENV, 240_000);
    expect(r.status, `${r.stdout}\n${r.stderr}`).toBe(1);
    expect(r.stderr).toContain('LỖI');
    expect(main(root)[0].status).not.toBe('done');
    expect(existsSync(segFile(root, 'seg-000'))).toBe(false);
    expect(partFiles(root)).toEqual([]);
    expect(await newOrphans(before)).toEqual([]);
  }, 300_000);

  test('lỗi giữa chừng qua điểm móc AIVIDEO_FAIL_SEGMENT: mã 1, không còn trình duyệt mồ côi', async () => {
    const root = makeRoot(staticTimeline([90]));
    const before = pidsOf(orphans());
    const r = runRender(['tap-thu', '--root', root, '--procs', '2'], {
      ...ENV,
      AIVIDEO_FAIL_SEGMENT: 'seg-000',
    }, 240_000);
    expect(r.status, `${r.stdout}\n${r.stderr}`).toBe(1);
    expect(r.stderr).toContain('AIVIDEO_FAIL_SEGMENT');
    expect(main(root)[0].status).toBe('failed');
    expect(existsSync(segFile(root, 'seg-000'))).toBe(false);
    expect(partFiles(root)).toEqual([]);
    expect(await newOrphans(before)).toEqual([]);
  }, 300_000);

  test.each(['throw', 'hang'] as const)(
    'close() của trình duyệt %s (AIVIDEO_FAIL_CLOSE): đoạn vẫn xong, manifest đã ghi, mọi trình duyệt đã mở đều chết, thoát mã 0 trong hạn',
    async (mode) => {
      const root = makeRoot(staticTimeline([90]));
      const trk = trackPids(allPids());
      try {
        const run = startRender(['tap-thu', '--root', root, '--procs', '2'], {
          ...ENV,
          AIVIDEO_FAIL_CLOSE: mode,
        });
        await run.waitFor(/đoạn seg-000 xong/, 240_000);
        const tXong = Date.now();
        const res = await Promise.race([run.exit, sleep(60_000).then(() => 'treo' as const)]);
        if (res === 'treo') run.signal('SIGKILL');
        expect(res, `close() ${mode} không được làm tiến trình treo\n${run.err()}`).not.toBe(
          'treo',
        );
        // hạn close() là 10 giây; cộng chỗ cho diệt dự phòng và ghi manifest
        expect(Date.now() - tXong).toBeLessThan(40_000);
        expect((res as any).code, `${run.out()}\n${run.err()}`).toBe(0);
        expect(trk.seen().length, 'phải thấy trình duyệt đã mở').toBeGreaterThan(0);
        expect(await trk.survivors()).toEqual([]);
        const m = main(root);
        expect(m.map((s) => s.status)).toEqual(['done']);
        expect(frames(segFile(root, 'seg-000'))).toBe(90);
        expect(m[0].bytes).toBe(statSync(segFile(root, 'seg-000')).size);
        expect(partFiles(root)).toEqual([]);
      } finally {
        trk.stop();
      }
    },
    360_000,
  );

  test('close() treo (hang) cộng đoạn lỗi (AIVIDEO_FAIL_SEGMENT): mã 1, đoạn failed trong manifest, không trình duyệt nào còn sống', async () => {
    const root = makeRoot(staticTimeline([90]));
    const trk = trackPids(allPids());
    try {
      const run = startRender(['tap-thu', '--root', root, '--procs', '2'], {
        ...ENV,
        AIVIDEO_FAIL_SEGMENT: 'seg-000',
        AIVIDEO_FAIL_CLOSE: 'hang',
      });
      const res = await Promise.race([run.exit, sleep(240_000).then(() => 'treo' as const)]);
      if (res === 'treo') run.signal('SIGKILL');
      expect(res, `phải thoát\n${run.out()}\n${run.err()}`).not.toBe('treo');
      expect((res as any).code, `${run.out()}\n${run.err()}`).toBe(1);
      expect(main(root)[0].status).toBe('failed');
      expect(existsSync(segFile(root, 'seg-000'))).toBe(false);
      expect(partFiles(root)).toEqual([]);
      expect(trk.seen().length).toBeGreaterThan(0);
      expect(await trk.survivors()).toEqual([]);
    } finally {
      trk.stop();
    }
  }, 300_000);

  test.each(['SIGINT', 'SIGTERM'] as const)(
    '%s ngay sau khi mở trình duyệt: thoát khác 0, manifest đã ghi lại sau tín hiệu, mọi trình duyệt đã mở đều chết, không .part',
    async (sig) => {
      const root = makeRoot(staticTimeline([2701]));
      const trk = trackPids(allPids());
      try {
        const run = startRender(['tap-thu', '--root', root, '--procs', '2'], ENV);
        await run.waitFor(/bundle/, 240_000);
        await sleep(1500);
        expect(trk.seen().length, 'phải thấy trình duyệt đã mở').toBeGreaterThan(0);
        const tSignal = Date.now();
        run.signal(sig);
        const res = await Promise.race([run.exit, sleep(90_000).then(() => 'treo' as const)]);
        if (res === 'treo') run.signal('SIGKILL');
        expect(res, 'phải thoát sau tín hiệu').not.toBe('treo');
        expect((res as any).code, `${run.out()}\n${run.err()}`).not.toBe(0);
        if (sig === 'SIGINT') expect((res as any).code).toBe(130);
        expect(partFiles(root)).toEqual([]);
        expect(await trk.survivors()).toEqual([]);
        // manifest được ghi trong handler tín hiệu (không phải lúc khởi động)
        const mf = path.join(outDir(root), 'manifest.json');
        expect(statSync(mf).mtimeMs).toBeGreaterThanOrEqual(tSignal - 1000);
        const m = main(root);
        expect(m.map((s) => s.id)).toEqual(['seg-000', 'seg-001']);
        expect(m.filter((s) => s.status === 'done')).toEqual([]);
        for (const s of m) expect(existsSync(segFile(root, s.id))).toBe(false);
      } finally {
        trk.stop();
      }
    },
    300_000,
  );
});

// Tiêu chí 10: `_template` với TTS fake (timeline ghim do `episode build
// _template --engine fake` sinh, xem test_render_dai_hop_dong.py), cảnh `custom:*`
// thật, KHÔNG thay bằng timeline tĩnh (D26). 17661 frame, 12 đoạn; --procs 1
// cho lượt bị ngắt nên đoạn 0 xong trước, đoạn kế chưa xong khi SIGINT tới.
d('[10-1] _template (TTS fake): ngắt giữa chừng rồi chạy lại chỉ render đoạn thiếu', () => {
  let tl: any;
  let root = '';
  let steps: ReturnType<typeof plan> = [];
  let ids: string[] = [];
  beforeAll(() => {
    tl = golden();
    root = makeRoot(tl);
    steps = plan(root, 'main');
    ids = steps.map((p) => p.id);
  });
  const doneIds = () =>
    main(root)
      .filter((s) => s.status === 'done')
      .map((s) => s.id);
  let mtimes = new Map<string, number>();

  test('kế hoạch của _template: 12 đoạn phủ kín 17661 frame', () => {
    expect(ids.length).toBe(12);
    expect(steps.reduce((a, p) => a + p.frames, 0)).toBe(tl.durationInFrames);
    expect(tl.durationInFrames).toBe(17661);
  });

  test('SIGINT sau khi đoạn 0 xong: thoát 130, manifest đã ghi, đoạn xong còn nguyên, đoạn dở không "done", không .part, không mồ côi', async () => {
    const before = pidsOf(orphans());
    const run = startRender(['tap-thu', '--root', root, '--procs', '1'], ENV);
    await run.waitFor(/đoạn seg-000 xong/, 600_000);
    run.signal('SIGINT');
    const res = await Promise.race([run.exit, sleep(90_000).then(() => 'treo' as const)]);
    if (res === 'treo') run.signal('SIGKILL');
    expect(res, 'phải thoát sau SIGINT').not.toBe('treo');
    expect((res as any).code, `${run.out()}\n${run.err()}`).toBe(130);

    const m = main(root);
    expect(m.map((s) => s.id)).toEqual(ids);
    expect(doneIds()).toContain('seg-000');
    expect(doneIds().length).toBeLessThan(ids.length);
    for (const s of m) {
      if (s.status === 'done') {
        expect(frames(segFile(root, s.id))).toBe(s.frames);
        mtimes.set(s.id, statSync(segFile(root, s.id)).mtimeMs);
      } else {
        expect(existsSync(segFile(root, s.id)), `${s.id} không được có file cụt`).toBe(false);
      }
    }
    expect(partFiles(root)).toEqual([]);
    expect(await newOrphans(before)).toEqual([]);
  }, 720_000);

  test('chạy lại: bỏ qua đúng các đoạn đã xong, chỉ render các đoạn còn thiếu, đoạn cũ không bị chạm', async () => {
    const had = new Set(doneIds());
    expect(had.size).toBeGreaterThan(0);
    const missing = ids.filter((i) => !had.has(i));
    const before = pidsOf(orphans());
    const r = runRender(['tap-thu', '--root', root, '--procs', '3'], ENV, 1_500_000);
    expect(r.status, `${r.stdout}\n${r.stderr}`).toBe(0);
    const skipped = [...r.stdout.matchAll(/bỏ qua (seg-\d+)/g)].map((x) => x[1]).sort();
    const rendered = [...r.stdout.matchAll(/đoạn (seg-\d+) xong/g)].map((x) => x[1]).sort();
    expect(skipped).toEqual([...had].sort());
    expect(rendered).toEqual([...missing].sort());
    for (const [id, t] of mtimes) expect(statSync(segFile(root, id)).mtimeMs).toBe(t);
    const m = main(root);
    expect(m.map((s) => s.status)).toEqual(ids.map(() => 'done'));
    expect(m.reduce((a, s) => a + s.frames, 0)).toBe(17661);
    for (const s of m) expect(frames(segFile(root, s.id))).toBe(s.frames);
    expect(partFiles(root)).toEqual([]);
    expect(await newOrphans(before)).toEqual([]);
  }, 1_600_000);
});
