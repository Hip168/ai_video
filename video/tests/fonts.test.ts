import {existsSync, readdirSync, readFileSync, statSync} from 'node:fs';
import path from 'node:path';
import {describe, expect, test} from 'vitest';
import {VIDEO_DIR} from './helpers/sample';

function walk(dir: string): string[] {
  return readdirSync(dir, {withFileTypes: true}).flatMap((e) =>
    e.isDirectory()
      ? walk(path.join(dir, e.name))
      : [path.join(dir, e.name)],
  );
}

describe('[2-2] font Việt có sẵn trong repo, render không cần mạng', () => {
  const fontDir = path.join(VIDEO_DIR, 'public', 'fonts');

  test('có ít nhất một file .woff2 thật trong video/public/fonts', () => {
    expect(existsSync(fontDir)).toBe(true);
    const fonts = readdirSync(fontDir).filter((f) => f.endsWith('.woff2'));
    expect(fonts.length).toBeGreaterThanOrEqual(1);
    for (const f of fonts) {
      const buf = readFileSync(path.join(fontDir, f));
      expect(statSync(path.join(fontDir, f)).size).toBeGreaterThan(10_000);
      // chữ ký file WOFF2
      expect(buf.subarray(0, 4).toString('latin1')).toBe('wOF2');
    }
  });

  test('có file giấy phép OFL đi kèm font', () => {
    const files = readdirSync(fontDir).map((f) => f.toLowerCase());
    expect(files.some((f) => f.includes('ofl') || f.includes('license'))).toBe(
      true,
    );
  });

  test('mã nguồn không tải font hay tài nguyên từ mạng', () => {
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
});
