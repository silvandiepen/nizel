import assert from 'node:assert/strict';
import { test } from 'vitest';
import { htmlToMarkdown, useNizel } from 'nizel';
import { tocPlugin } from '../dist/index.js';

test('round-trips the toc marker', async () => {
  const nizel = useNizel({ plugins: [tocPlugin()], anchors: true });
  const html = await nizel.html('[[toc]]\n\n## Heading');
  const back = htmlToMarkdown(html, { plugins: [tocPlugin()] });
  assert.equal(back, '[[toc]]\n\n## Heading');
});

test('does not claim an unrelated nav', () => {
  const back = htmlToMarkdown('<nav class="menu"><a href="/">Home</a></nav>', { plugins: [tocPlugin()] });
  assert.doesNotMatch(back, /\[\[toc\]\]/);
});
