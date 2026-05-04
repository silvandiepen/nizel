import {
  defineNizelPlugin,
  type NizelCodeNode,
  type NizelPlugin,
  type NizelRenderContext,
} from 'nizel';

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
  });
};

/**
 * Renders the safe core code block fallback when no highlighter is available.
 */
export const fallback = (node: NizelCodeNode, ctx: NizelRenderContext): string => {
  const language = node.lang ? ` class="language-${ctx.escape(node.lang)}"` : '';
  return `<pre><code${language}>${ctx.escape(node.code)}</code></pre>`;
};

export default shikiPlugin;
