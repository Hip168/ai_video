import type { SceneSpec } from "../types";

export const spec: SceneSpec = {
  type: "flow",
  propsSpec: {
    nodes: {
      kind: "array",
      required: true,
      minItems: 2,
      maxItems: 8,
      of: {
        kind: "object",
        shape: {
          id: { kind: "string", required: true, minLen: 1, maxLen: 12 },
          label: { kind: "string", required: true, minLen: 1, maxLen: 24 },
        },
      },
    },
    edges: {
      kind: "array",
      required: true,
      minItems: 1,
      maxItems: 10,
      of: {
        kind: "object",
        shape: {
          from: { kind: "string", required: true, minLen: 1, maxLen: 12 },
          to: { kind: "string", required: true, minLen: 1, maxLen: 12 },
          label: { kind: "string", maxLen: 16 },
        },
      },
    },
    packets: {
      kind: "array",
      maxItems: 6,
      of: {
        kind: "object",
        shape: {
          from: { kind: "string", required: true, minLen: 1, maxLen: 12 },
          to: { kind: "string", required: true, minLen: 1, maxLen: 12 },
          label: { kind: "string", maxLen: 8 },
        },
      },
    },
    direction: { kind: "string", oneOf: ["LR", "TB"] },
  },
  example: {
    nodes: [
      { id: "may", label: "Máy của bạn" },
      { id: "router", label: "Router" },
      { id: "dns", label: "Máy chủ DNS" },
      { id: "web", label: "Máy chủ web" },
    ],
    edges: [
      { from: "may", to: "router" },
      { from: "router", to: "dns", label: "hỏi tên" },
      { from: "router", to: "web", label: "tải trang" },
    ],
    packets: [
      { from: "may", to: "router", label: "yêu cầu" },
      { from: "router", to: "dns", label: "tên" },
      { from: "router", to: "web", label: "GET" },
    ],
    direction: "LR",
  },
  minBeats: 1,
  cues: ["graph", "packet"],
};
