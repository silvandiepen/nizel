import type { NizelBlockNode, NizelInlineNode, NizelPlugin, NizelRootNode } from 'nizel';

export type TypographyPluginOptions = {
  mark?: boolean;
  subscript?: boolean;
  superscript?: boolean;
};

/**
 * Adds optional typography extensions: ==mark==, H~2~O, and x^2^.
 */
export const typographyPlugin = (options: TypographyPluginOptions = {}): NizelPlugin => {
  return {
    name: 'typography',
    hooks: {
      afterParse(ast) {
        return transformTypography(ast, options);
      },
    },
  };
};

export const transformTypography = (
  ast: NizelRootNode,
  options: TypographyPluginOptions = {},
): NizelRootNode => {
  return { ...ast, children: ast.children.map((node) => transformBlock(node, options)) };
};

const transformBlock = (node: NizelBlockNode, options: TypographyPluginOptions): NizelBlockNode => {
  if (node.type === 'paragraph' || node.type === 'heading') {
    return { ...node, children: transformInlineNodes(node.children, options) } as NizelBlockNode;
  }
  if (node.type === 'blockquote') return { ...node, children: node.children.map((child) => transformBlock(child, options)) };
  if (node.type === 'list') {
    return {
      ...node,
      children: node.children.map((item) => ({ ...item, children: item.children.map((child) => transformBlock(child, options)) })),
    };
  }
  if (node.type === 'table') {
    return {
      ...node,
      children: node.children.map((row) => ({
        ...row,
        children: row.children.map((cell) => ({ ...cell, children: transformInlineNodes(cell.children, options) })),
      })),
    };
  }
  if (node.type === 'customBlock') return { ...node, children: node.children?.map((child) => transformBlock(child, options)) };
  return node;
};

const transformInlineNodes = (nodes: NizelInlineNode[], options: TypographyPluginOptions): NizelInlineNode[] => {
  const transformed: NizelInlineNode[] = [];
  for (const node of nodes) {
    if (node.type === 'text') {
      transformed.push(...transformText(node.value, options));
    } else if ('children' in node) {
      transformed.push({ ...node, children: transformInlineNodes(node.children, options) } as NizelInlineNode);
    } else {
      transformed.push(node);
    }
  }
  return transformed;
};

const transformText = (value: string, options: TypographyPluginOptions): NizelInlineNode[] => {
  const mark = options.mark !== false;
  const subscript = options.subscript !== false;
  const superscript = options.superscript !== false;
  const nodes: NizelInlineNode[] = [];
  const pattern = /==([^=\n]+)==|(?<!~)~([^~\n]+)~(?!~)|(?<!\\)\^([^^\n]+)\^/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(value))) {
    if (match.index > lastIndex) nodes.push({ type: 'text', value: value.slice(lastIndex, match.index) });
    if (match[1] !== undefined && mark) nodes.push({ type: 'inlineHtml', value: `<mark>${escapeHtml(match[1])}</mark>` });
    else if (match[2] !== undefined && subscript) nodes.push({ type: 'inlineHtml', value: `<sub>${escapeHtml(match[2])}</sub>` });
    else if (match[3] !== undefined && superscript) nodes.push({ type: 'inlineHtml', value: `<sup>${escapeHtml(match[3])}</sup>` });
    else nodes.push({ type: 'text', value: match[0] });
    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < value.length) nodes.push({ type: 'text', value: value.slice(lastIndex) });
  return nodes;
};

const escapeHtml = (value: string): string => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export default typographyPlugin;
