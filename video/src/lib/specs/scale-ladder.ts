import type { SceneSpec } from "../types";

export const spec: SceneSpec = {
  type: "scale-ladder",
  propsSpec: {
    rungs: {
      kind: "array",
      required: true,
      minItems: 3,
      maxItems: 7,
      of: {
        kind: "object",
        shape: {
          label: { kind: "string", required: true, minLen: 1, maxLen: 20 },
          value: { kind: "string", required: true, minLen: 1, maxLen: 16 },
          power: { kind: "number", required: true, min: -12, max: 24 },
        },
      },
    },
  },
  example: {
    rungs: [
      { label: "Một ký tự", value: "1 byte", power: 0 },
      { label: "Một bức ảnh", value: "3 MB", power: 6.5 },
      { label: "Một bộ phim", value: "4 GB", power: 9.6 },
      { label: "Một ổ cứng", value: "1 TB", power: 12 },
      { label: "Trung tâm dữ liệu", value: "1 EB", power: 18 },
    ],
  },
  minBeats: 3,
  cues: ["rung"],
};
