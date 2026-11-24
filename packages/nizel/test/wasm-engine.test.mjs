import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { tests } from 'commonmark-spec';
import { test } from 'vitest';
import * as stock from '../dist/index.js';
import { extractFrontmatter } from '../dist/frontmatter.js';

// The Rust engine may decline what it has not ported yet, but whatever it
// produces must be byte-identical to the JavaScript engine.
const bytes = await readFile(new URL('../dist/wasm/engine.wasm', import.meta.url));
const { instance } = await WebAssembly.instantiate(bytes, { env: { claim: () => -1 } });
const { memory, input, output, render } = instance.exports;
const encoder = new TextEncoder();
const decoder = new TextDecoder();
const engineRender = (source, flags) => {
  const encoded = encoder.encode(source);
  // input() may grow memory, which detaches earlier views of it.
  const at = input(encoded.length);
  new Uint8Array(memory.buffer, at, encoded.length).set(encoded);
  const length = render(encoded.length, flags);
  return length < 0 ? undefined : decoder.decode(new Uint8Array(memory.buffer, output(), length));
};

const profiles = [
  { name: 'default', options: {}, flags: 1 | 2 | 4 },
  { name: 'bare', options: { anchors: false, autolinks: false, frontmatter: false, safe: false }, flags: 0 },
  { name: 'classic slugs', options: { slugStyle: 'classic' }, flags: 1 | 2 | 4 | 8 },
];

for (const profile of profiles) {
  test(`engine never differs from JavaScript on the CommonMark corpus (${profile.name})`, async () => {
    const nizel = stock.useNizel(profile.options);
    let handled = 0;
    for (const example of tests) {
      const markdown = example.markdown.replaceAll('→', '\t');
      const source = profile.options.frontmatter === false ? markdown : extractFrontmatter(markdown).markdown;
      if (source.includes('{{')) continue;
      const actual = engineRender(source, profile.flags);
      if (actual === undefined) continue;
      handled += 1;
      assert.equal(actual, await nizel.html(markdown), `#${example.number} (${example.section})`);
    }
    assert.ok(handled > 0);
  });
}

test('engine heading ids match JavaScript for accents, case boundaries and repeats', async () => {
  const headings = ['# Café Déjà vu', '# HTMLParser and camelCase', '# Ñandú 🚀 Straße', '# Repeat\n\n# Repeat\n\n# Repeat', '# !!!', '# ŞİMDİ', '# Ελληνικά ΣΑΣ'];
  for (const style of [undefined, 'classic']) {
    const nizel = stock.useNizel(style ? { slugStyle: style } : {});
    for (const source of headings) {
      const actual = engineRender(source, 1 | 2 | 4 | (style ? 8 : 0));
      assert.notEqual(actual, undefined, source);
      assert.equal(actual, await nizel.html(source), `${style ?? 'github'}: ${source}`);
    }
  }
});

test('engine never differs from JavaScript on 20,000 fuzzed documents', async () => {
  const { execFileSync } = await import('node:child_process');
  const output = execFileSync(process.execPath, ['scripts/wasm-fuzz.mjs', '--count', '20000', '--seed', '3'], {
    cwd: new URL('..', import.meta.url),
    encoding: 'utf8',
  });
  // Forward, reverse, decoded AST, hook path and plugin reverse counts must all be zero.
  assert.doesNotMatch(output, /[1-9]\d* differences/, output);
  assert.equal(output.match(/ 0 differences/g)?.length, 5, output);
}, 240000);

test('quoted lines with line separators render on the engine, as in JavaScript (NIZEL-002)', async () => {
  for (const source of ['x\n\n> a\u2028b', '> a\u2028b\nskipped\nkept', '<b>\n  indented*h\n    - \n> - \u2028)<span a=1><!X', '> one\n> two\u2029three\nlazy']) {
    assert.equal(engineRender(source, 1 | 2 | 4), await stock.useNizel().html(source), JSON.stringify(source));
  }
});

test('lone surrogates go through the engine and match JavaScript in every direction', async () => {
  const backend = await import('../dist/wasm/backend.js');
  const { parseMarkdown } = await import('../dist/parse.js');
  const parseOptions = { anchors: true, autolinks: { enabled: true }, blocks: {}, safe: true, slugStyle: undefined };
  const wasm = await import('../dist/wasm.js');
  const markdown = [
    'a \uD800 b', '*x\uDC00*', '# H\uD83D', '[\uD800](x)', '[a](/u\uDE80)', '<http://e.com/\uD800>',
    // Real Private Use characters next to lone surrogates: the markers move to a free block.
    ' \uD800 ', ' \uDC00', '&#xE000; \uD800', '&#xD83D;&#xDE80; \uDE80',
  ];
  for (const source of markdown) {
    const expected = await stock.useNizel().html(source);
    assert.equal(backend.renderWasm(source, {}), expected, JSON.stringify(source));
    assert.deepEqual(backend.parseWasm(source, {}), parseMarkdown(source, parseOptions), JSON.stringify(source));
    assert.equal(await wasm.useNizel().html(source), expected);
  }
  const html = [
    '<p>\uD800 lone</p>', '<p>a&#xD83D;b</p>', '<p>&#xD83D;&#xDE80;</p>', '<p>\uDE80 x &#xE000;</p>',
    '<p> and &#xD800;</p>', '<a title="\uD800" href="x">t</a>', '<p><kbd>\uDC00</kbd></p>',
  ];
  for (const source of html) {
    assert.equal(backend.reverseWasm(source), stock.htmlToMarkdown(source), JSON.stringify(source));
  }
  // Every one of these was the engine's, not a fallback.
  assert.ok(markdown.every(source => backend.renderWasm(source, {}) !== undefined));
  assert.ok(html.every(source => backend.reverseWasm(source) !== undefined));
});

test('a retry in another marker block runs the plugin handlers in a fresh session', async () => {
  const backend = await import('../dist/wasm/backend.js');
  // An epilogue entry per <kbd>: a repeated session would list it twice.
  const notes = { name: 'notes', htmlToMarkdownTags: ['kbd'], htmlToMarkdown: (node, ctx) => {
    if (node.tag !== 'kbd') return undefined;
    ctx.epilogue(`[^k]: ${ctx.text(node)}`);
    return `[^k]`;
  } };
  // A real U+E000 and a surrogate entity: the first block is taken, so the engine asks for the next one.
  const html = '<p>\uE000 <kbd>K</kbd> &#xD800;</p>';
  const expected = stock.htmlToMarkdown(html, { plugins: [notes] });
  assert.equal(backend.reverseWasm(html, { plugins: [notes] }), expected);
  assert.equal(expected.split('[^k]: K').length, 2);
});

test('a handler that throws throws through the entry point, and the engine keeps working', async () => {
  const backend = await import('../dist/wasm/backend.js');
  // ctx.text decodes entities; an out-of-range one throws in JavaScript (NIZEL-003).
  const text = { name: 'text', htmlToMarkdownTags: ['kbd'], htmlToMarkdown: (node, ctx) => (node.tag === 'kbd' ? `<kbd>${ctx.text(node)}</kbd>` : undefined) };
  const html = '<p>a <kbd>&#1114112;</kbd> b</p>';
  assert.throws(() => stock.htmlToMarkdown(html, { plugins: [text] }), { name: 'RangeError', message: 'Invalid code point 1114112' });
  assert.throws(() => backend.reverseWasm(html, { plugins: [text] }), { name: 'RangeError', message: 'Invalid code point 1114112' });
  // The throw did not cross the engine's frames: it still converts, with and without handlers.
  assert.equal(backend.reverseWasm('<p><kbd>K</kbd> <b>x</b></p>', { plugins: [text] }), stock.htmlToMarkdown('<p><kbd>K</kbd> <b>x</b></p>', { plugins: [text] }));
  assert.equal(backend.reverseWasm('<p><b>x</b></p>'), '**x**');
  assert.equal(backend.renderWasm('*x*', {}), '<p><em>x</em></p>');
});

test('the engine scans paragraphs with @ (a table without a needle list) safely', async () => {
  // A Wasm SIMD build of the scans indexed the empty needle list here and
  // panicked on 16+ bytes after the scan position.
  for (const source of ['mail a@b.c and then quite a lot more text after it', '@'.repeat(40), 'x@y '.repeat(30) + '*z*']) {
    assert.equal(engineRender(source, 1 | 2 | 4), await stock.useNizel().html(source), source);
    assert.equal(engineRender(source, 0), await stock.useNizel({ anchors: false, autolinks: false, frontmatter: false, safe: false }).html(source), source);
  }
});

test('a task item opening a fence keeps tier 1 from cutting a stretch inside it', async () => {
  // Found by the fuzzer: after a task box, an item's content can be a fence,
  // which stays open across a blank line and takes the next lines lazily.
  for (const source of [
    "[r]: /url　||\n- [x] ``` filename='b' {2,1.5,x,0x3,1e1}\n\nlazy[r]: /url\n  - ===",
    'http://x.y)\n- [x] ```js filename="a.js" {1-3,5}\n\nn-1: 2\n***<https://e.com/a?b>[a [b] c](d)',
  ]) {
    assert.equal(engineRender(source, 1 | 2 | 4), await stock.useNizel().html(source), JSON.stringify(source));
  }
});

test('a fence-looking line inside a table is a row, not a fence', async () => {
  // Found by the tier-1 fuzzer: rows go on while a line holds `|`, so a
  // column-0 "```a | b" after table rows is a row.
  const source = '\n10. ten\n| a | b |\n| --- | --- |\n| 1 | 2 |\n```a | b\n---|---\nc | d`a|b`\n- a\n  ```\n\ntext\n  ``` \n007. bond_u_---\n1. item\n\n   ```swift\n   code\n\n   ```\n';
  assert.equal(engineRender(source, 0), await stock.useNizel({ anchors: false, autolinks: false, frontmatter: false, safe: false }).html(source));
  assert.equal(engineRender(source, 1 | 2 | 4), await stock.useNizel().html(source));
});

test('a quoted definition after a tab or extra spaces defines its reference', async () => {
  // Found by the JS fuzzer: extraction reads `>`, any one whitespace
  // character and up to three spaces before a definition's `[`, so tier 1
  // must not take such a line as plain text.
  const bare = stock.useNizel({ anchors: false, autolinks: false, frontmatter: false, safe: false });
  for (const source of [
    '1. \\_\\\n1) [a](b(c)d)<\n>\t[r]: /urlK\n    code\n\n````\n[a]b]\n[r]: <a b>\n',
    'text [r]\n\n>  [r]: /u\n\n```\n[x]: /y\n```\n',
  ]) {
    assert.equal(engineRender(source, 0), await bare.html(source), JSON.stringify(source));
    assert.equal(engineRender(source, 1 | 2 | 4), await stock.useNizel().html(source), JSON.stringify(source));
  }
});

test('a render after one with mapped lone surrogates keeps Private Use characters in hrefs', async () => {
  // Found by the JS fuzzer: the mapped render left the engine's marker flag
  // set, and the next document's stretches read U+E000 in a URL as a marker.
  const backend = await import('../dist/wasm/backend.js');
  const bare = { anchors: false, autolinks: false, frontmatter: false, safe: false };
  const mapped = '&#xD800;"<!X**b**\ude80[a [b] c](d)&amp;\n* [X] > ![x][r]HTTP://Up.case';
  const next = '[r]:\n/u\n2. )&copy;---[t](/u "a\\"b")![x][r]-####### *k**<![CDATA[';
  assert.equal(backend.renderWasm(mapped, bare), await stock.useNizel(bare).html(mapped));
  assert.equal(backend.renderWasm(next, bare), await stock.useNizel(bare).html(next));
});

test('underscore emphasis and code spans inside emphasis match the JavaScript engine', async () => {
  // Tier 1 renders these paragraphs itself; the code span binds before the
  // closer, and an intraword or unmatched underscore leaves it to the full engine.
  const bare = stock.useNizel({ anchors: false, autolinks: false, frontmatter: false, safe: false });
  for (const source of [
    '_Reviewed with the full diff and the CI logs from run `#4821`._\n',
    'A *see `x`* b __init__ c, _a `b_` c_ and _x `c_ d.\n\nsnake_case _x_y_ (_z_) _1_.\n',
    'Text _a `b` `c`_ and **`a`**, _a\nb_ then __x_ and _`a_`_.\n',
  ]) {
    assert.equal(engineRender(source, 0), await bare.html(source), JSON.stringify(source));
    assert.equal(engineRender(source, 1 | 2 | 4), await stock.useNizel().html(source), JSON.stringify(source));
  }
});

test('an HTML block handed to the full engine in safe mode keeps reference definitions exact', async () => {
  // Extraction skips an HTML block by its own rule whatever `safe` is; tier 1
  // skips its definition check only when that block is exactly what the full
  // engine took. An unclosed processing instruction runs past the last line
  // (found by the JS fuzzer: it must not panic).
  const bare = stock.useNizel({ anchors: false, autolinks: false, frontmatter: false, safe: false });
  for (const source of [
    '<p align="center">\n  <img src="a.svg">\n</p>\n\n# T\n\n```\n[x]: /u\n```\n\n[x]\n',
    '<div>\n[x]: /u\n</div>\n\n[x]\n',
    ' <?x!',
    '\n> [q]: /q\n[t](/u "ti")&#99999999;<img src=\'y\' />\n   <!XKHTTP://Up.case',
  ]) {
    assert.equal(engineRender(source, 0), await bare.html(source), JSON.stringify(source));
    assert.equal(engineRender(source, 1 | 2 | 4), await stock.useNizel().html(source), JSON.stringify(source));
  }
});

test('a document with U+2028 in list items after one without keeps list markers exact', async () => {
  // Tier 1 tells the list rules a document has no line terminators besides
  // its newlines; that must not outlive the document it was found for.
  const bare = stock.useNizel({ anchors: false, autolinks: false, frontmatter: false, safe: false });
  for (const source of [
    '1. one\n   - nested\n2. two\n',
    '1. one\n   - a b\n2. two \n- c \n',
    '- x\n  - y\n\ntext\n\n- [ ]  task\n',
  ]) {
    assert.equal(engineRender(source, 0), await bare.html(source), JSON.stringify(source));
    assert.equal(engineRender(source, 1 | 2 | 4), await stock.useNizel().html(source), JSON.stringify(source));
  }
});
