import os from "node:os";
import { Config } from "@remotion/cli/config";

Config.setCodec("h264");
Config.setPixelFormat("yuv420p");
Config.setCrf(18);
// Tối đa 4 luồng, nhưng không vượt số lõi (CI 2 lõi sẽ lỗi nếu đặt 4).
Config.setConcurrency(Math.max(1, Math.min(4, os.cpus().length)));
Config.setVideoImageFormat("png");
Config.setOverwriteOutput(true);

// Mac: Headless Shell tải về có thể lỗi "icudtl.dat not found in bundle". Đặt biến này để dùng Chrome của máy.
if (process.env.REMOTION_BROWSER_EXECUTABLE) {
  Config.setBrowserExecutable(process.env.REMOTION_BROWSER_EXECUTABLE);
}
