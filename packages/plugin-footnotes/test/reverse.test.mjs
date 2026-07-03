import assert from 'node:assert/strict';
import { test } from 'vitest';
import { htmlToMarkdown, useNizel } from 'nizel';
import { footnotesPlugin } from '../dist/index.js';

test('round-trips footnote references and definitions', async () => {
  const nizel = useNizel({ plugins: [footnotesPlugin()] });
  const md = 'See this[^1] and that[^2].\n\n[^1]: First note.\n[^2]: Second note.';
  const html = await nizel.html(md);
  const back = htmlToMarkdown(html, { plugins: [footnotesPlugin()] });
  assert.equal(back, md);
});

test('round-trips named footnote ids', async () => {
  const nizel = useNizel({ plugins: [footnotesPlugin()] });
  const html = await nizel.html('Hello[^greeting].\n\n[^greeting]: Hi there.');
  const back = htmlToMarkdown(html, { plugins: [footnotesPlugin()] });
  assert.equal(back, 'Hello[^greeting].\n\n[^greeting]: Hi there.');
});
