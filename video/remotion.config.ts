import { existsSync } from "node:fs";
import os from "node:os";
import { Config } from "@remotion/cli/config";
import { DEFAULT_BROWSER } from "./scripts/render-lib";

Config.setCodec("h264");
Config.setPixelFormat("yuv420p");
Config.setCrf(18);
// Tối đa 4 luồng, nhưng không vượt số lõi (CI 2 lõi sẽ lỗi nếu đặt 4).
Config.setConcurrency(Math.max(1, Math.min(4, os.cpus().length)));
Config.setVideoImageFormat("png");
Config.setOverwriteOutput(true);

// Mac: Headless Shell tải về có thể lỗi "icudtl.dat not found in bundle". Đặt biến này để dùng Chrome của máy.
// Không đặt mà có bản chép ra ~/.cache (D23) thì tự dùng bản đó, như scripts/render-episode.ts.
const browser = process.env.REMOTION_BROWSER_EXECUTABLE || (existsSync(DEFAULT_BROWSER) ? DEFAULT_BROWSER : null);
if (browser) {
  Config.setBrowserExecutable(browser);
}
