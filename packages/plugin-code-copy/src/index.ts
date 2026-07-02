import {
  defineNizelPlugin,
  type NizelBlockNode,
  type NizelCustomBlockNode,
  type NizelPlugin,
  type NizelRenderContext,
  type NizelRootNode,
} from 'nizel';

export type CodeCopyPluginOptions = {
  label?: string;
};

type CodeCopyValue = {
  code: string;
  filename?: string;
  lang?: string;
};

/**
 * Creates a plugin that renders CSP-friendly copy controls for fenced code blocks.
 */
export const codeCopyPlugin = (options: CodeCopyPluginOptions = {}): NizelPlugin => {
  const label = options.label ?? 'Copy';

  return defineNizelPlugin({
    name: 'code-copy',
    blocks: {
      'code-copy': {
        name: 'code-copy',
        formats: {
          html(node, ctx) {
            if (node.type !== 'customBlock') return '';
            return renderCodeCopyBlock(node, ctx, label);
          },
        },
      },
    },
    hooks: {
      afterParse: wrapCodeBlocks,
    },
  });
};

/**
 * Wraps source-bearing code blocks without replacing the active code renderer.
 */
export const wrapCodeBlocks = (ast: NizelRootNode): NizelRootNode => ({
  ...ast,
  children: ast.children.map(wrapCodeBlock),
});

/**
 * Wraps one block node and recurses into block containers.
 */
const wrapCodeBlock = (node: NizelBlockNode): NizelBlockNode => {
  if (node.type === 'code') return createCodeCopyNode(node, node);

  if (node.type === 'customBlock') {
    if (node.name === 'code-copy') return node;

    const source = sourceFromCustomBlock(node);
    if (source) return createCodeCopyNode(source, node);

    return node.children
      ? { ...node, children: node.children.map(wrapCodeBlock) }
      : node;
  }

  if (node.type === 'blockquote') {
    return { ...node, children: node.children.map(wrapCodeBlock) };
  }

  if (node.type === 'list') {
    return {
      ...node,
      children: node.children.map((item) => ({
        ...item,
        children: item.children.map(wrapCodeBlock),
      })),
    };
  }

  return node;
};

/**
 * Creates a custom wrapper block that keeps original rendered content as a child.
 */
const createCodeCopyNode = (
  value: CodeCopyValue,
  child: NizelBlockNode,
): NizelCustomBlockNode => ({
  type: 'customBlock',
  name: 'code-copy',
  value,
  children: [child],
});

/**
 * Extracts copyable source from custom blocks that expose code-like values.
 */
const sourceFromCustomBlock = (node: NizelCustomBlockNode): CodeCopyValue | undefined => {
  if (node.name !== 'diagram') return undefined;
  const value = node.value as Partial<CodeCopyValue> | undefined;
  return typeof value?.code === 'string'
    ? {
        code: value.code,
        filename: value.filename,
        lang: value.lang,
      }
    : undefined;
};

/**
 * Renders the code-copy wrapper around already-rendered code-like content.
 */
export const renderCodeCopyBlock = (
  node: NizelCustomBlockNode,
  ctx: NizelRenderContext,
  label: string,
): string => {
  const value = node.value as Partial<CodeCopyValue> | undefined;
  const filename = value?.filename ? `<figcaption>${ctx.escape(value.filename)}</figcaption>` : '';
  const source = typeof value?.code === 'string'
    ? ` data-nizel-copy-source="${ctx.escape(value.code)}"`
    : '';
  const body = ctx.render(node.children ?? []);

  return `<figure class="nizel-code-copy" data-nizel-code-copy${source}>${filename}<button type="button" class="nizel-code-copy__button" data-nizel-copy-button>${ctx.escape(label)}</button>${body}</figure>`;
};

export default codeCopyPlugin;
