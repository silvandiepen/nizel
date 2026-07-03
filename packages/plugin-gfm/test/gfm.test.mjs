import assert from 'node:assert/strict';
import { test } from 'vitest';
import { useNizel } from 'nizel';
import { gfmPlugins } from '../dist/index.js';

test('composes GFM-oriented plugins', async () => {
  const html = await useNizel({ plugins: gfmPlugins() }).html('> [!NOTE]\n> Hi');
  assert.match(html, /class="alert alert--note"/);
});

test('includes task list rendering by default', async () => {
  const html = await useNizel({ plugins: gfmPlugins() }).html('- [x] Done');

  assert.match(html, /data-nizel-task-checkbox/);
  assert.match(html, /checked disabled/);
});

test('can disable task list rendering', async () => {
  const html = await useNizel({ plugins: gfmPlugins({ taskLists: false }) }).html('- [x] Done');

  assert.doesNotMatch(html, /data-nizel-task-checkbox/);
});
