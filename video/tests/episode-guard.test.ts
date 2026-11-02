import {createHash} from 'node:crypto';
import {existsSync, readdirSync, readFileSync} from 'node:fs';
import path from 'node:path';
import {describe, expect, test} from 'vitest';
import {VIDEO_DIR} from './helpers/sample';

const SRC = path.join(VIDEO_DIR, 'src');
const LIB = path.join(SRC, 'lib');

function walk(dir: string): string[] {
  return readdirSync(dir, {withFileTypes: true}).flatMap((e) =>
    e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)],
  );
}

function sha(file: string): string {
  return createHash('sha256').update(readFileSync(file)).digest('hex');
}

// 18 loại cảnh theo D16 và 7-8-canh.md.
const STRUCTURE = ['cold-open', 'chapter-title', 'recap-outro'];
const GROUP_A = [
  'big-number',
  'compare',
  'myth-fact',
  'history-timeline',
  'term-card',
  'chart',
];
const GROUP_B = [
  'flow',
  'layers',
  'scale-ladder',
  'tree-graph',
  'code-walk',
  'terminal',
  'bits',
  'memory-array',
  'algo-bars',
];
const ALL_TYPES = [...STRUCTURE, ...GROUP_A, ...GROUP_B];

describe('[6-1] D15: file của v1 giữ nguyên byte', () => {
  // sha256 đo ở commit gốc 40e88c5 của nhánh 6-khung-v2.
  const PINNED: Record<string, string> = {
    'src/timeline.ts':
      '7c396d16229277d0c3190e7e172ef16bb46124c00c7d225a9c1f086caa337875',
    'src/Video.tsx':
      '3500160f767a5e4d6669ed6c1104a8d9418f889a0e9243d6dd7fa9038a560793',
    'src/font.ts':
      '4f706b9120acdf397bc716de8c0111e76603bb7ee4ab11bd54e110c5670dc819',
    'src/KitDemo.tsx':
      '181090b1ee3067e65ca4358efdb54b04efadaba494b02c4f377b2d4a2ee47bc0',
    'src/index.ts':
      '32185b5fe29233ed658013191cf02a1ba3181fe15dd4c43848136a344887ff0f',
    'src/scenes/Dns.tsx':
      '424cf8e4627e10133dd366e6e8796b17f50b99b0ad3e86fd2691357d11dc6e0d',
    'src/scenes/Hops.tsx':
      'd87df0a5c05d93dfde5ae723a019f22364959d634d159ea44b7c4689991b1114',
    'src/scenes/Packets.tsx':
      '38b2f0ffc731541adca7955e50e7a8c747a036d186d6b4bf8b4bbbedef6bf668',
    'src/scenes/Phone.tsx':
      'f9759448a934cd22b46ebfde393e606487389aea5fd34ab3f6232a8deb4076e9',
    'src/scenes/Receiver.tsx':
      '13a9bf5a1b15fd1f2ed259661d4bfcd2d78b732a71657ee61b14480693c8bdad',
    'src/scenes/Server.tsx':
      '8d37bb80e388eebe501bdf4b1ca1381142146aca2263fc44f95f96c041fdc910',
    'src/scenes/Wifi.tsx':
      '7ac83e6637b8476a94113b3880353179e456e6f93ee312a37a2faa993e527d53',
    'src/scenes/index.ts':
      '755c8ce258f7d1202e4ec8905adc0f0b6e9dffc5ea69f0db644397ee1b05fd05',
  };

  test.each(Object.keys(PINNED))('%s không bị sửa', (rel) => {
    expect(sha(path.join(VIDEO_DIR, rel))).toBe(PINNED[rel]);
  });

  test('thư mục src/scenes không có file lạ (không thêm vào v1)', () => {
    const names = readdirSync(path.join(SRC, 'scenes')).sort();
    const expected = Object.keys(PINNED)
      .filter((k) => k.startsWith('src/scenes/'))
      .map((k) => path.basename(k))
      .sort();
    expect(names).toEqual(expected);
  });
});

describe('[6-1] package.json: v1 còn nguyên, ghim chính xác, có tsx', () => {
  const pkg = JSON.parse(
    readFileSync(path.join(VIDEO_DIR, 'package.json'), 'utf8'),
  );

  const V1_DEPS = {
    '@remotion/cli': '4.0.539',
    react: '19.1.10',
    'react-dom': '19.1.10',
    remotion: '4.0.539',
  };
  const V1_DEV = {
    '@remotion/bundler': '4.0.539',
    '@remotion/renderer': '4.0.539',
    '@types/node': '22.20.5',
    '@types/react': '19.3.0',
    '@types/react-dom': '19.3.0',
    typescript: '5.7.2',
    vitest: '5.0.5',
  };

  test('mọi mục dependencies của v1 còn nguyên (đề mục khác được thêm gói)', () => {
    expect(pkg.dependencies).toMatchObject(V1_DEPS);
  });

  test('mọi mục devDependencies của v1 còn nguyên và có tsx', () => {
    expect(pkg.devDependencies).toMatchObject(V1_DEV);
    expect(pkg.devDependencies.tsx).toBeDefined();
  });

  test('mọi phiên bản trong dependencies và devDependencies ghim chính xác (không ^ ~ *)', () => {
    for (const group of [pkg.dependencies, pkg.devDependencies]) {
      for (const [name, ver] of Object.entries(group)) {
        expect(ver, name).toMatch(/^\d+\.\d+\.\d+$/);
      }
    }
  });

  test('scripts v1 còn nguyên và có thêm lint:episode dùng tsx', () => {
    expect(pkg.scripts).toMatchObject({
      studio: 'remotion studio src/index.ts',
      render: 'remotion render src/index.ts Video ../out/video.mp4',
      test: 'vitest run',
      typecheck: 'tsc --noEmit',
    });
    expect(pkg.scripts['lint:episode']).toMatch(/\btsx\b/);
    expect(pkg.scripts['lint:episode']).toContain('scripts/lint-episode.ts');
    expect(existsSync(path.join(VIDEO_DIR, 'scripts', 'lint-episode.ts'))).toBe(
      true,
    );
  });
});

describe('[6-1][6-2] cấu trúc file theo kiến trúc đã chọn', () => {
  test.each([
    'src/timeline2.ts',
    'src/Episode.tsx',
    'src/lib/theme.ts',
    'src/lib/subtitle.tsx',
    'src/lib/hooks.ts',
    'src/lib/fonts.ts',
    'src/lib/registry.ts',
    'src/episodes/registry.ts',
  ])('%s tồn tại và không rỗng', (rel) => {
    // theme/subtitle/hooks có thể là .ts hoặc .tsx: chấp nhận cả hai.
    const base = path.join(VIDEO_DIR, rel).replace(/\.tsx?$/, '');
    const found = ['.ts', '.tsx'].map((e) => base + e).find(existsSync);
    expect(found, `thiếu ${rel}`).toBeDefined();
    expect(readFileSync(found!, 'utf8').trim().length).toBeGreaterThan(50);
  });

  test.each(STRUCTURE)('cảnh cấu trúc %s có scenes/<type>.tsx và specs/<type>.ts', (t) => {
    expect(existsSync(path.join(LIB, 'scenes', `${t}.tsx`))).toBe(true);
    expect(existsSync(path.join(LIB, 'specs', `${t}.ts`))).toBe(true);
  });

  test('registry.ts có đủ 18 id, mỗi id là chuỗi trong nháy', () => {
    const text = readFileSync(path.join(LIB, 'registry.ts'), 'utf8');
    for (const t of ALL_TYPES) {
      expect(text, `registry thiếu id ${t}`).toMatch(
        new RegExp(`['"\`]${t}['"\`]`),
      );
    }
  });
});

describe('[6-2] luật cho mọi cảnh: grep tĩnh trong video/src/lib', () => {
  const files = existsSync(LIB)
    ? walk(LIB).filter((f) => /\.(ts|tsx|css)$/.test(f))
    : [];

  test('thư mục lib có các file nguồn (không xanh vì thư mục rỗng)', () => {
    expect(files.length).toBeGreaterThanOrEqual(11);
  });

  test('không chuỗi URL http(s):// nào (kể cả xmlns)', () => {
    for (const f of files) {
      const text = readFileSync(f, 'utf8');
      const remote = text.match(/https?:\/\/[^\s'"`)]+/g);
      expect(remote, `${f} chứa URL`).toBeNull();
    }
  });

  test('không dùng filter blur, feGaussianBlur, backdrop-filter, <filter>', () => {
    const bad = [
      /\bblur\s*\(/i,
      /feGaussianBlur/i,
      /backdrop-?filter/i,
      /<filter\b/i,
      /\bfilter\s*[:=]/i,
    ];
    for (const f of files) {
      const text = readFileSync(f, 'utf8');
      for (const re of bad) {
        expect(text, `${f} khớp ${re}`).not.toMatch(re);
      }
    }
  });
});
