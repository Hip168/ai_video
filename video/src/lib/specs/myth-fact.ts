import type { SceneSpec } from "../types";

export const spec: SceneSpec = {
  type: "myth-fact",
  propsSpec: {
    pairs: {
      kind: "array",
      required: true,
      minItems: 1,
      maxItems: 3,
      of: {
        kind: "object",
        shape: {
          myth: { kind: "string", required: true, minLen: 1, maxLen: 90 },
          fact: { kind: "string", required: true, minLen: 1, maxLen: 120 },
        },
      },
    },
  },
  example: {
    pairs: [
      { myth: "Xoá file là dữ liệu biến mất ngay", fact: "Máy chỉ đánh dấu chỗ đó là trống, dữ liệu còn đến khi bị ghi đè" },
      { myth: "Nhiều lõi hơn thì luôn nhanh hơn", fact: "Chỉ nhanh khi phần mềm biết chia việc ra nhiều lõi" },
    ],
  },
  minBeats: 2,
  cues: [],
};
