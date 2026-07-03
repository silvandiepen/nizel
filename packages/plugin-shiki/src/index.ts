import {
  defineNizelPlugin,
  type NizelCodeNode,
  type NizelHtmlToMarkdownHandler,
  type NizelPlugin,
  type NizelRenderContext,
} from 'nizel';
import { findHtmlElement, hasHtmlClass } from 'nizel';

export type ShikiHighlighterInput = {
  lang?: string;
  theme?: string;
  meta?: string;
  filename?: string;
  highlightLines?: number[];
};

export type ShikiPluginOptions = {
  highlighter?: (code: string, input: ShikiHighlighterInput) => string | undefined;
  mode?: 'blocks' | 'inline';
  theme?: string;
};

/**
 * Creates a code highlighting plugin that accepts a Worker-compatible highlighter function.
 */
export const shikiPlugin = (options: ShikiPluginOptions = {}): NizelPlugin => {
  const mode = options.mode ?? 'blocks';
  const highlighter = options.highlighter;

  return defineNizelPlugin({
    name: 'shiki',
    blocks: {
      code: {
        name: 'code',
        formats: {
          html(node, ctx) {
            if (node.type !== 'code') return '';
            if (mode === 'inline') return fallback(node, ctx);

            const highlighted = highlighter?.(node.code, {
              lang: node.lang,
              theme: options.theme,
              meta: node.meta,
              filename: node.filename,
              highlightLines: node.highlightLines,
            });

            return typeof highlighted === 'string' ? highlighted : fallback(node, ctx);
          },
        },
      },
    },
    htmlToMarkdown: shikiToMarkdown(),
  });
};

/**
 * Strips Shiki highlighting markup from a rendered `<pre>` and recovers a fenced code block.
 */
export const shikiToMarkdown = (): NizelHtmlToMarkdownHandler => (node, ctx) => {
  if (node.type !== 'element' || node.tag !== 'pre') return undefined;
  const isShiki = hasHtmlClass(node, 'shiki') || node.attrs.style !== undefined || node.attrs['data-language'] !== undefined;
  if (!isShiki) return undefined;

  const codeEl = findHtmlElement(node, (el) => el.tag === 'code');
  const codeClass = codeEl?.attrs.class ?? '';
  const langClass = codeClass.match(/\blanguage-([A-Za-z0-9_-]+)/)?.[1];
  const lang = node.attrs['data-language'] ?? langClass ?? '';
  const code = ctx.text(node).replace(/\n$/, '');
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
 * Renders the safe core code block fallback when no highlighter is available.
 */
export const fallback = (node: NizelCodeNode, ctx: NizelRenderContext): string => {
  const language = node.lang ? ` class="language-${ctx.escape(node.lang)}"` : '';
  return `<pre><code${language}>${ctx.escape(node.code)}</code></pre>`;
};

export default shikiPlugin;
