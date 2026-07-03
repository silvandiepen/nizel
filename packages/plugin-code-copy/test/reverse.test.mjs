import assert from 'node:assert/strict';
import { test } from 'vitest';
import { htmlToMarkdown, useNizel } from 'nizel';
import { codeCopyPlugin } from '../dist/index.js';

test('round-trips code-copy figures recovering source and language', async () => {
  const nizel = useNizel({ plugins: [codeCopyPlugin({ mode: 'button' })] });
  const md = '```js\nconst x = 1;\n```';
  const html = await nizel.html(md);
  const back = htmlToMarkdown(html, { plugins: [codeCopyPlugin()] });
  assert.equal(back, md);
});

test('falls back to inner pre when no source textarea is present', () => {
  const back = htmlToMarkdown(
    '<figure class="nizel-code-copy" data-nizel-code-copy><button type="button" data-nizel-copy-button>Copy</button><pre><code class="language-ts">let y: number</code></pre></figure>',
    { plugins: [codeCopyPlugin()] },
  );
  assert.equal(back, '```ts\nlet y: number\n```');
});
