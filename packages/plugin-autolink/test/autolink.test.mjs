import assert from 'node:assert/strict';
import { test } from 'vitest';
import { useNizel } from 'nizel';
import { autolinkPlugin } from '../src/index.js';

test('configures autolink attributes through a plugin', async () => {
  const nizel = useNizel({
    plugins: [autolinkPlugin({ target: '_blank', rel: 'noopener noreferrer' })],
  });

  const html = await nizel.html('Visit https://example.com');

  assert.match(html, /target="_blank"/);
  assert.match(html, /rel="noopener noreferrer"/);
});
