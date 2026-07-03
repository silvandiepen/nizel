import assert from 'node:assert/strict';
import { test } from 'vitest';
import { htmlToMarkdown, useNizel } from 'nizel';
import { alertPlugin } from '../dist/index.js';

test('round-trips GitHub alert HTML back to a custom block', async () => {
  const nizel = useNizel({ plugins: [alertPlugin()] });
  const html = await nizel.html('> [!NOTE]\n> Hello world');
  const back = htmlToMarkdown(html, { plugins: [alertPlugin()] });
  assert.equal(back, '::note Note\nHello world\n::');
});

test('round-trips custom alert syntax and warning type', async () => {
  const nizel = useNizel({ plugins: [alertPlugin()] });
  const html = await nizel.html('::warning Careful\n\nBe safe.\n::');
  const back = htmlToMarkdown(html, { plugins: [alertPlugin()] });
  assert.equal(back, '::warning Careful\nBe safe.\n::');
});

test('leaves plain divs untouched when no plugin is supplied', () => {
  const back = htmlToMarkdown('<div class="alert alert--note" data-alert="note"><p class="alert__title">Note</p></div>');
  assert.match(back, /data-alert="note"/);
});
