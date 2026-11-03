import type { PropSpec, SceneSpec } from "../types";

const idx: PropSpec = { kind: "array", maxItems: 16, of: { kind: "number", integer: true, min: 0, max: 15 } };

export const spec: SceneSpec = {
  type: "algo-bars",
  propsSpec: {
    title: { kind: "string", maxLen: 40 },
    states: {
      kind: "array",
      required: true,
      minItems: 1,
      maxItems: 24,
      of: {
        kind: "object",
        shape: {
          values: { kind: "array", required: true, minItems: 2, maxItems: 16, of: { kind: "number", integer: true, min: 1, max: 99 } },
          active: idx,
          done: idx,
          note: { kind: "string", maxLen: 60 },
        },
      },
    },
  },
  example: {
    title: "Sắp xếp nổi bọt",
    states: [
      { values: [5, 2, 8, 1], note: "Danh sách ban đầu" },
      { values: [5, 2, 8, 1], active: [0, 1], note: "So sánh 5 và 2" },
      { values: [2, 5, 8, 1], active: [0, 1], note: "5 lớn hơn nên đổi chỗ" },
      { values: [2, 5, 8, 1], active: [2, 3], note: "So sánh 8 và 1" },
      { values: [2, 5, 1, 8], done: [3], note: "8 về đúng vị trí cuối" },
    ],
  },
  minBeats: 2,
  cues: ["step"],
};
