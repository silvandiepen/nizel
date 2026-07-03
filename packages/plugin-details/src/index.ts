import type { NizelBlockDefinition, NizelHtmlToMarkdownHandler, NizelPlugin } from 'nizel';
import { findHtmlElement, htmlChildElements, htmlRoot } from 'nizel';

export type DetailsPluginOptions = {
  className?: string;
};

export const detailsPlugin = (options: DetailsPluginOptions = {}): NizelPlugin => ({
  name: 'details',
  blocks: {
    details: detailsBlock(options),
  },
  hooks: {
    beforeParse: transformDetails,
  },
  htmlToMarkdown: detailsToMarkdown(options),
});

/**
 * Converts rendered `<details>` blocks back into `:::details` Markdown fences.
 */
export const detailsToMarkdown = (options: DetailsPluginOptions = {}): NizelHtmlToMarkdownHandler => {
  const className = options.className ?? 'details';
  return (node, ctx) => {
    if (node.type !== 'element' || node.tag !== 'details' || node.attrs.class !== className) return undefined;
    const summaryEl = findHtmlElement(node, (el) => el.tag === 'summary');
    const summary = summaryEl ? ctx.text(summaryEl).trim() : 'Details';
    const body = ctx.block(htmlRoot(htmlChildElements(node).filter((el) => el.tag !== 'summary'))).trim();
    return body ? `::details ${summary}\n${body}\n::` : `::details ${summary}\n::`;
  };
};

export const transformDetails = (markdown: string): string => {
  return markdown
    .replace(/^:::details\s*(.*?)\s*$/gm, (_match, summary: string) => `::details ${summary || 'Details'}`)
    .replace(/^:::\s*$/gm, '::');
};

const detailsBlock = (options: DetailsPluginOptions): NizelBlockDefinition => ({
  name: 'details',
  parse({ args }) {
    return { summary: args.join(' ') || 'Details' };
  },
  formats: {
    html(node, ctx) {
      if (node.type !== 'customBlock') return '';
      const summary = (node.value as { summary?: string } | undefined)?.summary ?? 'Details';
      return `<details class="${ctx.escape(options.className ?? 'details')}"><summary>${ctx.escape(summary)}</summary>${ctx.render(node.children ?? [])}</details>`;
    },
  },
});

export default detailsPlugin;
