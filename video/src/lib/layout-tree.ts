import { hierarchy, tree } from "d3-hierarchy";
import type { Box } from "./layout-flow";

export interface TreeNodeIn {
  id: string;
  parent?: string;
  label: string;
}
interface TNode {
  id: string;
  label: string;
  children: TNode[];
}
export interface TreeBox extends Box {
  depth: number;
  label: string;
}
export interface TreeLayout {
  boxes: TreeBox[];
  links: { from: string; to: string }[];
  /** Số tầng (độ sâu lớn nhất + 1). */
  depth: number;
  scale: number;
}

export const TREE_AREA = { x: 40, y: 40, w: 1840, h: 750 };
/** Khung vuông của Short: cây nằm ngang (gốc bên trái), hộp 150x56, chữ cố định 30 px. */
export const TREE_AREA_SQUARE = { x: 30, y: 30, w: 780, h: 780 };
const SW = 150;
const SH = 56;
const SGAP = 50;
/** Khung vuông: hộp cao đủ hai dòng chữ 30 px (D32). */
const SH2 = 92;
const INSET = 16;
const r2 = (v: number) => Math.round(v * 100) / 100;
const NW = 200;
const NH = 70;
const VGAP = 90;

/** Gốc là nút đầu tiên không có cha hợp lệ; nút mồ côi và id trùng bị bỏ. */
function build(nodes: TreeNodeIn[]): TNode | null {
  const byId = new Map<string, TNode>();
  for (const n of nodes) if (!byId.has(n.id)) byId.set(n.id, { id: n.id, label: n.label, children: [] });
  let root: TNode | null = null;
  const seen = new Set<string>();
  for (const n of nodes) {
    if (seen.has(n.id)) continue;
    seen.add(n.id);
    const me = byId.get(n.id)!;
    const par = n.parent !== undefined && n.parent !== "" && n.parent !== n.id ? byId.get(n.parent) : undefined;
    if (par) par.children.push(me);
    else if (!root) root = me;
  }
  return root;
}

/** Bố cục thuần của `tree-graph` (d3-hierarchy), toạ độ màn hình, (x, y) là góc trên trái. */
export function layoutTree(props: Record<string, unknown>, square = false): TreeLayout {
  const nodes = (Array.isArray(props.nodes) ? props.nodes : []) as TreeNodeIn[];
  const root = build(nodes);
  if (!root) return { boxes: [], links: [], depth: 0, scale: 1 };
  const h = hierarchy<TNode>(root, (d) => d.children);
  if (square) return layoutSquare(h);
  tree<TNode>().nodeSize([NW + 40, NH + VGAP])(h);
  const all = h.descendants() as unknown as { x: number; y: number; depth: number; data: TNode; parent: { data: TNode } | null }[];
  const xs = all.map((d) => d.x);
  const depth = h.height + 1;
  const gw = Math.max(...xs) - Math.min(...xs) + NW;
  const gh = (depth - 1) * (NH + VGAP) + NH;
  const s = Math.min(1.1, (TREE_AREA.w - 2 * INSET) / gw, (TREE_AREA.h - 2 * INSET) / gh);
  const ox = TREE_AREA.x + TREE_AREA.w / 2 - ((Math.max(...xs) + Math.min(...xs)) / 2) * s;
  const oy = TREE_AREA.y + (TREE_AREA.h - gh * s) / 2;
  const boxes: TreeBox[] = all.map((d) => ({
    id: d.data.id,
    label: d.data.label,
    depth: d.depth,
    w: r2(NW * s),
    h: r2(NH * s),
    x: r2(ox + d.x * s - (NW * s) / 2),
    y: r2(oy + d.y * s),
  }));
  const links = all.filter((d) => d.parent).map((d) => ({ from: d.parent!.data.id, to: d.data.id }));
  return { boxes, links, depth, scale: s };
}

/** Cây nằm ngang trong khung vuông: x theo độ sâu, y theo d3 (tối đa 1,1 lần, không thu chữ). */
function layoutSquare(h: ReturnType<typeof hierarchy<TNode>>): TreeLayout {
  const A = TREE_AREA_SQUARE;
  const depth = h.height + 1;
  // Hộp rộng ra cho kín bề ngang khung, để nhãn dài vẫn giữ chữ 30 px.
  const sw = Math.max(SW, (A.w - 2 * INSET - (depth - 1) * SGAP) / depth);
  tree<TNode>().nodeSize([SH2 + 18, sw + SGAP])(h);
  const all = h.descendants() as unknown as { x: number; y: number; depth: number; data: TNode; parent: { data: TNode } | null }[];
  const xs = all.map((d) => d.x);
  const gh = Math.max(...xs) - Math.min(...xs) + SH2;
  const gw = (depth - 1) * (sw + SGAP) + sw;
  const s = Math.min(1.1, (A.w - 2 * INSET) / gw, (A.h - 2 * INSET) / gh);
  const ox = A.x + (A.w - gw * s) / 2;
  const oy = A.y + A.h / 2 - ((Math.max(...xs) + Math.min(...xs)) / 2) * s;
  const boxes: TreeBox[] = all.map((d) => ({
    id: d.data.id,
    label: d.data.label,
    depth: d.depth,
    w: r2(sw * s),
    h: r2(SH2 * s),
    x: r2(ox + d.y * s),
    y: r2(oy + d.x * s - (SH2 * s) / 2),
  }));
  const links = all.filter((d) => d.parent).map((d) => ({ from: d.parent!.data.id, to: d.data.id }));
  return { boxes, links, depth, scale: s };
}
