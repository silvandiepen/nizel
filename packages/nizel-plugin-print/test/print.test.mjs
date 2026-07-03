import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'vitest';
import { useNizel } from 'nizel';
import { printPlugin } from '../dist/index.js';

const render = (markdown, options = {}) => useNizel({ plugins: [printPlugin({ injectCss: false, ...options })] }).html(markdown);

test('renders pagebreak', async () => {
  const html = await render(':::pagebreak\n:::');
  assert.equal(html, '<div class="nizel-pagebreak" aria-hidden="true"></div>');
});

test('renders pagebreak-before', async () => {
  const html = await render(':::pagebreak-before\n# New section\n:::');
  assert.match(html, /^<div class="nizel-pagebreak-before"><h1 id="new-section">New section<\/h1><\/div>$/);
});

test('renders pagebreak-after', async () => {
  const html = await render(':::pagebreak-after\nEnd of section.\n:::');
  assert.equal(html, '<div class="nizel-pagebreak-after"><p>End of section.</p></div>');
});

test('renders keep', async () => {
  const html = await render(':::keep\nThis block should stay together.\n:::');
  assert.equal(html, '<div class="nizel-keep"><p>This block should stay together.</p></div>');
});

test('renders print-only', async () => {
  const html = await render(':::print-only\nPrinted copy.\n:::');
  assert.equal(html, '<div class="nizel-print-only"><p>Printed copy.</p></div>');
});

test('renders screen-only', async () => {
  const html = await render(':::screen-only\n[Open demo](./demo)\n:::');
  assert.equal(html, '<div class="nizel-screen-only"><p><a href="./demo">Open demo</a></p></div>');
});

test('renders no-print', async () => {
  const html = await render(':::no-print\nThis video is not included.\n:::');
  assert.equal(html, '<div class="nizel-no-print"><p>This video is not included.</p></div>');
});

test('renders print-wide', async () => {
  const html = await render(':::print-wide\n| Very | Wide | Table |\n|---|---|---|\n| A | B | C |\n:::');
  assert.match(html, /^<div class="nizel-print-wide"><table>/);
  assert.match(html, /<td>A<\/td><td>B<\/td><td>C<\/td>/);
});

test('does not transform fenced code', async () => {
  const html = await render('```md\n:::pagebreak\n:::\n```');
  assert.match(html, /<code class="language-md">:::pagebreak\n:::\n<\/code>/);
  assert.doesNotMatch(html, /nizel-pagebreak/);
});

test('does not transform inline code', async () => {
  const html = await render('`:::pagebreak`');
  assert.equal(html, '<p><code>:::pagebreak</code></p>');
});

test('does not transform raw html blocks', async () => {
  const html = await useNizel({ plugins: [printPlugin({ injectCss: false })] }).html(
    '<div>\n:::pagebreak\n:::\n</div>',
    { safe: false },
  );
  assert.equal(html, '<div>\n:::pagebreak\n:::\n</div>');
});

test('does not transform escaped syntax', async () => {
  const html = await render('\\:::pagebreak');
  assert.equal(html, '<p>:::pagebreak</p>');
});

test('emits metadata when collectMetadata is true', async () => {
  const result = await useNizel({ plugins: [printPlugin({ injectCss: false })] })(
    ':::pagebreak\n:::\n\n:::keep\nKeep this.\n:::\n\n:::no-print\nSkip this.\n:::',
  );

  assert.deepEqual(result.meta.print.controls, [
    { type: 'pagebreak' },
    { type: 'keep' },
    { type: 'no-print' },
  ]);
});

test('collects supported print settings from metadata', async () => {
  const result = await useNizel({
    plugins: [printPlugin({ injectCss: false })],
    meta: {
      print: {
        title: 'Markdown Plugin Guide',
        pageSize: 'A4',
        orientation: 'portrait',
        margins: 'normal',
        showDate: true,
        showUrl: true,
      },
    },
  })(':::pagebreak\n:::');

  assert.deepEqual(result.meta.print.settings, {
    title: 'Markdown Plugin Guide',
    pageSize: 'A4',
    orientation: 'portrait',
    margins: 'normal',
    showDate: true,
    showUrl: true,
  });
});

test('does not emit metadata when collectMetadata is false', async () => {
  const result = await useNizel({ plugins: [printPlugin({ collectMetadata: false, injectCss: false })] })(':::pagebreak\n:::');
  assert.equal(result.meta.print, undefined);
});

test('injects default css when enabled', async () => {
  const html = await useNizel({ plugins: [printPlugin()] }).html(':::pagebreak\n:::');
  assert.match(html, /^<style data-nizel-plugin="print">@media print/);
  assert.match(html, /\.nizel-screen-only,\n  \.nizel-no-print/);
});

test('css file exists and contains required print rules', async () => {
  const css = await readFile(new URL('../style.css', import.meta.url), 'utf8');
  assert.match(css, /@media print/);
  assert.match(css, /\.nizel-pagebreak/);
  assert.match(css, /break-after: page/);
  assert.match(css, /page-break-after: always/);
  assert.match(css, /\.nizel-pagebreak-before/);
  assert.match(css, /break-before: page/);
  assert.match(css, /\.nizel-pagebreak-after/);
  assert.match(css, /\.nizel-keep/);
  assert.match(css, /break-inside: avoid/);
  assert.match(css, /\.nizel-screen-only,\n  \.nizel-no-print/);
  assert.match(css, /display: none !important/);
  assert.match(css, /@media screen/);
});
