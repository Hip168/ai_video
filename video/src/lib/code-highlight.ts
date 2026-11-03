import { createHighlighterCoreSync, type HighlighterCore } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";
import bash from "shiki/langs/bash.mjs";
import javascript from "shiki/langs/javascript.mjs";
import python from "shiki/langs/python.mjs";
import typescript from "shiki/langs/typescript.mjs";
import githubDark from "shiki/themes/github-dark.mjs";

// Tô màu code bằng shiki, chạy đồng bộ, ngữ pháp và chủ đề nằm sẵn trong gói: không tải gì qua mạng,
// không dùng WASM. Cùng đầu vào luôn ra cùng token (tất định).

export const CODE_LANGS = ["javascript", "typescript", "python", "bash"] as const;
export type CodeLang = (typeof CODE_LANGS)[number];

/** Nền và màu chữ mặc định của chủ đề github-dark (khung code luôn tối, mọi theme đều đọc được). */
export const CODE_BG = "#0d1117";
export const CODE_FG = "#e1e4e8";
export const CODE_MUTED = "#6a737d";

export interface CodeToken {
  text: string;
  color: string;
}

let hl: HighlighterCore | null = null;

function highlighter(): HighlighterCore {
  hl ??= createHighlighterCoreSync({
    themes: [githubDark],
    langs: [javascript, typescript, python, bash],
    engine: createJavaScriptRegexEngine(),
  });
  return hl;
}

/** Chuẩn hoá: NFC, bỏ \r, tab thành 2 dấu cách. */
export function normalizeCode(code: string): string {
  return code.normalize("NFC").replace(/\r\n?/g, "\n").replace(/\t/g, "  ");
}

/** Mỗi dòng là danh sách token {text, color}. Số dòng bằng `normalizeCode(code).split("\n").length`. */
export function tokenizeCode(code: string, lang: CodeLang): CodeToken[][] {
  const src = normalizeCode(code);
  const rows = highlighter().codeToTokensBase(src, { lang, theme: "github-dark", tokenizeTimeLimit: 0 });
  const want = src.split("\n").length;
  const out = rows.map((r) => r.map((t) => ({ text: t.content, color: t.color ?? CODE_FG })));
  while (out.length < want) out.push([]);
  return out.slice(0, want);
}
