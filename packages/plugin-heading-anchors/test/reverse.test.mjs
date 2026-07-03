import assert from 'node:assert/strict';
import { test } from 'vitest';
import { htmlToMarkdown, useNizel } from 'nizel';
import { headingAnchorsPlugin } from '../dist/index.js';

test('drops heading anchors on reverse', async () => {
  const nizel = useNizel({ plugins: [headingAnchorsPlugin()], anchors: true });
  const html = await nizel.html('## Section title');
  const back = htmlToMarkdown(html, { plugins: [headingAnchorsPlugin()] });
  assert.equal(back, '## Section title');
});

test('does not touch ordinary links', () => {
  const back = htmlToMarkdown('<h2 id="t">T<a class="heading-anchor" href="#t" aria-label="Link to section"></a></h2>', {
    plugins: [headingAnchorsPlugin()],
  });
  assert.equal(back, '## T');
});
