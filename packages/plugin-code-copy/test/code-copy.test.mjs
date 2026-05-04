import assert from 'node:assert/strict';
import { test } from 'vitest';
import { useNizel } from 'nizel';
import { codeCopyPlugin } from '../src/index.js';

test('renders CSP-friendly copy markup for code blocks', async () => {
  const nizel = useNizel({ plugins: [codeCopyPlugin()] });
  const html = await nizel.html('```ts filename="demo.ts"\nconst x = 1;\n```');

  assert.match(html, /data-nizel-code-copy/);
  assert.match(html, /demo.ts/);
  assert.doesNotMatch(html, /onclick=/);
});
