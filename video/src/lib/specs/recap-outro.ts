import type { SceneSpec } from "../types";

export const spec: SceneSpec = {
  type: "recap-outro",
  propsSpec: {
    points: { kind: "array", required: true, minItems: 1, maxItems: 5, of: { kind: "string", minLen: 1, maxLen: 70 } },
    next: { kind: "string", maxLen: 80 },
  },
  example: {
    points: ["Máy tính lưu mọi thứ bằng bit", "Tám bit là một byte", "Mã hoá biến số thành chữ và hình"],
    next: "Tập sau: bộ nhớ hoạt động thế nào",
  },
  minBeats: 1,
  cues: [],
};
