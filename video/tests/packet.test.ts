import {describe, expect, test} from 'vitest';
import {POS, packetPosition, subtitleOpacity} from '../src/kit';

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

describe('[2-3] packetPosition: biên theo giao diện công khai', () => {
  const from = {x: 0, y: 0};
  const to = {x: 100, y: 50};
  test('duration <= 0 trả về to', () => {
    expect(packetPosition(from, to, 10, 0, 10)).toEqual(to);
    expect(packetPosition(from, to, 10, -5, 3)).toEqual(to);
  });
  test('nội suy tuyến tính ở 1/4 và 3/4', () => {
    const q = packetPosition(from, to, 0, 40, 10);
    expect(q.x).toBeCloseTo(25, 5);
    expect(q.y).toBeCloseTo(12.5, 5);
    const r = packetPosition(from, to, 0, 40, 30);
    expect(r.x).toBeCloseTo(75, 5);
    expect(r.y).toBeCloseTo(37.5, 5);
  });
});

describe('[2-3] POS nằm trong khung và phía trên dải phụ đề', () => {
  test.each(Object.entries(POS))('%s', (_name, p) => {
    expect(p.x).toBeGreaterThanOrEqual(0);
    expect(p.x).toBeLessThanOrEqual(1920);
    expect(p.y).toBeGreaterThanOrEqual(0);
    expect(p.y).toBeLessThan(880);
  });
  test('đủ 8 điểm và không có hai điểm trùng nhau', () => {
    const keys = Object.keys(POS).sort();
    expect(keys).toEqual(
      ['dns', 'isp1', 'isp2', 'isp3', 'phone', 'receiver', 'router', 'server'].sort(),
    );
    const set = new Set(Object.values(POS).map((p) => `${p.x},${p.y}`));
    expect(set.size).toBe(8);
  });
});

describe('[2-2] subtitleOpacity (fade 4 frame)', () => {
  const beat = {id: 'b', startFrame: 100, durationFrames: 50, text: 'x'};
  test('0 tại start, tăng dần, 1 từ start+4', () => {
    expect(subtitleOpacity(beat, 100)).toBe(0);
    expect(subtitleOpacity(beat, 102)).toBeCloseTo(0.5, 5);
    expect(subtitleOpacity(beat, 104)).toBe(1);
    expect(subtitleOpacity(beat, 125)).toBe(1);
  });
  test('giảm về cuối: start+dur-1 là 0.25, ngoài beat là 0', () => {
    expect(subtitleOpacity(beat, 145)).toBe(1);
    expect(subtitleOpacity(beat, 149)).toBeCloseTo(0.25, 5);
    expect(subtitleOpacity(beat, 150)).toBe(0);
    expect(subtitleOpacity(beat, 99)).toBe(0);
    expect(subtitleOpacity(beat, 500)).toBe(0);
  });
});
