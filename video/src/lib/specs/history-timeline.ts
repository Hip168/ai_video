import type { SceneSpec } from "../types";

export const spec: SceneSpec = {
  type: "history-timeline",
  propsSpec: {
    events: {
      kind: "array",
      required: true,
      minItems: 3,
      maxItems: 6,
      of: {
        kind: "object",
        shape: {
          year: { kind: "string", required: true, minLen: 1, maxLen: 10 },
          title: { kind: "string", required: true, minLen: 1, maxLen: 50 },
          detail: { kind: "string", maxLen: 100 },
        },
      },
    },
  },
  example: {
    events: [
      { year: "1946", title: "ENIAC ra đời", detail: "Máy tính điện tử đa dụng đầu tiên, nặng 27 tấn" },
      { year: "1971", title: "Chip Intel 4004", detail: "Cả bộ xử lý trên một con chip" },
      { year: "1981", title: "IBM PC", detail: "Máy tính cá nhân đi vào văn phòng" },
      { year: "2007", title: "iPhone", detail: "Máy tính bỏ túi có màn hình cảm ứng" },
    ],
  },
  minBeats: 3,
  cues: [],
};
