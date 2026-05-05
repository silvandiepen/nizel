import assert from 'node:assert/strict';
import { describe, test } from 'vitest';
import { htmlToMarkdown } from '../dist/index.js';

const lines = (...value) => value.join('\n');

describe('htmlToMarkdown block conversion', () => {
  test('converts heading levels and decodes heading entities', () => {
    assert.equal(
      htmlToMarkdown('<h1>Intro &amp; Goals</h1><h2>Scope</h2><h6>Fine print</h6>'),
      lines('# Intro & Goals', '', '## Scope', '', '###### Fine print'),
    );
  });

  test('converts paragraphs and collapses HTML source whitespace', () => {
    assert.equal(
      htmlToMarkdown('<p> One\n      two\t three </p><p>Four&nbsp;five</p>'),
      lines('One two three', '', 'Four five'),
    );
  });

  test('converts div and section wrappers without adding raw HTML', () => {
    assert.equal(
      htmlToMarkdown('<main><section><h2>Title</h2><div><p>Body</p></div></section></main>'),
      lines('## Title', '', 'Body'),
    );
  });

  test('converts thematic breaks', () => {
    assert.equal(htmlToMarkdown('<p>Before</p><hr><p>After</p>'), lines('Before', '', '---', '', 'After'));
  });

  test('converts blockquotes with nested block content', () => {
    assert.equal(
      htmlToMarkdown('<blockquote><h2>Quote</h2><p>First</p><p>Second</p></blockquote>'),
      lines('> ## Quote', '>', '> First', '>', '> Second'),
    );
  });

  test('converts line breaks in paragraphs and blockquotes', () => {
    assert.equal(
      htmlToMarkdown('<blockquote><p>Quoted<br>line</p></blockquote><p>A<br>B</p>'),
      lines('> Quoted', '> line', '', 'A', 'B'),
    );
  });
});

describe('htmlToMarkdown inline conversion', () => {
  test('converts inline formatting tags', () => {
    assert.equal(
      htmlToMarkdown('<p>Hello <strong>bold</strong>, <b>b</b>, <em>em</em>, <i>i</i>, <del>old</del>, <s>gone</s>.</p>'),
      'Hello **bold**, **b**, *em*, *i*, ~~old~~, ~~gone~~.',
    );
  });

  test('converts links with titles and URL escaping', () => {
    assert.equal(
      htmlToMarkdown('<p><a href="https://example.com/a b)" title="A &quot;title&quot;">Read ] docs</a></p>'),
      '[Read \\] docs](https://example.com/a%20b%29 "A \\"title\\"")',
    );
  });

  test('unwraps anchors without href', () => {
    assert.equal(htmlToMarkdown('<p><a name="top">Top</a></p>', { unsupported: 'drop' }), 'Top');
    assert.equal(htmlToMarkdown('<p><a>Top</a></p>'), 'Top');
  });

  test('converts images with alt and title attributes', () => {
    assert.equal(
      htmlToMarkdown('<p><img src="/logo large.png" alt="Logo ]" title="Brand"></p>'),
      '![Logo \\]](/logo%20large.png "Brand")',
    );
  });

  test('drops images without src', () => {
    assert.equal(htmlToMarkdown('<p>Before <img alt="Missing"> after</p>'), 'Before after');
  });

  test('unwraps span elements without attributes', () => {
    assert.equal(htmlToMarkdown('<p>A <span>small <em>piece</em></span>.</p>'), 'A small *piece*.');
  });

  test('preserves passthrough inline elements by default', () => {
    assert.equal(htmlToMarkdown('<p>Use <mark>highlight</mark> here.</p>'), 'Use <mark>highlight</mark> here.');
  });
});

describe('htmlToMarkdown code conversion', () => {
  test('converts inline code and decodes entities inside it', () => {
    assert.equal(htmlToMarkdown('<p>Use <code>x &lt; y</code>.</p>'), 'Use `x < y`.');
  });

  test('preserves inline code with non-language classes by default', () => {
    assert.equal(htmlToMarkdown('<p>Use <code class="token">x</code>.</p>'), 'Use <code class="token">x</code>.');
  });

  test('pads inline code when content touches a backtick', () => {
    assert.equal(htmlToMarkdown('<p><code>`value`</code></p>'), '`` `value` ``');
  });

  test('converts pre/code blocks and extracts language class', () => {
    assert.equal(
      htmlToMarkdown('<pre><code class="language-js">const tick = `value`;\n</code></pre>'),
      lines('```js', 'const tick = `value`;', '```'),
    );
  });

  test('chooses a safe code fence length for nested fences', () => {
    assert.equal(htmlToMarkdown('<pre><code>```nested```</code></pre>'), lines('````', '```nested```', '````'));
  });

  test('uses pre class as language fallback', () => {
    assert.equal(htmlToMarkdown('<pre class="language-ts">const x: number = 1;</pre>'), lines('```ts', 'const x: number = 1;', '```'));
  });

  test('preserves code blocks with non-language classes by default', () => {
    assert.equal(htmlToMarkdown('<pre class="snippet"><code>value</code></pre>'), '<pre class="snippet"><code>value</code></pre>');
  });
});

describe('htmlToMarkdown list conversion', () => {
  test('converts unordered lists', () => {
    assert.equal(htmlToMarkdown('<ul><li>One</li><li>Two</li></ul>'), lines('- One', '- Two'));
  });

  test('converts ordered lists with start offsets', () => {
    assert.equal(htmlToMarkdown('<ol start="3"><li>Three</li><li>Four</li></ol>'), lines('3. Three', '4. Four'));
  });

  test('converts list items with block children', () => {
    assert.equal(
      htmlToMarkdown('<ul><li><p>One</p><p>Extra</p></li><li><blockquote><p>Quote</p></blockquote></li></ul>'),
      lines('- One', '', '  Extra', '- > Quote'),
    );
  });

  test('converts nested lists with continuation indentation', () => {
    assert.equal(
      htmlToMarkdown('<ul><li>Parent<ul><li>Child</li></ul></li></ul>'),
      lines('- Parent', '  - Child'),
    );
  });
});

describe('htmlToMarkdown table conversion', () => {
  test('converts simple tables to GFM table syntax', () => {
    assert.equal(
      htmlToMarkdown(`
        <table>
          <thead><tr><th>Name</th><th>Value</th></tr></thead>
          <tbody><tr><td><strong>A</strong></td><td>1</td></tr></tbody>
        </table>
      `),
      lines('| Name | Value |', '| --- | --- |', '| **A** | 1 |'),
    );
  });

  test('pads missing table cells to the widest row', () => {
    assert.equal(
      htmlToMarkdown('<table><tr><th>A</th><th>B</th><th>C</th></tr><tr><td>1</td><td>2</td></tr></table>'),
      lines('| A | B | C |', '| --- | --- | --- |', '| 1 | 2 |  |'),
    );
  });

  test('preserves tables with cell attributes by default', () => {
    assert.equal(
      htmlToMarkdown('<table><tr><th colspan="2">Name</th></tr><tr><td>A</td><td>B</td></tr></table>'),
      '<table><tr><th colspan="2">Name</th></tr><tr><td>A</td><td>B</td></tr></table>',
    );
  });

  test('drops unsupported table structure in drop mode by emitting the best simple table', () => {
    assert.equal(
      htmlToMarkdown('<table><tr><th colspan="2">Name</th></tr><tr><td>A</td><td>B</td></tr></table>', {
        unsupported: 'drop',
      }),
      lines('| Name |  |', '| --- | --- |', '| A | B |'),
    );
  });
});

describe('htmlToMarkdown unsupported HTML policy', () => {
  test('preserves unsupported block HTML by default', () => {
    assert.equal(
      htmlToMarkdown('<p>Before</p><aside class="note"><p>Keep <button disabled>press</button></p></aside><p>After</p>'),
      lines('Before', '', '<aside class="note"><p>Keep <button disabled>press</button></p></aside>', '', 'After'),
    );
  });

  test('preserves semantic tags with unsupported attributes by default', () => {
    assert.equal(
      htmlToMarkdown('<h2 id="intro">Intro</h2><p class="lead">Keep style</p><a href="/x" target="_blank">External</a>'),
      lines('<h2 id="intro">Intro</h2>', '', '<p class="lead">Keep style</p>', '', '<a href="/x" target="_blank">External</a>'),
    );
  });

  test('converts semantic tags with supported attributes by default', () => {
    assert.equal(
      htmlToMarkdown('<p><a href="/x" title="Title">Link</a> <img src="/x.png" alt="X" title="Image"></p>'),
      '[Link](/x "Title") ![X](/x.png "Image")',
    );
  });

  test('drops unsupported markup while keeping readable text', () => {
    assert.equal(
      htmlToMarkdown('<p>Before</p><aside class="note"><p>Keep <button disabled>press</button></p></aside><p>After</p>', {
        unsupported: 'drop',
      }),
      lines('Before', '', 'Keep press', '', 'After'),
    );
  });

  test('drops unsupported attributes in drop mode and converts the element content', () => {
    assert.equal(
      htmlToMarkdown('<h2 id="intro">Intro</h2><p class="lead">Keep style</p><a href="/x" target="_blank">External</a>', {
        unsupported: 'drop',
      }),
      lines('## Intro', '', 'Keep style', '', '[External](/x)'),
    );
  });

  test('keeps comments in preserve mode and omits them in drop mode', () => {
    assert.equal(htmlToMarkdown('A<!-- note -->B'), 'A<!-- note -->B');
    assert.equal(htmlToMarkdown('A<!-- note -->B', { unsupported: 'drop' }), 'A B');
  });

  test('preserves declarations, processing instructions, and CDATA as source text', () => {
    assert.equal(
      htmlToMarkdown('<!DOCTYPE html><?xml version="1.0"?><![CDATA[x < y]]><p>Body</p>'),
      lines('<!DOCTYPE html><?xml version="1.0"?><![CDATA[x < y]]>', '', 'Body'),
    );
  });
});

describe('htmlToMarkdown parser tolerance', () => {
  test('preserves unclosed unsupported elements by default', () => {
    assert.equal(htmlToMarkdown('<custom><p>Open'), '<custom><p>Open');
  });

  test('keeps unmatched closing tags as text', () => {
    assert.equal(htmlToMarkdown('<p>Text</p></orphan>'), lines('Text', '', '</orphan>'));
  });

  test('handles uppercase tag and attribute names', () => {
    assert.equal(htmlToMarkdown('<H2>Title</H2><A HREF="/x" TITLE="T">Link</A>'), lines('## Title', '', '[Link](/x "T")'));
  });

  test('handles boolean attributes as unsupported attributes', () => {
    assert.equal(htmlToMarkdown('<p><button disabled>Save</button></p>'), '<button disabled>Save</button>');
    assert.equal(htmlToMarkdown('<p><button disabled>Save</button></p>', { unsupported: 'drop' }), 'Save');
  });
});
