// Kiểm `episodes/<slug>/shorts.json` (đề mục 14, D33). Cùng luật với `aivideo.shorts validate` (Python),
// thêm kiểm cảnh `custom:` phải có trong CUSTOM_SQUARE. Giao diện: .team/features/14-shorts-giao-dien.md
import { CUSTOM_SQUARE } from "./episodes/registry";
import { clipRange, sceneRange } from "./Short";
import type { Timeline2 } from "./timeline2";

export const SHORT_MIN_PARTS = 1;
export const SHORT_MAX_PARTS = 8;
// Ngưỡng tính theo giây; số frame theo `fps` của timeline (thiếu thì 30). Hằng *_FRAMES là số frame ở 30 fps.
export const SHORT_DEFAULT_FPS = 30;
export const SHORT_MAX_SEC = 180;
export const SHORT_WARN_SEC = 150;
// D43 (LUAT/con-bit.md §5): mỗi Short 30–45 s. Ngoài khoảng này chỉ cảnh báo lúc lên kế hoạch, không chặn.
export const SHORT_IDEAL_MIN_SEC = 30;
export const SHORT_IDEAL_MAX_SEC = 45;
export const SHORT_MAX_FRAMES = SHORT_MAX_SEC * SHORT_DEFAULT_FPS; // 5400
export const SHORT_WARN_FRAMES = SHORT_WARN_SEC * SHORT_DEFAULT_FPS; // 4500
export const SHORT_IDEAL_MIN_FRAMES = SHORT_IDEAL_MIN_SEC * SHORT_DEFAULT_FPS; // 900
export const SHORT_IDEAL_MAX_FRAMES = SHORT_IDEAL_MAX_SEC * SHORT_DEFAULT_FPS; // 1350
export const SHORT_MAX_HOOK = 40;
export const SHORT_MAX_TITLE = 100;

export interface ShortEntry {
  part: number;
  total: number;
  from: string;
  to: string;
  title: string;
  hook: string;
}

export const titleSuffix = (part: number, total: number): string => ` (Phần ${part}/${total}) #Shorts`;

/** Trả lỗi và cảnh báo; không ném. */
export function validateShorts(raw: unknown, timeline: Timeline2): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const list = raw && typeof raw === "object" && Array.isArray((raw as { shorts?: unknown }).shorts) ? ((raw as { shorts: unknown[] }).shorts) : null;
  if (!list) return { errors: ["shorts.json cần object có mảng `shorts`"], warnings };
  const n = list.length;
  if (n < SHORT_MIN_PARTS || n > SHORT_MAX_PARTS) errors.push(`cần ${SHORT_MIN_PARTS}..${SHORT_MAX_PARTS} phần, có ${n}`);
  const f = (timeline as {fps?: unknown}).fps;
  const fps = typeof f === "number" && f > 0 ? f : SHORT_DEFAULT_FPS;
  const order = new Map(timeline.scenes.flatMap((s) => s.beats).map((b, i) => [b.id, i]));
  let prevEnd = -1;
  list.forEach((e0, k) => {
    const i = k + 1;
    const w = `phần ${i}`;
    if (!e0 || typeof e0 !== "object") return errors.push(`${w}: phải là object`);
    const e = e0 as Partial<ShortEntry>;
    if (e.part !== i) errors.push(`${w}: part phải là ${i}, nhận ${JSON.stringify(e.part)}`);
    if (e.total !== n) errors.push(`${w}: total phải là ${n}, nhận ${JSON.stringify(e.total)}`);
    if (typeof e.hook !== "string" || e.hook.trim() === "" || e.hook.length > SHORT_MAX_HOOK) errors.push(`${w}: hook phải có 1..${SHORT_MAX_HOOK} ký tự`);
    if (typeof e.title !== "string" || e.title.trim() === "") errors.push(`${w}: title rỗng`);
    else if ((e.title + titleSuffix(i, n)).length > SHORT_MAX_TITLE)
      errors.push(`${w}: tiêu đề kèm "${titleSuffix(i, n).trim()}" dài quá ${SHORT_MAX_TITLE} ký tự`);
    if (typeof e.from !== "string" || typeof e.to !== "string" || !order.has(e.from) || !order.has(e.to))
      return errors.push(`${w}: from/to phải là id beat có trong timeline (${JSON.stringify(e.from)}, ${JSON.stringify(e.to)})`);
    if (order.get(e.to)! < order.get(e.from)!) return errors.push(`${w}: beat ${e.to} đứng trước ${e.from}`);
    const sFrom = timeline.scenes.find((s) => s.beats.some((b) => b.id === e.from))!;
    const sTo = timeline.scenes.find((s) => s.beats.some((b) => b.id === e.to))!;
    if (sFrom.beats[0].id !== e.from) errors.push(`${w}: ${e.from} không phải beat đầu của cảnh ${sFrom.id}`);
    if (sTo.beats[sTo.beats.length - 1].id !== e.to) errors.push(`${w}: ${e.to} không phải beat cuối của cảnh ${sTo.id}`);
    const { start, end } = clipRange(timeline, { from: e.from, to: e.to });
    if (start < prevEnd) errors.push(`${w}: chồng lên phần trước`);
    prevEnd = end;
    const len = end - start;
    const sec = (len / fps).toFixed(1);
    if (len > SHORT_MAX_SEC * fps) errors.push(`${w}: dài ${sec} s, tối đa ${SHORT_MAX_SEC} s`);
    else if (len > SHORT_WARN_SEC * fps) warnings.push(`${w}: dài ${sec} s, nên dưới ${SHORT_WARN_SEC} s`);
    else if (len < SHORT_IDEAL_MIN_SEC * fps || len > SHORT_IDEAL_MAX_SEC * fps)
      warnings.push(`${w}: dài ${sec} s, ngoài khoảng ${SHORT_IDEAL_MIN_SEC}–${SHORT_IDEAL_MAX_SEC} s (D43)`);
    const { first, last } = sceneRange(timeline, { from: e.from, to: e.to });
    for (const s of timeline.scenes.slice(first, last + 1)) {
      if (s.type.startsWith("custom:") && !CUSTOM_SQUARE.has(s.type.slice("custom:".length)))
        errors.push(`${w}: cảnh ${s.id} (${s.type}) chưa hỗ trợ khung vuông (thêm vào CUSTOM_SQUARE sau khi cảnh đọc useBox())`);
    }
  });
  return { errors, warnings };
}
