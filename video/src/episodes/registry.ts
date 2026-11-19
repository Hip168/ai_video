import type React from "react";
import type { SceneProps } from "../lib/types";
import { MoPhong } from "./_demo/mo-phong";
import { CanhMau } from "./_template/canh-mau";
import { BanhDa } from "./con-tau-sao-hoa-mat-vi-nham-don-vi/banh-da";
import { DoCao } from "./con-tau-sao-hoa-mat-vi-nham-don-vi/do-cao";
import { Doppler } from "./con-tau-sao-hoa-mat-vi-nham-don-vi/doppler";
import { HaiDoi } from "./con-tau-sao-hoa-mat-vi-nham-don-vi/hai-doi";
import { HaiThuoc } from "./con-tau-sao-hoa-mat-vi-nham-don-vi/hai-thuoc";
import { LiaThia } from "./con-tau-sao-hoa-mat-vi-nham-don-vi/lia-thia";
import { SaoHoa } from "./con-tau-sao-hoa-mat-vi-nham-don-vi/sao-hoa";
import { XungLuc } from "./con-tau-sao-hoa-mat-vi-nham-don-vi/xung-luc";
import { BonGcu } from "./khi-may-tinh-dem-qua-gioi-han/bon-gcu";
import { CongBit } from "./khi-may-tinh-dem-qua-gioi-han/cong-bit";
import { CongToMet } from "./khi-may-tinh-dem-qua-gioi-han/cong-to-met";
import { DongHo2038 } from "./khi-may-tinh-dem-qua-gioi-han/dong-ho-2038";
import { HaiBo } from "./khi-may-tinh-dem-qua-gioi-han/hai-bo";
import { NuaAm } from "./khi-may-tinh-dem-qua-gioi-han/nua-am";
import { OChua } from "./khi-may-tinh-dem-qua-gioi-han/o-chua";
import { SoTuan } from "./khi-may-tinh-dem-qua-gioi-han/so-tuan";
import { VongSo } from "./khi-may-tinh-dem-qua-gioi-han/vong-so";
import { BitByte } from "./vi-sao-chu-viet-bi-loi-font/bit-byte";
import { ChuEj } from "./vi-sao-chu-viet-bi-loi-font/chu-ej";
import { ChuMa } from "./vi-sao-chu-viet-bi-loi-font/chu-ma";
import { HaiTuDien } from "./vi-sao-chu-viet-bi-loi-font/hai-tu-dien";
import { NganKeo } from "./vi-sao-chu-viet-bi-loi-font/ngan-keo";
import { Notepad } from "./vi-sao-chu-viet-bi-loi-font/notepad";
import { PhongCu } from "./vi-sao-chu-viet-bi-loi-font/phong-cu";
import { SmsBit } from "./vi-sao-chu-viet-bi-loi-font/sms-bit";
import { Utf8Bit } from "./vi-sao-chu-viet-bi-loi-font/utf8-bit";
import { CatBit } from "./vi-sao-0-1-cong-0-2-khong-bang-0-3/cat-bit";
import { ChuSoCoNghia } from "./vi-sao-0-1-cong-0-2-khong-bang-0-3/chu-so-co-nghia";
import { DauPhayDong } from "./vi-sao-0-1-cong-0-2-khong-bang-0-3/dau-phay-dong";
import { DoLech } from "./vi-sao-0-1-cong-0-2-khong-bang-0-3/do-lech";
import { HaiLanDo } from "./vi-sao-0-1-cong-0-2-khong-bang-0-3/hai-lan-do";
import { PhanSoLap } from "./vi-sao-0-1-cong-0-2-khong-bang-0-3/phan-so-lap";
import { ThuocVach } from "./vi-sao-0-1-cong-0-2-khong-bang-0-3/thuoc-vach";
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
  // vi-sao-0-1-cong-0-2-khong-bang-0-3
  "phan-so-lap": PhanSoLap,
  "dau-phay-dong": DauPhayDong,
  "chu-so-co-nghia": ChuSoCoNghia,
  "thuoc-vach": ThuocVach,
  "cat-bit": CatBit,
  "do-lech": DoLech,
  "hai-lan-do": HaiLanDo,
  // khi-may-tinh-dem-qua-gioi-han
  "cong-to-met": CongToMet,
  "vong-so": VongSo,
  "nua-am": NuaAm,
  "cong-bit": CongBit,
  "o-chua": OChua,
  "hai-bo": HaiBo,
  "bon-gcu": BonGcu,
  "so-tuan": SoTuan,
  "dong-ho-2038": DongHo2038,
  // con-tau-sao-hoa-mat-vi-nham-don-vi
  "sao-hoa": SaoHoa,
  "xung-luc": XungLuc,
  "hai-doi": HaiDoi,
  "banh-da": BanhDa,
  "hai-thuoc": HaiThuoc,
  "doppler": Doppler,
  "lia-thia": LiaThia,
  "do-cao": DoCao,
  // vi-sao-chu-viet-bi-loi-font
  "chu-ma": ChuMa,
  "ngan-keo": NganKeo,
  "bit-byte": BitByte,
  "hai-tu-dien": HaiTuDien,
  "phong-cu": PhongCu,
  "utf8-bit": Utf8Bit,
  "chu-ej": ChuEj,
  "notepad": Notepad,
  "sms-bit": SmsBit,
};

/** Cảnh riêng đã tự vẽ vừa hộp vuông của Short (đọc `useBox()`); cảnh khác không được nằm trong Short (D33). */
export const CUSTOM_SQUARE: ReadonlySet<string> = new Set<string>([
  "mach-den", "bite-byte", "dien-ap", "bon-muoi-bit", "bo-dem-vong",
  // vi-sao-0-1-cong-0-2-khong-bang-0-3
  "phan-so-lap", "dau-phay-dong", "chu-so-co-nghia", "thuoc-vach", "cat-bit", "do-lech", "hai-lan-do",
  // khi-may-tinh-dem-qua-gioi-han
  "cong-to-met", "vong-so", "nua-am", "cong-bit", "o-chua", "hai-bo", "bon-gcu", "so-tuan", "dong-ho-2038",
  // con-tau-sao-hoa-mat-vi-nham-don-vi
  "sao-hoa", "xung-luc", "hai-doi", "banh-da", "hai-thuoc", "doppler", "lia-thia", "do-cao",
  // vi-sao-chu-viet-bi-loi-font
  "chu-ma", "ngan-keo", "bit-byte", "hai-tu-dien", "phong-cu", "utf8-bit", "chu-ej", "notepad", "sms-bit",
]);
