// Ghép từ cho phụ đề: thay khoảng trắng bằng khoảng trắng không ngắt (U+00A0) ở những chỗ không được xuống dòng,
// để trình duyệt (phụ đề in trên hình) và bộ chia đoạn phụ đề Short không tách:
//  - số với đơn vị đi sau ("212 GB", "hơn 5 GB", "30 giây", "2,5 lần"), kể cả đơn vị hai chữ ("11,6 micro giây");
//  - vài từ ghép tiếng Việt hay gặp ("máy tính", "bộ nhớ", "người làm game"...).
// Hàm thuần. Không đổi chữ nào, chỉ đổi loại khoảng trắng.

export const NBSP = " ";

/** Đơn vị đi sau số. Đơn vị dài đứng trước để khớp tham lam (GB/s trước GB, micro giây trước giây). */
const UNITS = [
  "GB/s", "MB/s", "micro giây", "GB", "MB", "KB", "TB", "GHz", "MHz", "Hz", "byte", "bit", "%", "µs",
  "giây", "phút", "giờ", "ngày", "tuần", "tháng", "năm", "lần", "điểm", "nhân", "bước", "nghìn", "triệu", "tỷ",
  "đồng", "km", "cm", "mm", "kg", "ô", "loại", "câu", "lớp", "vòng",
];

/** Từ ghép không tách. Viết thường; khớp không phân biệt hoa thường. */
export const NO_BREAK = [
  "người làm game", "máy chơi game", "máy tính", "bộ nhớ", "bộ xử lý", "ổ cứng", "ổ đĩa", "điện thoại", "máy chủ",
  "phần mềm", "phần cứng", "dữ liệu", "ứng dụng", "chất lượng", "thành phố", "trò chơi", "đồng hồ", "đồ họa",
  "giây nhuận", "múi giờ", "ảnh bề mặt", "giải nén", "thế giới", "Việt Nam", "Sài Gòn", "Hà Nội", "mạng di động",
];

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
const END = "(?=$|[\\s,.;:!?)\\]”\"'…])";
const START = "(?<=^|[\\s(\\[“\"'])";

const PHRASE_RE = new RegExp(
  `${START}(?:${[...NO_BREAK].sort((a, b) => b.length - a.length).map((p) => p.split(" ").map(esc).join("[ \\u00a0]+")).join("|")})${END}`,
  "giu",
);
const UNIT_RE = new RegExp(`(\\d[\\d.,]*)[ ]+(${UNITS.map((u) => u.split(" ").map(esc).join("[ \\u00a0]+")).join("|")})${END}`, "gu");

export function glueVi(text: string): string {
  return text
    .replace(PHRASE_RE, (m) => m.replace(/ +/g, NBSP))
    .replace(UNIT_RE, (_m, num: string, unit: string) => `${num}${NBSP}${unit.replace(/ +/g, NBSP)}`);
}
