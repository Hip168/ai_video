import type React from "react";
import type { SceneProps } from "../lib/types";
import { MoPhong } from "./_demo/mo-phong";
import { CanhMau } from "./_template/canh-mau";
import { BiteByte } from "./vi-sao-may-tinh-dung-nhi-phan/bite-byte";
import { BoDemVong } from "./vi-sao-may-tinh-dung-nhi-phan/bo-dem-vong";
import { BonMuoiBit } from "./vi-sao-may-tinh-dung-nhi-phan/bon-muoi-bit";
import { DienAp } from "./vi-sao-may-tinh-dung-nhi-phan/dien-ap";
import { MachDen } from "./vi-sao-may-tinh-dung-nhi-phan/mach-den";

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
  // vi-sao-may-tinh-dung-nhi-phan
  "mach-den": MachDen,
  "bite-byte": BiteByte,
  "dien-ap": DienAp,
  "bon-muoi-bit": BonMuoiBit,
  "bo-dem-vong": BoDemVong,
};

/** Cảnh riêng đã tự vẽ vừa hộp vuông của Short (đọc `useBox()`); cảnh khác không được nằm trong Short (D33). */
export const CUSTOM_SQUARE: ReadonlySet<string> = new Set<string>([]);
