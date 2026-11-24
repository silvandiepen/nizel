import { htmlToMarkdown as stockHtmlToMarkdown, type NizelHtmlToMarkdownOptions } from './html-to-markdown.js';
import { createNizelFactory } from './use-nizel.js';
import { parseWasm, renderWasm, reverseWasm } from './wasm/backend.js';

export * from './index.js';

export const useNizel = createNizelFactory(renderWasm, parseWasm);

/** Converts HTML with the optional backend and exact JavaScript fallback. */
export function htmlToMarkdown(html: string, options?: NizelHtmlToMarkdownOptions): string {
  return reverseWasm(html, options) ?? stockHtmlToMarkdown(html, options);
}
