import {existsSync, readdirSync, readFileSync, statSync} from 'node:fs';
import path from 'node:path';
import {describe, expect, test} from 'vitest';
import {VIDEO_DIR} from './helpers/sample';

const fontDir = path.join(VIDEO_DIR, 'public', 'fonts');
const mono = existsSync(fontDir)
  ? readdirSync(fontDir).filter(
      (f) => /jetbrains[-_ ]?mono/i.test(f) && f.endsWith('.woff2'),
    )
  : [];

describe('[6-4] font đơn cách JetBrains Mono (OFL)', () => {
  test('có ít nhất một file woff2 JetBrains Mono', () => {
    expect(mono.length).toBeGreaterThanOrEqual(1);
  });

  test.each(mono.length ? mono : ['(thiếu)'])(
    '%s là WOFF2 thật, đủ lớn',
    (name) => {
      const file = path.join(fontDir, name);
      expect(existsSync(file), `thiếu ${name}`).toBe(true);
      expect(statSync(file).size).toBeGreaterThan(5_000);
      expect(readFileSync(file).subarray(0, 4).toString('latin1')).toBe('wOF2');
    },
  );

  test('có file giấy phép OFL nêu rõ JetBrains Mono', () => {
    const texts = existsSync(fontDir)
      ? readdirSync(fontDir)
          .filter((f) => /\.(txt|md)$/i.test(f))
          .map((f) => readFileSync(path.join(fontDir, f), 'utf8'))
      : [];
    const ok = texts.some(
      (t) => /JetBrains Mono/i.test(t) && /SIL OPEN FONT LICENSE/i.test(t),
    );
    expect(ok, 'không file .txt/.md nào vừa có JetBrains Mono vừa có SIL OFL').toBe(
      true,
    );
  });

  test('giấy phép Be Vietnam Pro cũ vẫn nguyên (OFL.txt)', () => {
    expect(readFileSync(path.join(fontDir, 'OFL.txt'), 'utf8')).toMatch(
      /SIL OPEN FONT LICENSE/i,
    );
    expect(existsSync(path.join(fontDir, 'be-vietnam-pro-latin-400-normal.woff2'))).toBe(
      true,
    );
  });

  test('lib/fonts.ts nạp từng file JetBrains Mono và khai báo family', () => {
    const file = path.join(VIDEO_DIR, 'src', 'lib', 'fonts.ts');
    expect(existsSync(file)).toBe(true);
    const text = readFileSync(file, 'utf8');
    expect(text).toMatch(/JetBrains ?Mono/);
    expect(mono.length).toBeGreaterThanOrEqual(1);
    for (const name of mono) {
      expect(text, `fonts.ts không nhắc ${name}`).toContain(name);
    }
  });
});
