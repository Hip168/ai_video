// Ảnh bìa TikTok 1080x1920 cho "Chuyện Của Những Con Bit" — vẽ bằng HTML/SVG, không dùng ảnh AI.
// Chạy: node assets/brand/tiktok-cover.mjs <danh-sach.json> --videos <thư-mục-mp4> --out <thư-mục-png>
//   danh-sach.json: mảng { name, video, time, focusY, part, title }
//     name   : tên file PNG ra (vd "tap1-phan1")
//     video  : file mp4 của phần, tính từ --videos
//     time   : thời điểm lấy khung hình ("1:12" hoặc số giây)
//     focusY : toạ độ y (trên khung 1080x1920 gốc) của tâm vùng hình muốn lấy
//     part   : chữ trong viên thuốc, vd "1/3" -> "Phần 1/3"
//     title  : các dòng chữ bìa (tối đa 3); *chữ* = tô vàng; "≠" tự vẽ (font không có ký tự này)
//   Ví dụ: assets/brand/tiktok-cover.json (tập 1 và tập 2).
// Vùng an toàn: chữ nằm trong khung giữa 1080x1440 (lưới hồ sơ cắt 3:4), tránh 150 px trên,
// 400 px dưới, 120 px phải. Font Be Vietnam Pro trong video/public/fonts (đủ dấu tiếng Việt).
// Cần ffmpeg và Google Chrome (đổi bằng CHROME_BIN); thư mục tạm xoá ngay sau khi chụp.
import { execFileSync } from "node:child_process";
import { writeFileSync, readFileSync, existsSync, mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const FONTS = resolve(HERE, "../../video/public/fonts");
const W = 1080, H = 1920;
const BOX = { x: 60, y: 760, w: 960, h: 720 }; // khung hình minh hoạ (trên vạch 1520 của chú thích)
const C = { bg: "#0b1220", grid: "#1a2640", chipFill: "#16213a", yellow: "#f5c518", fg: "#e8eefc" };

const args = process.argv.slice(2);
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
const listPath = args[0];
const videos = opt("--videos"), outDir = opt("--out");
if (!listPath || !videos || !outDir) {
  console.error("Dùng: node assets/brand/tiktok-cover.mjs <danh-sach.json> --videos <thư-mục> --out <thư-mục>");
  process.exit(2);
}
const entries = JSON.parse(readFileSync(listPath, "utf8"));
const chrome = process.env.CHROME_BIN || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
if (!existsSync(chrome)) throw new Error(`Không thấy Chrome: ${chrome} (đặt CHROME_BIN)`);
mkdirSync(outDir, { recursive: true });

const seconds = (t) => typeof t === "number" ? t : t.split(":").reduce((a, b) => a * 60 + Number(b), 0);
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const line = (s) => esc(s).replace(/\*(.+?)\*/g, '<span class="y">$1</span>').replace(/≠/g, '<span class="neq">=</span>');

const fontFace = (file, weight) =>
  `@font-face{font-family:BVP;font-weight:${weight};src:url("${pathToFileURL(join(FONTS, file))}") format("woff2");}`;
const fonts = ["latin", "latin-ext", "vietnamese"].flatMap((s) => [
  fontFace(`be-vietnam-pro-${s}-400-normal.woff2`, 400),
  fontFace(`be-vietnam-pro-${s}-700-normal.woff2`, 700),
]).join("\n");

// Con chip nhỏ giống ảnh đại diện.
const chip = (size) => {
  const s = 100, h = 30, pins = [];
  for (let i = 0; i < 3; i++) {
    const o = (i - 1) * 16;
    pins.push(`<rect x="${50 + o - 5}" y="8" width="10" height="16" rx="3"/>`, `<rect x="${50 + o - 5}" y="76" width="10" height="16" rx="3"/>`,
      `<rect x="8" y="${50 + o - 5}" width="16" height="10" rx="3"/>`, `<rect x="76" y="${50 + o - 5}" width="16" height="10" rx="3"/>`);
  }
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${s} ${s}"><g fill="${C.yellow}">${pins.join("")}</g>
  <rect x="${50 - h}" y="${50 - h}" width="${2 * h}" height="${2 * h}" rx="9" fill="${C.chipFill}" stroke="${C.yellow}" stroke-width="5"/>
  <text x="50" y="62" text-anchor="middle" font-family="BVP" font-weight="700" font-size="32" letter-spacing="-1"><tspan fill="${C.fg}">0</tspan><tspan fill="${C.yellow}">1</tspan></text></svg>`;
};

const page = (e, frameUrl) => `<!doctype html><html><head><meta charset="utf-8"><style>
${fonts}
html,body{margin:0;width:${W}px;height:${H}px;overflow:hidden;background:${C.bg};font-family:BVP;}
.bg{position:absolute;inset:0;background-image:linear-gradient(${C.grid} 1.5px,transparent 1.5px),linear-gradient(90deg,${C.grid} 1.5px,transparent 1.5px);background-size:40px 40px;}
.glow{position:absolute;inset:0;background:radial-gradient(ellipse 620px 520px at 50% 34%,#14203a,transparent);}
.top{position:absolute;left:80px;right:120px;top:262px;display:flex;align-items:center;justify-content:space-between;}
.brand{display:flex;align-items:center;gap:12px;color:${C.fg};font-weight:700;font-size:38px;}
.brand b{color:${C.yellow};}
.pill{background:${C.yellow};color:${C.bg};font-weight:700;font-size:44px;line-height:1;padding:16px 30px 18px;border-radius:999px;}
.title{position:absolute;left:80px;width:880px;top:380px;height:350px;display:flex;flex-direction:column;justify-content:center;align-items:center;}
.title div{white-space:nowrap;color:${C.fg};font-weight:700;line-height:1.12;letter-spacing:-2px;text-align:center;text-shadow:0 6px 24px rgba(0,0,0,.6);}
.y{color:${C.yellow};}
.neq{position:relative;display:inline-block;}
.neq::after{content:"";position:absolute;left:50%;top:18%;width:.09em;height:64%;background:currentColor;border-radius:.04em;transform:translateX(-50%) rotate(28deg);}
.box{position:absolute;left:${BOX.x}px;top:${BOX.y}px;width:${BOX.w}px;height:${BOX.h}px;border-radius:36px;overflow:hidden;border:5px solid ${C.yellow};box-sizing:border-box;box-shadow:0 20px 60px rgba(0,0,0,.55);}
.box img{width:100%;height:100%;object-fit:cover;display:block;filter:brightness(.82);}
</style></head><body>
<div class="bg"></div><div class="glow"></div>
<div class="top"><div class="brand">${chip(76)}<span>Con <b>Bit</b></span></div><div class="pill">Phần ${esc(e.part)}</div></div>
<div class="title" id="t">${e.title.map((l) => `<div>${line(l)}</div>`).join("")}</div>
<div class="box"><img src="${frameUrl}"></div>
<script>
document.fonts.ready.then(() => {
  const t = document.getElementById("t"), rows = [...t.children];
  let fs = rows.length > 2 ? 112 : 150; // 3 dòng thì nhỏ hơn để vừa khung
  const fit = () => rows.every((r) => r.scrollWidth <= t.clientWidth) && t.scrollHeight <= t.clientHeight;
  t.style.fontSize = fs + "px";
  while (!fit() && fs > 60) t.style.fontSize = (fs -= 2) + "px";
});
</script></body></html>`;

for (const e of entries) {
  if (!Array.isArray(e.title) || e.title.length < 1 || e.title.length > 3) throw new Error(`${e.name}: title cần 1–3 dòng`);
  const tmp = mkdtempSync(join(tmpdir(), "tiktok-cover-"));
  try {
    const video = resolve(videos, e.video);
    if (!existsSync(video)) throw new Error(`${e.name}: không thấy ${video}`);
    // Cắt dải ngang cùng tỉ lệ với khung, tâm ở focusY.
    const ch = Math.round(1080 * BOX.h / BOX.w);
    const y0 = Math.max(0, Math.min(H - ch, Math.round((e.focusY ?? H / 2) - ch / 2)));
    const frame = join(tmp, "frame.png");
    execFileSync("ffmpeg", ["-v", "error", "-y", "-ss", String(seconds(e.time)), "-i", video, "-frames:v", "1",
      "-vf", `crop=1080:${ch}:0:${y0}`, frame], { stdio: "inherit" });
    const html = join(tmp, "cover.html");
    writeFileSync(html, page(e, pathToFileURL(frame).href));
    const png = resolve(outDir, `${e.name}.png`);
    execFileSync(chrome, [
      "--headless=new", "--disable-gpu", "--hide-scrollbars", "--no-first-run",
      "--force-device-scale-factor=1", `--user-data-dir=${join(tmp, "profile")}`,
      `--window-size=${W},${H}`, "--virtual-time-budget=3000", "--allow-file-access-from-files",
      `--screenshot=${png}`, pathToFileURL(html).href,
    ], { stdio: "ignore", timeout: 60000 });
    console.log(png);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}
