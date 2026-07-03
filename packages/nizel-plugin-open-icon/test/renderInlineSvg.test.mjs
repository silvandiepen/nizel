import assert from 'node:assert/strict';
import { test } from 'vitest';
import { useNizel } from 'nizel';
import { openIconPlugin } from '../dist/index.js';

test('renders local Open Icon SVG inline by default', async () => {
  const html = await useNizel({ plugins: [openIconPlugin()] }).html(':open-icon(ui/search-m)');
  assert.match(html, /<span class="nizel-open-icon" data-icon="ui\/search-m" aria-hidden="true"><svg/);
  assert.match(html, /id="search-m"/);
});

test('does not emit explicit data-size for the default size', async () => {
  const html = await useNizel({ plugins: [openIconPlugin()] }).html(':open-icon(ui/search-m)');
  assert.doesNotMatch(html, /data-size=/);
});

test('emits explicit size and color metadata attributes when supplied', async () => {
  const html = await useNizel({ plugins: [openIconPlugin()] }).html(':open-icon(ui/search-m, size="1.25em", color="currentColor")');
  assert.match(html, /data-size="1.25em"/);
  assert.match(html, /data-color="currentColor"/);
  assert.match(html, /width="1.25em"/);
  assert.match(html, /--icon-stroke-color: currentColor/);
});

test('renders safe missing placeholder when catalog validation fails', async () => {
  const html = await useNizel({ plugins: [openIconPlugin()] }).html(':open-icon(unknown/icon)');
  assert.match(html, /class="nizel-open-icon nizel-open-icon--missing"/);
  assert.match(html, /data-icon="unknown\/icon"/);
  assert.doesNotMatch(html, /<svg/);
});
