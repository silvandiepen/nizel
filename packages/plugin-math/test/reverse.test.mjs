import assert from 'node:assert/strict';
import { test } from 'vitest';
import { htmlToMarkdown, useNizel } from 'nizel';
import { mathPlugin } from '../dist/index.js';

test('round-trips inline and block math', async () => {
  const nizel = useNizel({ plugins: [mathPlugin()] });
  const md = 'Inline $E = mc^2$\n\n$$\nf(x)\n$$';
  const html = await nizel.html(md);
  const back = htmlToMarkdown(html, { plugins: [mathPlugin()] });
  assert.equal(back, md);
});

test('honors custom class names', async () => {
  const plugin = mathPlugin({ inlineClassName: 'katex', blockClassName: 'katex-block' });
  const nizel = useNizel({ plugins: [plugin] });
  const html = await nizel.html('$a+b$');
  const back = htmlToMarkdown(html, { plugins: [mathPlugin({ inlineClassName: 'katex', blockClassName: 'katex-block' })] });
  assert.equal(back, '$a+b$');
});
