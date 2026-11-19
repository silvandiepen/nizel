import type {
  useBrowserNizel,
  NizelBrowserHtmlSource,
  NizelBrowserProcessor,
  NizelHtmlToMarkdownOptions,
} from 'nizel/browser';
import type { NizelPlugin } from 'nizel';
import type { NizelKitOptions } from './index.js';

type PluginFactory = (
  enabledPlugins: NizelKitOptions['enabledPlugins'],
  options: NizelKitOptions['pluginOptions'],
) => NizelPlugin[];

/** Configures official plugins around a browser processor factory. */
export function createKitProcessor(
  options: NizelKitOptions,
  createProcessor: typeof useBrowserNizel,
  createPlugins: PluginFactory,
): NizelBrowserProcessor {
  const { enabledPlugins, pluginOptions, plugins = [], ...nizelOptions } = options;
  const resolvedPlugins = [...createPlugins(enabledPlugins, pluginOptions), ...plugins];
  const processor = createProcessor({
    ...nizelOptions,
    plugins: resolvedPlugins,
  });

  const htmlToMarkdown = processor.htmlToMarkdown.bind(processor);
  processor.htmlToMarkdown = (source: NizelBrowserHtmlSource, reverseOptions?: NizelHtmlToMarkdownOptions) => {
    return htmlToMarkdown(source, withKitHtmlToMarkdownPlugins(reverseOptions, resolvedPlugins));
  };
  const nodeToMarkdown = processor.nodeToMarkdown.bind(processor);
  processor.nodeToMarkdown = (source: NizelBrowserHtmlSource, reverseOptions?: NizelHtmlToMarkdownOptions) => {
    return nodeToMarkdown(source, withKitHtmlToMarkdownPlugins(reverseOptions, resolvedPlugins));
  };
  const selectionToMarkdown = processor.selectionToMarkdown.bind(processor);
  processor.selectionToMarkdown = (selection?: Selection | null, reverseOptions?: NizelHtmlToMarkdownOptions) => {
    return selectionToMarkdown(selection, withKitHtmlToMarkdownPlugins(reverseOptions, resolvedPlugins));
  };

  return processor;
}

const withKitHtmlToMarkdownPlugins = (
  options: NizelHtmlToMarkdownOptions | undefined,
  plugins: NizelPlugin[],
): NizelHtmlToMarkdownOptions => {
  return {
    ...options,
    plugins: [...plugins, ...(options?.plugins ?? [])],
  };
};

