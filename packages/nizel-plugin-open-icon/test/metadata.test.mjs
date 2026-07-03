import assert from 'node:assert/strict';
import { test } from 'vitest';
import { useNizel } from 'nizel';
import { openIconPlugin } from '../dist/index.js';

test('collects open icon usage metadata', async () => {
  const result = await useNizel({
    plugins: [openIconPlugin({ aliases: { search: 'ui/search-m' } })],
  })(':open-icon(search, label="Search", size="1.25em")');

  assert.deepEqual(result.meta.openIcon.icons, [
    {
      name: 'ui/search-m',
      original: 'search',
      label: 'Search',
      options: {
        size: '1.25em',
      },
    },
  ]);
});

test('can disable metadata collection', async () => {
  const result = await useNizel({ plugins: [openIconPlugin({ collectMetadata: false })] })(':open-icon(ui/search-m)');
  assert.equal(result.meta.openIcon, undefined);
});
