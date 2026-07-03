import assert from 'node:assert/strict';
import { test } from 'vitest';
import { htmlToMarkdown, useNizel } from 'nizel';
import { autolinkPlugin } from '../dist/index.js';

test('round-trips autolinks with target/rel stripped', async () => {
  const nizel = useNizel({ plugins: [autolinkPlugin({ target: '_blank', rel: 'noopener' })] });
  const html = await nizel.html('Visit https://example.com soon.');
  const back = htmlToMarkdown(html, { plugins: [autolinkPlugin()] });
  assert.equal(back, 'Visit https://example.com soon.');
});

test('keeps explicit links whose text differs from the URL', async () => {
  const nizel = useNizel({ plugins: [autolinkPlugin()] });
  const html = await nizel.html('[site](https://example.com)');
  const back = htmlToMarkdown(html, { plugins: [autolinkPlugin()] });
  assert.equal(back, '[site](https://example.com)');
});
