import assert from 'node:assert/strict';
import { test } from 'vitest';
import { htmlToMarkdown, useNizel } from 'nizel';
import {
  hiddenCommentsPlugin,
  hiddenCommentsToMarkdown,
  transformMarkdownComments,
} from '../dist/index.js';

const render = (markdown, options = {}) => {
  return useNizel({ plugins: [hiddenCommentsPlugin({ injectCss: false, ...options })] }).html(markdown);
};

test('hides comments by default while keeping copyable text', async () => {
  const html = await render('Before <!-- note --> after');
  assert.match(html, /data-nizel-hidden-comment/);
  assert.match(html, /nizel-hidden-comment--hide/);
  assert.match(html, /&lt;!-- note --&gt;/);
});

test('renders comments visibly in render mode', async () => {
  const html = await render('Before <!-- note --> after', { mode: 'render' });
  assert.match(html, /nizel-hidden-comment--render/);
  assert.match(html, /&lt;!-- note --&gt;/);
});

test('renders comments as small text in small mode', async () => {
  const html = await render('Before <!-- note --> after', { mode: 'small' });
  assert.match(html, /nizel-hidden-comment--small/);
  assert.match(html, /&lt;!-- note --&gt;/);
});

test('removes comments in remove mode', async () => {
  const html = await render('Before <!-- note --> after', { mode: 'remove' });
  assert.equal(html, '<p>Before  after</p>');
});

test('preserves multiline comments outside fenced code', async () => {
  const html = await render('A\n\n<!-- one\ntwo -->\n\nB');
  assert.match(html, /&lt;!-- one\ntwo --&gt;/);
});

test('does not transform comments in fenced code', async () => {
  const html = await render('```html\n<!-- note -->\n```');
  assert.match(html, /<code class="language-html">&lt;!-- note --&gt;\n<\/code>/);
  assert.doesNotMatch(html, /data-nizel-hidden-comment/);
});

test('converts hidden comment spans back to markdown comments', () => {
  const markdown = htmlToMarkdown(
    '<p>Before <span class="nizel-hidden-comment nizel-hidden-comment--hide" data-nizel-hidden-comment>&lt;!-- note --&gt;</span> after</p>',
    { plugins: [{ htmlToMarkdown: hiddenCommentsToMarkdown() }] },
  );

  assert.equal(markdown, 'Before <!-- note --> after');
});

test('does not inject css by default', async () => {
  const html = await useNizel({ plugins: [hiddenCommentsPlugin()] }).html('<!-- note -->');
  assert.doesNotMatch(html, /^<style data-nizel-plugin="hidden-comments">/);
});

test('injects css when explicitly enabled', async () => {
  const html = await useNizel({ plugins: [hiddenCommentsPlugin({ injectCss: true })] }).html('<!-- note -->');
  assert.match(html, /^<style data-nizel-plugin="hidden-comments">/);
  assert.match(html, /\.nizel-hidden-comment--hide/);
});

test('exports the markdown transformer', () => {
  assert.match(transformMarkdownComments('A <!-- note --> B'), /data-nizel-hidden-comment/);
});
