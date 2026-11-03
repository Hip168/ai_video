export interface AlgoState {
  values: number[];
  active?: number[];
  done?: number[];
  note?: string;
}
export interface BeatStart {
  startFrame: number;
  cue?: string;
}

export const ALGO_MAX_H = 480;
export const ALGO_SWAP_FRAMES = 14;

export interface AlgoBarsFrame {
  /** Chỉ số trạng thái đang hiện (0 trước beat đầu). */
  index: number;
  values: number[];
  /** Chiều cao từng cột (px) tại frame này, nội suy giữa trạng thái trước và trạng thái hiện tại. */
  heights: number[];
  active: number[];
  done: number[];
  note: string;
}

const ease = (v: number) => {
  const t = Math.min(1, Math.max(0, v));
  return t * t * (3 - 2 * t);
};

/**
 * Hàm thuần. `states[k]` hiện từ đầu beat `step` thứ k; không beat nào có cue `step` thì beat thứ k theo thứ tự;
 * k vượt số beat thì không tới được, giữ trạng thái cuối đã tới. `frame` và `startFrame` cùng một hệ quy chiếu.
 * Trước beat đầu là `states[0]`.
 */
export function algoBarsAt(props: Record<string, unknown>, frame: number, beats: BeatStart[]): AlgoBarsFrame {
  const states = (Array.isArray(props.states) ? props.states : []).filter(
    (s): s is AlgoState => typeof s === "object" && s !== null && Array.isArray((s as AlgoState).values),
  );
  if (states.length === 0) return { index: 0, values: [], heights: [], active: [], done: [], note: "" };
  const tagged = beats.filter((b) => b.cue === "step");
  const steps = tagged.length >= 1 ? tagged : beats;
  const start = (k: number) => (k < steps.length ? steps[k].startFrame : Infinity);
  let index = 0;
  for (let k = 0; k < states.length; k++) if (frame >= start(k)) index = k;
  const cur = states[index];
  const prev = states[Math.max(0, index - 1)];
  const t = index === 0 ? 1 : ease((frame - start(index)) / ALGO_SWAP_FRAMES);
  const vmax = Math.max(1, ...states.flatMap((s) => s.values));
  const heights = cur.values.map((v, i) => {
    const pv = prev.values[i] ?? v;
    return ((pv + (v - pv) * t) / vmax) * ALGO_MAX_H;
  });
  return { index, values: cur.values, heights, active: cur.active ?? [], done: cur.done ?? [], note: cur.note ?? "" };
}
