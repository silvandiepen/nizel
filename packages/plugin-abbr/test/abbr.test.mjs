import assert from 'node:assert/strict';
import { test } from 'vitest';
import { useNizel } from 'nizel';
import { abbrPlugin } from '../dist/index.js';

test('renders abbreviation definitions', async () => {
  const html = await useNizel({ plugins: [abbrPlugin()] }).html('*[HTML]: HyperText Markup Language\n\nHTML is text.');
  assert.match(html, /<abbr title="HyperText Markup Language">HTML<\/abbr>/);
});
