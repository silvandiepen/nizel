import type { NizelBlockDefinition, NizelPlugin } from 'nizel';

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
});

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
