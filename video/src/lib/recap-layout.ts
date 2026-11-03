import { fitText, MIN_MARGIN, type MeasureWidth } from "./text";

/** Chữ điểm bắt đầu ở x=360, lề phải MIN_MARGIN. */
export const RECAP_POINT_WIDTH = 1920 - 360 - MIN_MARGIN;
export const RECAP_NEXT_WIDTH = 1700;
/** Khoảng cách dòng của điểm 2 dòng, khoảng cách giữa các điểm, và hàng `next` (cuối cùng ≤ y 830). */
export const LINE_HEIGHT = 1.25;
export const ROW_PITCH = 105;
export const ROW_START_Y = 240;
export const NEXT_Y = 770;
export const POINT_SIZE = 48;
export const POINT_SIZE_SMALL = 40;
export const NEXT_SIZE = 36;
export const NEXT_LINE_HEIGHT = 1.2;

export interface RecapRow {
  /** Đường cơ sở gốc của hàng (tâm vòng tròn tích ở y - 14). */
  y: number;
  /** Đường cơ sở của từng dòng chữ. */
  lineYs: number[];
  lines: string[];
}

export interface RecapLayout {
  pointSize: number;
  rows: RecapRow[];
  next: { fontSize: number; lineYs: number[]; lines: string[] };
}

/**
 * Hàm thuần tính bố cục recap-outro. Thử cỡ 48; có điểm xuống 2 dòng hoặc phải giảm cỡ thì thử 40.
 * Mọi điểm dùng một cỡ chung là cỡ nhỏ nhất mà mọi điểm đều vừa, rồi ngắt lại ở đúng cỡ đó.
 */
export function recapLayout(points: string[], next: string, o: { measure?: MeasureWidth } = {}): RecapLayout {
  const fit = (size: number, minScale?: number) =>
    points.map((p) => fitText({ text: p, fontSize: size, width: RECAP_POINT_WIDTH, maxLines: 2, measure: o.measure, minScale }));
  let fits = fit(POINT_SIZE);
  if (!fits.every((f) => f.lines.length === 1 && f.fontSize === POINT_SIZE)) fits = fit(POINT_SIZE_SMALL);
  // Một cỡ chung: nhỏ nhất mà mọi điểm vừa; ngắt lại mọi điểm đúng ở cỡ đó (không giảm thêm).
  const common = fits.reduce((m, f) => Math.min(m, f.fontSize), fits.length > 0 ? fits[0].fontSize : POINT_SIZE);
  fits = fit(common, 1);
  const rows = fits.map((f, i) => {
    const y = ROW_START_Y + i * ROW_PITCH;
    const dy = -((f.lines.length - 1) * f.fontSize * LINE_HEIGHT) / 2;
    return { y, lines: f.lines, lineYs: f.lines.map((_, k) => y + dy + k * f.fontSize * LINE_HEIGHT) };
  });
  const nf = fitText({ text: next, fontSize: NEXT_SIZE, width: RECAP_NEXT_WIDTH, maxLines: 2, measure: o.measure });
  return {
    pointSize: common,
    rows,
    next: { fontSize: nf.fontSize, lines: nf.lines, lineYs: nf.lines.map((_, k) => NEXT_Y + k * nf.fontSize * NEXT_LINE_HEIGHT) },
  };
}
