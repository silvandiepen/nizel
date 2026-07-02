import assert from 'node:assert/strict';
import { test } from 'vitest';
import { useNizel } from 'nizel';
import { sanitizeHtml, sanitizePlugin } from '../dist/index.js';

test('removes risky HTML constructs', () => {
  const html = sanitizeHtml('<a href="javascript:alert(1)" onclick="x()">x</a><script>x</script>');
  assert.equal(html, '<a>x</a>');
});

test('sanitizes rendered output', async () => {
  const html = await useNizel({ safe: false, plugins: [sanitizePlugin({ allowRawHtml: true })] }).html('<img src=x onerror=alert(1)>');
  assert.doesNotMatch(html, /onerror/);
});
