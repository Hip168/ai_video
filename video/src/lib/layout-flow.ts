import dagre from "@dagrejs/dagre";

export interface FlowNodeIn {
  id: string;
  label: string;
}
export interface FlowEdgeIn {
  from: string;
  to: string;
  label?: string;
}
export type Pt = { x: number; y: number };
export interface Box {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Vùng cho phép của hình chính: lề 40 px, y < 830. */
export const FLOW_AREA = { x: 40, y: 40, w: 1840, h: 750 };
/** Khung vuông của Short (840x840, lề 30). Ở khung này đồ thị luôn chạy từ trên xuống, khoảng cách tầng 90. */
export const FLOW_AREA_SQUARE = { x: 30, y: 30, w: 780, h: 780 };
/** Chừa nửa nét viền và vòng sáng (16 px) để cả nét vẽ nằm trong FLOW_AREA. */
const INSET = 16;
const r2 = (v: number) => Math.round(v * 100) / 100;
const NW = 240;
const NH = 88;

export interface FlowLayout {
  /** Hộp từng nút, toạ độ màn hình, (x, y) là góc trên trái. */
  boxes: Box[];
  /** Đường gấp khúc từng cạnh, khoá "từ>tới", toạ độ màn hình. */
  paths: Record<string, Pt[]>;
  edges: FlowEdgeIn[];
  /** Hệ số thu phóng so với bố cục gốc (nút gốc 240x88). */
  scale: number;
}

/** Cỡ chữ nút (theo chiều cao hộp 88 * scale; hộp thấp thì 1 dòng) và khung nhãn cạnh. Cảnh và lint cùng dùng. */
export function flowSizes(scale: number, square = false): { nodeLines: number; nodeFont: number; lblW: number; lblH: number; lblFont: number } {
  const boxH = NH * scale;
  const fsMax = Math.max(8, Math.min(30 * scale, boxH * 0.4));
  const nodeLines = boxH >= 60 ? 2 : 1;
  const nodeFont = nodeLines === 2 ? Math.min(fsMax, boxH * 0.3) : fsMax;
  if (square) return { nodeLines, nodeFont, lblW: 200, lblH: 44, lblFont: 28 }; // nhãn cạnh ≥ 25 px (D32)
  const lblW = 160 * Math.min(1, scale + 0.2);
  const lblH = 36 * Math.min(1, scale + 0.2);
  return { nodeLines, nodeFont, lblW, lblH, lblFont: Math.min(24, lblH * 0.66) };
}

/** Bố cục thuần của `flow` (dagre). Bỏ cạnh trỏ tới nút lạ hoặc tự trỏ. Cảnh chỉ vẽ theo kết quả này. */
export function layoutFlow(props: Record<string, unknown>, square = false): FlowLayout {
  const nodes = (Array.isArray(props.nodes) ? props.nodes : []) as FlowNodeIn[];
  const raw = (Array.isArray(props.edges) ? props.edges : []) as FlowEdgeIn[];
  const dir = square || props.direction === "TB" ? "TB" : "LR";
  const area = square ? FLOW_AREA_SQUARE : FLOW_AREA;
  const ids = new Set(nodes.map((n) => n.id));
  const edges = raw.filter((e) => ids.has(e.from) && ids.has(e.to) && e.from !== e.to);
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: dir, ranksep: square ? 90 : 170, nodesep: 56, marginx: 0, marginy: 0 });
  g.setDefaultEdgeLabel(() => ({}));
  for (const n of nodes) g.setNode(n.id, { width: NW, height: NH });
  for (const e of edges) g.setEdge(e.from, e.to);
  dagre.layout(g);
  const gl = g.graph();
  const gw = Math.max(1, gl.width ?? NW);
  const gh = Math.max(1, gl.height ?? NH);
  const s = Math.min(1.15, (area.w - 2 * INSET) / gw, (area.h - 2 * INSET) / gh);
  const ox = area.x + (area.w - gw * s) / 2;
  const oy = area.y + (area.h - gh * s) / 2;
  const T = (p: Pt): Pt => ({ x: r2(ox + p.x * s), y: r2(oy + p.y * s) });
  const centre: Record<string, Pt> = {};
  const boxes: Box[] = nodes.map((n) => {
    const v = g.node(n.id);
    centre[n.id] = T({ x: v.x, y: v.y });
    return { id: n.id, x: r2(centre[n.id].x - (NW * s) / 2), y: r2(centre[n.id].y - (NH * s) / 2), w: r2(NW * s), h: r2(NH * s) };
  });
  const paths: Record<string, Pt[]> = {};
  for (const e of edges) {
    const pts = (g.edge(e.from, e.to)?.points ?? []) as Pt[];
    paths[`${e.from}>${e.to}`] = pts.length >= 2 ? pts.map((p) => T(p)) : [centre[e.from], centre[e.to]];
  }
  return { boxes, paths, edges, scale: s };
}
