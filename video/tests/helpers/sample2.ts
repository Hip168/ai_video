import {readFileSync} from 'node:fs';
import path from 'node:path';
import {VIDEO_DIR} from './sample';

export const SAMPLE2_PATH = path.resolve(
  VIDEO_DIR,
  '..',
  '.team',
  'contract',
  'timeline2.sample.json',
);

/** Đọc thẳng file mẫu hợp đồng v2, không chép. Mỗi lần gọi trả bản mới. */
export function loadSample2(): any {
  return JSON.parse(readFileSync(SAMPLE2_PATH, 'utf8'));
}
