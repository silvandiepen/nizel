import type { NizelBlockDefinition, NizelBlockNode, NizelPlugin, NizelRootNode } from 'nizel';

export type DiagramsPluginOptions = {
  mermaid?: boolean;
  className?: string;
};

type DiagramValue = {
  code: string;
  lang: 'mermaid';
};

/**
 * Adds opt-in diagram rendering for supported code block languages.
 */
export const diagramsPlugin = (options: DiagramsPluginOptions = {}): NizelPlugin => {
  return {
    name: 'diagrams',
    blocks: {
      diagram: diagramBlock(options),
    },
    hooks: {
      afterParse(ast) {
        return transformDiagramCodes(ast, options);
      },
    },
  };
};

/**
 * Converts explicit Mermaid fences into diagram custom blocks.
 */
export const transformDiagramCodes = (
  ast: NizelRootNode,
  options: DiagramsPluginOptions = {},
): NizelRootNode => ({
  ...ast,
  children: ast.children.map((node) => transformBlock(node, options)),
});

const transformBlock = (node: NizelBlockNode, options: DiagramsPluginOptions): NizelBlockNode => {
  if (options.mermaid !== false && node.type === 'code' && node.lang === 'mermaid') {
    return {
      type: 'customBlock',
      name: 'diagram',
      value: {
        code: node.code,
        lang: 'mermaid',
      } satisfies DiagramValue,
      children: [],
    };
  }

  if (node.type === 'blockquote') {
    return { ...node, children: node.children.map((child) => transformBlock(child, options)) };
  }

  if (node.type === 'list') {
    return {
      ...node,
      children: node.children.map((item) => ({
        ...item,
        children: item.children.map((child) => transformBlock(child, options)),
      })),
    };
  }

  if (node.type === 'customBlock' && node.children) {
    return { ...node, children: node.children.map((child) => transformBlock(child, options)) };
  }

  return node;
};

const diagramBlock = (options: DiagramsPluginOptions): NizelBlockDefinition => ({
  name: 'diagram',
  formats: {
    html(node, ctx) {
      if (node.type !== 'customBlock') return '';
      const value = node.value as Partial<DiagramValue> | undefined;
      if (value?.lang !== 'mermaid' || typeof value.code !== 'string') return '';
      return `<div class="${ctx.escape(options.className ?? 'mermaid')}">${ctx.escape(value.code.trimEnd())}</div>`;
    },
  },
});

export default diagramsPlugin;
