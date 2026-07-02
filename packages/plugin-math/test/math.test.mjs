import assert from 'node:assert/strict';
import { test } from 'vitest';
import { useNizel } from 'nizel';
import { mathPlugin, transformBlockMath } from '../dist/index.js';

test('core leaves math syntax as markdown text', async () => {
  const html = await useNizel().html('$E = mc^2$');
  assert.match(html, /\$E = mc\^2\$/);
});

test('renders inline and block math when enabled', async () => {
  assert.equal(transformBlockMath('$$\nf(x)\n$$'), '::math\nf(x)\n::');
  const html = await useNizel({ plugins: [mathPlugin()] }).html('Inline $E = mc^2$\n\n$$\nf(x)\n$$');
  assert.match(html, /<span class="math math-inline">E = mc\^2<\/span>/);
  assert.match(html, /<div class="math math-display">f\(x\)<\/div>/);
});
