import assert from 'node:assert/strict';
import { test } from 'vitest';
import { useNizel } from 'nizel';
import { detailsPlugin } from '../dist/index.js';

test('renders details containers', async () => {
  const html = await useNizel({ plugins: [detailsPlugin()] }).html(':::details More\nHidden **text**.\n:::');
  assert.match(html, /<details class="details"><summary>More<\/summary>/);
  assert.match(html, /<strong>text<\/strong>/);
});
