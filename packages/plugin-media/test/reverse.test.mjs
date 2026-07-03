import assert from 'node:assert/strict';
import { test } from 'vitest';
import { htmlToMarkdown, useNizel } from 'nizel';
import { mediaPlugin } from '../dist/index.js';

test('round-trips standalone images wrapped in figures', async () => {
  const nizel = useNizel({ plugins: [mediaPlugin()], unwrapStandaloneImages: false });
  const html = await nizel.html('![A cat](cat.png)');
  const back = htmlToMarkdown(html, { plugins: [mediaPlugin()] });
  assert.equal(back, '![A cat](cat.png)');
});

test('drops loading/decoding and caption on reverse', () => {
  const back = htmlToMarkdown(
    '<figure class="media-figure"><img src="x.png" alt="Hi" loading="lazy" decoding="async"><figcaption>Hi</figcaption></figure>',
    { plugins: [mediaPlugin()] },
  );
  assert.equal(back, '![Hi](x.png)');
});
