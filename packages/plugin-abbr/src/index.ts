import type { NizelBlockNode, NizelHtmlToMarkdownHandler, NizelInlineNode, NizelPlugin, NizelRootNode } from 'nizel';

export type AbbrPluginOptions = {
  definitions?: Record<string, string>;
};

export const abbrPlugin = (options: AbbrPluginOptions = {}): NizelPlugin => {
  let definitions = options.definitions ?? {};

  return {
    name: 'abbr',
    hooks: {
      beforeParse(markdown) {
        const result = extractAbbreviations(markdown);
        definitions = { ...definitions, ...result.definitions };
        return result.markdown;
      },
      afterParse(ast) {
        return replaceAbbreviations(ast, definitions);
      },
    },
    htmlToMarkdown: abbrToMarkdown(),
  };
};

/**
 * Converts rendered `<abbr>` tags back to bare text, re-emitting each definition once
 * at the end of the document.
 */
export const abbrToMarkdown = (): NizelHtmlToMarkdownHandler => {
  const seen = new Set<string>();
  return (node, ctx) => {
    if (node.type !== 'element' || node.tag !== 'abbr') return undefined;
    const term = ctx.text(node).trim();
    const title = node.attrs.title;
    if (title !== undefined && term && !seen.has(term)) {
      seen.add(term);
      ctx.epilogue(`*[${term}]: ${title}`);
    }
    return term;
  };
};

export const extractAbbreviations = (markdown: string): { markdown: string; definitions: Record<string, string> } => {
  const definitions: Record<string, string> = {};
  const lines = markdown.split('\n').filter((line) => {
    const match = /^\*\[([^\]]+)\]:\s*(.+)$/.exec(line);
    if (!match) return true;
    definitions[match[1]] = match[2];
    return false;
  });
  return { markdown: lines.join('\n'), definitions };
};

export const replaceAbbreviations = (ast: NizelRootNode, definitions: Record<string, string>): NizelRootNode => ({
  ...ast,
  children: ast.children.map((node) => transformBlock(node, definitions)),
});

const transformBlock = (node: NizelBlockNode, definitions: Record<string, string>): NizelBlockNode => {
  if (node.type === 'paragraph' || node.type === 'heading') return { ...node, children: transformInline(node.children, definitions) } as NizelBlockNode;
  if (node.type === 'blockquote') return { ...node, children: node.children.map((child) => transformBlock(child, definitions)) };
  if (node.type === 'list') return { ...node, children: node.children.map((item) => ({ ...item, children: item.children.map((child) => transformBlock(child, definitions)) })) };
  if (node.type === 'customBlock') return { ...node, children: node.children?.map((child) => transformBlock(child, definitions)) };
  return node;
};

const transformInline = (nodes: NizelInlineNode[], definitions: Record<string, string>): NizelInlineNode[] => {
  return nodes.flatMap((node) => {
    if (node.type === 'text') return replaceText(node.value, definitions);
    if ('children' in node) return [{ ...node, children: transformInline(node.children, definitions) } as NizelInlineNode];
    return [node];
  });
};

const replaceText = (value: string, definitions: Record<string, string>): NizelInlineNode[] => {
  const terms = Object.keys(definitions).sort((a, b) => b.length - a.length);
  if (terms.length === 0) return [{ type: 'text', value }];
  const pattern = new RegExp(`\\b(${terms.map(escapeRegExp).join('|')})\\b`, 'g');
  const nodes: NizelInlineNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(value))) {
    if (match.index > lastIndex) nodes.push({ type: 'text', value: value.slice(lastIndex, match.index) });
    nodes.push({ type: 'inlineHtml', value: `<abbr title="${escapeHtml(definitions[match[1]])}">${escapeHtml(match[1])}</abbr>` });
    lastIndex = pattern.lastIndex;
  }
  if (lastIndex < value.length) nodes.push({ type: 'text', value: value.slice(lastIndex) });
  return nodes;
};

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const escapeHtml = (value: string): string => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export default abbrPlugin;
