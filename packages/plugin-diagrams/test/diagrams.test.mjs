import assert from 'node:assert/strict';
import { test } from 'vitest';
import { useNizel } from 'nizel';
import { diagramsPlugin } from '../dist/index.js';

test('core renders mermaid as a normal code block', async () => {
  const html = await useNizel().html('```mermaid\nflowchart TD\nA --> B\n```');
  assert.match(html, /<pre><code class="language-mermaid">/);
});

test('renders mermaid fences as diagram containers when enabled', async () => {
  const html = await useNizel({ plugins: [diagramsPlugin()] }).html('```mermaid\nflowchart TD\nA --> B\n```');
  assert.match(html, /<div class="mermaid">flowchart TD\nA --&gt; B<\/div>/);
});

test('leaves non-mermaid code fences to the active code renderer', async () => {
  const codeRenderer = {
    name: 'test-code-renderer',
    blocks: {
      code: {
        name: 'code',
        formats: {
          html(node, ctx) {
            return node.type === 'code'
              ? `<pre class="custom-code">${ctx.escape(node.code)}</pre>`
              : '';
          },
        },
      },
    },
  };
  const html = await useNizel({ plugins: [diagramsPlugin(), codeRenderer] }).html([
    '```js',
    'const value = true;',
    '```',
    '',
    '```mermaid',
    'graph TD;',
    'A-->B;',
    '```',
  ].join('\n'));

  assert.match(html, /<pre class="custom-code">const value = true;\n<\/pre>/);
  assert.match(html, /<div class="mermaid">graph TD;\nA--&gt;B;<\/div>/);
});
