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
  assert.match(html, /data-nizel-hidden-comment/);
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

test('restores many standalone and inline comments in order', async () => {
  const count = 600;
  const markdown = Array.from({ length: count }, (_, index) =>
    '<!-- standalone ' + index + ' -->\n\nBefore <!-- inline ' + index + ' -->after',
  ).join('\n\n');
  const html = await render(markdown);
  const comments = [...html.matchAll(/&lt;!-- (standalone|inline) ([0-9]+) --&gt;/g)]
    .map(([, placement, index]) => [placement, Number(index)]);
  assert.deepEqual(comments, Array.from({ length: count }, (_, index) =>
    [['standalone', index], ['inline', index]],
  ).flat());
  assert.doesNotMatch(html, /<p><span[^>]*>&lt;!-- standalone/);
  assert.match(html, /<\/span>after<\/p>/);
  assert.doesNotMatch(html, /NIZEL_HIDDEN_COMMENT_/);
});

test('leaves unrelated placeholders intact alongside real comments', async () => {
  const lookalike = 'NIZEL_HIDDEN_COMMENT_999999_unrelated';
  const html = await render(lookalike + '\n\n<!-- real comment -->');
  assert.match(html, new RegExp('<p>' + lookalike + '</p>'));
  assert.match(html, /&lt;!-- real comment --&gt;/);
});

test('preserves existing dollar substitution in comment output', () => {
  const plugin = hiddenCommentsPlugin();
  const token = plugin.hooks.beforeParse('<!-- $$ -->');
  const html = plugin.hooks.afterRender('<p>' + token + '</p>');
  assert.match(html, /&lt;!-- \$ --&gt;<\/span>$/);
});
