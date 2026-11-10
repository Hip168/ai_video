import {describe, expect, test} from 'vitest';
import {
  FLOW_MAX_LABEL_OVERLAP,
  FLOW_MIN_LABEL_FONT,
  FLOW_MIN_NODE_FONT,
  lintEpisode,
  type Finding,
  type LintInput,
} from '../scripts/lint-core';
import {flowSizes, layoutFlow} from '../src/lib/layout-flow';
import {beatsOf, propsOf} from './helpers/lint-sample';

// [12-5] Lint cảnh `flow`: chữ nút, chữ nhãn cạnh, nhãn đè nhau.
// Lint tính từ bố cục (layoutFlow + flowSizes), không render.
// Giới hạn đã biết: lint chưa tính phần fitText co thêm khi nhãn dài.

const MIDDLE = [
  'big-number',
  'compare',
  'custom:mo-phong',
  'myth-fact',
  'flow',
  'chart',
  'custom:mo-phong',
  'term-card',
  'layers',
  'history-timeline',
  'bits',
  'tree-graph',
  'code-walk',
];

type Dir = 'TB' | 'LR';
type Props = Record<string, unknown>;

/** Tập hợp lệ (như lint-core.test) với cảnh sc5 (loại flow) đổi props. */
function withFlow(props: unknown): LintInput {
  const types = ['cold-open', ...MIDDLE, ...MIDDLE, 'recap-outro'];
  return {
    slug: 'tap-moi',
    theme: 'mau-b',
    index: [],
    hasDurations: true,
    scenes: types.map((type, i) => ({
      id: `sc${i}`,
      type,
      chapter: `c${Math.floor(i / 7)}`,
      props: i === 5 ? props : propsOf(type),
      durationFrames: 600,
      beats: beatsOf(type),
    })),
  };
}

function chain(n: number, direction: Dir): Props {
  const nodes = Array.from({length: n}, (_, i) => ({
    id: `n${i + 1}`,
    label: `Bước ${i + 1}`,
  }));
  const edges = nodes.slice(1).map((_, i) => ({
    from: `n${i + 1}`,
    to: `n${i + 2}`,
  }));
  return {direction, nodes, edges};
}

/** 1 gốc + k con, mỗi cạnh gốc>con có nhãn. */
function fan(k: number, direction: Dir): Props {
  const nodes = [
    {id: 'root', label: 'Máy chủ'},
    ...Array.from({length: k}, (_, i) => ({
      id: `m${i + 1}`,
      label: `Máy ${i + 1}`,
    })),
  ];
  const edges = Array.from({length: k}, (_, i) => ({
    from: 'root',
    to: `m${i + 1}`,
    label: `gửi gói ${i + 1}`,
  }));
  return {direction, nodes, edges};
}

const flowFindings = (p: Props): Finding[] =>
  lintEpisode(withFlow(p)).filter((f) => f.rule.startsWith('flow-'));
const of = (f: Finding[], rule: string) => f.filter((x) => x.rule === rule);

describe('[12-5] hằng số ngưỡng', () => {
  test('ngưỡng đúng giá trị BA chốt', () => {
    expect(FLOW_MIN_NODE_FONT).toBe(24);
    expect(FLOW_MIN_LABEL_FONT).toBe(20);
    expect(FLOW_MAX_LABEL_OVERLAP).toBe(4);
  });
});

describe('[12-5] flow: chữ nút nhỏ là lỗi', () => {
  test('TB 3 nút: sạch (30,4 px)', () => {
    expect(flowFindings(chain(3, 'TB'))).toEqual([]);
  });
  test('TB 4 nút: flow-node-font 22.0 px', () => {
    const f = flowFindings(chain(4, 'TB'));
    expect(f.map((x) => x.rule)).toEqual(['flow-node-font']);
    expect(f[0].level).toBe('error');
    expect(f[0].message).toBe(
      'cảnh sc5 (flow, 4 nút, hướng TB): chữ nút 22.0 px, ' +
        'cần ít nhất 24 px; tách thành hai cảnh `flow`',
    );
  });
  test('TB 8 nút: flow-node-font 11.4 px (ca issue 8 (f))', () => {
    const f = flowFindings(chain(8, 'TB'));
    expect(f.map((x) => x.rule)).toEqual(['flow-node-font']);
    expect(f[0].level).toBe('error');
    expect(f[0].message).toBe(
      'cảnh sc5 (flow, 8 nút, hướng TB): chữ nút 11.4 px, ' +
        'cần ít nhất 24 px; tách thành hai cảnh `flow`',
    );
  });
  test('LR 5 nút: sạch (25,4 px)', () => {
    expect(flowFindings(chain(5, 'LR'))).toEqual([]);
  });
  test('LR 6 nút: flow-node-font 20.8 px', () => {
    const f = flowFindings(chain(6, 'LR'));
    expect(f.map((x) => x.rule)).toEqual(['flow-node-font']);
    expect(f[0].level).toBe('error');
    expect(f[0].message).toBe(
      'cảnh sc5 (flow, 6 nút, hướng LR): chữ nút 20.8 px, ' +
        'cần ít nhất 24 px; tách thành hai cảnh `flow`',
    );
  });
  test('cỡ chữ trong lỗi khớp flowSizes(layoutFlow.scale) của cảnh', () => {
    const p = chain(4, 'TB');
    const px = flowSizes(layoutFlow(p).scale).nodeFont;
    expect(px).toBeLessThan(FLOW_MIN_NODE_FONT);
    expect(flowFindings(p)[0].message).toContain(`${px.toFixed(1)} px`);
  });
});

describe('[12-5] flow: nhãn cạnh đè nhau', () => {
  test('fan TB 1 gốc 6 con: sạch về lỗi (nhãn giao 3,3 px <= 4 px)', () => {
    const f = flowFindings(fan(6, 'TB'));
    expect(f.filter((x) => x.level === 'error')).toEqual([]);
    expect(of(f, 'flow-label-overlap')).toEqual([]);
  });
  test('fan TB 1 gốc 7 con: chữ nút 23.7 px và 4 lỗi đè 16.4 / 26.8 px', () => {
    const f = flowFindings(fan(7, 'TB'));
    const node = of(f, 'flow-node-font');
    expect(node).toHaveLength(1);
    expect(node[0].message).toBe(
      'cảnh sc5 (flow, 8 nút, hướng TB): chữ nút 23.7 px, ' +
        'cần ít nhất 24 px; tách thành hai cảnh `flow`',
    );
    const ov = of(f, 'flow-label-overlap');
    expect(ov).toHaveLength(4);
    for (const x of ov) {
      expect(x.level).toBe('error');
      expect(x.message).toMatch(
        /^cảnh sc5 \(flow, 8 nút, hướng TB\): nhãn cạnh "root>m\d" và "root>m\d" đè nhau \d+\.\d px, tối đa 4 px; tách thành hai cảnh `flow`$/,
      );
    }
    const px = ov.map((x) => /đè nhau (\d+\.\d) px/.exec(x.message)![1]);
    expect(px.filter((v) => v === '16.4')).toHaveLength(2);
    expect(px.filter((v) => v === '26.8')).toHaveLength(2);
  });
  test('mỗi cặp nhãn đè một lỗi riêng, tên cạnh đúng thứ tự edges', () => {
    const ov = of(flowFindings(fan(7, 'TB')), 'flow-label-overlap');
    const names = ov.map((x) => /nhãn cạnh "(.+?)" và "(.+?)"/.exec(x.message)!);
    for (const m of names) {
      expect(Number(m[1].slice(-1))).toBeLessThan(Number(m[2].slice(-1)));
    }
    expect(new Set(names.map((m) => m[1] + '|' + m[2])).size).toBe(4);
  });
});

describe('[12-5] flow: chữ nhãn cạnh', () => {
  test('không có nhãn cạnh thì không có lỗi flow-edge-label-font', () => {
    for (const p of [chain(3, 'TB'), chain(8, 'TB'), chain(6, 'LR')]) {
      expect(of(flowFindings(p), 'flow-edge-label-font')).toEqual([]);
    }
  });
  test('cỡ chữ nhãn cạnh của mọi ca mẫu >= 20 px nên không báo lỗi', () => {
    for (const p of [fan(6, 'TB'), fan(7, 'TB'), fan(5, 'LR'), fan(6, 'LR')]) {
      const z = flowSizes(layoutFlow(p).scale);
      expect(z.lblFont).toBeGreaterThanOrEqual(FLOW_MIN_LABEL_FONT);
      expect(of(flowFindings(p), 'flow-edge-label-font')).toEqual([]);
    }
  });
});

describe('[12-5] flow: chữ nhãn cạnh nhỏ (cảnh rất dày)', () => {
  const labelled = (n: number): Props => {
    const p = chain(n, 'TB') as {edges: {label?: string}[]};
    p.edges.forEach((e, i) => (e.label = `gói ${i + 1}`));
    return p;
  };
  test('TB 8 nút có nhãn cạnh: lỗi flow-edge-label-font với cỡ khớp flowSizes', () => {
    const p = labelled(8);
    const px = flowSizes(layoutFlow(p).scale).lblFont;
    expect(px).toBeLessThan(FLOW_MIN_LABEL_FONT);
    const f = of(flowFindings(p), 'flow-edge-label-font');
    expect(f).toHaveLength(1);
    expect(f[0].level).toBe('error');
    expect(f[0].message).toBe(
      'cảnh sc5 (flow, 8 nút, hướng TB): chữ nhãn cạnh ' +
        `${px.toFixed(1)} px, cần ít nhất 20 px; tách thành hai cảnh ` +
        '`flow`',
    );
  });
  test('cạnh nhãn rỗng "" không tính là có nhãn', () => {
    const p = chain(8, 'TB') as {edges: {label?: string}[]};
    p.edges.forEach((e) => (e.label = ''));
    expect(of(flowFindings(p), 'flow-edge-label-font')).toEqual([]);
  });
});

describe('[12-5] flow: nhãn che cạnh khác chỉ là cảnh báo', () => {
  test('fan LR 1 gốc 5 con: chỉ cảnh báo flow-label-covers-edge', () => {
    const f = flowFindings(fan(5, 'LR'));
    expect(f.length).toBeGreaterThan(0);
    expect(f.every((x) => x.rule === 'flow-label-covers-edge')).toBe(true);
    expect(f.every((x) => x.level === 'warn')).toBe(true);
    expect(f).toHaveLength(2);
    expect(f[0].message).toMatch(
      /^cảnh sc5 \(flow, 6 nút, hướng LR\): nhãn cạnh "root>m\d" che cạnh "root>m\d"(, "root>m\d")*$/,
    );
  });
  test('fan LR 1 gốc 6 con: lỗi chữ nút 23.5 px, kèm 2 cảnh báo che cạnh', () => {
    const f = flowFindings(fan(6, 'LR'));
    expect(of(f, 'flow-node-font').map((x) => x.message)).toEqual([
      'cảnh sc5 (flow, 7 nút, hướng LR): chữ nút 23.5 px, ' +
        'cần ít nhất 24 px; tách thành hai cảnh `flow`',
    ]);
    expect(of(f, 'flow-label-covers-edge')).toHaveLength(2);
    expect(of(f, 'flow-label-covers-edge').every((x) => x.level === 'warn')).toBe(
      true,
    );
  });
  test('cảnh báo che cạnh không làm tập lỗi nếu không có lỗi khác', () => {
    const all = lintEpisode(withFlow(fan(5, 'LR')));
    expect(all.filter((x) => x.level === 'error')).toEqual([]);
  });
});

describe('[12-5] flow: chỉ chạy khi props hợp lệ, không ảnh hưởng cảnh khác', () => {
  test('props sai (thiếu nodes) -> lỗi props, không có luật flow-*', () => {
    const f = lintEpisode(withFlow({direction: 'TB'}));
    expect(f.some((x) => x.rule === 'props')).toBe(true);
    expect(f.some((x) => x.rule.startsWith('flow-'))).toBe(false);
  });
  test('props thừa khoá (spec từ chối) nhưng bố cục dựng được: không có flow-*', () => {
    const f = lintEpisode(withFlow({...chain(8, 'TB'), bogus: 1}));
    expect(f.some((x) => x.rule === 'props')).toBe(true);
    expect(f.some((x) => x.rule.startsWith('flow-'))).toBe(false);
  });
  test('cảnh flow mẫu của tập hợp lệ vẫn không có phát hiện nào', () => {
    expect(lintEpisode(withFlow(propsOf('flow')))).toEqual([]);
  });
  test('mỗi cảnh flow lỗi được nêu đúng id cảnh của nó', () => {
    const input = withFlow(chain(4, 'TB'));
    input.scenes[18] = {...input.scenes[18], props: chain(8, 'TB')};
    expect(input.scenes[18].type).toBe('flow');
    const f = lintEpisode(input).filter((x) => x.rule === 'flow-node-font');
    expect(f).toHaveLength(2);
    expect(f.some((x) => x.message.startsWith('cảnh sc5 (flow, 4 nút'))).toBe(
      true,
    );
    expect(f.some((x) => x.message.startsWith('cảnh sc18 (flow, 8 nút'))).toBe(
      true,
    );
  });
});
