import assert from 'node:assert/strict';
import { test } from 'vitest';
import { htmlToMarkdown, useNizel } from 'nizel';
import { typographyPlugin } from '../dist/index.js';

test('round-trips mark, subscript, and superscript', async () => {
  const nizel = useNizel({ plugins: [typographyPlugin()] });
  const html = await nizel.html('a ==b== c\n\nH~2~O and x^2^');
  const back = htmlToMarkdown(html, { plugins: [typographyPlugin()] });
  assert.equal(back, 'a ==b== c\n\nH~2~O and x^2^');
});

test('does not claim attributed sup (e.g. footnotes)', () => {
  const back = htmlToMarkdown('<p>x<sup id="fnref-1">1</sup></p>', { plugins: [typographyPlugin()] });
  assert.doesNotMatch(back, /\^1\^/);
});
