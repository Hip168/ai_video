import type { SceneSpec } from "../types";

export const spec: SceneSpec = {
  type: "compare",
  propsSpec: {
    titleA: { kind: "string", required: true, minLen: 1, maxLen: 30 },
    titleB: { kind: "string", required: true, minLen: 1, maxLen: 30 },
    rows: {
      kind: "array",
      required: true,
      minItems: 2,
      maxItems: 5,
      of: {
        kind: "object",
        shape: {
          label: { kind: "string", required: true, minLen: 1, maxLen: 60 },
          a: { kind: "boolean", required: true },
          b: { kind: "boolean", required: true },
        },
      },
    },
  },
  example: {
    titleA: "RAM",
    titleB: "Ổ cứng",
    rows: [
      { label: "Truy cập rất nhanh", a: true, b: false },
      { label: "Giữ dữ liệu khi tắt máy", a: false, b: true },
      { label: "Dung lượng lớn, giá rẻ", a: false, b: true },
    ],
  },
  minBeats: 2,
  cues: [],
};
