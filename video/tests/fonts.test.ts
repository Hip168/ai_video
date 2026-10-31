import {existsSync, readdirSync, readFileSync, statSync} from 'node:fs';
import path from 'node:path';
import {describe, expect, test} from 'vitest';
import {VIDEO_DIR} from './helpers/sample';

function walk(dir: string): string[] {
  return readdirSync(dir, {withFileTypes: true}).flatMap((e) =>
    e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)],
  );
}

const FONT_FILES = ['latin', 'latin-ext', 'vietnamese'].flatMap((subset) =>
  ['400', '700'].map((w) => `be-vietnam-pro-${subset}-${w}-normal.woff2`),
);

describe('[2-2] font Việt có sẵn trong repo', () => {
  const fontDir = path.join(VIDEO_DIR, 'public', 'fonts');

  test.each(FONT_FILES)('%s tồn tại, là WOFF2 thật', (name) => {
    const file = path.join(fontDir, name);
    expect(existsSync(file), `thiếu ${name}`).toBe(true);
    expect(statSync(file).size).toBeGreaterThan(5_000);
    expect(readFileSync(file).subarray(0, 4).toString('latin1')).toBe('wOF2');
  });

  test('thư mục font có OFL.txt (giấy phép) và README.md (nguồn)', () => {
    for (const f of ['OFL.txt', 'README.md']) {
      const file = path.join(fontDir, f);
      expect(existsSync(file), `thiếu ${f}`).toBe(true);
      expect(statSync(file).size).toBeGreaterThan(100);
    }
    expect(readFileSync(path.join(fontDir, 'OFL.txt'), 'utf8')).toMatch(
      /SIL OPEN FONT LICENSE/i,
    );
  });

  test('chỉ quét tĩnh: mã nguồn không tải font hay tài nguyên từ mạng', () => {
    const srcFiles = walk(path.join(VIDEO_DIR, 'src')).filter((f) =>
      /\.(ts|tsx|css)$/.test(f),
    );
    expect(srcFiles.length).toBeGreaterThan(0);
    for (const f of srcFiles) {
      const text = readFileSync(f, 'utf8');
      // xmlns của SVG là hằng số, không phải tải mạng
      const remote = text.match(/https?:\/\/(?!www\.w3\.org)[^\s'"`)]+/g);
      expect(remote, `${f} chứa URL mạng`).toBeNull();
      expect(text).not.toMatch(/fonts\.googleapis|fonts\.gstatic/);
    }
  });

  test.todo(
    'KHÔNG TỰ ĐỘNG ĐƯỢC: render khi ngắt mạng (test trên chỉ quét URL tĩnh, chưa chứng minh render offline)',
  );
});
