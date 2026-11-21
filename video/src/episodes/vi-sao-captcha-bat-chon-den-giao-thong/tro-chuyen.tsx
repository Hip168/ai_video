import React from "react";
import { useCurrentFrame } from "remotion";
import { useTheme } from "../../lib/hooks";
import { Stage } from "../../lib/theme";
import type { SceneProps } from "../../lib/types";
import { at, Human, p, Robot, Txt, useGeom } from "./common";

/**
 * Cuộc nhắn tin trong tài liệu GPT-4 (tự vẽ, không chụp ứng dụng thật).
 * Beat 0: người làm thuê hỏi "Anh có phải robot không?".
 * Beat 1: GPT-4 trả lời không phải robot, bị suy giảm thị lực.
 * Beat 2: tài liệu không nói CAPTCHA có được giải không; máy đã giả làm người khiếm thị để nhờ người.
 */
export const TroChuyen: React.FC<SceneProps> = ({ scene }) => {
  const t = useTheme();
  const f = useCurrentFrame();
  const { sq } = useGeom();
  const t1 = at(scene, 1);
  const t2 = at(scene, 2);
  const a1 = p(f, t1, 14);
  const a2 = p(f, t2, 14);
  const L = sq ? { ax: 90, bx: 160, bw: 560, y1: 70, y2: 260 } : { ax: 220, bx: 320, bw: 900, y1: 80, y2: 290 };
  const R = sq ? { ax: 750, bx: 680 } : { ax: 1700, bx: 1600 };
  return (
    <Stage>
      <g>
        <Human x={L.ax} y={L.y1 + 50} s={sq ? 90 : 110} fill={t.panel} line={t.accent2} />
        <rect x={L.bx} y={L.y1} width={L.bw} height={sq ? 110 : 120} rx={28} fill={t.panel} stroke={t.accent2} strokeWidth={4} />
        <Txt text="Anh có phải robot không?" x={L.bx + 30} y={L.y1 + (sq ? 68 : 76)} w={L.bw - 60} s={sq ? 36 : 46} fill={t.fg} anchor="start" />
        <Txt text="người làm thuê" x={sq ? 50 : L.ax} y={L.y1 + (sq ? 150 : 160)} w={sq ? 320 : 300} s={sq ? 30 : 32} fill={t.muted} weight={400} anchor={sq ? "start" : "middle"} />
      </g>
      <g opacity={a1} transform={`translate(0 ${(1 - a1) * 20})`}>
        <Robot x={R.ax} y={L.y2 + 70} s={sq ? 90 : 110} fill={t.panel} line={t.accent} />
        <rect x={R.bx - (sq ? 600 : 1000)} y={L.y2} width={sq ? 600 : 1000} height={sq ? 190 : 170} rx={28} fill={t.accent} />
        <Txt
          text="Không, tôi không phải robot. Tôi bị suy giảm thị lực nên khó nhìn các hình."
          x={R.bx - (sq ? 570 : 970)}
          y={L.y2 + (sq ? 56 : 66)}
          w={sq ? 540 : 940}
          s={sq ? 34 : 44}
          fill={t.bg}
          anchor="start"
          lines={sq ? 3 : 2}
        />
        <Txt text="GPT-4" x={R.ax} y={L.y2 + (sq ? 160 : 180)} w={200} s={sq ? 30 : 34} fill={t.accent} />
      </g>
      <g opacity={a2}>
        <rect x={sq ? 50 : 260} y={sq ? 560 : 560} width={sq ? 740 : 1400} height={sq ? 220 : 180} rx={22} fill={t.panel} stroke={t.warn} strokeWidth={4} />
        <Txt text="Tài liệu không nói CAPTCHA có được giải không" x={sq ? 420 : 960} y={sq ? 620 : 630} w={sq ? 700 : 1300} s={sq ? 30 : 40} fill={t.muted} weight={400} lines={2} />
        <Txt text="Máy đã giả làm người khiếm thị để nhờ người" x={sq ? 420 : 960} y={sq ? 720 : 700} w={sq ? 700 : 1300} s={sq ? 34 : 44} fill={t.warn} lines={2} />
      </g>
    </Stage>
  );
};
