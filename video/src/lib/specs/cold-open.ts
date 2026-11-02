import type { SceneSpec } from "../types";

export const spec: SceneSpec = {
  type: "cold-open",
  propsSpec: {
    hook: { kind: "string", required: true, minLen: 1, maxLen: 80 },
    kicker: { kind: "string", maxLen: 40 },
  },
  example: { hook: "Máy tính chỉ hiểu 0 và 1", kicker: "Bạn có biết?" },
  minBeats: 1,
  cues: ["hook"],
};
