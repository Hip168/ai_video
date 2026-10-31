import {describe, expect, test} from 'vitest';
import {packetPosition} from '../src/kit';

describe('[2-3] packetPosition(from, to, start, duration, frame)', () => {
  const from = {x: 100, y: 200};
  const to = {x: 900, y: 600};

  test('tại frame đầu (start): đúng vị trí from', () => {
    const p = packetPosition(from, to, 50, 40, 50);
    expect(p.x).toBeCloseTo(100, 5);
    expect(p.y).toBeCloseTo(200, 5);
  });

  test('tại frame cuối (start+duration): đúng vị trí to', () => {
    const p = packetPosition(from, to, 50, 40, 90);
    expect(p.x).toBeCloseTo(900, 5);
    expect(p.y).toBeCloseTo(600, 5);
  });

  test('tại giữa (start+duration/2): trung điểm của from và to', () => {
    const p = packetPosition(from, to, 50, 40, 70);
    expect(p.x).toBeCloseTo(500, 5);
    expect(p.y).toBeCloseTo(400, 5);
  });

  test('trước start giữ ở from; sau end giữ ở to (không vượt ra ngoài)', () => {
    const before = packetPosition(from, to, 50, 40, 0);
    expect(before.x).toBeCloseTo(100, 5);
    expect(before.y).toBeCloseTo(200, 5);
    const after = packetPosition(from, to, 50, 40, 500);
    expect(after.x).toBeCloseTo(900, 5);
    expect(after.y).toBeCloseTo(600, 5);
  });

  test('di chuyển đơn điệu từ from tới to qua các frame', () => {
    let prev = packetPosition(from, to, 50, 40, 50);
    for (let f = 51; f <= 90; f++) {
      const p = packetPosition(from, to, 50, 40, f);
      expect(p.x).toBeGreaterThanOrEqual(prev.x);
      expect(p.y).toBeGreaterThanOrEqual(prev.y);
      prev = p;
    }
  });

  test('hướng ngược (to nhỏ hơn from) cũng đúng ở đầu, giữa, cuối', () => {
    const a = {x: 1800, y: 900};
    const b = {x: 200, y: 100};
    const s = packetPosition(a, b, 10, 60, 10);
    const m = packetPosition(a, b, 10, 60, 40);
    const e = packetPosition(a, b, 10, 60, 70);
    expect([s.x, s.y]).toEqual([1800, 900]);
    expect(m.x).toBeCloseTo(1000, 5);
    expect(m.y).toBeCloseTo(500, 5);
    expect([e.x, e.y]).toEqual([200, 100]);
  });

  test('là hàm thuần: cùng đầu vào cho cùng kết quả', () => {
    const a = packetPosition(from, to, 5, 30, 17);
    const b = packetPosition(from, to, 5, 30, 17);
    expect(a).toEqual(b);
  });
});
