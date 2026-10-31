import type React from "react";
import type { Scene, SceneId } from "../timeline";
import { Dns } from "./Dns";
import { Hops } from "./Hops";
import { Packets } from "./Packets";
import { Phone } from "./Phone";
import { Receiver } from "./Receiver";
import { Server } from "./Server";
import { Wifi } from "./Wifi";

export const SCENES: Record<SceneId, React.FC<{ scene: Scene }>> = {
  phone: Phone,
  dns: Dns,
  packets: Packets,
  wifi: Wifi,
  hops: Hops,
  server: Server,
  receiver: Receiver,
};
