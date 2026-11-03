import {existsSync, readdirSync, readFileSync, statSync} from 'node:fs';
import path from 'node:path';
import {describe, expect, test} from 'vitest';
import {VIDEO_DIR} from './helpers/sample';
import {woff2Codepoints} from './helpers/woff2';

const fontDir = path.join(VIDEO_DIR, 'public', 'fonts');

// Kích thước tối thiểu hợp lý theo subset (bản chính thức của
// @fontsource/jetbrains-mono: latin ~21 KB, latin-ext ~7 KB, vietnamese ~4 KB).
const MIN_BYTES: Record<string, number> = {
  latin: 10_000,
  'latin-ext': 3_000,
  vietnamese: 2_000,
};
const SUBSETS = Object.keys(MIN_BYTES);
const FILES = SUBSETS.flatMap((s) =>
  ['400', '700'].map((w) => ({
    name: `jetbrains-mono-${s}-${w}-normal.woff2`,
    subset: s,
  })),
);

const range = (a: number, b: number): number[] =>
  Array.from({length: b - a + 1}, (_, i) => a + i);

// Chữ Việt tiền soạn sẵn: U+1EA0..U+1EF9 (dấu thanh) và các chữ cơ sở.
const VIET_BASE = [
  0x102, 0x103, 0x110, 0x111, 0x128, 0x129, 0x168, 0x169, 0x1a0, 0x1a1,
  0x1af, 0x1b0,
];
const VIET = [...range(0x1ea0, 0x1ef9), ...VIET_BASE];
const ASCII = range(0x20, 0x7e);

describe('[6-4] font đơn cách JetBrains Mono (OFL)', () => {
  test.each(FILES)('$name tồn tại, là WOFF2 thật, đủ lớn theo subset', (f) => {
    const file = path.join(fontDir, f.name);
    expect(existsSync(file), `thiếu ${f.name}`).toBe(true);
    expect(statSync(file).size).toBeGreaterThan(MIN_BYTES[f.subset]);
    expect(readFileSync(file).subarray(0, 4).toString('latin1')).toBe('wOF2');
  });

  test.each(['400', '700'])(
    'subset vietnamese %s có glyph cho mọi chữ Việt tiền soạn (cmap)',
    (w) => {
      const cps = woff2Codepoints(
        path.join(fontDir, `jetbrains-mono-vietnamese-${w}-normal.woff2`),
      );
      const missing = VIET.filter((c) => !cps.has(c));
      expect(
        missing.map((c) => 'U+' + c.toString(16)),
        'thiếu glyph',
      ).toEqual([]);
    },
  );

  test.each(['400', '700'])(
    'subset latin %s có glyph cho mọi ký tự ASCII in được',
    (w) => {
      const cps = woff2Codepoints(
        path.join(fontDir, `jetbrains-mono-latin-${w}-normal.woff2`),
      );
      expect(ASCII.filter((c) => !cps.has(c))).toEqual([]);
    },
  );

  test('có file giấy phép OFL nêu rõ JetBrains Mono', () => {
    const file = path.join(fontDir, 'OFL-JetBrainsMono.txt');
    expect(existsSync(file), 'thiếu OFL-JetBrainsMono.txt').toBe(true);
    const t = readFileSync(file, 'utf8');
    expect(t).toMatch(/JetBrains Mono/);
    expect(t).toMatch(/SIL OPEN FONT LICENSE/i);
  });

  test('README.md của thư mục font ghi nguồn JetBrains Mono', () => {
    const t = readFileSync(path.join(fontDir, 'README.md'), 'utf8');
    expect(t).toMatch(/JetBrains Mono/);
  });

  test('font Be Vietnam Pro và OFL.txt của v1 vẫn còn', () => {
    expect(readFileSync(path.join(fontDir, 'OFL.txt'), 'utf8')).toMatch(
      /SIL OPEN FONT LICENSE/i,
    );
    const left = readdirSync(fontDir).filter((f) =>
      f.startsWith('be-vietnam-pro-'),
    );
    expect(left).toHaveLength(6);
  });

  test('lib/fonts.ts nạp đủ 6 file và khai báo family JetBrainsMono', () => {
    const file = path.join(VIDEO_DIR, 'src', 'lib', 'fonts.ts');
    expect(existsSync(file)).toBe(true);
    const text = readFileSync(file, 'utf8');
    expect(text).toMatch(/['"`]JetBrainsMono['"`]/);
    for (const f of FILES) {
      expect(text, `fonts.ts không nhắc ${f.name}`).toContain(f.name);
    }
  });
});
