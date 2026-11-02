import type { CatalogType, Scene2 } from "../timeline2";

export interface SceneProps {
  scene: Scene2;
}

export type PropSpec =
  | { kind: "string"; required?: boolean; minLen?: number; maxLen?: number; oneOf?: string[] }
  | { kind: "number"; required?: boolean; min?: number; max?: number; integer?: boolean }
  | { kind: "boolean"; required?: boolean }
  | { kind: "array"; of: PropSpec; required?: boolean; minItems?: number; maxItems?: number }
  | { kind: "object"; shape: PropsSpec; required?: boolean };

export type PropsSpec = Record<string, PropSpec>;

export interface SceneSpec {
  type: CatalogType;
  propsSpec: PropsSpec;
  example: Record<string, unknown>;
  minBeats: number;
  cues: string[];
  /** true với spec giữ chỗ: không kiểm khoá props. Đề mục 7, 8 bỏ cờ này. */
  anyProps?: boolean;
}
