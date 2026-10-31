import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe, expect, test} from 'vitest';
import {Subtitle} from '../src/kit';

const html = (text: string, opacity?: number) =>
  renderToStaticMarkup(createElement(Subtitle, {text, opacity}));

describe('[2-2] Subtitle: kiểu dáng theo thiết kế', () => {
  const text = 'Tin nhắn đi qua mạng, ă â ê ô ơ ư đ';
  const out = html(text);

  test('có data-testid="subtitle" và chứa đúng chữ (kể cả dấu)', () => {
    expect(out).toContain('data-testid="subtitle"');
    expect(out).toContain(text);
  });

  test('đặt tuyệt đối, cách đáy 90 px', () => {
    expect(out).toContain('position:absolute');
    expect(out).toContain('bottom:90px');
  });

  test('rộng tối đa 1500 px, chữ 52 px đậm, text-wrap: balance', () => {
    expect(out).toContain('max-width:1500px');
    expect(out).toContain('font-size:52px');
    expect(out).toMatch(/font-weight:(700|bold)/);
    expect(out).toContain('text-wrap:balance');
  });

  test('tối đa 2 dòng, nền tối bán trong suốt, font BeVietnamPro', () => {
    expect(out).toContain('-webkit-line-clamp:2');
    expect(out).toMatch(/background:rgba\(\s*\d+,\s*\d+,\s*\d+,\s*0?\.\d+\)/);
    expect(out).toContain('BeVietnamPro');
  });

  test('opacity truyền vào được áp dụng; mặc định là 1', () => {
    expect(html('x', 0.5)).toContain('opacity:0.5');
    expect(out).toContain('opacity:1');
  });
});
