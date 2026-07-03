import type {
  NizelBlockDefinition,
  NizelBlockNode,
  NizelHtmlToMarkdownHandler,
  NizelInlineNode,
  NizelPlugin,
  NizelRootNode,
} from 'nizel';

export type MathPluginOptions = {
  inlineClassName?: string;
  blockClassName?: string;
};

/**
 * Adds opt-in inline `$math$` and block `$$` math wrappers.
 */
export const mathPlugin = (options: MathPluginOptions = {}): NizelPlugin => {
  return {
    name: 'math',
    blocks: {
      math: mathBlock(options),
    },
    hooks: {
      beforeParse: transformBlockMath,
      afterParse(ast) {
        return transformInlineMath(ast, options);
      },
    },
    htmlToMarkdown: mathToMarkdown(options),
  };
};

/**
 * Converts rendered math HTML back into `$inline$` and `$$block$$` Markdown.
 */
export const mathToMarkdown = (options: MathPluginOptions = {}): NizelHtmlToMarkdownHandler => {
  const inlineTokens = (options.inlineClassName ?? 'math math-inline').split(/\s+/);
  const blockTokens = (options.blockClassName ?? 'math math-display').split(/\s+/);
  return (node, ctx) => {
    if (node.type !== 'element') return undefined;
    const tokens = node.attrs.class ? node.attrs.class.split(/\s+/) : [];
    if (node.tag === 'span' && inlineTokens.every((token) => tokens.includes(token))) {
      return `$${ctx.text(node)}$`;
    }
    if (node.tag === 'div' && blockTokens.every((token) => tokens.includes(token))) {
      return `$$\n${ctx.text(node).trim()}\n$$`;
    }
    return undefined;
  };
};

export const transformBlockMath = (markdown: string): string => {
  const lines = markdown.split('\n');
  const result: string[] = [];
  let index = 0;

  while (index < lines.length) {
    if (!/^ {0,3}\$\$\s*$/.test(lines[index])) {
      result.push(lines[index]);
      index += 1;
      continue;
    }

    const content: string[] = [];
    index += 1;
    while (index < lines.length && !/^ {0,3}\$\$\s*$/.test(lines[index])) {
      content.push(lines[index]);
      index += 1;
    }
    if (index < lines.length) index += 1;
    result.push('::math', ...content, '::');
  }

  return result.join('\n');
};

export const transformInlineMath = (ast: NizelRootNode, options: MathPluginOptions = {}): NizelRootNode => {
  return { ...ast, children: ast.children.map((node) => transformBlock(node, options)) };
};

const mathBlock = (options: MathPluginOptions): NizelBlockDefinition => ({
  name: 'math',
  parse({ content }) {
    return { code: content };
  },
  formats: {
    html(node, ctx) {
      if (node.type !== 'customBlock') return '';
      const code = (node.value as { code?: string } | undefined)?.code ?? '';
      return `<div class="${ctx.escape(options.blockClassName ?? 'math math-display')}">${ctx.escape(code)}</div>`;
    },
  },
});

const transformBlock = (node: NizelBlockNode, options: MathPluginOptions): NizelBlockNode => {
  if (node.type === 'paragraph' || node.type === 'heading') {
    return { ...node, children: transformInlineNodes(node.children, options) } as NizelBlockNode;
  }
  if (node.type === 'blockquote') return { ...node, children: node.children.map((child) => transformBlock(child, options)) };
  if (node.type === 'list') {
    return { ...node, children: node.children.map((item) => ({ ...item, children: item.children.map((child) => transformBlock(child, options)) })) };
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

const transformInlineNodes = (nodes: NizelInlineNode[], options: MathPluginOptions): NizelInlineNode[] => {
  const transformed: NizelInlineNode[] = [];
  for (const node of nodes) {
    if (node.type === 'text') transformed.push(...transformText(node.value, options));
    else if ('children' in node) transformed.push({ ...node, children: transformInlineNodes(node.children, options) } as NizelInlineNode);
    else transformed.push(node);
  }
  return transformed;
};

const transformText = (value: string, options: MathPluginOptions): NizelInlineNode[] => {
  const nodes: NizelInlineNode[] = [];
  const pattern = /(?<!\\)\$(?!\$)([^$\n]+?)(?<!\\)\$/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(value))) {
    if (match.index > lastIndex) nodes.push({ type: 'text', value: value.slice(lastIndex, match.index) });
    nodes.push({
      type: 'inlineHtml',
      value: `<span class="${escapeHtml(options.inlineClassName ?? 'math math-inline')}">${escapeHtml(match[1])}</span>`,
    });
    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < value.length) nodes.push({ type: 'text', value: value.slice(lastIndex) });
  return nodes;
};

const escapeHtml = (value: string): string => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export default mathPlugin;
