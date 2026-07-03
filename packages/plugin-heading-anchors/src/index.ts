import type { NizelHtmlToMarkdownHandler, NizelPlugin, NizelRootNode } from 'nizel';
import { hasHtmlClass } from 'nizel';

export type HeadingAnchorsPluginOptions = {
  className?: string;
  label?: string;
  ariaLabel?: string;
};

export const headingAnchorsPlugin = (options: HeadingAnchorsPluginOptions = {}): NizelPlugin => ({
  name: 'heading-anchors',
  hooks: {
    afterParse(ast) {
      return addHeadingAnchors(ast, options);
    },
  },
  htmlToMarkdown: headingAnchorsToMarkdown(options),
});

/**
 * Drops rendered heading-anchor links so headings convert back to clean Markdown.
 */
export const headingAnchorsToMarkdown = (options: HeadingAnchorsPluginOptions = {}): NizelHtmlToMarkdownHandler => {
  const className = options.className ?? 'heading-anchor';
  return (node) => {
    if (node.type !== 'element' || node.tag !== 'a' || !hasHtmlClass(node, className)) return undefined;
    return '';
  };
};

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
          value: `<a class="${escapeHtml(options.className ?? 'heading-anchor')}" href="#${escapeHtml(node.id)}" aria-label="${escapeHtml(options.ariaLabel ?? 'Link to section')}">${escapeHtml(options.label ?? '')}</a>`,
        },
      ],
    };
  }),
});

const escapeHtml = (value: string): string => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export default headingAnchorsPlugin;
