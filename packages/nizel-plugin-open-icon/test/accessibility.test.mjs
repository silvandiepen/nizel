import assert from 'node:assert/strict';
import { test } from 'vitest';
import { useNizel } from 'nizel';
import { openIconPlugin } from '../dist/index.js';

test('icons without labels are decorative', async () => {
  const html = await useNizel({ plugins: [openIconPlugin()] }).html(':open-icon(ui/search-m)');
  assert.match(html, /aria-hidden="true"/);
  assert.doesNotMatch(html, /aria-label=/);
  assert.doesNotMatch(html, /role="img"/);
});

test('icons with labels are meaningful images', async () => {
  const html = await useNizel({ plugins: [openIconPlugin()] }).html(':open-icon(ui/search-m, label="Search")');
  assert.match(html, /role="img"/);
  assert.match(html, /aria-label="Search"/);
  assert.doesNotMatch(html, /aria-hidden="true"/);
});
