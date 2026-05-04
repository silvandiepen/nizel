import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'vitest';
import { useNizel } from 'nizel';
import { fallback, shikiPlugin } from '../dist/index.js';
import { createJavaScriptShikiHighlighter } from '../dist/javascript.js';

const ctx = {
  escape(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  },
};

test('unit: renders safe fallback code markup', () => {
  assert.equal(
    fallback({ type: 'code', code: 'x < y\n', lang: 'js' }, ctx),
    '<pre><code class="language-js">x &lt; y\n</code></pre>',
  );
});

test('integration: uses a provided highlighter and falls back safely', async () => {
  const highlighted = useNizel({
    plugins: [shikiPlugin({ highlighter: (code) => `<pre class="hl">${code}</pre>` })],
  });
  const fallback = useNizel({ plugins: [shikiPlugin()] });

  assert.match(await highlighted.html('```js\nx\n```'), /class="hl"/);
  assert.match(await fallback.html('```js\nx\n```'), /language-js/);
});

test('unit: creates a Shiki highlighter with the JavaScript regex engine', async () => {
  const highlighter = await createJavaScriptShikiHighlighter({
    themes: ['github-dark'],
    langs: ['javascript'],
    defaultLang: 'javascript',
    defaultTheme: 'github-dark',
  });

  const html = highlighter('const value = true;', {});

  assert.match(html, /<pre class="shiki github-dark"/);
  assert.match(html, /const/);
});

test('integration: highlights fenced code with the JavaScript regex engine helper', async () => {
  const highlighter = await createJavaScriptShikiHighlighter({
    themes: ['github-dark'],
    langs: ['javascript'],
    defaultLang: 'javascript',
    defaultTheme: 'github-dark',
  });
  const nizel = useNizel({
    plugins: [shikiPlugin({ highlighter })],
  });

  const html = await nizel.html('```js\nconst value = true;\n```');

  assert.match(html, /<pre class="shiki github-dark"/);
  assert.doesNotMatch(html, /language-js/);
});

test('unit: keeps Shiki imports isolated to the JavaScript helper entrypoint', async () => {
  const [rootEntrypoint, javascriptEntrypoint] = await Promise.all([
    readFile(new URL('../dist/index.js', import.meta.url), 'utf8'),
    readFile(new URL('../dist/javascript.js', import.meta.url), 'utf8'),
  ]);

  assert.doesNotMatch(rootEntrypoint, /from 'shiki/);
  assert.doesNotMatch(javascriptEntrypoint, /from 'shiki';/);
  assert.match(javascriptEntrypoint, /from 'shiki\/core'/);
  assert.match(javascriptEntrypoint, /shiki\/engine\/javascript/);
});
