import type { PropSpec, PropsSpec } from "./types";

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

function checkValue(spec: PropSpec, value: unknown, path: string, out: string[]): void {
  switch (spec.kind) {
    case "string": {
      if (typeof value !== "string") return void out.push(`${path}: phải là chuỗi`);
      const len = [...value].length;
      if (spec.minLen !== undefined && len < spec.minLen)
        out.push(`${path}: dài ${len} ký tự, tối thiểu ${spec.minLen}`);
      if (spec.maxLen !== undefined && len > spec.maxLen)
        out.push(`${path}: dài ${len} ký tự, tối đa ${spec.maxLen}`);
      if (spec.oneOf && !spec.oneOf.includes(value))
        out.push(`${path}: phải là một trong ${spec.oneOf.join(", ")}`);
      return;
    }
    case "number": {
      if (typeof value !== "number" || !Number.isFinite(value)) return void out.push(`${path}: phải là số`);
      if (spec.integer && !Number.isInteger(value)) out.push(`${path}: phải là số nguyên`);
      if (spec.min !== undefined && value < spec.min) out.push(`${path}: nhỏ hơn ${spec.min}`);
      if (spec.max !== undefined && value > spec.max) out.push(`${path}: lớn hơn ${spec.max}`);
      return;
    }
    case "boolean":
      if (typeof value !== "boolean") out.push(`${path}: phải là true/false`);
      return;
    case "array": {
      if (!Array.isArray(value)) return void out.push(`${path}: phải là mảng`);
      if (spec.minItems !== undefined && value.length < spec.minItems)
        out.push(`${path}: có ${value.length} phần tử, tối thiểu ${spec.minItems}`);
      if (spec.maxItems !== undefined && value.length > spec.maxItems)
        out.push(`${path}: có ${value.length} phần tử, tối đa ${spec.maxItems}`);
      value.forEach((v, i) => checkValue(spec.of, v, `${path}[${i}]`, out));
      return;
    }
    case "object": {
      if (!isObj(value)) return void out.push(`${path}: phải là đối tượng`);
      checkObject(spec.shape, value, path, out);
      return;
    }
  }
}

function checkObject(shape: PropsSpec, obj: Record<string, unknown>, base: string, out: string[]): void {
  const prefix = base === "" ? "" : `${base}.`;
  for (const key of Object.keys(obj)) {
    if (!(key in shape)) out.push(`${prefix}${key}: khoá không có trong propsSpec`);
  }
  for (const [key, spec] of Object.entries(shape)) {
    const v = obj[key];
    if (v === undefined) {
      if (spec.required) out.push(`${prefix}${key}: bắt buộc`);
      continue;
    }
    checkValue(spec, v, `${prefix}${key}`, out);
  }
}

/** Trả danh sách lỗi; rỗng là hợp lệ. Khoá lạ bị từ chối. */
export function validateProps(spec: PropsSpec, props: unknown): string[] {
  if (!isObj(props)) return ["(props): phải là đối tượng"];
  const out: string[] = [];
  checkObject(spec, props, "", out);
  return out;
}
