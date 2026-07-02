import assert from 'node:assert/strict';
import { test } from 'vitest';
import { useNizel } from 'nizel';
import { gfmPlugins } from '../dist/index.js';

test('composes GFM-oriented plugins', async () => {
  const html = await useNizel({ plugins: gfmPlugins() }).html('> [!NOTE]\n> Hi');
  assert.match(html, /class="alert alert--note"/);
});
