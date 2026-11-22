import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { tests } from 'commonmark-spec';
import { test } from 'vitest';
import * as stock from '../dist/index.js';
import { extractFrontmatter } from '../dist/frontmatter.js';

// The Rust engine may decline what it has not ported yet, but whatever it
// produces must be byte-identical to the JavaScript engine.
const bytes = await readFile(new URL('../dist/wasm/engine.wasm', import.meta.url));
const { instance } = await WebAssembly.instantiate(bytes);
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
  assert.match(output, / 0 differences/, output);
}, 120000);
