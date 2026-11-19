import encoded from './bytes.js';
import type { NizelHtmlToMarkdownOptions } from '../html-to-markdown.js';
import type { NizelOptions } from '../types.js';

type Convert = (source: number, length: number, destination: number, anchors: number) => number;
type Renderer = { memory: WebAssembly.Memory; render: Convert; reverse: Convert };

// Leaves room for AssemblyScript's static data and the heading ID scratch table.
const inputAddress = 16384;
const maximumSourceLength = 1024 * 1024;
const pageSize = 65536;
const unsupportedMarkdown = /[^A-Za-z0-9 .,!?'"\x60*#\n-]/;
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

/** Renders supported prepared Markdown without changing any plugin or AST semantics. */
export function renderWasm(source: string, options: NizelOptions): string | undefined {
  if (options.plugins?.some(plugin => !!plugin.hooks?.afterParse) || options.transforms?.length ||
      Object.keys(options.blocks ?? {}).length || Object.keys(options.elements ?? {}).length ||
      options.unwrapStandaloneImages || (options.slugStyle !== undefined && options.slugStyle !== 'github') ||
      unsupportedMarkdown.test(source)) return undefined;
  return convert(source, 'render', options.anchors !== false);
}

/** Converts supported semantic HTML while leaving plugin handlers to JavaScript. */
export function reverseWasm(source: string, options?: NizelHtmlToMarkdownOptions): string | undefined {
  if (options?.plugins?.some(plugin => !!plugin.htmlToMarkdown) || unsupportedHtml.test(source)) return undefined;
  return convert(source, 'reverse');
}
