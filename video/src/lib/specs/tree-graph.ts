import type { SceneSpec } from "../types";

export const spec: SceneSpec = {
  type: "tree-graph",
  propsSpec: {
    nodes: {
      kind: "array",
      required: true,
      minItems: 2,
      maxItems: 15,
      of: {
        kind: "object",
        shape: {
          id: { kind: "string", required: true, minLen: 1, maxLen: 12 },
          parent: { kind: "string", maxLen: 12 },
          label: { kind: "string", required: true, minLen: 1, maxLen: 16 },
        },
      },
    },
    path: { kind: "array", maxItems: 6, of: { kind: "string", minLen: 1, maxLen: 12 } },
  },
  example: {
    nodes: [
      { id: "goc", label: "/" },
      { id: "home", parent: "goc", label: "home" },
      { id: "etc", parent: "goc", label: "etc" },
      { id: "an", parent: "home", label: "an" },
      { id: "binh", parent: "home", label: "bình" },
      { id: "hosts", parent: "etc", label: "hosts" },
    ],
    path: ["goc", "home", "an"],
  },
  minBeats: 2,
  cues: ["level", "path"],
};
