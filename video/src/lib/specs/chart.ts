import type { SceneSpec } from "../types";

export const spec: SceneSpec = {
  type: "chart",
  propsSpec: {
    kind: { kind: "string", required: true, oneOf: ["bar", "line"] },
    title: { kind: "string", maxLen: 60 },
    unit: { kind: "string", maxLen: 12 },
    decimals: { kind: "number", integer: true, min: 0, max: 3 },
    highlight: { kind: "number", integer: true, min: 0, max: 7 },
    data: {
      kind: "array",
      required: true,
      minItems: 2,
      maxItems: 8,
      of: {
        kind: "object",
        shape: {
          label: { kind: "string", required: true, minLen: 1, maxLen: 16 },
          value: { kind: "number", required: true, min: -1e12, max: 1e12 },
        },
      },
    },
  },
  example: {
    kind: "bar",
    title: "Dung lượng RAM phổ biến theo năm",
    unit: " GB",
    highlight: 3,
    data: [
      { label: "2005", value: 0.5 },
      { label: "2010", value: 2 },
      { label: "2015", value: 8 },
      { label: "2020", value: 16 },
      { label: "2025", value: 32 },
    ],
    decimals: 1,
  },
  minBeats: 2,
  cues: [],
};
