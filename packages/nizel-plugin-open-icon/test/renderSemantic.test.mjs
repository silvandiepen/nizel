import assert from 'node:assert/strict';
import { test } from 'vitest';
import { useNizel } from 'nizel';
import { openIconPlugin } from '../dist/index.js';

test('semantic mode renders an app-replaceable span without svg', async () => {
  const html = await useNizel({ plugins: [openIconPlugin({ mode: 'semantic' })] }).html(':open-icon(ui/search-m)');
  assert.equal(html, '<p><span class="nizel-open-icon" data-icon="ui/search-m" aria-hidden="true"></span></p>');
});

test('semantic mode still collects metadata', async () => {
  const result = await useNizel({ plugins: [openIconPlugin({ mode: 'semantic' })] })(':open-icon(ui/search-m, label="Search")');
  assert.deepEqual(result.meta.openIcon.icons, [
    {
      name: 'ui/search-m',
      label: 'Search',
      options: {},
    },
  ]);
});
