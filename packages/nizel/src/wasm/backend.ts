import encoded from './bytes.js';
import engineEncoded from './engine-bytes.js';
import type { NizelHtmlToMarkdownOptions } from '../html-to-markdown.js';
import type { NizelOptions, NizelPlugin } from '../types.js';

type Convert = (source: number, length: number, destination: number, anchors: number) => number;
type Renderer = { memory: WebAssembly.Memory; render: Convert; reverse: Convert };

// Leaves room for AssemblyScript's static data and the heading ID scratch table.
const inputAddress = 16384;
const maximumSourceLength = 1024 * 1024;
const pageSize = 65536;
const unsupportedHtml = /<(?:a|div|img|ol|pre|span|table|ul)(?:[ >])/;
let cachedRenderer: Renderer | null | undefined;

/** Lazily initializes the optional backend and remembers unavailable runtimes. */
function getRenderer(): Renderer | null {
  if (cachedRenderer !== undefined) return cachedRenderer;
  try {
    const bytes = Uint8Array.from(atob(encoded), character => character.charCodeAt(0));
    const module = new WebAssembly.Module(bytes);
    cachedRenderer = new WebAssembly.Instance(module).exports as Renderer;
  } catch {
    cachedRenderer = null;
  }
  return cachedRenderer;
}

/** Transfers one bounded document through Wasm and returns undefined on fallback. */
function convert(source: string, direction: 'render' | 'reverse', anchors = false): string | undefined {
  if (source.length > maximumSourceLength) return undefined;
  const renderer = getRenderer();
  if (!renderer) return undefined;
  try {
    const destination = inputAddress + source.length * 3;
    const outputCapacity = source.length * 12 + 16;
    const required = destination + outputCapacity;
    const extra = required - renderer.memory.buffer.byteLength;
    if (extra > 0) renderer.memory.grow(Math.ceil(extra / pageSize));
    const input = new Uint8Array(renderer.memory.buffer, inputAddress, source.length * 3);
    const { written } = encoder.encodeInto(source, input);
    const length = renderer[direction](inputAddress, written, destination, anchors ? 1 : 0);
    if (length < 0 || length > outputCapacity) return undefined;
    return decoder.decode(new Uint8Array(renderer.memory.buffer, destination, length));
  } catch {
    return undefined;
  }
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

type Engine = {
  memory: WebAssembly.Memory;
  input: (length: number) => number;
  output: () => number;
  render: (length: number, flags: number) => number;
};
let cachedEngine: Engine | null | undefined;

/** Lazily initializes the Rust engine and remembers unavailable runtimes. */
function getEngine(): Engine | null {
  if (cachedEngine !== undefined) return cachedEngine;
  try {
    const bytes = Uint8Array.from(atob(engineEncoded), character => character.charCodeAt(0));
    cachedEngine = new WebAssembly.Instance(new WebAssembly.Module(bytes)).exports as Engine;
  } catch {
    cachedEngine = null;
  }
  return cachedEngine;
}

/** Option bits shared with `engine/src/lib.rs`. */
function engineFlags(options: NizelOptions): number {
  const autolinks = options.autolinks;
  const autolinksEnabled = autolinks !== false && (typeof autolinks !== 'object' || autolinks.enabled !== false);
  return (options.anchors !== false ? 1 : 0) |
    (autolinksEnabled ? 2 : 0) |
    (options.safe !== false ? 4 : 0) |
    (options.slugStyle === 'classic' ? 8 : 0);
}

/** Renders prepared Markdown with the Rust engine; undefined means JavaScript renders it. */
export function renderWasm(source: string, options: NizelOptions): string | undefined {
  // Not ported to the engine yet: these still render in JavaScript.
  if (options.plugins?.some(plugin => blocksRender(plugin, source)) || options.transforms?.length ||
      Object.keys(options.blocks ?? {}).length || Object.keys(options.elements ?? {}).length ||
      options.unwrapStandaloneImages || hasAutolinkAttributes(options.autolinks) ||
      source.length > maximumSourceLength || !isWellFormed(source)) return undefined;
  const engine = getEngine();
  if (!engine) return undefined;
  try {
    const at = engine.input(source.length * 3);
    const { written } = encoder.encodeInto(source, new Uint8Array(engine.memory.buffer, at, source.length * 3));
    const length = engine.render(written, engineFlags(options));
    if (length < 0) return undefined;
    return decoder.decode(new Uint8Array(engine.memory.buffer, engine.output(), length));
  } catch {
    return undefined;
  }
}

/** `withAutolinkElements` adds an `a` element rule for these. */
function hasAutolinkAttributes(autolinks: NizelOptions['autolinks']): boolean {
  return typeof autolinks === 'object' && autolinks !== null && Boolean(autolinks.target || autolinks.rel);
}

/** Lone surrogates cannot cross into the engine as UTF-8. */
function isWellFormed(source: string): boolean {
  const check = (source as string & { isWellFormed?: () => boolean }).isWellFormed;
  return check ? check.call(source) : !/[\uD800-\uDFFF]/.test(source.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, ''));
}

/** Converts supported semantic HTML while leaving plugin handlers to JavaScript. */
export function reverseWasm(source: string, options?: NizelHtmlToMarkdownOptions): string | undefined {
  if (unsupportedHtml.test(source) || options?.plugins?.some(plugin => blocksReverse(plugin, source))) return undefined;
  return convert(source, 'reverse');
}

/** An `afterParse` hook blocks Wasm unless its plugin says it cannot apply to this source. */
function blocksRender(plugin: NizelPlugin, source: string): boolean {
  if (!plugin.hooks?.afterParse) return false;
  return plugin.afterParseApplies?.(source) ?? true;
}

/** A reverse handler blocks Wasm unless its plugin names its tags and none occur in the HTML. */
function blocksReverse(plugin: NizelPlugin, source: string): boolean {
  if (!plugin.htmlToMarkdown) return false;
  const tags = plugin.htmlToMarkdownTags;
  if (!tags) return true;
  return tags.some(tag => new RegExp('<' + tag + '[\\s/>]', 'i').test(source));
}
