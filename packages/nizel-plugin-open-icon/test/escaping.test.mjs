import assert from 'node:assert/strict';
import { test } from 'vitest';
import { useNizel } from 'nizel';
import { openIconPlugin } from '../dist/index.js';

test('escapes labels and attributes', async () => {
  const html = await useNizel({ plugins: [openIconPlugin()] }).html(':open-icon(ui/search-m, label="<script>alert(1)</script>")');
  assert.match(html, /aria-label="&lt;script&gt;alert\(1\)&lt;\/script&gt;"/);
  assert.doesNotMatch(html, /aria-label="<script>/);
});

test('invalid icon names fail safely in non-strict mode', async () => {
  const html = await useNizel({ plugins: [openIconPlugin()] }).html(':open-icon(<script>)');
  assert.match(html, /nizel-open-icon--missing/);
  assert.doesNotMatch(html, /<script>/);
});

test('invalid icon names throw in strict mode', async () => {
  await assert.rejects(
    useNizel({ plugins: [openIconPlugin({ strict: true })] }).html(':open-icon(<script>)'),
    /Invalid Open Icon name/,
  );
});
