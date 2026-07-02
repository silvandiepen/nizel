import assert from 'node:assert/strict';
import { test } from 'vitest';
import { useNizel } from 'nizel';
import { frontmatterUiPlugin, renderFrontmatterMeta } from '../dist/index.js';

test('renders supplied metadata as a definition list', () => {
  assert.match(renderFrontmatterMeta({ title: 'Doc', tags: ['a', 'b'] }), /<dd>a, b<\/dd>/);
});

test('renders frontmatter custom blocks', async () => {
  const html = await useNizel({ plugins: [frontmatterUiPlugin()] }).html('::frontmatter\ntitle: Doc\n::');
  assert.match(html, /<dl class="frontmatter"><dt>title<\/dt><dd>Doc<\/dd><\/dl>/);
});
