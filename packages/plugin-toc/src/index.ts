import type { NizelBlockDefinition, NizelHeadingNode, NizelHtmlToMarkdownHandler, NizelPlugin, NizelRootNode } from 'nizel';
import { hasHtmlClass } from 'nizel';

export type TocPluginOptions = {
  className?: string;
  minDepth?: number;
  maxDepth?: number;
};

type TocValue = {
  items: Array<{ id: string; text: string; depth: number }>;
};

export const tocPlugin = (options: TocPluginOptions = {}): NizelPlugin => ({
  name: 'toc',
  blocks: {
    toc: tocBlock(options),
  },
  hooks: {
    beforeParse(markdown) {
      return markdown.replace(/^\[\[toc\]\]\s*$/gim, '::toc\n::');
    },
    afterParse(ast) {
      return fillTocBlocks(ast, options);
    },
  },
  htmlToMarkdown: tocToMarkdown(options),
});

/**
 * Converts a rendered table-of-contents nav back into the `[[toc]]` marker.
 */
export const tocToMarkdown = (options: TocPluginOptions = {}): NizelHtmlToMarkdownHandler => {
  const className = options.className ?? 'toc';
  return (node) => {
    if (node.type !== 'element' || node.tag !== 'nav' || !hasHtmlClass(node, className)) return undefined;
    return '[[toc]]';
  };
};

export const fillTocBlocks = (ast: NizelRootNode, options: TocPluginOptions = {}): NizelRootNode => {
  const minDepth = options.minDepth ?? 2;
  const maxDepth = options.maxDepth ?? 6;
  const headings = ast.children
    .filter((node): node is NizelHeadingNode => node.type === 'heading' && Boolean(node.id))
    .filter((node) => node.depth >= minDepth && node.depth <= maxDepth)
    .map((node) => ({ id: node.id ?? '', text: node.text, depth: node.depth }));

  return {
    ...ast,
    children: ast.children.map((node) => node.type === 'customBlock' && node.name === 'toc'
      ? { ...node, value: { items: headings } satisfies TocValue }
      : node),
  };
};

const tocBlock = (options: TocPluginOptions): NizelBlockDefinition => ({
  name: 'toc',
  parse() {
    return { items: [] } satisfies TocValue;
  },
  formats: {
    html(node, ctx) {
      if (node.type !== 'customBlock') return '';
      const items = (node.value as TocValue | undefined)?.items ?? [];
      const body = items
        .map((item) => `<li data-depth="${item.depth}"><a href="#${ctx.escape(item.id)}">${ctx.escape(item.text)}</a></li>`)
        .join('');
      return `<nav class="${ctx.escape(options.className ?? 'toc')}"><ol>${body}</ol></nav>`;
    },
  },
});

export default tocPlugin;
