import { defineNizelPlugin } from 'nizel';

/**
 * Creates a plugin that renders CSP-friendly copy controls for code blocks.
 */
export function codeCopyPlugin(options = {}) {
  const label = options.label ?? 'Copy';

  return defineNizelPlugin({
    name: 'code-copy',
    blocks: {
      code: {
        name: 'code',
        formats: {
          html(node, ctx) {
            if (node.type !== 'code') return '';
            const language = node.lang ? ` class="language-${ctx.escape(node.lang)}"` : '';
            const filename = node.filename
              ? `<figcaption>${ctx.escape(node.filename)}</figcaption>`
              : '';

            return `<figure class="nizel-code-copy" data-nizel-code-copy>${filename}<button type="button" class="nizel-code-copy__button" data-nizel-copy-button>${ctx.escape(label)}</button><pre><code${language}>${ctx.escape(node.code)}</code></pre></figure>`;
          },
        },
      },
    },
  });
}

export default codeCopyPlugin;
