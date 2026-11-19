import { useBrowserNizel } from 'nizel/browser/wasm';
import type { NizelBrowserMountTarget, NizelBrowserProcessor } from 'nizel/browser';
import { createPlugins, type NizelKitOptions } from './index.js';
import { createKitProcessor } from './processor.js';

export * from './index.js';

/** Creates a kit processor that uses Wasm when compatible with its configuration. */
export function useNizelKit(options: NizelKitOptions = {}): NizelBrowserProcessor {
  return createKitProcessor(options, useBrowserNizel, createPlugins);
}

/** Renders Markdown using the optional Wasm kit. */
export async function markdownToHtml(markdown: string, options?: NizelKitOptions): Promise<string> {
  return useNizelKit(options).html(markdown);
}

/** Mounts Markdown rendered by the optional Wasm kit. */
export async function mountMarkdown(
  target: NizelBrowserMountTarget,
  markdown: string,
  options?: NizelKitOptions,
): Promise<Element> {
  return useNizelKit(options).mount(target, markdown);
}
