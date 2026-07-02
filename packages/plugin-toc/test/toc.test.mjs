import assert from 'node:assert/strict';
import { test } from 'vitest';
import { useNizel } from 'nizel';
import { tocPlugin } from '../dist/index.js';

test('renders [[toc]] from headings', async () => {
  const html = await useNizel({ plugins: [tocPlugin()] }).html('# Title\n\n[[toc]]\n\n## A\n\n### B');
  assert.match(html, /<nav class="toc"><ol>/);
  assert.match(html, /href="#a">A/);
  assert.match(html, /data-depth="3"><a href="#b">B/);
});
