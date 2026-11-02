import type { CatalogType } from "../../timeline2";
import type { SceneSpec } from "../types";

/** Spec giữ chỗ: không kiểm props (anyProps), ví dụ rỗng, không đòi beat. */
export const placeholderSpec = (type: CatalogType): SceneSpec => ({
  type,
  propsSpec: {},
  example: {},
  minBeats: 0,
  cues: [],
  anyProps: true,
});
