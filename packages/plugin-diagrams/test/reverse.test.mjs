import assert from 'node:assert/strict';
import { test } from 'vitest';
import { htmlToMarkdown, useNizel } from 'nizel';
import { diagramsPlugin } from '../dist/index.js';

test('round-trips mermaid diagrams', async () => {
  const nizel = useNizel({ plugins: [diagramsPlugin()] });
  const md = '```mermaid\ngraph TD\nA --> B\n```';
  const html = await nizel.html(md);
  const back = htmlToMarkdown(html, { plugins: [diagramsPlugin()] });
  assert.equal(back, md);
});
