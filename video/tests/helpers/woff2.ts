import {readFileSync} from 'node:fs';
import {brotliDecompressSync} from 'node:zlib';

/** Thứ tự thẻ bảng đã biết của WOFF2 (chỉ cần tới glyf=10, loca=11). */
const KNOWN_TAGS = [
  'cmap', 'head', 'hhea', 'hmtx', 'maxp', 'name', 'OS/2', 'post', 'cvt ',
  'fpgm', 'glyf', 'loca', 'prep', 'CFF ', 'VORG', 'EBDT', 'EBLC', 'gasp',
  'hdmx', 'kern', 'LTSH', 'PCLT', 'VDMX', 'vhea', 'vmtx', 'BASE', 'GDEF',
  'GPOS', 'GSUB', 'EBSC', 'JSTF', 'MATH', 'CBDT', 'CBLC', 'COLR', 'CPAL',
  'SVG ', 'sbix', 'acnt', 'avar', 'bdat', 'bloc', 'bsln', 'cvar', 'fdsc',
  'feat', 'fmtx', 'fvar', 'gvar', 'hsty', 'just', 'lcar', 'mort', 'morx',
  'opbd', 'prop', 'trak', 'Zapf', 'Silf', 'Glat', 'Gloc', 'Feat', 'Sill',
];

/**
 * Đọc bảng cmap của file WOFF2 (không cần thư viện font): giải nén Brotli,
 * tìm cmap (không bị biến đổi) rồi trả tập mã Unicode có glyph.
 */
export function woff2Codepoints(file: string): Set<number> {
  const buf = readFileSync(file);
  if (buf.subarray(0, 4).toString('latin1') !== 'wOF2') {
    throw new Error('không phải WOFF2');
  }
  const numTables = buf.readUInt16BE(12);
  const compressedSize = buf.readUInt32BE(20);
  let p = 48;
  const base128 = (): number => {
    let v = 0;
    for (let i = 0; i < 5; i++) {
      const b = buf[p++];
      v = v * 128 + (b & 0x7f);
      if ((b & 0x80) === 0) return v;
    }
    throw new Error('UIntBase128 hỏng');
  };
  const tables: Array<{tag: string; len: number}> = [];
  for (let i = 0; i < numTables; i++) {
    const flags = buf[p++];
    const idx = flags & 0x3f;
    const version = flags >> 6;
    let tag: string;
    if (idx === 63) {
      tag = buf.subarray(p, p + 4).toString('latin1');
      p += 4;
    } else {
      tag = KNOWN_TAGS[idx];
    }
    const orig = base128();
    const isGlyfLoca = tag === 'glyf' || tag === 'loca';
    const transformed = isGlyfLoca ? version === 0 : version !== 0;
    const len = transformed ? base128() : orig;
    tables.push({tag, len});
  }
  const data = brotliDecompressSync(buf.subarray(p, p + compressedSize));
  let off = 0;
  let cmapOff = -1;
  for (const t of tables) {
    if (t.tag === 'cmap') cmapOff = off;
    off += t.len;
  }
  if (cmapOff < 0) throw new Error('không có bảng cmap');
  const out = new Set<number>();
  const n = data.readUInt16BE(cmapOff + 2);
  for (let i = 0; i < n; i++) {
    const so = cmapOff + data.readUInt32BE(cmapOff + 4 + i * 8 + 4);
    const fmt = data.readUInt16BE(so);
    if (fmt === 4) {
      const segX2 = data.readUInt16BE(so + 6);
      const endO = so + 14;
      const startO = endO + segX2 + 2;
      const deltaO = startO + segX2;
      const rangeO = deltaO + segX2;
      for (let s = 0; s < segX2 / 2; s++) {
        const end = data.readUInt16BE(endO + s * 2);
        const start = data.readUInt16BE(startO + s * 2);
        const ro = data.readUInt16BE(rangeO + s * 2);
        if (start === 0xffff) continue;
        for (let c = start; c <= end; c++) {
          let gid = 0;
          if (ro === 0) gid = (c + data.readInt16BE(deltaO + s * 2)) & 0xffff;
          else {
            const g = data.readUInt16BE(rangeO + s * 2 + ro + (c - start) * 2);
            gid = g === 0 ? 0 : (g + data.readInt16BE(deltaO + s * 2)) & 0xffff;
          }
          if (gid !== 0) out.add(c);
        }
      }
    } else if (fmt === 12) {
      const groups = data.readUInt32BE(so + 12);
      for (let g = 0; g < groups; g++) {
        const go = so + 16 + g * 12;
        const s = data.readUInt32BE(go);
        const e = data.readUInt32BE(go + 4);
        for (let c = s; c <= e; c++) out.add(c);
      }
    }
  }
  return out;
}
