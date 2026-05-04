import assert from 'node:assert/strict';
import { test } from 'vitest';
import { useNizel } from 'nizel';
import { shikiPlugin } from '../src/index.js';

test('uses a provided highlighter and falls back safely', async () => {
  const highlighted = useNizel({
    plugins: [shikiPlugin({ highlighter: (code) => `<pre class="hl">${code}</pre>` })],
  });
  const fallback = useNizel({ plugins: [shikiPlugin()] });

  assert.match(await highlighted.html('```js\nx\n```'), /class="hl"/);
  assert.match(await fallback.html('```js\nx\n```'), /language-js/);
});
