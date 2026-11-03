import type React from "react";
import type { SceneProps } from "../lib/types";
import { MoPhong } from "./_demo/mo-phong";

/** Cảnh riêng của tập (`custom:<tên>`). Khoá là <tên>, không có tiền tố `custom:`. */
export const CUSTOM_SCENES: Record<string, React.FC<SceneProps>> = {
  "mo-phong": MoPhong,
};
