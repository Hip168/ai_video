// Ảnh bìa kênh YouTube "Chuyện Của Những Con Bit" — vẽ bằng SVG, không dùng ảnh AI.
// Chạy: node assets/brand/banner.mjs [--safe]
//   -> assets/brand/banner.svg (nguồn) và assets/brand/banner.png (2560x1440)
//   --safe: thêm khung vùng an toàn 1546x423, ghi ra banner-safe-area.png
// Font: Be Vietnam Pro + JetBrains Mono trong video/public/fonts (đủ dấu tiếng Việt).
// Chụp bằng Google Chrome headless (hồ sơ tạm, xoá ngay sau khi chụp); đổi trình duyệt bằng CHROME_BIN.
import { execFileSync } from "node:child_process";
import { writeFileSync, existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../..");
const SAFE = process.argv.includes("--safe");
const W = 2560, H = 1440;
const SA = { x: 507, y: 508, w: 1546, h: 423 };

const C = {
  bg: "#0b1220", grid: "#1a2640", chipFill: "#16213a", yellow: "#f5c518",
  fg: "#e8eefc", muted: "#9aa8c4", accent: "#4cc9f0",
};

// Số ngẫu nhiên có hạt giống để lần chạy nào cũng ra cùng một ảnh.
let seed = 20261115;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);

const fontFace = (fam, file, weight) =>
  `@font-face{font-family:${fam};font-weight:${weight};src:url("../../video/public/fonts/${file}") format("woff2");}`;
const fonts = ["latin", "latin-ext", "vietnamese"].flatMap((s) => [
  fontFace("BVP", `be-vietnam-pro-${s}-400-normal.woff2`, 400),
  fontFace("BVP", `be-vietnam-pro-${s}-700-normal.woff2`, 700),
  fontFace("JBM", `jetbrains-mono-${s}-700-normal.woff2`, 700),
]).join("\n");

// --- Con chip (giống ảnh đại diện) ---
const CX = 720, CY = 720, S = 270; // tâm và cạnh thân chip
function chip() {
  const h = S / 2, pinW = 26, pinL = 40, gap = S / 4.6;
  const pins = [];
  for (let i = 0; i < 4; i++) {
    const o = (i - 1.5) * gap;
    pins.push(
      `<rect x="${CX + o - pinW / 2}" y="${CY - h - pinL}" width="${pinW}" height="${pinL + 10}" rx="7"/>`,
      `<rect x="${CX + o - pinW / 2}" y="${CY + h - 10}" width="${pinW}" height="${pinL + 10}" rx="7"/>`,
      `<rect x="${CX - h - pinL}" y="${CY + o - pinW / 2}" width="${pinL + 10}" height="${pinW}" rx="7"/>`,
      `<rect x="${CX + h - 10}" y="${CY + o - pinW / 2}" width="${pinL + 10}" height="${pinW}" rx="7"/>`,
    );
  }
  return `<g fill="${C.yellow}">${pins.join("")}</g>
  <rect x="${CX - h}" y="${CY - h}" width="${S}" height="${S}" rx="34" fill="${C.chipFill}" stroke="${C.yellow}" stroke-width="13"/>
  <circle cx="${CX - h + 38}" cy="${CY - h + 38}" r="10" fill="${C.yellow}"/>
  <text x="${CX}" y="${CY + 50}" text-anchor="middle" font-family="BVP" font-weight="700" font-size="150" letter-spacing="-4"><tspan fill="${C.fg}">0</tspan><tspan fill="${C.yellow}">1</tspan></text>`;
}

// --- Đường mạch: từ mép ảnh chạy vào chân chip, uốn góc 45° ---
function traces() {
  const h = S / 2, pinL = 40, gap = S / 4.6, out = [];
  const path = (pts, col, op) =>
    out.push(`<polyline points="${pts.map((p) => p.join(",")).join(" ")}" fill="none" stroke="${col}" stroke-opacity="${op}" stroke-width="5" stroke-linejoin="round"/>` +
      `<circle cx="${pts[0][0]}" cy="${pts[0][1]}" r="9" fill="none" stroke="${col}" stroke-opacity="${op}" stroke-width="5"/>`);
  for (let i = 0; i < 4; i++) {
    const o = (i - 1.5) * gap;
    // trái: vào chân trái
    const yL = CY + o, xPin = CX - h - pinL;
    const yStart = CY + o * 3.2;
    path([[60 + i * 30, yStart], [300 - i * 20, yStart], [300 - i * 20 + Math.abs(yStart - yL), yL], [xPin, yL]].map(([x, y], k) => [k === 3 ? x : Math.min(x, xPin - 20), y]), C.yellow, 0.32);
    // trên / dưới: đi thẳng lên mép rồi rẽ ngang
    const xP = CX + o;
    path([[xP - 260 + i * 40, 70 + i * 26], [xP - 120, 70 + i * 26], [xP, 190 + i * 26], [xP, CY - h - pinL]], C.yellow, 0.22);
    path([[xP - 260 + i * 40, H - 70 - i * 26], [xP - 120, H - 70 - i * 26], [xP, H - 190 - i * 26], [xP, CY + h + pinL]], C.yellow, 0.22);
  }
  // phải: vài đường xanh từ mép phải vào gần vùng chữ
  for (let i = 0; i < 4; i++) {
    const y1 = 140 + i * 80, y2 = H - 140 - i * 80;
    path([[W - 70, y1], [W - 240 - i * 30, y1], [W - 310 - i * 30, y1 + 70], [W - 470 - i * 20, y1 + 70]], C.accent, 0.2);
    path([[W - 70, y2], [W - 240 - i * 30, y2], [W - 310 - i * 30, y2 - 70], [W - 470 - i * 20, y2 - 70]], C.accent, 0.2);
  }
  return out.join("\n");
}

// --- Dòng bit 0/1 trôi ngang ở dải trên và dưới (ngoài vùng an toàn) ---
function bits() {
  const out = [];
  const rows = [];
  for (let y = 130; y < SA.y - 40; y += 78) rows.push(y);
  for (let y = SA.y + SA.h + 100; y < H - 60; y += 78) rows.push(y);
  for (const y of rows) {
    let x = 1000 + rnd() * 120;
    while (x < W - 640) {
      const len = 4 + Math.floor(rnd() * 9);
      const s = Array.from({ length: len }, () => (rnd() < 0.5 ? "0" : "1")).join("");
      const op = (0.05 + rnd() * 0.12).toFixed(2);
      const col = rnd() < 0.25 ? C.yellow : C.accent;
      out.push(`<text x="${x.toFixed(0)}" y="${y}" fill="${col}" fill-opacity="${op}">${s}</text>`);
      x += len * 22 + 60 + rnd() * 160;
    }
  }
  return `<g font-family="JBM" font-weight="700" font-size="36" mask="url(#fadeMid)">${out.join("")}</g>`;
}

// --- Chữ ---
const TX = 960;
const text = `
  <text x="${TX}" y="672" font-family="BVP" font-weight="700" font-size="112" fill="${C.fg}" letter-spacing="-1">Chuyện Của Những</text>
  <text x="${TX}" y="800" font-family="BVP" font-weight="700" font-size="112" fill="${C.yellow}" letter-spacing="-1">Con Bit</text>
  <rect x="${TX + 4}" y="838" width="90" height="6" rx="3" fill="${C.yellow}"/>
  <text x="${TX}" y="902" font-family="BVP" font-weight="400" font-size="46" fill="${C.muted}">Máy tính hoạt động thế nào — kể bằng chuyện</text>`;

const safeBox = SAFE
  ? `<rect x="${SA.x}" y="${SA.y}" width="${SA.w}" height="${SA.h}" fill="none" stroke="#ff3b3b" stroke-width="4" stroke-dasharray="18 10"/>
  <text x="${SA.x + 8}" y="${SA.y - 14}" font-family="BVP" font-weight="700" font-size="30" fill="#ff3b3b">Vùng an toàn 1546×423 (mọi thiết bị)</text>`
  : "";

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<style>
${fonts}
</style>
<defs>
  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
    <path d="M40 0H0V40" fill="none" stroke="${C.grid}" stroke-width="1.5"/>
  </pattern>
  <radialGradient id="glow" cx="0.5" cy="0.5" r="0.5">
    <stop offset="0" stop-color="#14203a" stop-opacity="1"/>
    <stop offset="1" stop-color="${C.bg}" stop-opacity="0"/>
  </radialGradient>
  <linearGradient id="fadeX" x1="0" x2="1" y1="0" y2="0">
    <stop offset="0" stop-color="#fff" stop-opacity="0"/>
    <stop offset="0.35" stop-color="#fff" stop-opacity="1"/>
    <stop offset="1" stop-color="#fff" stop-opacity="1"/>
  </linearGradient>
  <mask id="fadeMid"><rect width="${W}" height="${H}" fill="url(#fadeX)"/></mask>
</defs>
<rect width="${W}" height="${H}" fill="${C.bg}"/>
<rect width="${W}" height="${H}" fill="url(#grid)"/>
<ellipse cx="${W / 2}" cy="${H / 2}" rx="1100" ry="420" fill="url(#glow)"/>
${bits()}
${traces()}
${chip()}
${text}
${safeBox}
</svg>
`;

const name = SAFE ? "banner-safe-area" : "banner";
const svgPath = join(HERE, `${name}.svg`);
writeFileSync(svgPath, svg);

const chrome = process.env.CHROME_BIN || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
if (!existsSync(chrome)) throw new Error(`Không thấy Chrome: ${chrome} (đặt CHROME_BIN)`);
const png = join(HERE, `${name}.png`);
const profile = mkdtempSync(join(tmpdir(), "banner-chrome-"));
try {
  execFileSync(chrome, [
    "--headless=new", "--disable-gpu", "--hide-scrollbars", "--no-first-run",
    "--force-device-scale-factor=1", `--user-data-dir=${profile}`,
    `--window-size=${W},${H}`, "--virtual-time-budget=3000", "--allow-file-access-from-files",
    `--screenshot=${png}`, `file://${svgPath}`,
  ], { stdio: "ignore", timeout: 60000 });
} finally {
  rmSync(profile, { recursive: true, force: true });
}
console.log(png);
