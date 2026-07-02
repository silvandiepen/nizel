import assert from 'node:assert/strict';
import { test } from 'vitest';
import { useNizel } from 'nizel';
import { headingAnchorsPlugin } from '../dist/index.js';

test('adds heading anchor links', async () => {
  const html = await useNizel({ plugins: [headingAnchorsPlugin()] }).html('# Title');
  assert.match(html, /class="heading-anchor" href="#title"/);
  assert.match(html, /aria-label="Link to section"/);
  assert.doesNotMatch(html, />#<\/a>/);
});
