import assert from 'node:assert/strict';
import { test } from 'vitest';
import { useNizel } from 'nizel';
import { footnotesPlugin, transformFootnotes } from '../dist/index.js';

test('core leaves footnote syntax as plain text', async () => {
  const html = await useNizel().html('Text.[^a]\n\n[^a]: Footnote.');
  assert.doesNotMatch(html, /class="footnotes"/);
  assert.doesNotMatch(html, /class="footnote-ref"/);
});

test('renders footnotes when enabled', async () => {
  assert.match(transformFootnotes('Text.[^a]\n\n[^a]: Footnote.'), /\{\{nizel-footnote-ref:a:1\}\}/);
  const html = await useNizel({ plugins: [footnotesPlugin()] }).html('Text.[^a]\n\n[^a]: Footnote.');
  assert.match(html, /class="footnote-ref"/);
  assert.match(html, /<section class="footnotes"><ol><li id="fn-a">Footnote\./);
});
