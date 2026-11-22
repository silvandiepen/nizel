import engineEncoded from './engine-bytes.js';
import type { NizelHtmlToMarkdownOptions } from '../html-to-markdown.js';
import type { NizelOptions, NizelPlugin } from '../types.js';

// The Rust engine (packages/nizel/engine): Nizel's parser, renderer and
// HTML-to-Markdown converter ported behaviour for behaviour.
type Engine = {
  memory: WebAssembly.Memory;
  input: (length: number) => number;
  output: () => number;
  render: (length: number, flags: number) => number;
  reverse: (length: number, flags: number) => number;
};

const maximumSourceLength = 1024 * 1024;
const encoder = new TextEncoder();
const decoder = new TextDecoder();
let cachedEngine: Engine | null | undefined;

/** Lazily initializes the engine and remembers unavailable runtimes. */
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

/** Runs one conversion; undefined when JavaScript must produce the result. */
function run(direction: 'render' | 'reverse', source: string, flags: number): string | undefined {
  if (source.length > maximumSourceLength || !isWellFormed(source)) return undefined;
  const engine = getEngine();
  if (!engine) return undefined;
  try {
    const capacity = source.length * 3;
    const at = engine.input(capacity);
    const { written } = encoder.encodeInto(source, new Uint8Array(engine.memory.buffer, at, capacity));
    const length = engine[direction](written, flags);
    if (length < 0) return undefined;
    return decoder.decode(new Uint8Array(engine.memory.buffer, engine.output(), length));
  } catch {
    return undefined;
  }
}

/** Option bits shared with `engine/src/lib.rs`. */
function renderFlags(options: NizelOptions): number {
  const autolinks = options.autolinks;
  const autolinksEnabled = autolinks !== false && (typeof autolinks !== 'object' || autolinks.enabled !== false);
  return (options.anchors !== false ? 1 : 0) |
    (autolinksEnabled ? 2 : 0) |
    (options.safe !== false ? 4 : 0) |
    (options.slugStyle === 'classic' ? 8 : 0);
}

/** Renders prepared Markdown with the engine; undefined means JavaScript renders it. */
export function renderWasm(source: string, options: NizelOptions): string | undefined {
  // Not ported to the engine yet: these still render in JavaScript.
  if (options.plugins?.some(plugin => blocksRender(plugin, source)) || options.transforms?.length ||
      Object.keys(options.blocks ?? {}).length || Object.keys(options.elements ?? {}).length ||
      options.unwrapStandaloneImages || hasAutolinkAttributes(options.autolinks)) return undefined;
  return run('render', source, renderFlags(options));
}

/** Converts HTML with the engine; undefined means JavaScript converts it. */
export function reverseWasm(source: string, options?: NizelHtmlToMarkdownOptions): string | undefined {
  // Reverse handlers are not ported to the engine yet.
  if (options?.plugins?.some(plugin => blocksReverse(plugin, source))) return undefined;
  return run('reverse', source, options?.unsupported === 'drop' ? 16 : 0);
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
