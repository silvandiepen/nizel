import assert from 'node:assert/strict';
import { test } from 'vitest';
import { useNizel } from 'nizel';
import { openIconPlugin } from '../dist/index.js';

test('does not transform inline code', async () => {
  const html = await useNizel({ plugins: [openIconPlugin()] }).html('`:open-icon(ui/search-m)`');
  assert.equal(html, '<p><code>:open-icon(ui/search-m)</code></p>');
});

test('does not transform escaped syntax', async () => {
  const html = await useNizel({ plugins: [openIconPlugin()] }).html('\\:open-icon(ui/search-m)');
  assert.equal(html, '<p>:open-icon(ui/search-m)</p>');
});

test('does not transform fenced code', async () => {
  const html = await useNizel({ plugins: [openIconPlugin()] }).html('```md\n:open-icon(ui/search-m)\n```');
  assert.match(html, /<code class="language-md">:open-icon\(ui\/search-m\)\n<\/code>/);
  assert.doesNotMatch(html, /nizel-open-icon/);
});

test('does not transform generic icon syntax or inline html', async () => {
  const html = await useNizel({ plugins: [openIconPlugin()] }).html(':icon(ui/search-m)\n\n<span>:open-icon(ui/search-m)</span>');
  assert.match(html, /:icon\(ui\/search-m\)/);
  assert.match(html, /&lt;span&gt;:open-icon\(ui\/search-m\)&lt;\/span&gt;/);
});
