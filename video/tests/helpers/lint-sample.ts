import {CATALOG} from '../../src/lib/registry';
import type {CatalogType} from '../../src/timeline2';

/** Props mẫu hợp lệ của một loại cảnh, dựng từ spec.example (không phụ thuộc cảnh giữ chỗ). */
export function propsOf(type: string): Record<string, unknown> {
  if (type.startsWith('custom:')) return {};
  const s = CATALOG[type as CatalogType].spec;
  return s.anyProps ? {} : structuredClone(s.example);
}

/** Beat tối thiểu hợp lệ của một loại cảnh, theo spec.minBeats và spec.cues. */
export function beatsOf(type: string): Array<{cue?: string}> {
  if (type.startsWith('custom:')) return [];
  const s = CATALOG[type as CatalogType].spec;
  return Array.from({length: s.minBeats}, () =>
    s.cues.length > 0 ? {cue: s.cues[0]} : {},
  );
}
