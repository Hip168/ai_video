import {describe, expect, test} from 'vitest';
import {FLOW_MIN_NODE_FONT} from '../scripts/lint-core';
import {FLOW_SIDE_MARGIN, flowSizes, layoutFlow} from '../src/lib/layout-flow';
import {SHORT_SCENE, SHORT_SCENE_SCALE, SHORT_W} from '../src/Short';
import {SHORT_MIN_TEXT_PX} from '../src/lib/theme';

// Bài học QC tập 6/7: sơ đồ `flow` 3 nút ở khung ngang sát mép phải (~20 px). Hộp nút phải cách hai mép
// khung ít nhất 96 px ở cả khung ngang 16:9 (1920) và khung dọc 9:16 (Short 1080), và chữ nút không xuống dưới
// ngưỡng đọc được (lint: 24 px ở khung ngang; 30 px ở khung Short).

const MARGIN = 96;
const EPS = 0.01;

/** Chuỗi n nút, nhãn dài nhất cho phép (24 ký tự), có nhãn cạnh. */
function chain(n: number, edgeLabels = true): Record<string, unknown> {
  const ids = [...Array(n)].map((_, i) => `n${i}`);
  return {
    nodes: ids.map((id, i) => ({id, label: `Nút số ${i + 1} có nhãn dài ra`.slice(0, 24)})),
    edges: ids.slice(1).map((id, i) => ({from: ids[i], to: id, ...(edgeLabels ? {label: 'nhãn cạnh'} : {})})),
    packets: ids.slice(1).map((id, i) => ({from: ids[i], to: id})),
    direction: 'LR',
  };
}

describe('flow: lề hai bên >= 96 px, chữ nút đủ đọc', () => {
  test('hằng lề khung ngang là 96', () => {
    expect(FLOW_SIDE_MARGIN).toBe(MARGIN);
  });

  test.each([3, 4, 5])('khung ngang 16:9, %i nút: mọi hộp nằm trong x 96..1824, chữ nút >= 24 px', (n) => {
    for (const labels of [true, false]) {
      const l = layoutFlow(chain(n, labels));
      expect(l.boxes).toHaveLength(n);
      for (const b of l.boxes) {
        expect(b.x, `${b.id} trái`).toBeGreaterThanOrEqual(MARGIN - EPS);
        expect(b.x + b.w, `${b.id} phải`).toBeLessThanOrEqual(1920 - MARGIN + EPS);
      }
      expect(flowSizes(l.scale).nodeFont).toBeGreaterThanOrEqual(FLOW_MIN_NODE_FONT);
    }
  });

  test.each([3, 4, 5])('khung dọc 9:16 (Short), %i nút: mọi hộp cách hai mép khung 1080 ít nhất 96 px, chữ nút >= 30 px', (n) => {
    const l = layoutFlow(chain(n), true);
    expect(l.boxes).toHaveLength(n);
    for (const b of l.boxes) {
      const x0 = SHORT_SCENE.x0 + b.x * SHORT_SCENE_SCALE;
      const x1 = SHORT_SCENE.x0 + (b.x + b.w) * SHORT_SCENE_SCALE;
      expect(x0, `${b.id} trái`).toBeGreaterThanOrEqual(MARGIN - EPS);
      expect(x1, `${b.id} phải`).toBeLessThanOrEqual(SHORT_W - MARGIN + EPS);
    }
    expect(flowSizes(l.scale, true).nodeFont).toBeGreaterThanOrEqual(SHORT_MIN_TEXT_PX);
  });

  test('3 nút khung ngang vẫn to: nút >= 380 px, sơ đồ rộng quá nửa khung', () => {
    const l = layoutFlow(chain(3, false));
    const x0 = Math.min(...l.boxes.map((b) => b.x));
    const x1 = Math.max(...l.boxes.map((b) => b.x + b.w));
    expect(l.boxes[0].w).toBeGreaterThanOrEqual(380);
    expect(x1 - x0).toBeGreaterThan(960);
  });
});
