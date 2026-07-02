import assert from 'node:assert/strict';
import { test } from 'vitest';
import { useNizel } from 'nizel';
import { mediaPlugin } from '../dist/index.js';

test('wraps standalone images in figures', async () => {
  const html = await useNizel({ plugins: [mediaPlugin()] }).html('![Alt](image.png)');
  assert.match(html, /<figure class="media-figure">/);
  assert.match(html, /loading="lazy"/);
  assert.match(html, /<figcaption>Alt<\/figcaption>/);
});
