import assert from 'node:assert/strict';
import { test } from 'vitest';
import { htmlToMarkdown, useNizel } from 'nizel';
import { detailsPlugin } from '../dist/index.js';

test('round-trips details blocks', async () => {
  const nizel = useNizel({ plugins: [detailsPlugin()] });
  const md = ':::details More info\n\nHidden content here.\n:::';
  const html = await nizel.html(md);
  const back = htmlToMarkdown(html, { plugins: [detailsPlugin()] });
  assert.equal(back, '::details More info\nHidden content here.\n::');
});

test('round-trips details with default summary', async () => {
  const nizel = useNizel({ plugins: [detailsPlugin()] });
  const html = await nizel.html(':::details\n\nBody.\n:::');
  const back = htmlToMarkdown(html, { plugins: [detailsPlugin()] });
  assert.equal(back, '::details Body.\n::');
  assert.equal(await nizel.html(back), html);
});
