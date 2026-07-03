import { defineNizelPlugin, type NizelAutolinkOptions, type NizelHtmlToMarkdownHandler, type NizelPlugin } from 'nizel';

export type AutolinkPluginOptions = NizelAutolinkOptions;

/**
 * Normalizes autolink plugin options for Nizel's core autolink configuration.
 */
export const resolveAutolinkPluginOptions = (
  options: AutolinkPluginOptions = {},
): Required<Pick<NizelAutolinkOptions, 'enabled'>> & Omit<NizelAutolinkOptions, 'enabled'> => {
  return {
    enabled: options.enabled ?? true,
    target: options.target,
    rel: options.rel,
  };
};

/**
 * Creates a plugin that configures Nizel's built-in bare URL and email autolink behavior.
 */
export const autolinkPlugin = (options: AutolinkPluginOptions = {}): NizelPlugin => {
  return defineNizelPlugin({
    name: 'autolink',
    options: {
      autolinks: resolveAutolinkPluginOptions(options),
    },
    htmlToMarkdown: autolinkToMarkdown(),
  });
};

/**
 * Converts autolinked anchors (where the text equals the URL) back to a bare URL,
 * dropping any `target`/`rel` attributes that Markdown cannot carry.
 */
export const autolinkToMarkdown = (): NizelHtmlToMarkdownHandler => (node, ctx) => {
  if (node.type !== 'element' || node.tag !== 'a') return undefined;
  const href = node.attrs.href;
  if (!href) return undefined;
  const extras = Object.keys(node.attrs).filter((key) => key !== 'href' && key !== 'target' && key !== 'rel');
  if (extras.length > 0) return undefined;
  return ctx.text(node).trim() === href ? href : undefined;
};

export default autolinkPlugin;
