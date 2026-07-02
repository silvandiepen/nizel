import assert from 'node:assert/strict';
import { test } from 'vitest';
import { useNizel } from 'nizel';
import { typographyPlugin } from '../dist/index.js';

test('core leaves typography extensions as plain text', async () => {
  const html = await useNizel().html('==marked== H~2~O x^2^');
  assert.match(html, /==marked== H~2~O x\^2\^/);
});

test('renders mark, subscript, and superscript when enabled', async () => {
  const html = await useNizel({ plugins: [typographyPlugin()] }).html('==marked== H~2~O x^2^');
  assert.match(html, /<mark>marked<\/mark>/);
  assert.match(html, /H<sub>2<\/sub>O/);
  assert.match(html, /x<sup>2<\/sup>/);
});
