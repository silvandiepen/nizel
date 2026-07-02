import assert from 'node:assert/strict';
import { test } from 'vitest';
import { useNizel } from 'nizel';
import { codeCopyPlugin, renderCodeCopyBlock } from '../dist/index.js';

const ctx = {
  render() {
    return '<pre><code class="language-ts">const x = &quot;&lt;&quot;\n</code></pre>';
  },
  escape(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  },
};

test('unit: renders escaped copy markup for one code block', () => {
  const html = renderCodeCopyBlock(
    {
      type: 'customBlock',
      name: 'code-copy',
      value: { code: 'const x = "<";\n', lang: 'ts', filename: 'demo.ts' },
      children: [{ type: 'code', code: 'const x = "<";\n', lang: 'ts', filename: 'demo.ts' }],
    },
    ctx,
    'Copy <code>',
  );

  assert.match(html, /<figcaption>demo.ts<\/figcaption>/);
  assert.match(html, /class="language-ts"/);
  assert.match(html, /data-nizel-copy-source="const x = &quot;&lt;&quot;;\n"/);
  assert.match(html, /Copy &lt;code&gt;/);
  assert.match(html, /const x = &quot;&lt;&quot;/);
});

test('integration: renders CSP-friendly copy markup for code blocks', async () => {
  const nizel = useNizel({ plugins: [codeCopyPlugin()] });
  const html = await nizel.html('```ts filename="demo.ts"\nconst x = 1;\n```');

  assert.match(html, /data-nizel-code-copy/);
  assert.match(html, /demo.ts/);
  assert.doesNotMatch(html, /onclick=/);
});

test('integration: wraps a custom code renderer without replacing it', async () => {
  const codeRenderer = {
    name: 'test-code-renderer',
    blocks: {
      code: {
        name: 'code',
        formats: {
          html(node, renderCtx) {
            return node.type === 'code'
              ? `<pre class="custom-code">${renderCtx.escape(node.code)}</pre>`
              : '';
          },
        },
      },
    },
  };
  const nizel = useNizel({ plugins: [codeCopyPlugin(), codeRenderer] });
  const html = await nizel.html('```js\nconsole.log("copy");\n```');

  assert.match(html, /data-nizel-code-copy/);
  assert.match(html, /class="custom-code"/);
  assert.match(html, /console\.log\(&quot;copy&quot;\);/);
});

test('integration: wraps explicit diagram blocks when another plugin converts them', async () => {
  const diagramPlugin = {
    name: 'test-diagrams',
    blocks: {
      diagram: {
        name: 'diagram',
        formats: {
          html(node, renderCtx) {
            return node.type === 'customBlock'
              ? `<div class="mermaid">${renderCtx.escape(node.value.code.trimEnd())}</div>`
              : '';
          },
        },
      },
    },
    hooks: {
      afterParse(ast) {
        return {
          ...ast,
          children: ast.children.map((node) => node.type === 'code' && node.lang === 'mermaid'
            ? {
                type: 'customBlock',
                name: 'diagram',
                value: { code: node.code, lang: 'mermaid' },
                children: [],
              }
            : node),
        };
      },
    },
  };
  const nizel = useNizel({ plugins: [diagramPlugin, codeCopyPlugin()] });
  const html = await nizel.html('```mermaid\ngraph TD;\nA-->B;\n```');

  assert.match(html, /data-nizel-code-copy/);
  assert.match(html, /data-nizel-copy-source="graph TD;\nA--&gt;B;\n"/);
  assert.match(html, /<div class="mermaid">graph TD;\nA--&gt;B;<\/div>/);
});
