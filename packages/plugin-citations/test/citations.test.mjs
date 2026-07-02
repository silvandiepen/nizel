import assert from 'node:assert/strict';
import { test } from 'vitest';
import { useNizel } from 'nizel';
import { citationsPlugin } from '../dist/index.js';

test('renders citation references and bibliography', async () => {
  const html = await useNizel({ plugins: [citationsPlugin()] }).html('See [@doe].\n\n[@doe]: Doe, Example.');
  assert.match(html, /class="citation" href="#cite-doe"/);
  assert.match(html, /<section class="citations"><ol><li id="cite-doe">Doe, Example\./);
});
