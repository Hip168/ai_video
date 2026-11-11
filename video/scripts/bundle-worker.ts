// Chạy bundle() của Remotion trong worker thread. Webpack chặn event loop hàng trăm ms mỗi lần;
// nếu chạy ở luồng chính, tsx (tiến trình cha) chỉ chờ con nhận tín hiệu 30 ms rồi SIGKILL con,
// nên handler SIGINT/SIGTERM của render-episode.ts không kịp ghi manifest (D26).
import { parentPort, workerData } from "node:worker_threads";
import { bundle } from "@remotion/bundler";

const { entryPoint, publicDir } = workerData as { entryPoint: string; publicDir: string };
parentPort!.postMessage(await bundle({ entryPoint, publicDir }));
