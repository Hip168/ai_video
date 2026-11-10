import type { SceneSpec } from "../types";

export const spec: SceneSpec = {
  type: "terminal",
  propsSpec: {
    title: { kind: "string", maxLen: 24 },
    prompt: { kind: "string", maxLen: 8 },
    lines: {
      kind: "array",
      required: true,
      minItems: 1,
      maxItems: 10,
      of: {
        kind: "object",
        shape: {
          kind: { kind: "string", required: true, oneOf: ["cmd", "out", "err"] },
          text: { kind: "string", required: true, minLen: 1, maxLen: 56 },
        },
      },
    },
  },
  example: {
    title: "bash",
    prompt: "$",
    lines: [
      { kind: "cmd", text: "ping -c 2 example.com" },
      { kind: "out", text: "64 bytes từ máy chủ: thời gian=21 ms" },
      { kind: "out", text: "64 bytes từ máy chủ: thời gian=19 ms" },
      { kind: "cmd", text: "ping máy-không-có" },
      { kind: "err", text: "Không tìm thấy tên máy chủ" },
    ],
  },
  minBeats: 2,
  cues: ["line"],
};
