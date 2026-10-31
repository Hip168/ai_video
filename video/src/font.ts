import { continueRender, delayRender, staticFile } from "remotion";

export const FONT_FAMILY = "BeVietnamPro";

const RANGES = {
  latin:
    "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD",
  "latin-ext":
    "U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF",
  vietnamese:
    "U+0102-0103,U+0110-0111,U+0128-0129,U+0168-0169,U+01A0-01A1,U+01AF-01B0,U+0300-0301,U+0303-0304,U+0308-0309,U+0323,U+0329,U+1EA0-1EF9,U+20AB",
} as const;

let started = false;

/** Nạp font cục bộ (không dùng mạng). Gọi nhiều lần cũng chỉ nạp một lần. */
export function loadFonts(): void {
  if (started || typeof document === "undefined" || typeof FontFace === "undefined") return;
  started = true;
  const handle = delayRender("Nạp font Be Vietnam Pro");
  const jobs: Promise<unknown>[] = [];
  for (const weight of ["400", "700"] as const) {
    for (const subset of Object.keys(RANGES) as (keyof typeof RANGES)[]) {
      const face = new FontFace(
        FONT_FAMILY,
        `url(${staticFile(`fonts/be-vietnam-pro-${subset}-${weight}-normal.woff2`)}) format("woff2")`,
        { weight, style: "normal", unicodeRange: RANGES[subset] },
      );
      jobs.push(face.load().then((f) => (document.fonts as unknown as { add(face: FontFace): void }).add(f)));
    }
  }
  Promise.all(jobs)
    .then(() => continueRender(handle))
    .catch((err) => {
      // Lỗi font phải làm hỏng render rõ ràng, không im lặng dùng font khác.
      throw err;
    });
}
