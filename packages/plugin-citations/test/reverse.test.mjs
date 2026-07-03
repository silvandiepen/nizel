import assert from 'node:assert/strict';
import { test } from 'vitest';
import { htmlToMarkdown, useNizel } from 'nizel';
import { citationsPlugin } from '../dist/index.js';

test('round-trips citation references and bibliography', async () => {
  const nizel = useNizel({ plugins: [citationsPlugin()] });
  const md = 'As stated by [@smith].\n\n[@smith]: Smith, J. (2020). A Paper.';
  const html = await nizel.html(md);
  const back = htmlToMarkdown(html, { plugins: [citationsPlugin()] });
  assert.equal(back, md);
});

test('round-trips multiple citations preserving order', async () => {
  const nizel = useNizel({ plugins: [citationsPlugin()] });
  const html = await nizel.html('First[@a], then[@b].\n\n[@a]: A.\n[@b]: B.');
  const back = htmlToMarkdown(html, { plugins: [citationsPlugin()] });
  assert.equal(back, 'First[@a], then[@b].\n\n[@a]: A.\n[@b]: B.');
});
