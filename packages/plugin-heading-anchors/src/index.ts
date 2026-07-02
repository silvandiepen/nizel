import type { NizelPlugin, NizelRootNode } from 'nizel';

export type HeadingAnchorsPluginOptions = {
  className?: string;
  label?: string;
};

export const headingAnchorsPlugin = (options: HeadingAnchorsPluginOptions = {}): NizelPlugin => ({
  name: 'heading-anchors',
  hooks: {
    afterParse(ast) {
      return addHeadingAnchors(ast, options);
    },
  },
});

export const addHeadingAnchors = (
  ast: NizelRootNode,
  options: HeadingAnchorsPluginOptions = {},
): NizelRootNode => ({
  ...ast,
  children: ast.children.map((node) => {
    if (node.type !== 'heading' || !node.id) return node;
    return {
      ...node,
      children: [
        ...node.children,
        {
          type: 'inlineHtml',
          value: `<a class="${escapeHtml(options.className ?? 'heading-anchor')}" href="#${escapeHtml(node.id)}" aria-hidden="true">${escapeHtml(options.label ?? '#')}</a>`,
        },
      ],
    };
  }),
});

const escapeHtml = (value: string): string => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export default headingAnchorsPlugin;
