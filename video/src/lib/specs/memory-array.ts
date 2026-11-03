import type { SceneSpec } from "../types";

export const spec: SceneSpec = {
  type: "memory-array",
  propsSpec: {
    name: { kind: "string", maxLen: 24 },
    cells: { kind: "array", required: true, minItems: 2, maxItems: 10, of: { kind: "string", minLen: 1, maxLen: 6 } },
    base: { kind: "number", integer: true, min: 0, max: 65535 },
    size: { kind: "number", integer: true, min: 1, max: 8 },
    access: { kind: "array", maxItems: 6, of: { kind: "number", integer: true, min: 0, max: 9 } },
  },
  example: {
    name: "bảng điểm",
    cells: ["7", "9", "6", "8", "10"],
    base: 4096,
    size: 4,
    access: [0, 3, 1],
  },
  minBeats: 2,
  cues: ["array", "access"],
};
