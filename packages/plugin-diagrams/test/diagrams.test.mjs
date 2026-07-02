import assert from 'node:assert/strict';
import { test } from 'vitest';
import { useNizel } from 'nizel';
import { diagramsPlugin } from '../dist/index.js';

test('core renders mermaid as a normal code block', async () => {
  const html = await useNizel().html('```mermaid\nflowchart TD\nA --> B\n```');
  assert.match(html, /<pre><code class="language-mermaid">/);
});

test('renders mermaid fences as diagram containers when enabled', async () => {
  const html = await useNizel({ plugins: [diagramsPlugin()] }).html('```mermaid\nflowchart TD\nA --> B\n```');
  assert.match(html, /<div class="mermaid">flowchart TD\nA --&gt; B<\/div>/);
});
