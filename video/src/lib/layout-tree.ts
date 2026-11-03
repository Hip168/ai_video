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
export function layoutTree(props: Record<string, unknown>): TreeLayout {
  const nodes = (Array.isArray(props.nodes) ? props.nodes : []) as TreeNodeIn[];
  const root = build(nodes);
  if (!root) return { boxes: [], links: [], depth: 0, scale: 1 };
  const h = hierarchy<TNode>(root, (d) => d.children);
  tree<TNode>().nodeSize([NW + 40, NH + VGAP])(h);
  const all = h.descendants() as unknown as { x: number; y: number; depth: number; data: TNode; parent: { data: TNode } | null }[];
  const xs = all.map((d) => d.x);
  const depth = h.height + 1;
  const gw = Math.max(...xs) - Math.min(...xs) + NW;
  const gh = (depth - 1) * (NH + VGAP) + NH;
  const s = Math.min(1.1, TREE_AREA.w / gw, TREE_AREA.h / gh);
  const ox = TREE_AREA.x + TREE_AREA.w / 2 - ((Math.max(...xs) + Math.min(...xs)) / 2) * s;
  const oy = TREE_AREA.y + (TREE_AREA.h - gh * s) / 2;
  const boxes: TreeBox[] = all.map((d) => ({
    id: d.data.id,
    label: d.data.label,
    depth: d.depth,
    w: NW * s,
    h: NH * s,
    x: ox + d.x * s - (NW * s) / 2,
    y: oy + d.y * s,
  }));
  const links = all.filter((d) => d.parent).map((d) => ({ from: d.parent!.data.id, to: d.data.id }));
  return { boxes, links, depth, scale: s };
}
