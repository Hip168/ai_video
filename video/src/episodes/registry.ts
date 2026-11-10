import type React from "react";
import type { SceneProps } from "../lib/types";
import { MoPhong } from "./_demo/mo-phong";
import { BiteByte } from "./vi-sao-may-tinh-dung-nhi-phan/bite-byte";
import { BoDemVong } from "./vi-sao-may-tinh-dung-nhi-phan/bo-dem-vong";
import { BonMuoiBit } from "./vi-sao-may-tinh-dung-nhi-phan/bon-muoi-bit";
import { DienAp } from "./vi-sao-may-tinh-dung-nhi-phan/dien-ap";
import { MachDen } from "./vi-sao-may-tinh-dung-nhi-phan/mach-den";

/** Cảnh riêng của tập (`custom:<tên>`). Khoá là <tên>, không có tiền tố `custom:`. */
export const CUSTOM_SCENES: Record<string, React.FC<SceneProps>> = {
  "mo-phong": MoPhong,
  // vi-sao-may-tinh-dung-nhi-phan
  "mach-den": MachDen,
  "bite-byte": BiteByte,
  "dien-ap": DienAp,
  "bon-muoi-bit": BonMuoiBit,
  "bo-dem-vong": BoDemVong,
};
