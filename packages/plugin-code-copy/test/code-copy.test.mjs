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
    { copiedLabel: 'Copied', label: 'Copy <code>', mode: 'inline' },
  );

  assert.match(html, /<figcaption>demo.ts<\/figcaption>/);
  assert.match(html, /class="language-ts"/);
  assert.match(html, /<textarea class="nizel-code-copy__source" data-nizel-copy-source hidden readonly tabindex="-1" aria-hidden="true" style="display: none">const x = &quot;&lt;&quot;;\n<\/textarea>/);
  assert.match(html, /onclick="/);
  assert.match(html, /navigator\.clipboard/);
  assert.match(html, /querySelector\('\[data-nizel-copy-source\]'\)/);
  assert.match(html, /Copy &lt;code&gt;/);
  assert.match(html, /const x = &quot;&lt;&quot;/);
});

test('integration: renders inline copy behavior for code blocks by default', async () => {
  const nizel = useNizel({ plugins: [codeCopyPlugin()] });
  const html = await nizel.html('```ts filename="demo.ts"\nconst x = 1;\n```');

  assert.match(html, /data-nizel-code-copy/);
  assert.match(html, /data-nizel-copy-source/);
  assert.match(html, /demo.ts/);
  assert.match(html, /onclick=/);
  assert.match(html, /navigator\.clipboard/);
});

test('integration: renders button-only markup when requested', async () => {
  const nizel = useNizel({ plugins: [codeCopyPlugin({ mode: 'button' })] });
  const html = await nizel.html('```ts filename="demo.ts"\nconst x = 1;\n```');

  assert.match(html, /data-nizel-code-copy/);
  assert.match(html, /data-nizel-copy-source/);
  assert.match(html, /data-nizel-copy-button/);
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
              ? `<pre class="custom-code"><span>${renderCtx.escape(node.code.toUpperCase())}</span></pre>`
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
  assert.match(html, /CONSOLE\.LOG\(&quot;COPY&quot;\);/);
  assert.match(html, /<textarea class="nizel-code-copy__source" data-nizel-copy-source hidden readonly tabindex="-1" aria-hidden="true" style="display: none">console\.log\(&quot;copy&quot;\);\n<\/textarea>/);
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
  assert.match(html, /<textarea class="nizel-code-copy__source" data-nizel-copy-source hidden readonly tabindex="-1" aria-hidden="true" style="display: none">graph TD;\nA--&gt;B;\n<\/textarea>/);
  assert.match(html, /<div class="mermaid">graph TD;\nA--&gt;B;<\/div>/);
});
