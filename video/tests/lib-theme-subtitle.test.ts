import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe, expect, test} from 'vitest';
import {clamp01, ease, useBeatStart} from '../src/lib/hooks';
import {Subtitle, subtitleOpacity} from '../src/lib/subtitle';
import {THEMES, THEME_IDS, getTheme} from '../src/lib/theme';
import {wrapLines} from '../src/lib/text';
import type {Beat2, Scene2} from '../src/timeline2';
import {loadSample2} from './helpers/sample2';

describe('[6-2] theme', () => {
  test('có ít nhất 4 theme; mau-a..mau-d; THEME_IDS khớp THEMES', () => {
    expect(THEME_IDS.length).toBeGreaterThanOrEqual(4);
    for (const id of ['mau-a', 'mau-b', 'mau-c', 'mau-d']) {
      expect(THEMES[id], id).toBeDefined();
    }
    expect([...THEME_IDS].sort()).toEqual(Object.keys(THEMES).sort());
  });
  test('theme của file mẫu hợp đồng có trong THEMES', () => {
    expect(THEME_IDS).toContain(loadSample2().theme);
  });
  test('mỗi theme đủ màu hex, id khớp khoá, pattern hợp lệ', () => {
    for (const [k, t] of Object.entries(THEMES)) {
      expect(t.id).toBe(k);
      for (const f of ['bg', 'panel', 'fg', 'accent', 'accent2', 'muted', 'ok', 'warn'] as const) {
        expect(t[f], `${k}.${f}`).toMatch(/^#[0-9a-fA-F]{6}$/);
      }
      expect(['grid', 'dots', 'diagonal', 'rings']).toContain(t.pattern);
    }
  });
  test('các theme khác nhau về màu nền (chống lặp)', () => {
    const bgs = new Set(Object.values(THEMES).map((t) => t.bg.toLowerCase()));
    expect(bgs.size).toBe(Object.keys(THEMES).length);
  });
  test('getTheme: trả theme đúng; id lạ ném lỗi nêu id', () => {
    expect(getTheme('mau-b')).toBe(THEMES['mau-b']);
    expect(() => getTheme('mau-z')).toThrow(/mau-z/);
  });
});

describe('[6-2] hàm thuần: clamp01, ease, useBeatStart, wrapLines', () => {
  test('clamp01', () => {
    expect(clamp01(-3)).toBe(0);
    expect(clamp01(0.25)).toBe(0.25);
    expect(clamp01(7)).toBe(1);
  });
  test('ease: 0 -> 0, 1 -> 1, đơn điệu, kẹp ngoài [0,1]', () => {
    expect(ease(0)).toBe(0);
    expect(ease(1)).toBe(1);
    expect(ease(-1)).toBe(0);
    expect(ease(2)).toBe(1);
    let prev = -1;
    for (let i = 0; i <= 20; i++) {
      const v = ease(i / 20);
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
  });

  const scene = (): Scene2 => loadSample2().scenes[0] as Scene2;
  const start = (sc: Scene2, cue: string | number): number => {
    let v = NaN;
    const C = () => {
      v = useBeatStart(sc, cue);
      return null;
    };
    renderToStaticMarkup(createElement(C));
    return v;
  };
  test('useBeatStart theo cue, theo chỉ số, cue lạ rơi về beat đầu', () => {
    const sc = scene();
    expect(start(sc, 'hook')).toBe(0);
    expect(start(sc, 1)).toBe(150);
    expect(start(sc, 'khong-co')).toBe(0);
  });
  test('useBeatStart tương đối đầu cảnh (cảnh sc03 bắt đầu 390, beat 390 -> 0)', () => {
    const sc = loadSample2().scenes[2] as Scene2;
    expect(start(sc, 'pop')).toBe(0);
    sc.beats[0].startFrame = 420;
    expect(start(sc, 'pop')).toBe(30);
  });
  test('useBeatStart: cảnh không có beat -> 0', () => {
    expect(start(loadSample2().scenes[1] as Scene2, 'x')).toBe(0);
  });

  test('wrapLines: mỗi dòng <= maxChars, ghép lại đúng chữ, không dòng rỗng', () => {
    const text = 'Máy tính chỉ hiểu hai trạng thái là không và một mà thôi';
    for (const max of [10, 16, 25, 80]) {
      const lines = wrapLines(text, max);
      expect(lines.join(' ')).toBe(text);
      for (const l of lines) {
        expect([...l].length).toBeLessThanOrEqual(max);
        expect(l.trim()).not.toBe('');
      }
    }
    expect(wrapLines(text, 1000)).toEqual([text]);
  });
});

describe('[6-2] phụ đề v2', () => {
  const beat: Beat2 = {id: 'b', startFrame: 100, durationFrames: 60, text: 'x'};
  test('subtitleOpacity: ngoài beat 0, fade vào 4 frame, đầy ở giữa, fade ra 4 frame', () => {
    expect(subtitleOpacity(beat, 99)).toBe(0);
    expect(subtitleOpacity(beat, 100)).toBe(0);
    expect(subtitleOpacity(beat, 102)).toBeCloseTo(0.5, 5);
    expect(subtitleOpacity(beat, 104)).toBe(1);
    expect(subtitleOpacity(beat, 130)).toBe(1);
    expect(subtitleOpacity(beat, 158)).toBeCloseTo(0.5, 5);
    expect(subtitleOpacity(beat, 160)).toBe(0);
    expect(subtitleOpacity(beat, 500)).toBe(0);
  });
  const text = 'Tin nhắn đi qua mạng, ă â ê ô ơ ư đ';
  const out = renderToStaticMarkup(createElement(Subtitle, {text}));
  test('markup: data-testid, đáy 90 px, rộng 1500, chữ 52 đậm, 2 dòng, nền tối', () => {
    expect(out).toContain('data-testid="subtitle"');
    expect(out).toContain(text);
    expect(out).toContain('bottom:90px');
    expect(out).toContain('max-width:1500px');
    expect(out).toContain('font-size:52px');
    expect(out).toMatch(/font-weight:(700|bold)/);
    expect(out).toContain('-webkit-line-clamp:2');
    expect(out).toMatch(/background:rgba\(\s*\d+,\s*\d+,\s*\d+,\s*0?\.\d+\)/);
  });
  test('opacity truyền vào được áp dụng', () => {
    expect(renderToStaticMarkup(createElement(Subtitle, {text: 'x', opacity: 0.5}))).toContain(
      'opacity:0.5',
    );
  });
});
