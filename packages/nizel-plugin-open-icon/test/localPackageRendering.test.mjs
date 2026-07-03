import assert from 'node:assert/strict';
import { test } from 'vitest';
import { useNizel } from 'nizel';
import { getIcon } from 'open-icon/static';
import { openIconPlugin } from '../dist/index.js';

test('renders SVG from the local open-icon package', async () => {
  const localSvg = getIcon('ui/check-m');
  assert.ok(localSvg);

  const html = await useNizel({ plugins: [openIconPlugin()] }).html(':open-icon(ui/check-m)');
  assert.match(html, /<svg/);
  assert.match(html, /id="check-m"/);
});

test('rendering does not call network APIs or output remote icon URLs', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () => {
    throw new Error('fetch should not be called');
  };

  try {
    const html = await useNizel({ plugins: [openIconPlugin()] }).html(':open-icon(ui/search-m)');
    assert.doesNotMatch(html, /api\.open-icon\.org|https?:\/\//);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
