import { defineNizelPlugin } from 'nizel';

/**
 * Creates a code highlighting plugin that accepts a Worker-compatible highlighter.
 */
export function shikiPlugin(options = {}) {
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
            if (mode === 'inline') {
              return fallback(node, ctx);
            }

            const highlighted =
              typeof highlighter === 'function'
                ? highlighter(node.code, {
                    lang: node.lang,
                    theme: options.theme,
                    meta: node.meta,
                    filename: node.filename,
                    highlightLines: node.highlightLines,
                  })
                : undefined;

            return typeof highlighted === 'string' ? highlighted : fallback(node, ctx);
          },
        },
      },
    },
  });
}

/**
 * Renders the safe core code block fallback when no highlighter is available.
 */
function fallback(node, ctx) {
  const language = node.lang ? ` class="language-${ctx.escape(node.lang)}"` : '';
  return `<pre><code${language}>${ctx.escape(node.code)}</code></pre>`;
}

export default shikiPlugin;
