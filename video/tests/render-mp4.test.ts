import {spawnSync} from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
} from 'node:fs';
import path from 'node:path';
import {beforeAll, describe, expect, test} from 'vitest';
import {RENDER_TEST, writeSilentWav} from './helpers/render';
import {SAMPLE_PATH, VIDEO_DIR, loadSample} from './helpers/sample';

const d = describe.skipIf(!RENDER_TEST);
const OUT = path.resolve(VIDEO_DIR, '..', 'out', 'video.mp4');

function probe(args: string[]): any {
  const r = spawnSync('ffprobe', ['-v', 'error', '-of', 'json', ...args, OUT], {
    encoding: 'utf8',
  });
  expect(r.status, r.stderr).toBe(0);
  return JSON.parse(r.stdout);
}

d('[2-5] npm run render ra MP4 đúng thông số', () => {
  let timeline: any;
  beforeAll(() => {
    // Dùng file thật nếu đã có; nếu chưa thì dựng từ mẫu + âm thanh im lặng.
    const tl = path.join(VIDEO_DIR, 'public', 'timeline.json');
    if (!existsSync(tl)) {
      mkdirSync(path.join(VIDEO_DIR, 'public', 'audio'), {recursive: true});
      const s = loadSample();
      writeSilentWav(
        path.join(VIDEO_DIR, 'public', s.audio.src),
        s.durationInFrames / s.fps,
      );
      copyFileSync(SAMPLE_PATH, tl);
    }
    timeline = JSON.parse(readFileSync(tl, 'utf8'));
    rmSync(OUT, {force: true});
    const r = spawnSync('npm', ['run', 'render'], {
      cwd: VIDEO_DIR,
      encoding: 'utf8',
      maxBuffer: 1 << 28,
    });
    expect(r.status, `${r.stdout}\n${r.stderr}`).toBe(0);
  }, 1_200_000);

  test('npm run render tạo ../out/video.mp4', () => {
    expect(existsSync(OUT)).toBe(true);
  });

  test('video: h264, yuv420p, 1920x1080, 30 fps', () => {
    const v = probe([
      '-select_streams',
      'v:0',
      '-show_entries',
      'stream=codec_name,pix_fmt,width,height,r_frame_rate',
    ]).streams[0];
    expect(v.codec_name).toBe('h264');
    expect(v.pix_fmt).toBe('yuv420p');
    expect(v.width).toBe(1920);
    expect(v.height).toBe(1080);
    expect(v.r_frame_rate).toBe('30/1');
  });

  test('có đúng một luồng âm thanh AAC', () => {
    const a = probe([
      '-select_streams',
      'a',
      '-show_entries',
      'stream=codec_name',
    ]).streams;
    expect(a).toHaveLength(1);
    expect(a[0].codec_name).toBe('aac');
  });

  test('thời lượng video khớp durationInFrames của timeline ±1 frame', () => {
    const v = probe([
      '-select_streams',
      'v:0',
      '-show_entries',
      'stream=duration,nb_frames',
    ]).streams[0];
    const expected = timeline.durationInFrames / timeline.fps;
    expect(Math.abs(Number(v.duration) - expected)).toBeLessThanOrEqual(
      1 / timeline.fps + 1e-6,
    );
    expect(
      Math.abs(Number(v.nb_frames) - timeline.durationInFrames),
    ).toBeLessThanOrEqual(1);
  });

  test('thời lượng âm thanh khớp timeline ±1 frame', () => {
    const a = probe([
      '-select_streams',
      'a',
      '-show_entries',
      'stream=duration',
    ]).streams[0];
    const expected = timeline.durationInFrames / timeline.fps;
    expect(Math.abs(Number(a.duration) - expected)).toBeLessThanOrEqual(
      1 / timeline.fps + 0.05,
    );
  });

  test.todo(
    'KHÔNG TỰ ĐỘNG ĐƯỢC: người dùng xem bản dựng với giọng giả lập và cho ý kiến về hình',
  );
});
