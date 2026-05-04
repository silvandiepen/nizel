import assert from 'node:assert/strict';
import { test } from 'vitest';
import { useNizel } from 'nizel';
import { autolinkPlugin, resolveAutolinkPluginOptions } from '../dist/index.js';

test('unit: normalizes autolink plugin options', () => {
  assert.deepEqual(resolveAutolinkPluginOptions(), {
    enabled: true,
    target: undefined,
    rel: undefined,
  });
  assert.deepEqual(resolveAutolinkPluginOptions({ enabled: false, target: '_blank' }), {
    enabled: false,
    target: '_blank',
    rel: undefined,
  });
});

test('integration: configures autolink attributes through a plugin', async () => {
  const nizel = useNizel({
    plugins: [autolinkPlugin({ target: '_blank', rel: 'noopener noreferrer' })],
  });

  const html = await nizel.html('Visit https://example.com');

  assert.match(html, /target="_blank"/);
  assert.match(html, /rel="noopener noreferrer"/);
});
