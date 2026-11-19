import { htmlToMarkdown as convertHtml } from './html-to-markdown.js';
import { useNizel } from './use-nizel.js';
import { createBrowserRuntime } from './browser-runtime.js';

export { useNizel };
export { defineNizelPlugin } from './plugins/define-nizel-plugin.js';
export { defineBlock } from './blocks/define-block.js';
export { renderMarkdown } from './markdown.js';
export { completeStreamingMarkdown } from './streaming.js';
export { visitNizel } from './visit.js';
export { renderNizelTree } from './renderer.js';
export {
  NIZEL_DOCUMENT_SCHEMA,
  NIZEL_DOCUMENT_VERSION,
  assertNizelDocument,
  createNizelDocument,
  deserializeNizelDocument,
  serializeNizelDocument,
} from './document.js';
export type * from './types.js';
export type { NizelHtmlToMarkdownOptions, NizelHtmlToMarkdownUnsupportedMode } from './html-to-markdown.js';

export type {
  NizelBrowserHtmlSource,
  NizelBrowserMountTarget,
  NizelBrowserProcessor,
} from './browser-runtime.js';

export const {
  useBrowserNizel,
  markdownToHtml,
  mountMarkdown,
  htmlToMarkdown,
  nodeToMarkdown,
  selectionToMarkdown,
} = createBrowserRuntime(useNizel, convertHtml);
