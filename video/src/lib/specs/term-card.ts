import type { SceneSpec } from "../types";

export const spec: SceneSpec = {
  type: "term-card",
  propsSpec: {
    term: { kind: "string", required: true, minLen: 1, maxLen: 40 },
    tag: { kind: "string", maxLen: 24 },
    pronunciation: { kind: "string", maxLen: 40 },
    definition: { kind: "string", required: true, minLen: 1, maxLen: 160 },
    example: { kind: "string", maxLen: 110 },
  },
  example: {
    term: "Bộ đệm (cache)",
    tag: "Thuật ngữ",
    pronunciation: "/kæʃ/",
    definition: "Vùng nhớ nhỏ và rất nhanh, giữ bản sao dữ liệu hay dùng để CPU không phải chờ RAM",
    example: "Mở lại một trang web đã xem thì trình duyệt lấy từ bộ đệm",
  },
  minBeats: 1,
  cues: [],
};
