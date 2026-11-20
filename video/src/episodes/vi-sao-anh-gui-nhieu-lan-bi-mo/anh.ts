// Ảnh tự vẽ bằng code và một bộ nén kiểu JPEG viết tay (tách lớp màu, bớt màu 2×2, ô 8×8, biến đổi cosin
// rời rạc, làm tròn theo bảng lượng tử chuẩn, giải nén). Hàm thuần, kết quả lưu đệm theo khoá.
// Không dùng ảnh của ai, không dùng ảnh do AI tạo.

export interface Img {
  w: number;
  h: number;
  r: Float32Array;
  g: Float32Array;
  b: Float32Array;
}

const W = 64;
const H = 48;

function blank(w: number, h: number): Img {
  return { w, h, r: new Float32Array(w * h), g: new Float32Array(w * h), b: new Float32Array(w * h) };
}

/** Ảnh "chụp" tự vẽ 64×48: trời, mặt trời, dây điện mảnh, ngôi nhà, cây, cỏ. */
export function makePhoto(): Img {
  const im = blank(W, H);
  const set = (x: number, y: number, c: [number, number, number]) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const i = y * W + x;
    im.r[i] = c[0];
    im.g[i] = c[1];
    im.b[i] = c[2];
  };
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (y < 33) {
        const k = y / 33;
        set(x, y, [95 + 105 * k, 160 + 65 * k, 235 + 15 * k]);
      } else {
        const k = (y - 33) / 15;
        const n = ((x * 13 + y * 7) % 5) * 4;
        set(x, y, [70 + 30 * k + n, 150 - 30 * k + n, 60 + n]);
      }
    }
  // mặt trời
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) if ((x - 52) ** 2 + (y - 9) ** 2 <= 30) set(x, y, [255, 214, 70]);
  // cây
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if ((x - 46) ** 2 + (y - 24) ** 2 <= 42) set(x, y, [40, 120, 50]);
      if (x >= 45 && x <= 47 && y > 29 && y < 38) set(x, y, [110, 70, 40]);
    }
  // nhà: tường, mái, cửa sổ, cửa
  for (let y = 22; y < 38; y++) for (let x = 10; x < 30; x++) set(x, y, [215, 95, 70]);
  for (let y = 12; y < 22; y++)
    for (let x = 8; x < 32; x++) if (Math.abs(x - 20) <= (y - 12) * 1.25) set(x, y, [120, 40, 45]);
  for (let y = 25; y < 30; y++) for (let x = 13; x < 18; x++) set(x, y, [245, 245, 235]);
  set(15, 25, [60, 60, 70]);
  for (let y = 25; y < 30; y++) set(15, y, [60, 60, 70]);
  for (let y = 29; y < 38; y++) for (let x = 22; x < 26; x++) set(x, y, [70, 45, 35]);
  // dây điện mảnh (1 điểm ảnh)
  for (let x = 0; x < W; x++) set(x, Math.round(5 + x * 0.11), [25, 25, 30]);
  return im;
}

/** Ảnh "tin nhắn chữ": nền trắng, chữ đen mảnh (nét 1 điểm), cạnh sắc. */
export function makeText(): Img {
  const im = blank(W, H);
  im.r.fill(250);
  im.g.fill(250);
  im.b.fill(250);
  const ink = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const i = y * W + x;
    im.r[i] = 20;
    im.g[i] = 20;
    im.b[i] = 30;
  };
  // các "dòng chữ": chuỗi nét dọc, ngang ngắn
  for (let line = 0; line < 4; line++) {
    const y0 = 6 + line * 11;
    let x = 4;
    let s = line * 17 + 3;
    while (x < W - 6) {
      s = (s * 37 + 11) % 101;
      const w = 2 + (s % 3);
      for (let y = y0; y < y0 + 6; y++) ink(x, y);
      if (s % 2 === 0) for (let k = 0; k <= w; k++) ink(x + k, y0 + (s % 3 === 0 ? 0 : 5));
      if (s % 5 === 0) for (let y = y0; y < y0 + 6; y++) ink(x + w, y);
      x += w + 2 + (s % 4 === 0 ? 3 : 0);
    }
  }
  return im;
}

// ---- nén kiểu JPEG ----

const QY = [16, 11, 10, 16, 24, 40, 51, 61, 12, 12, 14, 19, 26, 58, 60, 55, 14, 13, 16, 24, 40, 57, 69, 56, 14, 17, 22, 29, 51, 87, 80, 62, 18, 22, 37, 56, 68, 109, 103, 77, 24, 35, 55, 64, 81, 104, 113, 92, 49, 64, 78, 87, 103, 121, 120, 101, 72, 92, 95, 98, 112, 100, 103, 99];
const QC = [17, 18, 24, 47, 99, 99, 99, 99, 18, 21, 26, 66, 99, 99, 99, 99, 24, 26, 56, 99, 99, 99, 99, 99, 47, 66, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99];

/** Bảng lượng tử theo chất lượng q (1..100), cùng công thức của libjpeg; mỗi mức trong 1..255. */
export function qtable(base: number[], q: number): number[] {
  const s = q < 50 ? 5000 / q : 200 - 2 * q;
  return base.map((v) => Math.min(255, Math.max(1, Math.floor((v * s + 50) / 100))));
}

const COS: number[] = [];
for (let x = 0; x < 8; x++) for (let u = 0; u < 8; u++) COS[x * 8 + u] = Math.cos(((2 * x + 1) * u * Math.PI) / 16);
const C0 = (u: number) => (u === 0 ? Math.SQRT1_2 : 1);

export function dct(block: number[]): number[] {
  const out = new Array<number>(64).fill(0);
  for (let v = 0; v < 8; v++)
    for (let u = 0; u < 8; u++) {
      let s = 0;
      for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) s += block[y * 8 + x] * COS[x * 8 + u] * COS[y * 8 + v];
      out[v * 8 + u] = 0.25 * C0(u) * C0(v) * s;
    }
  return out;
}

export function idct(c: number[]): number[] {
  const out = new Array<number>(64).fill(0);
  for (let y = 0; y < 8; y++)
    for (let x = 0; x < 8; x++) {
      let s = 0;
      for (let v = 0; v < 8; v++) for (let u = 0; u < 8; u++) s += C0(u) * C0(v) * c[v * 8 + u] * COS[x * 8 + u] * COS[y * 8 + v];
      out[y * 8 + x] = 0.25 * s;
    }
  return out;
}

/** Nén rồi giải nén một mặt phẳng (w×h), lưới ô bắt đầu lệch (ox, oy). */
function codePlane(p: Float32Array, w: number, h: number, tab: number[], ox: number, oy: number): Float32Array {
  const out = new Float32Array(w * h);
  const at = (x: number, y: number) => p[Math.min(h - 1, Math.max(0, y)) * w + Math.min(w - 1, Math.max(0, x))];
  for (let by = -oy; by < h; by += 8)
    for (let bx = -ox; bx < w; bx += 8) {
      const blk: number[] = [];
      for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) blk.push(at(bx + x, by + y) - 128);
      const c = dct(blk).map((v, i) => Math.round(v / tab[i]) * tab[i]);
      const r = idct(c);
      for (let y = 0; y < 8; y++)
        for (let x = 0; x < 8; x++) {
          const X = bx + x;
          const Y = by + y;
          if (X >= 0 && Y >= 0 && X < w && Y < h) out[Y * w + X] = Math.min(255, Math.max(0, r[y * 8 + x] + 128));
        }
    }
  return out;
}

/** Tách độ sáng Y và hai lớp màu Cb, Cr. */
export function toYCC(im: Img): { y: Float32Array; cb: Float32Array; cr: Float32Array } {
  const n = im.w * im.h;
  const y = new Float32Array(n);
  const cb = new Float32Array(n);
  const cr = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const r = im.r[i];
    const g = im.g[i];
    const b = im.b[i];
    y[i] = 0.299 * r + 0.587 * g + 0.114 * b;
    cb[i] = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
    cr[i] = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
  }
  return { y, cb, cr };
}

export function fromYCC(w: number, h: number, y: Float32Array, cb: Float32Array, cr: Float32Array): Img {
  const im = blank(w, h);
  for (let i = 0; i < w * h; i++) {
    const Y = y[i];
    const B = cb[i] - 128;
    const R = cr[i] - 128;
    im.r[i] = Math.min(255, Math.max(0, Y + 1.402 * R));
    im.g[i] = Math.min(255, Math.max(0, Y - 0.344136 * B - 0.714136 * R));
    im.b[i] = Math.min(255, Math.max(0, Y + 1.772 * B));
  }
  return im;
}

function down2(p: Float32Array, w: number, h: number): Float32Array {
  const w2 = Math.ceil(w / 2);
  const h2 = Math.ceil(h / 2);
  const o = new Float32Array(w2 * h2);
  for (let y = 0; y < h2; y++)
    for (let x = 0; x < w2; x++) {
      let s = 0;
      let n = 0;
      for (let dy = 0; dy < 2; dy++)
        for (let dx = 0; dx < 2; dx++) {
          const X = 2 * x + dx;
          const Y = 2 * y + dy;
          if (X < w && Y < h) {
            s += p[Y * w + X];
            n++;
          }
        }
      o[y * w2 + x] = s / n;
    }
  return o;
}

function up2(p: Float32Array, w: number, h: number): Float32Array {
  const w2 = Math.ceil(w / 2);
  const o = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) o[y * w + x] = p[(y >> 1) * w2 + (x >> 1)];
  return o;
}

/** Chỉ bớt màu (lớp màu còn nửa chiều ngang, nửa chiều dọc), không nén ô. */
export function chromaOnly(im: Img): Img {
  const { y, cb, cr } = toYCC(im);
  return fromYCC(im.w, im.h, y, up2(down2(cb, im.w, im.h), im.w, im.h), up2(down2(cr, im.w, im.h), im.w, im.h));
}

/** Một lần lưu JPEG chất lượng q, lưới lệch (ox, oy). */
export function jpeg(im: Img, q: number, ox = 0, oy = 0): Img {
  const { y, cb, cr } = toYCC(im);
  const ty = qtable(QY, q);
  const tc = qtable(QC, q);
  const w2 = Math.ceil(im.w / 2);
  const h2 = Math.ceil(im.h / 2);
  const Y = codePlane(y, im.w, im.h, ty, ox, oy);
  const CB = up2(codePlane(down2(cb, im.w, im.h), w2, h2, tc, ox >> 1, oy >> 1), im.w, im.h);
  const CR = up2(codePlane(down2(cr, im.w, im.h), w2, h2, tc, ox >> 1, oy >> 1), im.w, im.h);
  return fromYCC(im.w, im.h, Y, CB, CR);
}

/** Thu nhỏ một nửa mỗi chiều (4 điểm gộp 1) rồi phóng to lại (mỗi điểm thành 4). */
export function halveAndBack(im: Img): Img {
  const o = blank(im.w, im.h);
  for (const k of ["r", "g", "b"] as const) o[k].set(up2(down2(im[k], im.w, im.h), im.w, im.h));
  return o;
}

const cache = new Map<string, Img>();

/**
 * Ảnh sau n chặng gửi: mỗi chặng một nơi nén lại với chất lượng khác, lưới lệch khác,
 * chặng 3 và 7 có thu nhỏ một nửa.
 */
export function generation(n: number, src: "photo" | "text" = "photo"): Img {
  const key = `${src}:${n}`;
  const hit = cache.get(key);
  if (hit) return hit;
  let im: Img;
  if (n === 0) im = src === "photo" ? makePhoto() : makeText();
  else {
    const prev = generation(n - 1, src);
    const qs = [72, 60, 78, 55, 70, 62, 75, 58, 66, 52];
    const offs: [number, number][] = [[0, 0], [3, 2], [5, 1], [2, 6], [6, 3], [1, 5], [4, 4], [7, 2], [3, 7], [5, 5]];
    const base = n === 3 || n === 7 ? halveAndBack(prev) : prev;
    im = jpeg(base, qs[(n - 1) % qs.length], offs[(n - 1) % offs.length][0], offs[(n - 1) % offs.length][1]);
  }
  cache.set(key, im);
  return im;
}

/** Ảnh gốc nén một lần chất lượng q (lưu đệm). */
export function once(q: number, src: "photo" | "text" = "photo"): Img {
  const key = `${src}:q${q}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const im = jpeg(generation(0, src), q);
  cache.set(key, im);
  return im;
}

/** Ảnh chỉ bớt màu (lưu đệm). */
export function chromaPhoto(): Img {
  const key = "photo:chroma";
  const hit = cache.get(key);
  if (hit) return hit;
  const im = chromaOnly(generation(0));
  cache.set(key, im);
  return im;
}

export const rgb = (im: Img, i: number): string => `rgb(${Math.round(im.r[i])},${Math.round(im.g[i])},${Math.round(im.b[i])})`;
