import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect, test, vi} from 'vitest';
import {Terminal} from '../src/lib/scenes/terminal';
import {SceneBox, THEMES, ThemeProvider} from '../src/lib/theme';

// QC tập 4 vòng 1: ở khung dọc, dòng terminal xuống hàng giữa từ ("bình thườn|g", "quy trì|nh", "float<lbf|>)").
// Khung dọc phải xuống hàng theo từ; chỉ cắt giữa token khi token dài hơn cả hàng. Khung ngang giữ một hàng mỗi dòng.
let FRAME = 0;
vi.mock('remotion', async (orig) => ({
  ...(await orig<typeof import('remotion')>()),
  useCurrentFrame: () => FRAME,
}));

type Line = {kind: 'cmd' | 'out' | 'err'; text: string};

function rows(lines: Line[], layout: 'square' | 'wide', frame = 5000): string[] {
  FRAME = frame;
  const scene: any = {
    id: 's1', chapter: 'c1', type: 'terminal', props: {title: '#', prompt: '>', lines}, startFrame: 0,
    durationFrames: 6000,
    beats: lines.map((_, i) => ({id: `b00${i + 1}`, startFrame: 30 + i * 100, durationFrames: 60, text: 'x'})),
  };
  const html = renderToStaticMarkup(
    createElement(ThemeProvider as any, {theme: THEMES['mau-c']},
      createElement(SceneBox as any, {layout}, createElement(Terminal, {scene}))),
  );
  // Chữ của từng phần tử <text> (mỗi hàng là một phần tử).
  return [...html.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((m) => m[1]
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#x27;/g, "'").replace(/&amp;/g, '&'))
    .filter((t) => t !== '#'); // bỏ tiêu đề cửa sổ
}

const CASES: {name: string; lines: Line[]; words: string[]}[] = [
  {name: 's03', words: ['thường'], lines: [
    {kind: 'out', text: 'giây cuối: mọi hệ thống vẫn bình thường'},
    {kind: 'cmd', text: 'vì sao tàu biến mất?'},
  ]},
  {name: 's49', words: ['trình'], lines: [
    {kind: 'out', text: 'TCM-5: được bàn bằng miệng, ngay trước giờ đốt'},
    {kind: 'err', text: 'không thực hiện: chưa chuẩn bị quy trình'},
  ]},
  {name: 's60', words: ['float<lbf>)', 'float<N>)'], lines: [
    {kind: 'cmd', text: 'let cong (a: float<N>) (b: float<lbf>) = a + b'},
    {kind: 'err', text: "lỗi: đơn vị 'lbf' không khớp với 'N'"},
    {kind: 'out', text: 'báo ngay lúc dịch chương trình'},
  ]},
];

for (const c of CASES) {
  test(`terminal khung dọc ${c.name}: xuống hàng theo từ, không cắt giữa token`, () => {
    const r = rows(c.lines, 'square');
    const tokens = r.flatMap((t) => t.split(' ')).filter(Boolean);
    for (const w of c.words) expect(tokens).toContain(w);
    // Ghép các hàng lại (thêm dấu cách ở chỗ xuống hàng) phải ra đúng các dòng gốc.
    const joined = r.filter((t) => t !== '>').join(' ');
    for (const l of c.lines) expect(joined).toContain(l.text);
  });
}

test('terminal khung dọc: token dài hơn cả hàng thì mới cắt giữa token, không mất ký tự', () => {
  const long = 'x'.repeat(120);
  const r = rows([{kind: 'out', text: long}], 'square');
  expect(r.length).toBeGreaterThan(1);
  expect(r.join('')).toBe(long);
});

test('terminal khung dọc: lệnh đang gõ dở giữ đúng hàng của cả dòng (chữ không nhảy hàng)', () => {
  const lines: Line[] = [{kind: 'cmd', text: 'let cong (a: float<N>) (b: float<lbf>) = a + b'}];
  const done = rows(lines, 'square').filter((t) => t !== '>');
  // beat đầu bắt đầu ở frame 0 (itemStart), gõ 1,1 ký tự mỗi frame: frame 30 đã gõ được 33 ký tự.
  const part = rows(lines, 'square', 30).filter((t) => t !== '>');
  part.forEach((t, i) => expect(done[i].startsWith(t)).toBe(true));
});

test('terminal khung ngang: vẫn một hàng mỗi dòng', () => {
  const r = rows(CASES[2].lines, 'wide');
  expect(r).toContain('let cong (a: float<N>) (b: float<lbf>) = a + b');
});
