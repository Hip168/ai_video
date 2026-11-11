import {readFileSync} from 'node:fs';
import path from 'node:path';
import {describe, expect, test} from 'vitest';
import {SFX_NAMES, validateTimeline2} from '../src/timeline2';
import {VIDEO_DIR} from './helpers/sample';

// [10-2] Cùng bộ mẫu chung với audio/tests/test_render_dai_hop_dong.py:
// mỗi ca có `valid`; phía Python kiểm validate_timeline2 theo đúng `valid`
// này, phía đây kiểm validateTimeline2, nên hai bên cho cùng kết quả.
const DATA = path.resolve(VIDEO_DIR, '..', 'audio', 'tests', 'data');
const read = (f: string): any => JSON.parse(readFileSync(path.join(DATA, f), 'utf8'));
const CASES: {name: string; valid: boolean; timeline: any}[] = read(
  'timeline2-cases.json',
).cases;

describe('[10-2] validateTimeline2 trên bộ mẫu chung với Python', () => {
  test('bộ mẫu đủ lớn: nhiều ca sai, nhiều ca đúng, đủ mọi luật trừ luật 11', () => {
    const names = CASES.map((c) => c.name);
    expect(new Set(names).size).toBe(names.length);
    expect(names.length).toBeGreaterThanOrEqual(70);
    expect(CASES.filter((c) => !c.valid).length).toBeGreaterThanOrEqual(55);
    expect(CASES.filter((c) => c.valid).length).toBeGreaterThanOrEqual(12);
    const rules = new Set(
      names.filter((n) => n.startsWith('luat')).map((n) => n.split('_')[0]),
    );
    const want = new Set<string>();
    for (let i = 1; i <= 13; i++) if (i !== 11) want.add(`luat${i}`);
    expect(rules).toEqual(want);
  });

  test('danh sách tên SFX của TypeScript đúng hợp đồng', () => {
    expect([...SFX_NAMES]).toEqual(['pop', 'tick', 'whoosh', 'ding', 'buzz']);
  });

  test.each(CASES.map((c) => [c.name, c] as const))(
    '%s: kết quả đúng theo `valid` của bộ mẫu chung',
    (_name, c) => {
      if (c.valid) {
        expect(() => validateTimeline2(structuredClone(c.timeline))).not.toThrow();
      } else {
        expect(() => validateTimeline2(structuredClone(c.timeline))).toThrow(/\S/);
      }
    },
  );

  test('timeline `_template` do Python sinh qua được validator TypeScript', () => {
    const golden = read('template-timeline.json');
    const t: any = validateTimeline2(structuredClone(golden));
    expect(t).toEqual(golden);
    expect(t.durationInFrames).toBe(17661);
    expect(t.scenes).toHaveLength(18);
    expect(t.sfx.length).toBeGreaterThan(0);
    for (const fx of t.sfx) expect(SFX_NAMES as readonly string[]).toContain(fx.name);
  });
});
