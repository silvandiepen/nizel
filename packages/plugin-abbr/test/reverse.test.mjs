import assert from 'node:assert/strict';
import { test } from 'vitest';
import { htmlToMarkdown, useNizel } from 'nizel';
import { abbrPlugin } from '../dist/index.js';

test('round-trips abbreviations, re-emitting the definition', async () => {
  const nizel = useNizel({ plugins: [abbrPlugin()] });
  const html = await nizel.html('*[HTML]: HyperText Markup Language\n\nHTML is great.');
  const back = htmlToMarkdown(html, { plugins: [abbrPlugin()] });
  assert.equal(back, 'HTML is great.\n\n*[HTML]: HyperText Markup Language');
});

test('emits each abbreviation definition only once', async () => {
  const nizel = useNizel({ plugins: [abbrPlugin()] });
  const html = await nizel.html('*[HTML]: HyperText Markup Language\n\nHTML and HTML again.');
  const back = htmlToMarkdown(html, { plugins: [abbrPlugin()] });
  assert.equal(back.match(/\*\[HTML\]:/g).length, 1);
});
