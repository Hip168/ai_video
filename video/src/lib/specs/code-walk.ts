import type { SceneSpec } from "../types";

export const spec: SceneSpec = {
  type: "code-walk",
  propsSpec: {
    lang: { kind: "string", required: true, oneOf: ["javascript", "typescript", "python", "bash"] },
    lines: { kind: "array", required: true, minItems: 1, maxItems: 18, of: { kind: "string", maxLen: 56 } },
    notes: {
      kind: "array",
      maxItems: 6,
      of: {
        kind: "object",
        shape: {
          line: { kind: "number", required: true, integer: true, min: 1, max: 18 },
          text: { kind: "string", required: true, minLen: 1, maxLen: 90 },
        },
      },
    },
  },
  example: {
    lang: "javascript",
    lines: [
      "function demChan(ds) {",
      "  // đếm số phần tử chẵn",
      "  let dem = 0;",
      "  for (const x of ds) {",
      "    if (x % 2 === 0) dem++;",
      "  }",
      "  return dem;",
      "}",
    ],
    notes: [
      { line: 3, text: "Biến đếm bắt đầu từ không" },
      { line: 4, text: "Duyệt từng phần tử trong danh sách" },
      { line: 5, text: "Số chẵn chia hết cho hai nên dư không" },
      { line: 7, text: "Trả kết quả về cho nơi gọi hàm" },
    ],
  },
  minBeats: 2,
  cues: ["note"],
};
