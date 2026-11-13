import React, { useMemo } from "react";
import { useCurrentFrame } from "remotion";
import { clamp01, ease, useTheme } from "../hooks";
import { SHORT_MIN_EDGE_LABEL_PX, Stage, useBox } from "../theme";
import { itemStart, pointAlong, TextBlock } from "../b-kit";
import { flowSizes, layoutFlow, type FlowLayout, type Pt } from "../layout-flow";
import { fitText } from "../text";
import type { SceneProps } from "../types";

interface PacketIn {
  from: string;
  to: string;
  label?: string;
}

const TRAVEL = 36;

export const Flow: React.FC<SceneProps> = ({ scene }) => {
  const theme = useTheme();
  const frame = useCurrentFrame();
  const p = scene.props;
  const packets = (Array.isArray(p.packets) ? p.packets : []) as PacketIn[];
  const sq = useBox().layout === "square";
  const key = JSON.stringify([p.nodes, p.edges, p.direction, sq]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const lay: FlowLayout = useMemo(() => layoutFlow(p, sq), [key]);
  const nodes = (Array.isArray(p.nodes) ? p.nodes : []) as { id: string; label: string }[];
  const edges = lay.edges;
  const boxOf = new Map(lay.boxes.map((bx) => [bx.id, bx]));
  const centre = (id: string): Pt => ({ x: boxOf.get(id)!.x + boxOf.get(id)!.w / 2, y: boxOf.get(id)!.y + boxOf.get(id)!.h / 2 });
  const n = packets.length + 1;
  const graphStart = itemStart(scene, 0, n);
  const { nodeLines, nodeFont: fs, lblW, lblH, lblFont } = flowSizes(lay.scale, sq);

  const arrival: Record<string, number> = {};
  const pk = packets.map((k, i) => {
    const start = itemStart(scene, i + 1, n);
    const pts = lay.paths[`${k.from}>${k.to}`] ?? (boxOf.has(k.from) && boxOf.has(k.to) ? [centre(k.from), centre(k.to)] : null);
    if (pts && boxOf.has(k.to)) arrival[k.to] = Math.min(arrival[k.to] ?? Infinity, start + TRAVEL);
    return { k, start, pts };
  });

  return (
    <Stage>
      {edges.map((e, i) => {
        const pts = lay.paths[`${e.from}>${e.to}`];
        const a = ease((frame - graphStart - 6 - i * 3) / 14);
        const last = pts[pts.length - 1];
        const prev = pts[pts.length - 2];
        const ang = Math.atan2(last.y - prev.y, last.x - prev.x);
        const mid = pointAlong(pts, 0.5);
        return (
          <g key={`${e.from}>${e.to}`} opacity={a}>
            <polyline points={pts.map((q) => `${q.x},${q.y}`).join(" ")} fill="none" stroke={theme.muted} strokeWidth={5} strokeLinejoin="round" />
            <polygon
              points="0,0 -22,-10 -22,10"
              fill={theme.muted}
              transform={`translate(${last.x} ${last.y}) rotate(${(ang * 180) / Math.PI})`}
            />
            {e.label && e.label !== "" && (
              <g>
                <rect x={mid.x - lblW / 2} y={mid.y - lblH / 2} width={lblW} height={lblH} rx={10} fill={theme.bg} opacity={0.9} />
                <TextBlock text={e.label} x={mid.x} y={mid.y + lblH * 0.22} width={lblW - 12} fontSize={lblFont} fill={theme.muted} weight={400} minPx={SHORT_MIN_EDGE_LABEL_PX} />
              </g>
            )}
          </g>
        );
      })}
      {nodes.map((nd, i) => {
        const c = centre(nd.id);
        const a = ease((frame - graphStart - i * 4) / 14);
        const hit = arrival[nd.id] !== undefined && frame >= arrival[nd.id];
        const pulse = hit ? clamp01(1 - (frame - arrival[nd.id]) / 20) : 0;
        const w = boxOf.get(nd.id)!.w;
        const h = boxOf.get(nd.id)!.h;
        // Lề trong để chữ không chạm viền; căn giữa theo chiều dọc: khối chữ (1 hoặc 2 dòng) đặt quanh tâm hộp.
        const tw = w - 2 * Math.max(12, w * 0.08);
        const fit = fitText({ text: nd.label, fontSize: fs, width: tw, maxLines: nodeLines });
        const ty = c.y - ((fit.lines.length - 1) * fit.fontSize * 1.1) / 2 + fit.fontSize * 0.35;
        return (
          <g key={nd.id} opacity={a} transform={`translate(0 ${(1 - a) * 24})`}>
            <rect x={c.x - w / 2} y={c.y - h / 2} width={w} height={h} rx={18 * lay.scale} fill={theme.panel} stroke={hit ? theme.accent2 : theme.accent} strokeWidth={hit ? 7 : 5} />
            {pulse > 0 && <rect x={c.x - w / 2 - 10 * pulse} y={c.y - h / 2 - 10 * pulse} width={w + 20 * pulse} height={h + 20 * pulse} rx={24} fill="none" stroke={theme.accent2} strokeWidth={3} opacity={pulse} />}
            <TextBlock text={nd.label} x={c.x} y={ty} width={tw} fontSize={fs} maxLines={nodeLines} fill={theme.fg} lineHeight={1.1} />
          </g>
        );
      })}
      {pk.map(({ k, start, pts }, i) => {
        if (!pts) return null;
        const t = (frame - start) / TRAVEL;
        if (t < 0) return null;
        const u = ease(t);
        const pos = pointAlong(pts, u);
        const fade = t <= 1 ? 1 : 1 - clamp01((t - 1) * TRAVEL / 14);
        if (fade <= 0) return null;
        const lbl = k.label ?? "";
        const w = lbl === "" ? 44 : sq ? 130 : 112;
        return (
          <g key={i} opacity={fade} transform={`translate(${pos.x} ${pos.y})`}>
            <rect x={-w / 2} y={-22} width={w} height={44} rx={12} fill={theme.accent2} />
            {lbl !== "" && <TextBlock text={lbl} x={0} y={sq ? 10 : 8} width={w - 16} fontSize={sq ? 30 : 26} fill={theme.bg} />}
            {lbl === "" && <circle r={9} fill={theme.bg} />}
          </g>
        );
      })}
    </Stage>
  );
};
