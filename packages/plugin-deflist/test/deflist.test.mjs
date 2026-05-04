import assert from 'node:assert/strict';
import { test } from 'vitest';
import { useNizel } from 'nizel';
import {
  deflistPlugin,
  readDefinitionList,
  renderDefinitionList,
  transformDefinitionLists,
} from '../dist/index.js';

test('unit: transforms definition list syntax into an internal custom block', () => {
  assert.equal(transformDefinitionLists('Term\n: Definition'), '::deflist\nTerm\n: Definition\n::');
});

test('unit: reads contiguous definition list entries', () => {
  assert.deepEqual(readDefinitionList(['Term', ': One', ': Two'], 0)?.entries, [
    { term: 'Term', definitions: ['One', 'Two'] },
  ]);
});

test('unit: renders escaped definition list HTML', () => {
  assert.equal(
    renderDefinitionList([{ term: '<Term>', definitions: ['A & B'] }], { className: 'defs' }),
    '<dl class="defs">\n  <dt>&lt;Term&gt;</dt>\n  <dd>A &amp; B</dd>\n</dl>',
  );
});

test('integration: renders definition lists through Nizel without enabling raw HTML', async () => {
  const nizel = useNizel({ plugins: [deflistPlugin()] });
  const html = await nizel.html('Term\n: Definition');

  assert.equal(html, '<dl>\n  <dt>Term</dt>\n  <dd>Definition</dd>\n</dl>');
});
