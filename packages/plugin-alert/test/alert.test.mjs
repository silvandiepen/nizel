import assert from 'node:assert/strict';
import { test } from 'vitest';
import { useNizel } from 'nizel';
import { alertPlugin, transformGitHubAlerts } from '../dist/index.js';

test('unit: exposes alert custom block definitions', () => {
  const plugin = alertPlugin();

  assert.equal(plugin.name, 'alert');
  assert.equal(plugin.blocks?.warning?.name, 'warning');
  assert.deepEqual(plugin.blocks?.warning?.parse?.({ name: 'warning', args: ['Careful'], props: {}, content: '' }), {
    alertType: 'warning',
    title: 'Careful',
  });
});

test('integration: renders GitHub-style alert custom blocks', async () => {
  const nizel = useNizel({ plugins: [alertPlugin()] });
  const html = await nizel.html('::warning Careful\nPay **attention**.\n::');

  assert.match(html, /class="alert alert--warning"/);
  assert.match(html, /data-alert="warning"/);
  assert.match(html, /<p class="alert__title">Careful<\/p>/);
  assert.match(html, /<strong>attention<\/strong>/);
});

test('integration: supports custom root class names', async () => {
  const nizel = useNizel({ plugins: [alertPlugin({ className: 'callout' })] });
  const html = await nizel.html('::tip\nReusable content.\n::');

  assert.match(html, /class="callout callout--tip"/);
  assert.match(html, /class="callout__content"/);
});

test('unit: transforms GitHub alert blockquotes to custom blocks', () => {
  assert.equal(
    transformGitHubAlerts('> [!WARNING]\n> Be **careful**.\n\nAfter'),
    '::warning Warning\nBe **careful**.\n::\n\nAfter',
  );
});

test('integration: renders GitHub alert blockquote syntax', async () => {
  const nizel = useNizel({ plugins: [alertPlugin()] });
  const html = await nizel.html('> [!NOTE]\n> This is **useful**.');

  assert.match(html, /class="alert alert--note"/);
  assert.match(html, /<p class="alert__title">Note<\/p>/);
  assert.match(html, /<strong>useful<\/strong>/);
});
