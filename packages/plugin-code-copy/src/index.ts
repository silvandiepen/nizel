import {
  defineNizelPlugin,
  type NizelBlockNode,
  type NizelCustomBlockNode,
  type NizelHtmlToMarkdownHandler,
  type NizelPlugin,
  type NizelRenderContext,
  type NizelRootNode,
} from 'nizel';
import { findHtmlDescendant, findHtmlElement, htmlChildElements, htmlRoot } from 'nizel';

export type CodeCopyPluginOptions = {
  copiedLabel?: string;
  label?: string;
  mode?: 'inline' | 'button';
};

type CodeCopyValue = {
  code: string;
  filename?: string;
  lang?: string;
};

/**
 * Creates a plugin that renders copy controls for fenced code blocks.
 */
export const codeCopyPlugin = (options: CodeCopyPluginOptions = {}): NizelPlugin => {
  const copiedLabel = options.copiedLabel ?? 'Copied';
  const label = options.label ?? 'Copy';
  const mode = options.mode ?? 'inline';

  return defineNizelPlugin({
    name: 'code-copy',
    blocks: {
      'code-copy': {
        name: 'code-copy',
        formats: {
          html(node, ctx) {
            if (node.type !== 'customBlock') return '';
            return renderCodeCopyBlock(node, ctx, { copiedLabel, label, mode });
          },
        },
      },
    },
    hooks: {
      afterParse: wrapCodeBlocks,
    },
    htmlToMarkdown: codeCopyToMarkdown(),
  });
};

/**
 * Converts rendered code-copy figures back into fenced code, preferring the verbatim source textarea.
 */
export const codeCopyToMarkdown = (): NizelHtmlToMarkdownHandler => (node, ctx) => {
  if (node.type !== 'element' || node.tag !== 'figure' || node.attrs['data-nizel-code-copy'] === undefined) return undefined;

  const source = findHtmlDescendant(node, (el) => el.tag === 'textarea' && el.attrs['data-nizel-copy-source'] !== undefined);
  if (!source) {
    const body = htmlChildElements(node).filter((el) => !['figcaption', 'textarea', 'button'].includes(el.tag));
    return ctx.block(htmlRoot(body));
  }

  const code = ctx.text(source).replace(/\n$/, '');
  const pre = findHtmlDescendant(node, (el) => el.tag === 'pre');
  const codeEl = pre ? findHtmlElement(pre, (el) => el.tag === 'code') : undefined;
  const codeClass = codeEl?.attrs.class ?? '';
  const langClass = codeClass.match(/\blanguage-([A-Za-z0-9_-]+)/)?.[1];
  const isMermaid = findHtmlDescendant(node, (el) => el.tag === 'div' && el.attrs.class === 'mermaid') !== undefined;
  const lang = langClass ?? pre?.attrs['data-language'] ?? (isMermaid ? 'mermaid' : '');
  const fence = fenceFor(code);
  return `${fence}${lang}\n${code}\n${fence}`;
};

/**
 * Builds a Markdown code fence long enough to safely enclose the given source.
 */
const fenceFor = (code: string): string => {
  const longest = Math.max(0, ...(code.match(/`+/g) ?? []).map((run) => run.length));
  return '`'.repeat(Math.max(3, longest + 1));
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
  options: Required<CodeCopyPluginOptions>,
): string => {
  const value = node.value as Partial<CodeCopyValue> | undefined;
  const filename = value?.filename ? `<figcaption>${ctx.escape(value.filename)}</figcaption>` : '';
  const source = typeof value?.code === 'string'
    ? `<textarea class="nizel-code-copy__source" data-nizel-copy-source hidden readonly tabindex="-1" aria-hidden="true" style="display: none">${ctx.escape(value.code)}</textarea>`
    : '';
  const body = ctx.render(node.children ?? []);
  const onclick = options.mode === 'inline'
    ? ` onclick="${ctx.escape(createInlineCopyHandler(options.copiedLabel))}"`
    : '';

  return `<figure class="nizel-code-copy" data-nizel-code-copy>${filename}${source}<button type="button" class="nizel-code-copy__button" data-nizel-copy-button${onclick}>${ctx.escape(options.label)}</button>${body}</figure>`;
};

/**
 * Creates the inline browser copy handler used by the default copy mode.
 */
const createInlineCopyHandler = (copiedLabel: string): string => {
  const label = jsString(copiedLabel);

  return `var b=this,f=b.closest('[data-nizel-code-copy]'),s=f?f.querySelector('[data-nizel-copy-source]'):null,v=s?s.value:'',p=b.textContent,d=function(){b.textContent='${label}';setTimeout(function(){b.textContent=p;},1200)},c=function(){var t=document.createElement('textarea');t.value=v;t.setAttribute('readonly','');t.style.position='fixed';t.style.opacity='0';document.body.appendChild(t);t.select();document.execCommand('copy');document.body.removeChild(t);d()};if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(v).then(d,c)}else{c()}`;
};

/**
 * Escapes a string for single-quoted JavaScript string literals.
 */
const jsString = (value: string): string => value
  .replace(/\\/g, '\\\\')
  .replace(/'/g, "\\'")
  .replace(/\r/g, '\\r')
  .replace(/\n/g, '\\n')
  .replace(/\u2028/g, '\\u2028')
  .replace(/\u2029/g, '\\u2029');

export default codeCopyPlugin;
