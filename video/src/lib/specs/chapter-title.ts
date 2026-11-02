import type { SceneSpec } from "../types";

export const spec: SceneSpec = {
  type: "chapter-title",
  propsSpec: {
    title: { kind: "string", required: true, minLen: 1, maxLen: 80 },
    number: { kind: "number", integer: true, min: 1, max: 99 },
    subtitle: { kind: "string", maxLen: 80 },
  },
  example: { title: "Chương một", number: 1, subtitle: "Từ công tắc đến con số" },
  minBeats: 0,
  cues: [],
};
