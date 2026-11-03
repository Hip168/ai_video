import type { SceneSpec } from "../types";

export const spec: SceneSpec = {
  type: "big-number",
  propsSpec: {
    value: { kind: "number", required: true, min: -1e12, max: 1e12 },
    from: { kind: "number", min: -1e12, max: 1e12 },
    decimals: { kind: "number", integer: true, min: 0, max: 3 },
    prefix: { kind: "string", maxLen: 12 },
    suffix: { kind: "string", maxLen: 16 },
    label: { kind: "string", required: true, minLen: 1, maxLen: 80 },
    note: { kind: "string", maxLen: 100 },
  },
  example: { value: 8589934592, suffix: " byte", label: "Bộ nhớ tối đa mà CPU 32 bit chạm tới trong ví dụ 8 GB", note: "Mỗi byte có một địa chỉ riêng" },
  minBeats: 1,
  cues: [],
};
