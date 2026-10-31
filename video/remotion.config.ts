import { Config } from "@remotion/cli/config";

Config.setCodec("h264");
Config.setPixelFormat("yuv420p");
Config.setCrf(18);
Config.setConcurrency(4);
Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);

// Mac: Headless Shell tải về có thể lỗi "icudtl.dat not found in bundle". Đặt biến này để dùng Chrome của máy.
if (process.env.REMOTION_BROWSER_EXECUTABLE) {
  Config.setBrowserExecutable(process.env.REMOTION_BROWSER_EXECUTABLE);
}
