import type { SceneSpec } from "../types";

export const spec: SceneSpec = {
  type: "layers",
  propsSpec: {
    layers: {
      kind: "array",
      required: true,
      minItems: 2,
      maxItems: 7,
      of: {
        kind: "object",
        shape: {
          name: { kind: "string", required: true, minLen: 1, maxLen: 24 },
          detail: { kind: "string", maxLen: 40 },
        },
      },
    },
    highlight: { kind: "number", integer: true, min: 0, max: 6 },
  },
  example: {
    layers: [
      { name: "Ứng dụng", detail: "trình duyệt, thư điện tử" },
      { name: "Vận chuyển", detail: "TCP chia dữ liệu thành gói" },
      { name: "Mạng", detail: "IP chọn đường đi" },
      { name: "Liên kết", detail: "Wi-Fi, cáp mạng" },
    ],
    highlight: 2,
  },
  minBeats: 2,
  cues: ["layer", "highlight"],
};
