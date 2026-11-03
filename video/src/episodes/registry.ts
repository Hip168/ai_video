import type React from "react";
import type { SceneProps } from "../lib/types";
import { MoPhong } from "./_demo/mo-phong";
import { CanhMau } from "./_template/canh-mau";

/** Cảnh riêng của tập (`custom:<tên>`). Khoá là <tên>, không có tiền tố `custom:`. */
export const CUSTOM_SCENES: Record<string, React.FC<SceneProps>> = {
  "mo-phong": MoPhong,
  "bang-so": CanhMau,
  "buoc-xu-ly": CanhMau,
  "do-toc-do": CanhMau,
  "dong-chay": CanhMau,
  "loi-thuong-gap": CanhMau,
  "nhin-lai": CanhMau,
  "so-do": CanhMau,
  "so-lieu": CanhMau,
  "so-sanh": CanhMau,
  "tong-ket-nho": CanhMau,
  "vi-du": CanhMau,
};
