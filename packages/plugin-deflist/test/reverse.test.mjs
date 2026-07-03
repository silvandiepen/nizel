import assert from 'node:assert/strict';
import { test } from 'vitest';
import { htmlToMarkdown, useNizel } from 'nizel';
import { deflistPlugin } from '../dist/index.js';

test('round-trips definition lists', async () => {
  const nizel = useNizel({ plugins: [deflistPlugin()] });
  const md = 'Term\n: A definition\n: Another line';
  const html = await nizel.html(md);
  const back = htmlToMarkdown(html, { plugins: [deflistPlugin()] });
  assert.equal(back, md);
});

test('does not claim definition lists carrying another class', () => {
  const back = htmlToMarkdown('<dl class="frontmatter"><dt>k</dt><dd>v</dd></dl>', { plugins: [deflistPlugin()] });
  assert.match(back, /frontmatter/);
});
