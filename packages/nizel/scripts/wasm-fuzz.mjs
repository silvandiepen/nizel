// Differential fuzzer: random Markdown through the Rust engine and the
// JavaScript engine; any byte difference is a bug. Declined inputs are
// counted, not compared.
//
//   node scripts/wasm-fuzz.mjs [--count 200000] [--seed 1] [--show 5]
import { readFile } from 'node:fs/promises';
import * as stock from '../dist/index.js';
import { extractFrontmatter } from '../dist/frontmatter.js';

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(name);
  return index === -1 ? fallback : Number(args[index + 1]);
};
const count = option('--count', 200000);
let seed = option('--seed', 1) >>> 0;
const show = option('--show', 5);
const showDeclined = option('--declined', 0);
const declinedSamples = [];

const bytes = await readFile(new URL('../dist/wasm/engine.wasm', import.meta.url));
const { instance } = await WebAssembly.instantiate(bytes);
const { memory, input, output, render, reverse } = instance.exports;
const encoder = new TextEncoder();
const decoder = new TextDecoder();
const engineRender = (source, flags) => {
  const encoded = encoder.encode(source);
  const at = input(encoded.length);
  new Uint8Array(memory.buffer, at, encoded.length).set(encoded);
  const length = render(encoded.length, flags);
  lastStatus = length;
  return length < 0 ? undefined : decoder.decode(new Uint8Array(memory.buffer, output(), length));
};
let lastStatus = 0;
const engineReverse = (source, flags) => {
  const encoded = encoder.encode(source);
  const at = input(encoded.length);
  new Uint8Array(memory.buffer, at, encoded.length).set(encoded);
  const length = reverse(encoded.length, flags);
  return length < 0 ? length : decoder.decode(new Uint8Array(memory.buffer, output(), length));
};

// Tag soup for the reverse direction.
const htmlAtoms = [
  'text', ' ', '\n', '  ', '\t', 'é', '🚀', '\u00a0', '&amp;', '&lt;', '&nbsp;', '&QUOT;', '&bogus;', '&#65;', '&#x41', '&#X263a;',
  '&#x26;#66;', '&#0;', '&#xD83D;', '&#1114112;', '<p>', '</p>', '<P>', '<br>', '<br/>', '<hr>', '<strong>', '</strong>', '<b>', '</b>',
  '<em>', '</em>', '<i>', '<del>', '</del>', '<s>', '<code>', '</code>', '<pre>', '</pre>', '<pre><code class="language-js">',
  '<code class="x language-py y">', '<a href="/u">', '<a href="/a b)" title="T \\ &quot;q&quot;">', '<a href="">', '<a name=x>', '</a>',
  '<img src="i.png" alt="a]b\\">', '<img src=x title=t>', '<img alt=n>', '<h1>', '</h1>', '<h2 id="heading-text">', '<h3 id="x">',
  '</h2>', '<blockquote>', '</blockquote>', '<ul>', '</ul>', '<ol>', '<ol start="3">', '<ol start="x">', '<ol start="1.5">', '</ol>',
  '<li>', '</li>', '<table>', '</table>', '<thead>', '<tbody>', '<tr>', '</tr>', '<th>', '<td>', '<td align="left">', '</td>',
  '<div>', '</div>', '<section>', '<span class="c">', '</span>', '<kbd>', '</kbd>', '<sub>', '<u>', '<custom-el a=1>', '</custom-el>',
  '<!-- c -->', '<!-- open', '<![CDATA[x]]>', '<!DOCTYPE html>', '<?pi?>', '</nope>', '</ SPAN >', '<x/>', '<br />', '`', '``',
  '*', '_', '[', ']', '(', ')', '\\', '"', "'", '<', '>', '<a', '< b>', '<1>', '- ', '1. ',
];
const flagsFor = [0, 16];
let reverseCompared = 0;
let reverseDeferred = 0;
const reverseDiffs = [];
const checkReverse = (html, flags) => {
  let expected;
  try {
    expected = stock.htmlToMarkdown(html, flags & 16 ? { unsupported: 'drop' } : {});
  } catch {
    expected = undefined;
  }
  const actual = engineReverse(html, flags);
  if (actual === -3) {
    reverseDeferred += 1;
    // The engine hands back exactly the inputs JavaScript throws on or answers with a lone surrogate.
    if (expected !== undefined && expected.isWellFormed()) reverseDiffs.push({ html, flags, expected, actual: 'deferred to JavaScript' });
    return;
  }
  reverseCompared += 1;
  if (actual !== expected) reverseDiffs.push({ html, flags, expected, actual });
};

const random = (n) => {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed % n;
};
const pick = (list) => list[random(list.length)];

// Fragments that sit on the edges of Nizel's rules.
const atoms = [
  'a', 'word', 'Foo', ' ', '  ', '\t', '\n', '\n\n', '*', '**', '***', '_', '__', '~~', '`', '``', '\\', '\\*', '\\_',
  '&amp;', '&copy;', '&#35;', '&#x41;', '&#0;', '&#xD800;', '&bogus;', '&#99999999;', '<', '>', '<b>', '</i>', '<a href="x">',
  "<img src='y' />", '<!-- c -->', '<?pi?>', '<!DOCTYPE x>', '<https://e.com/a?b>', '<mailto:x@y.z>', '<me@example.com>',
  'https://example.com/path.', 'http://x.y)', 'HTTP://Up.case', 'user@mail.example.org', 'a.b@c', '#', '## ', '###### ',
  '####### ', '---', '***', '===', '- ', '* ', '+ ', '1. ', '2) ', '> ', '    ', '|', ' | ', '|---|---|', 'é', 'Ñ', '🚀', 'ß',
  'Σ', '.', ',', '!', '?', '(', ')', '"', "'", ':', ';', '-', 'ſ', 'K', ' ', ' ', '　', 'café', 'x_y_z',
  '*a*', '**b**', '_c_', '__d__', '`e`', '~~f~~', 'g*', '*h', ' *i* ', '**j*', '*k**',
  '[', ']', '![', '](', '[a](b)', '[a](<b c>)', '[t](/u "ti")', "[t](/u 'ti')", '[t](/u (ti))', '[t](/u "a\\"b")',
  '![i](/s.png)', '![*a*](x "y")', '[r]', '[R]', '[x][r]', '[x][]', '![r]', '![x][r]', '[r]: /url', '[r]: /url "T"',
  '\n[r]: <a b>\n', '[r]:\n/u', '[ r ]: /u', '[\\]]: /x', '[a]b]', '[a [b] c](d)', '[a](b(c)d)', '[a](b\\)c)', '[`]`](x)',
  '[<b>](c)', '[a](javascript:x)', '\n<div>\n', '<div>', '</div>', '<pre>', '</pre>', '<!-- x\n', '<?x', '<!X', '<![CDATA[', ']]>',
  '<script>', '</SCRIPT>', '<span a=1>', '<x\ny>', '(', ')', '"', '\n> [q]: /q\n',
  '\n```\n', '\n```js\n', '\n~~~ py\n', '```js filename="a.js" {1-3,5}\n', "``` filename='b' {2,1.5,x,0x3,1e1}\n", '\n````\n',
  '\n    code\n', '\n\tcode\n', '\n> ', '\n>> ', '\n > > ', '\n>\t', '\n- ', '\n  - ', '\n    - ', '\n* ', '\n+ ', '\n1. ',
  '\n2. ', '\n1) ', '\n10. ', '\n- [ ] ', '\n- [x] ', '\n* [X] ', '\n-\t', '\n1.\t', '\n   ', '\n\n- ', '\n\n  ', '\n> - ',
  '\n- > ', '\n- # h', '\n---\n', '\n***\n', '\n===\n', '\nlazy', '\n  indented', '\n      deep',
  '\n| a | b |\n|---|---|\n', '\n|:-|-:|:-:|\n', '\n| --- | --- |\n', '\nx|y\n', '| c [r] |', '\n|\n', '||',
  '\n::note\n', '\n::tip a "b" c\n', '\n::\n', '\nkey: value\n', '\nn-1: 2\n', '\n::x-y\n', '\n::9bad\n',
];

const profiles = [
  { options: {}, flags: 1 | 2 | 4 },
  { options: { anchors: false, autolinks: false, frontmatter: false, safe: false }, flags: 0 },
];

let compared = 0;
let declined = 0;
const diffs = [];
for (let i = 0; i < count; i += 1) {
  const length = 1 + random(14);
  let markdown = '';
  for (let j = 0; j < length; j += 1) markdown += pick(atoms);
  const profile = profiles[i % profiles.length];
  const source = profile.options.frontmatter === false ? markdown : extractFrontmatter(markdown).markdown;
  if (source.includes('{{')) continue;
  const actual = engineRender(source, profile.flags);
  if (actual === undefined) {
    declined += 1;
    if (declinedSamples.length < showDeclined) declinedSamples.push(`${lastStatus} ${JSON.stringify(source).replace(/[\u2028\u2029]/g, (c) => "\\u" + c.charCodeAt(0).toString(16))}`);
    continue;
  }
  compared += 1;
  const expected = await stock.useNizel(profile.options).html(markdown);
  if (actual !== expected) diffs.push({ markdown, flags: profile.flags, expected, actual });
  checkReverse(expected, flagsFor[i % 2]);
  let soup = '';
  const soupLength = 1 + random(16);
  for (let j = 0; j < soupLength; j += 1) soup += pick(htmlAtoms);
  checkReverse(soup, flagsFor[(i >> 1) % 2]);
}

console.log(`fuzz: ${count} generated, ${compared} compared, ${declined} declined, ${diffs.length} differences`);
console.log(`reverse: ${reverseCompared} compared, ${reverseDeferred} deferred to JavaScript, ${reverseDiffs.length} differences`);
for (const diff of reverseDiffs.slice(0, show)) {
  console.log('\nhtml:    ', JSON.stringify(diff.html), 'flags', diff.flags);
  console.log('expected:', JSON.stringify(diff.expected));
  console.log('actual:  ', JSON.stringify(diff.actual));
}
for (const sample of declinedSamples) console.log('declined:', sample);
for (const diff of diffs.slice(0, show)) {
  console.log('\nmarkdown:', JSON.stringify(diff.markdown), 'flags', diff.flags);
  console.log('expected:', JSON.stringify(diff.expected));
  console.log('actual:  ', JSON.stringify(diff.actual));
}
process.exitCode = diffs.length === 0 && reverseDiffs.length === 0 ? 0 : 1;
