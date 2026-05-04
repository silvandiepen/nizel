import assert from 'node:assert/strict';
import { test } from 'vitest';
import { useNizel } from 'nizel';
import { fallback, shikiPlugin } from '../dist/index.js';

const ctx = {
  escape(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  },
};

test('unit: renders safe fallback code markup', () => {
  assert.equal(
    fallback({ type: 'code', code: 'x < y\n', lang: 'js' }, ctx),
    '<pre><code class="language-js">x &lt; y\n</code></pre>',
  );
});

test('integration: uses a provided highlighter and falls back safely', async () => {
  const highlighted = useNizel({
    plugins: [shikiPlugin({ highlighter: (code) => `<pre class="hl">${code}</pre>` })],
  });
  const fallback = useNizel({ plugins: [shikiPlugin()] });

  assert.match(await highlighted.html('```js\nx\n```'), /class="hl"/);
  assert.match(await fallback.html('```js\nx\n```'), /language-js/);
});
