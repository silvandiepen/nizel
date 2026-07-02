import type { NizelBlockDefinition, NizelPlugin } from 'nizel';

export type DiagramsPluginOptions = {
  mermaid?: boolean;
  className?: string;
};

/**
 * Adds opt-in diagram rendering for supported code block languages.
 */
export const diagramsPlugin = (options: DiagramsPluginOptions = {}): NizelPlugin => {
  return {
    name: 'diagrams',
    blocks: {
      code: codeBlock(options),
    },
  };
};

const codeBlock = (options: DiagramsPluginOptions): NizelBlockDefinition => ({
  name: 'code',
  formats: {
    html(node, ctx) {
      if (node.type !== 'code') return '';
      if (options.mermaid !== false && node.lang === 'mermaid') {
        return `<div class="${ctx.escape(options.className ?? 'mermaid')}">${ctx.escape(node.code.trimEnd())}</div>`;
      }
      const langClass = node.lang ? ` class="language-${ctx.escape(node.lang)}"` : '';
      const filename = node.filename ? ` data-filename="${ctx.escape(node.filename)}"` : '';
      const highlight = node.highlightLines?.length ? ` data-highlight-lines="${ctx.escape(node.highlightLines.join(','))}"` : '';
      return `<pre><code${langClass}${filename}${highlight}>${ctx.escape(node.code)}</code></pre>`;
    },
  },
});

export default diagramsPlugin;
