import assert from 'node:assert/strict';
import { test } from 'vitest';
import { useNizel } from '../dist/index.js';

const render = (markdown, options) => useNizel(options).html(markdown);

test('CommonMark ATX headings require valid marker shape', async () => {
  assert.equal(await render('# Heading'), '<h1 id="heading">Heading</h1>');
  assert.equal(await render('### Heading ###'), '<h3 id="heading">Heading</h3>');
  assert.equal(await render('####### not a heading'), '<p>####### not a heading</p>');
});

test('CommonMark setext headings render as level one and two headings', async () => {
  assert.equal(await render('Heading\n='), '<h1 id="heading">Heading</h1>');
  assert.equal(await render('Heading\n---'), '<h2 id="heading">Heading</h2>');
});

test('CommonMark indented and fenced code blocks render safely', async () => {
  assert.equal(await render('    const x = 1;'), '<pre><code>const x = 1;\n</code></pre>');
  assert.equal(await render('~~~js\nconst x = 1;\n~~~'), '<pre><code class="language-js">const x = 1;\n</code></pre>');
  assert.equal(await render('````\n``` inside\n```\n````'), '<pre><code>``` inside\n```\n</code></pre>');
});

test('CommonMark thematic breaks accept hyphen, asterisk, and underscore runs', async () => {
  assert.equal(await render('---'), '<hr />');
  assert.equal(await render('***'), '<hr />');
  assert.equal(await render('___'), '<hr />');
});

test('CommonMark block quotes can contain nested blocks', async () => {
  assert.equal(
    await render('> # Quote\n>\n> text'),
    '<blockquote>\n<h1 id="quote">Quote</h1>\n<p>text</p>\n</blockquote>',
  );
});

test('CommonMark ordered list markers support dot and parenthesis markers', async () => {
  assert.equal(await render('1. one\n2. two'), '<ol>\n<li>one</li>\n<li>two</li>\n</ol>');
  assert.equal(await render('3) three\n4) four'), '<ol start="3">\n<li>three</li>\n<li>four</li>\n</ol>');
});

test('CommonMark backslash escapes and entities render as literal characters', async () => {
  assert.equal(await render('\\*not emphasis\\*'), '<p>*not emphasis*</p>');
  assert.equal(await render('&amp; &lt; &#35; &#x41;'), '<p>&amp; &lt; # A</p>');
});

test('CommonMark hard line breaks render br elements', async () => {
  assert.equal(await render('one  \ntwo'), '<p>one<br />\ntwo</p>');
  assert.equal(await render('one\\\ntwo'), '<p>one<br />\ntwo</p>');
});

test('CommonMark code spans normalize internal whitespace', async () => {
  assert.equal(await render('`` foo   bar ``'), '<p><code>foo   bar</code></p>');
});

test('CommonMark inline reference links and images resolve definitions', async () => {
  assert.equal(
    await render('[site][ref]\n\n[ref]: https://example.com "Example"'),
    '<p><a href="https://example.com" title="Example">site</a></p>',
  );
  assert.equal(
    await render('![alt][img]\n\n[img]: /image.png "Image"'),
    '<p><img src="/image.png" alt="alt" title="Image" /></p>',
  );
  assert.equal(
    await render('[site]\n\n[site]: https://example.com "Example"'),
    '<p><a href="https://example.com" title="Example">site</a></p>',
  );
  assert.equal(
    await render('![alt]\n\n[alt]: /image.png "Image"'),
    '<p><img src="/image.png" alt="alt" title="Image" /></p>',
  );
});

test('CommonMark angle autolinks render independently of bare autolinks', async () => {
  assert.equal(
    await render('<https://example.com?find=\\*>', { autolinks: false, safe: false }),
    '<p><a href="https://example.com?find=%5C*">https://example.com?find=\\*</a></p>',
  );
  assert.equal(
    await render('<user@example.com>', { autolinks: false }),
    '<p><a href="mailto:user@example.com">user@example.com</a></p>',
  );
});

test('standalone image paragraphs can be unwrapped as a render option', async () => {
  assert.equal(await render('![alt](/image.png)'), '<p><img src="/image.png" alt="alt" /></p>');
  assert.equal(
    await render('![alt](/image.png)', { unwrapStandaloneImages: true }),
    '<img src="/image.png" alt="alt" />',
  );
  assert.equal(
    await render('before ![alt](/image.png)', { unwrapStandaloneImages: true }),
    '<p>before <img src="/image.png" alt="alt" /></p>',
  );
});

test('CommonMark raw HTML passes through only when safe mode is disabled', async () => {
  assert.equal(await render('<div>raw</div>'), '<p>&lt;div&gt;raw&lt;/div&gt;</p>');
  assert.equal(await render('<div>raw</div>', { safe: false }), '<div>raw</div>');
});

test('GFM tables and task list markers render supported extensions', async () => {
  assert.equal(
    await render('| A | B |\n| :--- | ---: |\n| x | y |'),
    '<table><thead><tr><th align="left">A</th><th align="right">B</th></tr></thead><tbody><tr><td align="left">x</td><td align="right">y</td></tr></tbody></table>',
  );
  assert.equal(
    await render('- [x] done\n- [ ] todo'),
    '<ul>\n<li data-checked>done</li>\n<li>todo</li>\n</ul>',
  );
});
