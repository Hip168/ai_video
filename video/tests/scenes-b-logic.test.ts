import {describe, expect, test} from 'vitest';
import {
  ALGO_MAX_H,
  ALGO_SWAP_FRAMES,
  algoBarsAt,
  type BeatStart,
} from '../src/lib/algo-bars-at';
import {
  CODE_LANGS,
  normalizeCode,
  tokenizeCode,
} from '../src/lib/code-highlight';
import {FLOW_AREA, layoutFlow} from '../src/lib/layout-flow';
import {TREE_AREA, layoutTree} from '../src/lib/layout-tree';
import {allStrings, flowMax, hasVi, specB, treeMax, wide} from './helpers/scenes-b';

// Hàm thuần của đề mục 8 (.team/features/8-canh-b-giao-dien.md): bước thuật toán,
// bố cục không chồng nút, tô màu code. Không cần trình duyệt.

// ---------------- algo-bars ----------------
const STEPS = 5;
const START = (k: number) => 30 + k * 100;
const stepBeats = (n: number, cue = 'step'): BeatStart[] =>
  [...Array(n)].map((_, k) => ({startFrame: START(k), cue}));
const example = () => specB('algo-bars').example as any;
const SETTLED = ALGO_SWAP_FRAMES + 10;

describe('[8-9] algoBarsAt: trạng thái frame k khớp bước k', () => {
  test('mọi beat là step: sau khi đổi xong, frame ở beat k cho đúng states[k] (giá trị, active, done, note)', () => {
    const p = example();
    expect(p.states).toHaveLength(STEPS);
    for (let k = 0; k < STEPS; k++) {
      const f = algoBarsAt(p, START(k) + SETTLED, stepBeats(STEPS));
      const st = p.states[k];
      expect(f.index, `bước ${k}`).toBe(k);
      expect(f.values).toEqual(st.values);
      expect(f.active).toEqual(st.active ?? []);
      expect(f.done).toEqual(st.done ?? []);
      expect(f.note).toBe(st.note ?? '');
    }
  });

  test('chiều cao sau khi đổi xong = value / max(mọi trạng thái) x ALGO_MAX_H', () => {
    const p = {
      states: [{values: [2, 4]}, {values: [4, 8]}, {values: [8, 2]}],
    };
    const beats = stepBeats(3);
    const f0 = algoBarsAt(p, START(0) + SETTLED, beats);
    const f1 = algoBarsAt(p, START(1) + SETTLED, beats);
    expect(f0.heights[0]).toBeCloseTo((2 / 8) * ALGO_MAX_H, 3);
    expect(f0.heights[1]).toBeCloseTo((4 / 8) * ALGO_MAX_H, 3);
    expect(f1.heights[0]).toBeCloseTo((4 / 8) * ALGO_MAX_H, 3);
    expect(f1.heights[1]).toBeCloseTo(ALGO_MAX_H, 3);
    expect(Math.max(...f1.heights)).toBeCloseTo(ALGO_MAX_H, 3);
  });

  test('nội suy: đầu beat = chiều cao bước trước, giữa chừng ở giữa, sau ALGO_SWAP_FRAMES = bước mới', () => {
    const p = {states: [{values: [2, 4]}, {values: [4, 8]}]};
    const beats = stepBeats(2);
    const prev = algoBarsAt(p, START(1) - 1, beats).heights;
    const at0 = algoBarsAt(p, START(1), beats).heights;
    const mid = algoBarsAt(p, START(1) + ALGO_SWAP_FRAMES / 2, beats).heights;
    const end = algoBarsAt(p, START(1) + ALGO_SWAP_FRAMES, beats).heights;
    expect(at0[0]).toBeCloseTo(prev[0], 3);
    expect(mid[0]).toBeGreaterThan(prev[0] + 1);
    expect(mid[0]).toBeLessThan(end[0] - 1);
    expect(end[0]).toBeCloseTo((4 / 8) * ALGO_MAX_H, 3);
    expect(end[1]).toBeCloseTo(ALGO_MAX_H, 3);
  });

  test('trước beat đầu tiên là states[0]', () => {
    const f = algoBarsAt(example(), 0, stepBeats(STEPS));
    expect(f.index).toBe(0);
    expect(f.values).toEqual(example().states[0].values);
  });

  test('chỉ beat mang cue step được đếm: beat cue khác bị bỏ qua', () => {
    const beats: BeatStart[] = [
      {startFrame: 30, cue: 'khac'},
      {startFrame: 130, cue: 'step'},
      {startFrame: 230, cue: 'khac'},
      {startFrame: 330, cue: 'step'},
      {startFrame: 430},
    ];
    const p = example();
    expect(algoBarsAt(p, 130 + SETTLED, beats).index).toBe(0);
    expect(algoBarsAt(p, 230 + SETTLED, beats).index).toBe(0);
    expect(algoBarsAt(p, 330 + SETTLED, beats).index).toBe(1);
    expect(algoBarsAt(p, 430 + SETTLED, beats).index).toBe(1);
    expect(algoBarsAt(p, 330 + SETTLED, beats).values).toEqual(p.states[1].values);
  });

  test('chỉ MỘT beat có step: luôn states[0] dù frame ở beat nào', () => {
    const beats: BeatStart[] = [
      {startFrame: 30},
      {startFrame: 130, cue: 'step'},
      {startFrame: 230},
      {startFrame: 330},
    ];
    const p = example();
    for (const f of [0, 130 + SETTLED, 230 + SETTLED, 330 + SETTLED, 900]) {
      expect(algoBarsAt(p, f, beats).index, `frame ${f}`).toBe(0);
    }
  });

  test('không beat nào có step: states[k] theo beat thứ k theo thứ tự', () => {
    const beats: BeatStart[] = [
      {startFrame: 30}, {startFrame: 130, cue: 'khac'}, {startFrame: 230},
      {startFrame: 330}, {startFrame: 430},
    ];
    const p = example();
    for (let k = 0; k < STEPS; k++) {
      expect(algoBarsAt(p, beats[k].startFrame + SETTLED, beats).index).toBe(k);
    }
  });

  test('k vượt số beat: giữ trạng thái cuối đã tới (3 beat, 5 trạng thái)', () => {
    const p = example();
    const beats = stepBeats(3);
    for (const f of [START(2) + SETTLED, START(2) + 500, 5000]) {
      const r = algoBarsAt(p, f, beats);
      expect(r.index).toBe(2);
      expect(r.values).toEqual(p.states[2].values);
    }
  });

  test('frame và startFrame cùng hệ quy chiếu: cộng cùng một độ lệch cho cùng kết quả', () => {
    const p = example();
    const a = algoBarsAt(p, START(2) + 5, stepBeats(STEPS));
    const shifted = stepBeats(STEPS).map((b) => ({...b, startFrame: b.startFrame + 4000}));
    const b = algoBarsAt(p, START(2) + 5 + 4000, shifted);
    expect(b).toEqual(a);
  });

  test('hàm thuần: gọi hai lần cùng đầu vào ra cùng kết quả, không sửa đầu vào', () => {
    const p = example();
    const before = JSON.stringify(p);
    const beats = stepBeats(STEPS);
    expect(algoBarsAt(p, 250, beats)).toEqual(algoBarsAt(p, 250, beats));
    expect(JSON.stringify(p)).toBe(before);
    expect(beats).toEqual(stepBeats(STEPS));
  });
});

// ---------------- bố cục ----------------
const EPS = 1e-6; // sai số làm tròn số thực
type B = {id: string; x: number; y: number; w: number; h: number};
function expectLayoutOk(boxes: B[], area: {x: number; y: number; w: number; h: number}) {
  for (const b of boxes) {
    expect(b.w, b.id).toBeGreaterThan(0);
    expect(b.h, b.id).toBeGreaterThan(0);
    expect(b.x, `${b.id} trái`).toBeGreaterThanOrEqual(40 - EPS);
    expect(b.y, `${b.id} trên`).toBeGreaterThanOrEqual(40 - EPS);
    expect(b.x + b.w, `${b.id} phải`).toBeLessThanOrEqual(1880 + EPS);
    expect(b.y + b.h, `${b.id} dưới`).toBeLessThanOrEqual(790 + EPS);
  }
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i];
      const c = boxes[j];
      const overlap =
        a.x < c.x + c.w - EPS && c.x < a.x + a.w - EPS &&
        a.y < c.y + c.h - EPS && c.y < a.y + a.h - EPS;
      expect(overlap, `${a.id} chồng ${c.id}`).toBe(false);
    }
  }
}

describe('[8-1] layoutFlow: không hộp nào chồng nhau, trong vùng cho phép', () => {
  test('vùng cho phép đúng như hợp đồng', () => {
    expect(FLOW_AREA).toEqual({x: 40, y: 40, w: 1840, h: 750});
  });

  test('ví dụ của spec: đủ một hộp mỗi nút, id khớp, không chồng, trong vùng', () => {
    const p = specB('flow').example as any;
    const l = layoutFlow(p);
    expect(l.boxes.map((b) => b.id).sort()).toEqual(
      p.nodes.map((n: any) => n.id).sort(),
    );
    expectLayoutOk(l.boxes, FLOW_AREA);
  });

  test.each(['LR', 'TB'] as const)(
    '8 nút, 10 cạnh, nhãn dài nhất (%s): không chồng, trong vùng, đủ 8 hộp',
    (dir) => {
      const l = layoutFlow(flowMax(dir));
      expect(l.boxes).toHaveLength(8);
      expect(new Set(l.boxes.map((b) => b.id)).size).toBe(8);
      expectLayoutOk(l.boxes, FLOW_AREA);
      expect(l.scale).toBeGreaterThan(0);
      expect(l.scale).toBeLessThanOrEqual(1);
    },
  );

  test('nút xếp thành một hàng dài / cạnh vòng: vẫn không chồng', () => {
    const ids = [...Array(8)].map((_, i) => `n${i + 1}`);
    const p = {
      nodes: ids.map((id) => ({id, label: wide(24)})),
      edges: ids.map((id, i) => ({from: id, to: ids[(i + 1) % 8]})),
      direction: 'LR',
    };
    expectLayoutOk(layoutFlow(p).boxes, FLOW_AREA);
  });

  test('cạnh trỏ nút lạ hoặc tự trỏ bị bỏ, không ném lỗi, vẫn đủ hộp', () => {
    const p = {
      nodes: [{id: 'a', label: 'A'}, {id: 'b', label: 'B'}],
      edges: [
        {from: 'a', to: 'b'}, {from: 'a', to: 'zzz'}, {from: 'b', to: 'b'},
      ],
    };
    const l = layoutFlow(p);
    expect(l.boxes).toHaveLength(2);
    expect(l.edges).toHaveLength(1);
    expect(l.edges[0]).toMatchObject({from: 'a', to: 'b'});
    expectLayoutOk(l.boxes, FLOW_AREA);
  });

  test('hàm thuần: hai lần gọi cho cùng bố cục', () => {
    expect(layoutFlow(flowMax())).toEqual(layoutFlow(flowMax()));
  });
});

describe('[8-4] layoutTree: không hộp nào chồng nhau, trong vùng cho phép', () => {
  test('vùng cho phép đúng như hợp đồng', () => {
    expect(TREE_AREA).toEqual({x: 40, y: 40, w: 1840, h: 750});
  });

  test('ví dụ của spec: một hộp mỗi nút, không chồng, trong vùng', () => {
    const p = specB('tree-graph').example as any;
    const l = layoutTree(p);
    expect(l.boxes.map((b) => b.id).sort()).toEqual(
      p.nodes.map((n: any) => n.id).sort(),
    );
    expectLayoutOk(l.boxes, TREE_AREA);
  });

  test.each(['binary', 'star', 'chain'] as const)(
    '15 nút dạng %s, nhãn dài nhất: đủ 15 hộp, không chồng, trong vùng',
    (shape) => {
      const l = layoutTree(treeMax(shape));
      expect(l.boxes).toHaveLength(15);
      expect(l.links).toHaveLength(14);
      expectLayoutOk(l.boxes, TREE_AREA);
    },
  );

  test('độ sâu: gốc 0, con = cha + 1; cây nhị phân 15 nút sâu 4 tầng', () => {
    const l = layoutTree(treeMax('binary'));
    const d = new Map(l.boxes.map((b) => [b.id, b.depth]));
    expect(d.get('t1')).toBe(0);
    expect(d.get('t2')).toBe(1);
    expect(d.get('t4')).toBe(2);
    expect(d.get('t8')).toBe(3);
    expect(Math.max(...l.boxes.map((b) => b.depth))).toBe(3);
  });

  test('nút mồ côi (cha không tồn tại) bị bỏ, không ném lỗi', () => {
    const l = layoutTree({
      nodes: [
        {id: 'g', label: 'Gốc'},
        {id: 'c', parent: 'g', label: 'Con'},
        {id: 'x', parent: 'khongco', label: 'Mồ côi'},
      ],
    });
    expect(l.boxes.map((b) => b.id).sort()).toEqual(['c', 'g']);
    expectLayoutOk(l.boxes, TREE_AREA);
  });

  test('hàm thuần: hai lần gọi cho cùng bố cục', () => {
    expect(layoutTree(treeMax())).toEqual(layoutTree(treeMax()));
  });
});

// ---------------- code-walk ----------------
const SNIPPETS: Record<(typeof CODE_LANGS)[number], string> = {
  javascript: 'const tong = 1 + 2;\nreturn "xin chào";',
  typescript: 'let n: number = 2;\nfunction f(x: string) { return x; }',
  python: 'def f(x):\n    return "xin chào" + str(x)',
  bash: 'echo "xin chao" | grep -i x',
};

describe('[8-5] code-walk: tô màu tất định, đúng dấu tiếng Việt', () => {
  test('bốn ngôn ngữ của spec', () => {
    expect([...CODE_LANGS].sort()).toEqual(
      ['bash', 'javascript', 'python', 'typescript'],
    );
  });

  test.each(CODE_LANGS)('%s: tô nhiều hơn một màu', (lang) => {
    const colors = new Set(
      tokenizeCode(SNIPPETS[lang], lang).flatMap((r) => r.map((t) => t.color)),
    );
    expect(colors.size).toBeGreaterThan(1);
  });

  test.each(CODE_LANGS)('%s: hai lần gọi cho token giống hệt (tất định)', (lang) => {
    expect(tokenizeCode(SNIPPETS[lang], lang)).toEqual(
      tokenizeCode(SNIPPETS[lang], lang),
    );
  });

  test.each(CODE_LANGS)('%s: ghép token từng dòng lại đúng bằng dòng gốc (không mất, không thêm ký tự)', (lang) => {
    const src = normalizeCode(SNIPPETS[lang]).split('\n');
    const rows = tokenizeCode(SNIPPETS[lang], lang);
    expect(rows).toHaveLength(src.length);
    rows.forEach((r, i) => expect(r.map((t) => t.text).join('')).toBe(src[i]));
  });

  test('dòng bash có chuỗi tiếng Việt rồi dấu | vẫn được tô màu (không rơi về một token)', () => {
    const rows = tokenizeCode('echo "xin chào" | grep -i x', 'bash');
    expect(rows[0].length).toBeGreaterThan(1);
    expect(new Set(rows[0].map((t) => t.color)).size).toBeGreaterThan(1);
  });

  test('token có màu dạng #rrggbb', () => {
    for (const r of tokenizeCode(SNIPPETS.javascript, 'javascript')) {
      for (const t of r) expect(t.color).toMatch(/^#[0-9a-fA-F]{6,8}$/);
    }
  });

  test('chữ tiếng Việt có dấu trong chuỗi / chú thích code giữ nguyên từng ký tự', () => {
    const code = '// Đây là chú thích: Ưu tiên ắ ề ỡ ự\nconst tên = "Xin chào";';
    const rows = tokenizeCode(code, 'javascript');
    expect(rows.map((r) => r.map((t) => t.text).join('')).join('\n')).toBe(
      code.normalize('NFC'),
    );
  });

  test('normalizeCode: NFC (e + dấu sắc thành é), tab thành 2 dấu cách, bỏ \\r', () => {
    expect(normalizeCode('é')).toBe('é');
    expect(normalizeCode('\tx')).toBe('  x');
    expect(normalizeCode('a\r\nb')).toBe('a\nb');
  });

  test('ví dụ của spec: ghi chú trỏ đúng dòng có thật và viết tiếng Việt có dấu', () => {
    const p = specB('code-walk').example as any;
    expect(p.lines.length).toBeGreaterThanOrEqual(1);
    expect(p.notes.length).toBeGreaterThanOrEqual(1);
    for (const n of p.notes) {
      expect(n.line).toBeGreaterThanOrEqual(1);
      expect(n.line).toBeLessThanOrEqual(p.lines.length);
    }
    expect(allStrings(p.notes).some(hasVi)).toBe(true);
  });

  test('ví dụ của spec: tô nhiều hơn một màu', () => {
    const p = specB('code-walk').example as any;
    const colors = new Set(
      tokenizeCode(p.lines.join('\n'), p.lang).flatMap((r) =>
        r.map((t) => t.color),
      ),
    );
    expect(colors.size).toBeGreaterThan(1);
  });
});
