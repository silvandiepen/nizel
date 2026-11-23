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
  markers: () => number;
  set_marker_base: (base: number) => void;
  thrown_code_point: () => number;
};

const needsJavaScriptStatus = -3;
const throwsStatus = -4;
const mappedSurrogatesFlag = 128;
const loneSurrogates = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g;
/** The Private Use blocks lone surrogates can travel in, each 2048 characters. */
const markerBlocks = [0xe000, 0xe800, 0xf000];
const blockPatterns = markerBlocks.map(base => new RegExp(`[\\u${base.toString(16)}-\\u${(base + 0x7ff).toString(16)}]`));

/** A lone surrogate unit travels as `base` + (unit - 0xD800): neither is whitespace, punctuation or a letter, both are one unit. */
function markerMapper(base: number): (unit: string) => string {
  return unit => String.fromCharCode(base + unit.charCodeAt(0) - 0xd800);
}

/** Does UTF-8 `bytes` hold a character of the block at `base`? (One lead byte, 32 second bytes.) */
function bytesHaveMarker(bytes: Uint8Array, base: number): boolean {
  const lead = 0xe0 | (base >> 12);
  const low = 0x80 | ((base >> 6) & 0x3f);
  for (let index = bytes.indexOf(lead); index !== -1; index = bytes.indexOf(lead, index + 1)) {
    if (bytes[index + 1] >= low && bytes[index + 1] <= low + 0x1f) return true;
  }
  return false;
}

/** The inverse of `markerMapper`, as a replacement over the whole block. */
function restoreMarkers(text: string, base: number): string {
  const block = blockPatterns[markerBlocks.indexOf(base)];
  return text.replace(new RegExp(block.source, 'g'), marker => String.fromCharCode(0xd800 + marker.charCodeAt(0) - base));
}

/** Runs the plugin handlers on one element during a reverse conversion. */
type Claimer = (node: NizelHtmlElementNode) => string | undefined;
let activeClaimer: Claimer | undefined;
/** The source being converted, for its marker block. */
let activeSource: PreparedSource | undefined;
/** A handler threw during a claim: rethrown once the engine has returned, never through its frames. */
class HandlerThrew {
  constructor(readonly error: unknown) {}
}
let handlerThrew: HandlerThrew | undefined;

const maximumSourceLength = 1024 * 1024;
const encoder = new TextEncoder();
const decoder = new TextDecoder();
let cachedEngine: Engine | null | undefined;

/**
 * The engine's bytes from base64: natively where the runtime has it (Safari
 * 18.2+), else one pass over `atob`'s output. (A per-byte callback, as in
 * `Uint8Array.from(text, mapper)`, made this most of the cold start.)
 */
function decodeBase64(encoded: string): Uint8Array<ArrayBuffer> {
  const native = (Uint8Array as unknown as { fromBase64?: (text: string) => Uint8Array<ArrayBuffer> }).fromBase64;
  if (native) return native(encoded);
  const text = atob(encoded);
  const bytes = new Uint8Array(text.length);
  for (let index = 0; index < text.length; index += 1) bytes[index] = text.charCodeAt(index);
  return bytes;
}

/** Lazily initializes the engine and remembers unavailable runtimes. */
function getEngine(): Engine | null {
  if (cachedEngine !== undefined) return cachedEngine;
  try {
    const bytes = decodeBase64(engineEncoded);
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
  const bytes = new Uint8Array(engine.memory.buffer, pointer, length).slice();
  const prepared = activeSource;
  // With mapped surrogates every marker is one; otherwise a marker here could be a real character or a decoded surrogate entity.
  const mapped = prepared?.mapped === true;
  const node = decodeHtmlElement(bytes, mapped ? text => restoreMarkers(text, prepared.base) : undefined);
  if (handlerThrew || (!mapped && prepared && bytesHaveMarker(bytes, prepared.base))) return -2;
  let result: string | undefined;
  try {
    result = activeClaimer(node);
  } catch (error) {
    // The JavaScript stops at this throw; the engine gives up and the host throws it.
    handlerThrew = new HandlerThrew(error);
    return -2;
  }
  if (result === undefined) return -1;
  if (!isWellFormed(result)) {
    if (!mapped) return -2;
    result = result.replace(loneSurrogates, markerMapper(prepared.base));
  }
  const encoded = encoder.encode(result);
  const at = engine.callback(encoded.length);
  new Uint8Array(engine.memory.buffer, at, encoded.length).set(encoded);
  return encoded.length;
}

/** Copies `source` into the engine and runs `direction`; the output length, or a negative status. */
function call(engine: Engine, direction: 'render' | 'parse' | 'reverse', source: string, flags: number): number {
  const capacity = source.length * 3;
  const at = engine.input(capacity);
  const { written } = encoder.encodeInto(source, new Uint8Array(engine.memory.buffer, at, capacity));
  const length = engine[direction](written, flags);
  if (length === throwsStatus) throw new EngineThrows(engine.thrown_code_point());
  return length;
}

/** The engine reached input the JavaScript throws on; `codePoint` is what it throws for. */
class EngineThrows {
  constructor(readonly codePoint: number) {}
}

/** The source as the engine takes it, with the marker block lone surrogates travel in. */
interface PreparedSource {
  text: string;
  mapped: boolean;
  base: number;
}

/**
 * The ways the source can cross, in order: a well-formed source as it is
 * (markers, from surrogate entities, in the first block), then each Private
 * Use block the source doesn't use, its lone surrogates mapped to markers
 * there. An entity that decodes into the block is caught by the engine,
 * which then asks for the next one.
 */
function* prepareSource(source: string): Generator<PreparedSource> {
  if (source.length > maximumSourceLength) return;
  const wellFormed = isWellFormed(source);
  if (wellFormed) yield { text: source, mapped: false, base: markerBlocks[0] };
  for (const [index, base] of markerBlocks.entries()) {
    if ((wellFormed && index === 0) || blockPatterns[index].test(source)) continue;
    yield wellFormed ? { text: source, mapped: false, base } : { text: source.replace(loneSurrogates, markerMapper(base)), mapped: true, base };
  }
}

/**
 * Runs `direction` on the prepared source; `read` takes the output (memory
 * offset and length) before the next call, and `attempt` runs before each
 * try. Undefined when JavaScript must produce the result; where the
 * JavaScript throws, throws what it throws.
 */
function run<T>(
  direction: 'render' | 'parse' | 'reverse',
  source: string,
  flags: number,
  read: (engine: Engine, length: number, prepared: PreparedSource) => T,
  attempt?: () => void,
): T | undefined {
  const engine = getEngine();
  if (!engine) return undefined;
  let thrown: EngineThrows | undefined;
  try {
    // On a marker conflict the engine asks for JavaScript; try the next block.
    for (const prepared of prepareSource(source)) {
      attempt?.();
      engine.set_marker_base(prepared.base);
      const previous = activeSource;
      activeSource = prepared;
      let length: number;
      try {
        length = call(engine, direction, prepared.text, flags | (prepared.mapped ? mappedSurrogatesFlag : 0));
      } finally {
        activeSource = previous;
      }
      if (handlerThrew) {
        const threw = handlerThrew;
        handlerThrew = undefined;
        throw threw;
      }
      if (length >= 0) return read(engine, length, prepared);
      if (length !== needsJavaScriptStatus) return undefined;
    }
    return undefined;
  } catch (error) {
    if (error instanceof HandlerThrew) throw error.error;
    if (!(error instanceof EngineThrows)) {
      // A trap leaves the instance's state undefined: start the next call on a fresh one.
      cachedEngine = undefined;
      return undefined;
    }
    thrown = error;
  }
  // Where the JavaScript throws, throw exactly what this host throws for it.
  String.fromCodePoint(thrown.codePoint);
  return undefined;
}

/** Runs a text conversion; undefined when JavaScript must produce the result. */
function runText(direction: 'render' | 'reverse', source: string, flags: number, attempt?: () => void): string | undefined {
  return run(direction, source, flags, (engine, length, prepared) => {
    const output = decoder.decode(new Uint8Array(engine.memory.buffer, engine.output(), length));
    const markersAreSurrogates = direction === 'reverse' ? engine.markers() === 1 : prepared.mapped;
    return markersAreSurrogates ? restoreMarkers(output, prepared.base) : output;
  }, attempt);
}

/**
 * Parses prepared Markdown with the engine into the AST `parseMarkdown`
 * builds, calling custom block `parse` definitions as it does. Used when
 * plugins, transforms, element rules or block renderers run in JavaScript.
 */
export function parseWasm(source: string, options: NizelOptions): NizelRootNode | undefined {
  const result = run('parse', source, renderFlags(options), (engine, length, prepared) => ({
    bytes: new Uint8Array(engine.memory.buffer, engine.output(), length).slice(),
    prepared,
  }));
  if (!result) return undefined;
  const { bytes, prepared } = result;
  const blocks = options.blocks ?? {};
  return decodeAst(
    bytes,
    (node, content) => {
      node.value = blocks[node.name]?.parse?.({ name: node.name, args: node.args, props: node.props, content });
    },
    prepared.mapped ? text => restoreMarkers(text, prepared.base) : undefined,
  );
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
  return runText('render', source, renderFlags(options));
}

/** Converts HTML with the engine; undefined means JavaScript converts it. */
export function reverseWasm(source: string, options?: NizelHtmlToMarkdownOptions): string | undefined {
  const flags = options?.unsupported === 'drop' ? 16 : 0;
  // Handlers only see elements they could claim; none can apply here.
  if (!options?.plugins?.some(plugin => blocksReverse(plugin, source))) return runText('reverse', source, flags);

  const { all, tags } = handlerReach(options.plugins ?? []);
  const previous = activeClaimer;
  let session: ReturnType<typeof createHtmlToMarkdownSession> | undefined;
  /** Each try starts a fresh session, so a retry doesn't repeat epilogue entries. */
  const attempt = () => {
    session = createHtmlToMarkdownSession(options);
    activeClaimer = session.claim;
  };
  try {
    const body = runText('reverse', `${tags.join('\n')}\0${source}`, flags | 32 | (all ? 64 : 0), attempt);
    return body === undefined || !session ? undefined : session.finish(body);
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
