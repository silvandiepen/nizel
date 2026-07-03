import assert from 'node:assert/strict';
import { test } from 'vitest';
import { htmlToMarkdown, useNizel } from 'nizel';
import { shikiPlugin } from '../dist/index.js';

test('round-trips the fallback code block when no highlighter is set', async () => {
  const nizel = useNizel({ plugins: [shikiPlugin()] });
  const md = '```ts\nconst x: number = 1;\n```';
  const html = await nizel.html(md);
  const back = htmlToMarkdown(html, { plugins: [shikiPlugin()] });
  assert.equal(back, md);
});

test('strips shiki token markup, recovering language and source', () => {
  const html =
    '<pre class="shiki" style="background-color:#fff" tabindex="0" data-language="js"><code class="language-js"><span style="color:#0000ff">const</span> x = 1;</code></pre>';
  const back = htmlToMarkdown(html, { plugins: [shikiPlugin()] });
  assert.equal(back, '```js\nconst x = 1;\n```');
});
