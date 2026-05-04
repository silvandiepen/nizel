import assert from 'node:assert/strict';
import { test } from 'vitest';
import { useNizel } from 'nizel';
import { codeCopyPlugin, renderCodeCopyBlock } from '../dist/index.js';

const ctx = {
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
    { type: 'code', code: 'const x = "<";\n', lang: 'ts', filename: 'demo.ts' },
    ctx,
    'Copy <code>',
  );

  assert.match(html, /<figcaption>demo.ts<\/figcaption>/);
  assert.match(html, /class="language-ts"/);
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
