import { htmlToMarkdown as baseHtmlToMarkdown, type NizelHtmlToMarkdownOptions } from './html-to-markdown.js';
import { useNizel } from './use-nizel.js';
import type { NizelOptions, NizelProcessor } from './types.js';

export { useNizel } from './use-nizel.js';
export { defineNizelPlugin } from './plugins/define-nizel-plugin.js';
export { defineBlock } from './blocks/define-block.js';
export type * from './types.js';
export type { NizelHtmlToMarkdownOptions, NizelHtmlToMarkdownUnsupportedMode } from './html-to-markdown.js';

export type NizelBrowserHtmlSource =
  | string
  | Node
  | Range
  | Selection
  | ArrayLike<Node>;

export type NizelBrowserMountTarget = Element | string;

export type NizelBrowserProcessor = NizelProcessor & {
  markdownToHtml(markdown: string, runtimeOptions?: NizelOptions): Promise<string>;
  mount(target: NizelBrowserMountTarget, markdown: string, runtimeOptions?: NizelOptions): Promise<Element>;
  htmlToMarkdown(source: NizelBrowserHtmlSource, options?: NizelHtmlToMarkdownOptions): string;
  nodeToMarkdown(source: NizelBrowserHtmlSource, options?: NizelHtmlToMarkdownOptions): string;
  selectionToMarkdown(selection?: Selection | null, options?: NizelHtmlToMarkdownOptions): string;
};

/**
 * Creates a browser-focused Nizel processor with DOM mounting helpers.
 */
export function useBrowserNizel<TMeta extends Record<string, unknown> = Record<string, unknown>>(
  options: NizelOptions<TMeta> = {},
): NizelBrowserProcessor {
  const processor = useNizel(options) as NizelBrowserProcessor;

  processor.markdownToHtml = (markdown, runtimeOptions) => processor.html(markdown, runtimeOptions);
  processor.mount = async (target, markdown, runtimeOptions) => mountMarkdown(target, markdown, runtimeOptions, processor);
  processor.htmlToMarkdown = htmlToMarkdown;
  processor.nodeToMarkdown = nodeToMarkdown;
  processor.selectionToMarkdown = selectionToMarkdown;

  return processor;
}

/**
 * Renders Markdown to HTML with the default Nizel processor.
 */
export async function markdownToHtml(markdown: string, runtimeOptions?: NizelOptions): Promise<string> {
  return useNizel().html(markdown, runtimeOptions);
}

/**
 * Renders Markdown into a DOM element.
 */
export async function mountMarkdown(
  target: NizelBrowserMountTarget,
  markdown: string,
  runtimeOptions?: NizelOptions,
  processor: Pick<NizelProcessor, 'html'> = useNizel(),
): Promise<Element> {
  const element = resolveMountTarget(target);
  element.innerHTML = await processor.html(markdown, runtimeOptions);
  return element;
}

/**
 * Converts HTML strings, DOM nodes, ranges, selections, or node lists to Markdown.
 */
export function htmlToMarkdown(source: NizelBrowserHtmlSource, options?: NizelHtmlToMarkdownOptions): string {
  return baseHtmlToMarkdown(sourceToHtml(source), options);
}

/**
 * Alias for `htmlToMarkdown()` that reads better when passing DOM nodes.
 */
export function nodeToMarkdown(source: NizelBrowserHtmlSource, options?: NizelHtmlToMarkdownOptions): string {
  return htmlToMarkdown(source, options);
}

/**
 * Converts the current browser selection, or a supplied selection, to Markdown.
 */
export function selectionToMarkdown(selection: Selection | null = currentSelection(), options?: NizelHtmlToMarkdownOptions): string {
  if (!selection || selection.rangeCount === 0) return '';
  return htmlToMarkdown(selection, options);
}

/**
 * Serializes browser HTML sources before handing them to the shared converter.
 */
function sourceToHtml(source: NizelBrowserHtmlSource): string {
  if (typeof source === 'string') return source;
  if (isSelection(source)) return serializeSelection(source);
  if (isRange(source)) return serializeNode(source.cloneContents());
  if (isNodeList(source)) return Array.from(source, serializeNode).join('');
  return serializeNode(source);
}

/**
 * Serializes a DOM node while preserving element markup where available.
 */
function serializeNode(node: Node): string {
  if (isElement(node) && typeof node.outerHTML === 'string') return node.outerHTML;

  switch (node.nodeType) {
    case 3:
    case 4:
      return escapeHtml(node.nodeValue ?? '');
    case 8:
      return `<!--${node.nodeValue ?? ''}-->`;
    case 9: {
      const documentNode = node as Document;
      return documentNode.documentElement?.outerHTML ?? serializeChildren(node);
    }
    case 11:
      return serializeChildren(node);
    default:
      return 'childNodes' in node ? serializeChildren(node) : '';
  }
}

/**
 * Serializes all child nodes in source order.
 */
function serializeChildren(node: Node): string {
  return Array.from(node.childNodes, serializeNode).join('');
}

/**
 * Serializes each range in a selection.
 */
function serializeSelection(selection: Selection): string {
  const fragments: string[] = [];
  for (let index = 0; index < selection.rangeCount; index += 1) {
    fragments.push(serializeNode(selection.getRangeAt(index).cloneContents()));
  }
  return fragments.join('');
}

/**
 * Resolves a CSS selector or element into a mount target.
 */
function resolveMountTarget(target: NizelBrowserMountTarget): Element {
  if (typeof target !== 'string') return target;
  if (typeof document === 'undefined') {
    throw new Error('nizel/browser mountMarkdown() needs a browser document when target is a selector.');
  }
  const element = document.querySelector(target);
  if (!element) throw new Error(`nizel/browser could not find mount target: ${target}`);
  return element;
}

/**
 * Returns the active selection when running in a browser.
 */
function currentSelection(): Selection | null {
  return typeof globalThis.getSelection === 'function' ? globalThis.getSelection() : null;
}

/**
 * Checks for DOM Selection-like values without relying on one browser realm.
 */
function isSelection(value: object): value is Selection {
  return 'rangeCount' in value && 'getRangeAt' in value;
}

/**
 * Checks for DOM Range-like values without relying on one browser realm.
 */
function isRange(value: object): value is Range {
  return 'cloneContents' in value && 'startContainer' in value && 'endContainer' in value;
}

/**
 * Checks for NodeList-like collections while excluding single nodes.
 */
function isNodeList(value: object): value is ArrayLike<Node> {
  return 'length' in value && !('nodeType' in value);
}

/**
 * Checks for Element-like values without requiring global Element.
 */
function isElement(value: Node): value is Element {
  return value.nodeType === 1 && 'outerHTML' in value;
}

/**
 * Escapes text and CDATA nodes before parsing as HTML.
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
