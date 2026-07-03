import assert from 'node:assert/strict';
import { test } from 'vitest';
import { useNizel } from 'nizel';
import { openIconPlugin } from '../dist/index.js';

test('resolves aliases and records original metadata', async () => {
  const result = await useNizel({
    plugins: [openIconPlugin({ aliases: { search: 'ui/search-m' } })],
  })(':open-icon(search)');

  assert.match(result.html, /data-icon="ui\/search-m"/);
  assert.deepEqual(result.meta.openIcon.icons, [
    {
      name: 'ui/search-m',
      original: 'search',
      options: {},
    },
  ]);
});

test('supports nested aliases and handles loops safely', async () => {
  const html = await useNizel({
    plugins: [openIconPlugin({ aliases: { search: 'find', find: 'ui/search-m' } })],
  }).html(':open-icon(search)');
  assert.match(html, /data-icon="ui\/search-m"/);

  await assert.rejects(
    useNizel({ plugins: [openIconPlugin({ aliases: { a: 'b', b: 'a' }, strict: true })] }).html(':open-icon(a)'),
    /alias loop/,
  );
});
