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

test('engine declines the blockquote input that never terminates in JavaScript (NIZEL-002)', async () => {
  assert.equal(engineRender('x\n\n> a\u2028b', 1 | 2 | 4), undefined);
  // The fuzzer's variant: a quoted list line after other content.
  assert.equal(engineRender('<b>\n  indented*h\n    - \n> - \u2028)<span a=1><!X', 1 | 2 | 4), undefined);
  // At the start of a document the JavaScript does terminate: an empty quote, and the next line is skipped.
  assert.equal(engineRender('> a\u2028b\nskipped\nkept', 1 | 2 | 4), await stock.useNizel().html('> a\u2028b\nskipped\nkept'));
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
