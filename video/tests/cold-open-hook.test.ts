import {describe, expect, test} from 'vitest';
import {hookLineMotion} from '../src/lib/scenes/cold-open';

// [20] Cold-open: chữ hook hiện đủ ngay từ frame 0 (không mờ dần).

describe('[20] cold-open hook hiện ngay frame 0', () => {
  test.each([0, 1, 2])('dòng %i: opacity = 1 ở frame 0', (i) => {
    expect(hookLineMotion(0, i).opacity).toBe(1);
  });
  test('opacity luôn 1 suốt đoạn vào', () => {
    for (let t = 0; t <= 40; t++) expect(hookLineMotion(t, 0).opacity).toBe(1);
  });
  test('vẫn giữ chuyển động trượt nhẹ rồi đứng yên', () => {
    expect(hookLineMotion(0, 0).dy).toBeGreaterThan(0);
    expect(hookLineMotion(0, 0).dy).toBeLessThanOrEqual(40);
    expect(hookLineMotion(60, 2).dy).toBe(0);
  });
});
