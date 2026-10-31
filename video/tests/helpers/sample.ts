import {readFileSync} from 'node:fs';
import path from 'node:path';

export const VIDEO_DIR = path.resolve(__dirname, '..', '..');
export const SAMPLE_PATH = path.resolve(
  VIDEO_DIR,
  '..',
  '.team',
  'contract',
  'timeline.sample.json',
);

/** Đọc thẳng file mẫu của hợp đồng, không chép. Mỗi lần gọi trả bản mới. */
export function loadSample(): any {
  return JSON.parse(readFileSync(SAMPLE_PATH, 'utf8'));
}
