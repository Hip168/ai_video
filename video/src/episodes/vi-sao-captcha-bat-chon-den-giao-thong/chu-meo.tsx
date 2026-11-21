import React from "react";
import { useCurrentFrame } from "remotion";
import { useTheme } from "../../lib/hooks";
import { Stage } from "../../lib/theme";
import type { SceneProps } from "../../lib/types";
import { at, Chip, Human, Mark, modeOf, p, Robot, Txt, useGeom, WarpWord } from "./common";

/**
 * Chữ méo tự vẽ.
 * - `meo`: beat 0 ô đăng ký kiểu AltaVista, vài ký tự bị méo nhẹ; beat 1 người đọc được, máy thời ấy đọc không ra.
 * - `hai-chu`: beat 0 mỗi lần hai chữ; beat 1 một chữ máy đã biết đáp án (kiểm tra người); beat 2 chữ kia phần mềm nhận dạng chữ không đọc được.
 */
export const ChuMeo: React.FC<SceneProps> = ({ scene }) => {
  const mode = modeOf(scene.props, "meo");
  return <Stage>{mode === "hai-chu" ? <HaiChu scene={scene} /> : <Meo scene={scene} />}</Stage>;
};

const Meo: React.FC<SceneProps> = ({ scene }) => {
  const t = useTheme();
  const f = useCurrentFrame();
  const { sq } = useGeom();
  const t1 = at(scene, 1);
  const a1 = p(f, t1, 14);
  const F = sq ? { x: 50, y: 40, w: 740, h: 380 } : { x: 160, y: 60, w: 960, h: 640 };
  return (
    <g>
      <rect x={F.x} y={F.y} width={F.w} height={F.h} rx={20} fill="#f4f6fa" />
      <Chip x={F.x + 30} y={F.y + 24} w={sq ? 260 : 300} h={sq ? 60 : 66} text="AltaVista" s={sq ? 32 : 36} fill={t.accent} color={t.bg} />
      <Txt text="Đăng ký tài khoản" x={F.x + F.w - 30} y={F.y + (sq ? 64 : 68)} w={sq ? 380 : 500} s={sq ? 30 : 36} fill="#1d2b52" anchor="end" />
      <rect x={F.x + 40} y={F.y + (sq ? 110 : 130)} width={F.w - 80} height={sq ? 150 : 260} rx={12} fill="#e3e7ef" stroke="#9aa5bb" strokeWidth={3} />
      <WarpWord text="k7wQe" cx={F.x + F.w / 2} cy={F.y + (sq ? 180 : 255)} s={sq ? 90 : 150} fill="#1d2b52" noise="#9aa5bb" />
      <rect x={F.x + 40} y={F.y + F.h - (sq ? 100 : 130)} width={F.w - 80} height={sq ? 64 : 80} rx={10} fill="#ffffff" stroke="#9aa5bb" strokeWidth={3} />
      <Txt text="Gõ lại các ký tự trên" x={F.x + 70} y={F.y + F.h - (sq ? 56 : 78)} w={F.w - 140} s={sq ? 30 : 36} fill="#6b7a99" anchor="start" weight={400} />
      <g opacity={a1}>
        {[
          { who: "người", ok: true, x: sq ? 220 : 1340, y: sq ? 560 : 220 },
          { who: "máy thời ấy", ok: false, x: sq ? 620 : 1340, y: sq ? 560 : 520 },
        ].map((r, i) => (
          <g key={i}>
            {i === 0 ? <Human x={r.x} y={r.y} s={sq ? 120 : 160} fill={t.panel} line={t.fg} /> : <Robot x={r.x} y={r.y} s={sq ? 120 : 160} fill={t.panel} line={t.accent} />}
            <Mark cx={r.x + (sq ? 70 : 110)} cy={r.y - (sq ? 30 : 40)} r={sq ? 30 : 38} ok={r.ok} />
            <Txt text={r.ok ? "đọc được" : "đọc không ra"} x={sq ? r.x : r.x + 260} y={sq ? r.y + 100 : r.y + 14} w={sq ? 340 : 360} s={sq ? 32 : 44} fill={r.ok ? t.ok : t.warn} anchor={sq ? "middle" : "start"} />
          </g>
        ))}
      </g>
    </g>
  );
};

const HaiChu: React.FC<SceneProps> = ({ scene }) => {
  const t = useTheme();
  const f = useCurrentFrame();
  const { sq } = useGeom();
  const t1 = at(scene, 1);
  const t2 = at(scene, 2);
  const W = sq ? { y: 60, h: 300, a: 230, b: 610 } : { y: 90, h: 360, a: 620, b: 1300 };
  return (
    <g>
      <rect x={sq ? 50 : 300} y={W.y} width={sq ? 740 : 1320} height={W.h} rx={20} fill="#efe6cf" />
      <WarpWord text="morning" cx={W.a} cy={W.y + W.h / 2 - 20} s={sq ? 52 : 90} fill="#2b2118" noise="#b8a888" seed={7} />
      <WarpWord text="overlooks" cx={W.b} cy={W.y + W.h / 2 - 20} s={sq ? 46 : 80} fill="#2b2118" noise="#b8a888" seed={11} smudge={1} />
      <Txt text="mỗi lần: hai chữ" x={sq ? 420 : 960} y={W.y + W.h + (sq ? 50 : 70)} w={sq ? 700 : 1000} s={sq ? 36 : 48} fill={t.fg} />
      <g opacity={p(f, t1, 14)}>
        <rect x={W.a - (sq ? 170 : 300)} y={W.y + 20} width={sq ? 340 : 600} height={W.h - 40} rx={16} fill="none" stroke={t.ok} strokeWidth={6} />
        <Txt text="máy đã biết đáp án" x={W.a} y={W.y + W.h + (sq ? 120 : 150)} w={sq ? 370 : 600} s={sq ? 32 : 42} fill={t.ok} lines={2} />
        <Txt text="để kiểm tra bạn là người" x={W.a} y={W.y + W.h + (sq ? 210 : 210)} w={sq ? 370 : 600} s={sq ? 30 : 36} fill={t.muted} weight={400} lines={2} />
      </g>
      <g opacity={p(f, t2, 14)}>
        <rect x={W.b - (sq ? 170 : 300)} y={W.y + 20} width={sq ? 340 : 600} height={W.h - 40} rx={16} fill="none" stroke={t.warn} strokeWidth={6} strokeDasharray="14 10" />
        <Txt text="phần mềm đọc không ra" x={W.b} y={W.y + W.h + (sq ? 120 : 150)} w={sq ? 370 : 600} s={sq ? 32 : 42} fill={t.warn} lines={2} />
      </g>
    </g>
  );
};
