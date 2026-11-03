import type { SceneSpec } from "../types";

export const spec: SceneSpec = {
  type: "bits",
  propsSpec: {
    value: { kind: "number", required: true, integer: true, min: 0, max: 65535 },
    // `width` là số bit TỐI THIỂU; cảnh hiện max(width, độ dài bit của value) để không bao giờ hiện số khác value.
    width: { kind: "number", integer: true, min: 4, max: 16 },
    label: { kind: "string", maxLen: 30 },
  },
  example: { value: 202, width: 8, label: "Một byte đổi sang số thập phân" },
  minBeats: 2,
  cues: ["bit"],
};
