import {
  useBrowserNizel,
  type NizelBrowserHtmlSource,
  type NizelBrowserMountTarget,
  type NizelBrowserProcessor,
  type NizelHtmlToMarkdownOptions,
} from 'nizel/browser';
import type { NizelOptions, NizelPlugin } from 'nizel';
import { abbrPlugin, type AbbrPluginOptions } from 'nizel-plugin-abbr';
import { alertPlugin, type AlertPluginOptions } from 'nizel-plugin-alert';
import { autolinkPlugin, type AutolinkPluginOptions } from 'nizel-plugin-autolink';
import { codeCopyPlugin, type CodeCopyPluginOptions } from 'nizel-plugin-code-copy';
import { citationsPlugin, type CitationsPluginOptions } from 'nizel-plugin-citations';
import { deflistPlugin, type DeflistPluginOptions } from 'nizel-plugin-deflist';
import { detailsPlugin, type DetailsPluginOptions } from 'nizel-plugin-details';
import { diagramsPlugin, type DiagramsPluginOptions } from 'nizel-plugin-diagrams';
import { emojiPlugin, type EmojiPluginOptions } from 'nizel-plugin-emoji';
import { footnotesPlugin, type FootnotesPluginOptions } from 'nizel-plugin-footnotes';
import { frontmatterUiPlugin, type FrontmatterUiPluginOptions } from 'nizel-plugin-frontmatter-ui';
import { gfmPlugins, type GfmPluginOptions } from 'nizel-plugin-gfm';
import { headingAnchorsPlugin, type HeadingAnchorsPluginOptions } from 'nizel-plugin-heading-anchors';
import { hiddenCommentsPlugin, type HiddenCommentsPluginOptions } from 'nizel-plugin-hidden-comments';
import { mathPlugin, type MathPluginOptions } from 'nizel-plugin-math';
import { mediaPlugin, type MediaPluginOptions } from 'nizel-plugin-media';
import { sanitizePlugin, type SanitizePluginOptions } from 'nizel-plugin-sanitize';
import { shikiPlugin, type ShikiPluginOptions } from 'nizel-plugin-shiki';
import { taskListPlugin, type TaskListPluginOptions } from 'nizel-plugin-task-list';
import { tocPlugin, type TocPluginOptions } from 'nizel-plugin-toc';
import { typographyPlugin, type TypographyPluginOptions } from 'nizel-plugin-typography';

export type NizelKitPluginId =
  | 'abbr'
  | 'alert'
  | 'autolink'
  | 'citations'
  | 'code-copy'
  | 'deflist'
  | 'details'
  | 'diagrams'
  | 'emoji'
  | 'footnotes'
  | 'frontmatter-ui'
  | 'gfm'
  | 'heading-anchors'
  | 'hidden-comments'
  | 'math'
  | 'media'
  | 'sanitize'
  | 'shiki'
  | 'task-list'
  | 'toc'
  | 'typography';

export type NizelKitPluginMeta = {
  id: NizelKitPluginId;
  label: string;
  description: string;
  defaultEnabled: boolean;
  category: 'core-behavior' | 'inline' | 'block' | 'code';
  exclusiveGroup?: string;
};

export type NizelKitPluginOptions = {
  abbr?: AbbrPluginOptions;
  alert?: AlertPluginOptions;
  autolink?: AutolinkPluginOptions;
  citations?: CitationsPluginOptions;
  'code-copy'?: CodeCopyPluginOptions;
  deflist?: DeflistPluginOptions;
  details?: DetailsPluginOptions;
  diagrams?: DiagramsPluginOptions;
  emoji?: EmojiPluginOptions;
  footnotes?: FootnotesPluginOptions;
  'frontmatter-ui'?: FrontmatterUiPluginOptions;
  gfm?: GfmPluginOptions;
  'heading-anchors'?: HeadingAnchorsPluginOptions;
  'hidden-comments'?: HiddenCommentsPluginOptions;
  math?: MathPluginOptions;
  media?: MediaPluginOptions;
  sanitize?: SanitizePluginOptions;
  shiki?: ShikiPluginOptions;
  'task-list'?: TaskListPluginOptions;
  toc?: TocPluginOptions;
  typography?: TypographyPluginOptions;
};

export type NizelKitOptions = NizelOptions & {
  enabledPlugins?: NizelKitPluginId[];
  pluginOptions?: NizelKitPluginOptions;
};

export const supportedPlugins: NizelKitPluginMeta[] = [
  {
    id: 'sanitize',
    label: 'Sanitize Output',
    description: 'Remove risky HTML from rendered output.',
    defaultEnabled: true,
    category: 'core-behavior',
  },
  {
    id: 'autolink',
    label: 'Autolinks',
    description: 'Configure bare URL and email autolinking.',
    defaultEnabled: true,
    category: 'core-behavior',
  },
  {
    id: 'gfm',
    label: 'GFM Preset',
    description: 'Enable the GFM-oriented companion plugin set.',
    defaultEnabled: false,
    category: 'core-behavior',
  },
  {
    id: 'emoji',
    label: 'Emoji Shortcodes',
    description: 'Replace :name: emoji shortcodes outside code.',
    defaultEnabled: false,
    category: 'inline',
  },
  {
    id: 'abbr',
    label: 'Abbreviations',
    description: 'Render abbreviation definitions as abbr elements.',
    defaultEnabled: false,
    category: 'inline',
  },
  {
    id: 'citations',
    label: 'Citations',
    description: 'Render simple citation references and bibliography entries.',
    defaultEnabled: false,
    category: 'inline',
  },
  {
    id: 'alert',
    label: 'Alerts',
    description: 'Render GitHub-style [!NOTE] callouts and alert custom blocks.',
    defaultEnabled: false,
    category: 'block',
  },
  {
    id: 'details',
    label: 'Details',
    description: 'Render disclosure blocks.',
    defaultEnabled: false,
    category: 'block',
  },
  {
    id: 'deflist',
    label: 'Definition Lists',
    description: 'Render Term / : Definition blocks.',
    defaultEnabled: false,
    category: 'block',
  },
  {
    id: 'frontmatter-ui',
    label: 'Frontmatter UI',
    description: 'Render metadata helper UI blocks.',
    defaultEnabled: false,
    category: 'block',
  },
  {
    id: 'heading-anchors',
    label: 'Heading Anchors',
    description: 'Add visible anchor links to headings.',
    defaultEnabled: false,
    category: 'block',
  },
  {
    id: 'hidden-comments',
    label: 'Hidden Comments',
    description: 'Control how Markdown HTML comments render in documents.',
    defaultEnabled: false,
    category: 'core-behavior',
  },
  {
    id: 'media',
    label: 'Media',
    description: 'Enhance standalone images as native-friendly figures.',
    defaultEnabled: false,
    category: 'block',
  },
  {
    id: 'toc',
    label: 'Table of Contents',
    description: 'Render [[toc]] from document headings.',
    defaultEnabled: false,
    category: 'block',
  },
  {
    id: 'task-list',
    label: 'Task Lists',
    description: 'Render parsed task-list items as view-only or editable checkboxes.',
    defaultEnabled: false,
    category: 'block',
  },
  {
    id: 'footnotes',
    label: 'Footnotes',
    description: 'Render [^id] references and definitions.',
    defaultEnabled: false,
    category: 'block',
  },
  {
    id: 'math',
    label: 'Math',
    description: 'Wrap inline $math$ and display $$ math for KaTeX or MathJax.',
    defaultEnabled: false,
    category: 'inline',
  },
  {
    id: 'typography',
    label: 'Typography',
    description: 'Render ==mark==, subscript, and superscript extensions.',
    defaultEnabled: false,
    category: 'inline',
  },
  {
    id: 'diagrams',
    label: 'Diagrams',
    description: 'Render explicit Mermaid code fences as diagram containers.',
    defaultEnabled: false,
    category: 'code',
  },
  {
    id: 'shiki',
    label: 'Code Highlighting',
    description: 'Use a supplied Shiki-compatible highlighter for code blocks.',
    defaultEnabled: false,
    category: 'code',
  },
  {
    id: 'code-copy',
    label: 'Code Copy',
    description: 'Render code blocks with copy button markup.',
    defaultEnabled: false,
    category: 'code',
  },
];

const factories: Record<NizelKitPluginId, (options: NizelKitPluginOptions) => NizelPlugin | NizelPlugin[]> = {
  abbr: (options) => abbrPlugin(options.abbr),
  alert: (options) => alertPlugin(options.alert),
  autolink: (options) => autolinkPlugin(options.autolink),
  citations: (options) => citationsPlugin(options.citations),
  'code-copy': (options) => codeCopyPlugin(options['code-copy']),
  deflist: (options) => deflistPlugin(options.deflist),
  details: (options) => detailsPlugin(options.details),
  diagrams: (options) => diagramsPlugin(options.diagrams),
  emoji: (options) => emojiPlugin(options.emoji),
  footnotes: (options) => footnotesPlugin(options.footnotes),
  'frontmatter-ui': (options) => frontmatterUiPlugin(options['frontmatter-ui']),
  gfm: (options) => gfmPlugins(options.gfm),
  'heading-anchors': (options) => headingAnchorsPlugin(options['heading-anchors']),
  'hidden-comments': (options) => hiddenCommentsPlugin(options['hidden-comments']),
  math: (options) => mathPlugin(options.math),
  media: (options) => mediaPlugin(options.media),
  sanitize: (options) => sanitizePlugin(options.sanitize),
  shiki: (options) => shikiPlugin(options.shiki),
  'task-list': (options) => taskListPlugin(options['task-list']),
  toc: (options) => tocPlugin(options.toc),
  typography: (options) => typographyPlugin(options.typography),
};

/**
 * Returns the default enabled plugin identifiers for UI initialization.
 */
export const defaultEnabledPlugins = (): NizelKitPluginId[] => {
  return supportedPlugins.filter((plugin) => plugin.defaultEnabled).map((plugin) => plugin.id);
};

/**
 * Creates official Nizel plugins from native-app friendly plugin IDs.
 */
export const createPlugins = (
  enabledPlugins: NizelKitPluginId[] = defaultEnabledPlugins(),
  options: NizelKitPluginOptions = {},
): NizelPlugin[] => {
  return normalizeEnabledPlugins(enabledPlugins).flatMap((id) => factories[id](options));
};

/**
 * Creates a browser/WebView processor with selected official plugins.
 */
export function useNizelKit(options: NizelKitOptions = {}): NizelBrowserProcessor {
  const { enabledPlugins, pluginOptions, plugins = [], ...nizelOptions } = options;
  const resolvedPlugins = [...createPlugins(enabledPlugins, pluginOptions), ...plugins];
  const processor = useBrowserNizel({
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

/**
 * Renders Markdown to HTML using selected official plugins.
 */
export async function markdownToHtml(markdown: string, options?: NizelKitOptions): Promise<string> {
  return useNizelKit(options).html(markdown);
}

/**
 * Renders Markdown into a DOM element using selected official plugins.
 */
export async function mountMarkdown(
  target: NizelBrowserMountTarget,
  markdown: string,
  options?: NizelKitOptions,
): Promise<Element> {
  return useNizelKit(options).mount(target, markdown);
}

/**
 * Removes unknown IDs and keeps only the last plugin in each exclusive group.
 */
export const normalizeEnabledPlugins = (enabledPlugins: NizelKitPluginId[]): NizelKitPluginId[] => {
  const validIds = new Set(supportedPlugins.map((plugin) => plugin.id));
  const exclusiveGroups = new Map<string, NizelKitPluginId>();
  const normalized: NizelKitPluginId[] = [];

  for (const id of enabledPlugins) {
    if (!validIds.has(id)) continue;
    const meta = supportedPlugins.find((plugin) => plugin.id === id);
    if (meta?.exclusiveGroup) {
      exclusiveGroups.set(meta.exclusiveGroup, id);
      continue;
    }
    if (!normalized.includes(id)) normalized.push(id);
  }

  for (const id of exclusiveGroups.values()) {
    if (!normalized.includes(id)) normalized.push(id);
  }

  return normalized;
};
