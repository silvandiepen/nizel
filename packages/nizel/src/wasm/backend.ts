import engineEncoded from './engine-bytes.js';
import type { NizelHtmlToMarkdownOptions } from '../html-to-markdown.js';
import type { NizelOptions, NizelPlugin, NizelRootNode } from '../types.js';
import { decodeAst } from './ast-codec.js';
import { decodeHtmlElement } from './html-codec.js';
import { createHtmlToMarkdownSession } from '../html-to-markdown.js';
import type { NizelHtmlElementNode } from '../types.js';

// The Rust engine (packages/nizel/engine): Nizel's parser, renderer and
// HTML-to-Markdown converter ported behaviour for behaviour.
type Engine = {
  memory: WebAssembly.Memory;
  input: (length: number) => number;
  output: () => number;
  render: (length: number, flags: number) => number;
  parse: (length: number, flags: number) => number;
  reverse: (length: number, flags: number) => number;
  callback: (length: number) => number;
};

/** Runs the plugin handlers on one element during a reverse conversion. */
type Claimer = (node: NizelHtmlElementNode) => string | undefined;
let activeClaimer: Claimer | undefined;

const maximumSourceLength = 1024 * 1024;
const encoder = new TextEncoder();
const decoder = new TextDecoder();
let cachedEngine: Engine | null | undefined;

/** Lazily initializes the engine and remembers unavailable runtimes. */
function getEngine(): Engine | null {
  if (cachedEngine !== undefined) return cachedEngine;
  try {
    const bytes = Uint8Array.from(atob(engineEncoded), character => character.charCodeAt(0));
    const imports = { env: { claim: (pointer: number, length: number) => claim(pointer, length) } };
    cachedEngine = new WebAssembly.Instance(new WebAssembly.Module(bytes), imports).exports as Engine;
  } catch {
    cachedEngine = null;
  }
  return cachedEngine;
}

/**
 * The engine offering an element to the handlers: decode it, run them,
 * and hand back their Markdown (-1 when none claims it, -2 to give up).
 */
function claim(pointer: number, length: number): number {
  const engine = cachedEngine;
  if (!engine || !activeClaimer) return -1;
  const node = decodeHtmlElement(new Uint8Array(engine.memory.buffer, pointer, length).slice());
  const result = activeClaimer(node);
  if (result === undefined) return -1;
  if (!isWellFormed(result)) return -2;
  const encoded = encoder.encode(result);
  const at = engine.callback(encoded.length);
  new Uint8Array(engine.memory.buffer, at, encoded.length).set(encoded);
  return encoded.length;
}

/** Copies `source` into the engine and runs `direction`; the output length, or undefined. */
function call(engine: Engine, direction: 'render' | 'parse' | 'reverse', source: string, flags: number): number | undefined {
  const capacity = source.length * 3;
  const at = engine.input(capacity);
  const { written } = encoder.encodeInto(source, new Uint8Array(engine.memory.buffer, at, capacity));
  const length = engine[direction](written, flags);
  return length < 0 ? undefined : length;
}

/** Runs one conversion; undefined when JavaScript must produce the result. */
function run(direction: 'render' | 'reverse', source: string, flags: number): string | undefined {
  if (source.length > maximumSourceLength || !isWellFormed(source)) return undefined;
  const engine = getEngine();
  if (!engine) return undefined;
  try {
    const length = call(engine, direction, source, flags);
    return length === undefined ? undefined : decoder.decode(new Uint8Array(engine.memory.buffer, engine.output(), length));
  } catch {
    return undefined;
  }
}

/**
 * Parses prepared Markdown with the engine into the AST `parseMarkdown`
 * builds, calling custom block `parse` definitions as it does. Used when
 * plugins, transforms, element rules or block renderers run in JavaScript.
 */
export function parseWasm(source: string, options: NizelOptions): NizelRootNode | undefined {
  if (source.length > maximumSourceLength || !isWellFormed(source)) return undefined;
  const engine = getEngine();
  if (!engine) return undefined;
  let bytes: Uint8Array;
  try {
    const length = call(engine, 'parse', source, renderFlags(options));
    if (length === undefined) return undefined;
    bytes = new Uint8Array(engine.memory.buffer, engine.output(), length).slice();
  } catch {
    return undefined;
  }
  const blocks = options.blocks ?? {};
  return decodeAst(bytes, (node, content) => {
    node.value = blocks[node.name]?.parse?.({ name: node.name, args: node.args, props: node.props, content });
  });
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
  // These parse with the engine (parseWasm) and render through the JavaScript renderer.
  if (options.plugins?.some(plugin => blocksRender(plugin, source)) || options.transforms?.length ||
      Object.keys(options.blocks ?? {}).length || Object.keys(options.elements ?? {}).length ||
      options.unwrapStandaloneImages || hasAutolinkAttributes(options.autolinks)) return undefined;
  return run('render', source, renderFlags(options));
}

/** Converts HTML with the engine; undefined means JavaScript converts it. */
export function reverseWasm(source: string, options?: NizelHtmlToMarkdownOptions): string | undefined {
  const flags = options?.unsupported === 'drop' ? 16 : 0;
  // Handlers only see elements they could claim; none can apply here.
  if (!options?.plugins?.some(plugin => blocksReverse(plugin, source))) return run('reverse', source, flags);

  const session = createHtmlToMarkdownSession(options);
  const { all, tags } = handlerReach(options.plugins ?? []);
  const previous = activeClaimer;
  activeClaimer = session.claim;
  try {
    const body = run('reverse', `${tags.join('\n')}\0${source}`, flags | 32 | (all ? 64 : 0));
    return body === undefined ? undefined : session.finish(body);
  } finally {
    activeClaimer = previous;
  }
}

/** The tags plugin reverse handlers may claim; `all` when one does not say. */
function handlerReach(plugins: NizelPlugin[]): { all: boolean; tags: string[] } {
  let all = false;
  const tags = new Set<string>();
  for (const plugin of plugins) {
    if (!plugin?.htmlToMarkdown) continue;
    if (!plugin.htmlToMarkdownTags) all = true;
    for (const tag of plugin.htmlToMarkdownTags ?? []) tags.add(tag);
  }
  return { all, tags: [...tags] };
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
