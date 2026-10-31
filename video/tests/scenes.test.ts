import {describe, expect, test} from 'vitest';
import {SCENES} from '../src/scenes';
import {SCENE_IDS} from '../src/timeline';
import {loadSample} from './helpers/sample';

const CONTRACT_ORDER = [
  'phone',
  'dns',
  'packets',
  'wifi',
  'hops',
  'server',
  'receiver',
];

describe('[2-4] SCENES khớp SCENE_IDS và hợp đồng', () => {
  test('SCENE_IDS đúng 7 id theo thứ tự hợp đồng', () => {
    expect([...SCENE_IDS]).toEqual(CONTRACT_ORDER);
  });

  test('SCENES có đúng các khoá của SCENE_IDS, không thừa không thiếu', () => {
    expect(Object.keys(SCENES).sort()).toEqual([...CONTRACT_ORDER].sort());
  });

  test.each(CONTRACT_ORDER)('SCENES.%s là component (function)', (id) => {
    expect(typeof (SCENES as Record<string, unknown>)[id]).toBe('function');
  });

  test('mọi id cảnh trong file mẫu đều có component', () => {
    for (const sc of loadSample().scenes) {
      expect(typeof (SCENES as Record<string, unknown>)[sc.id]).toBe(
        'function',
      );
    }
  });

  test('mỗi cảnh là một component riêng (không trỏ chung một hàm)', () => {
    const fns = new Set(Object.values(SCENES));
    expect(fns.size).toBe(7);
  });
});
