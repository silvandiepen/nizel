// Differential fuzzer: random Markdown through the Rust engine and the
// JavaScript engine; any byte difference is a bug. Declined inputs are
// counted, not compared.
//
//   node scripts/wasm-fuzz.mjs [--count 200000] [--seed 1] [--show 5]
import { readFile } from 'node:fs/promises';
import { isDeepStrictEqual } from 'node:util';
import * as stock from '../dist/index.js';
import * as wasmEntry from '../dist/wasm.js';
import { parseMarkdown } from '../dist/parse.js';
import { parseWasm, renderWasm, reverseWasm } from '../dist/wasm/backend.js';
import { taskListPlugin } from '../../plugin-task-list/dist/index.js';
import { hiddenCommentsPlugin } from '../../nizel-plugin-hidden-comments/dist/index.js';
import { autolinkPlugin } from '../../plugin-autolink/dist/index.js';
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
const { instance } = await WebAssembly.instantiate(bytes, { env: { claim: () => -1 } });
const { memory, input, output, render, reverse } = instance.exports;
const encoder = new TextEncoder();
const decoder = new TextDecoder();
// The real backend paths: they map lone surrogates and reproduce throws.
const optionsFor = (flags) => (flags & 4 ? {} : { anchors: false, autolinks: false, safe: false });
const engineRender = (source, flags) => {
  const result = renderWasm(source, optionsFor(flags));
  lastStatus = result === undefined ? -1 : 0;
  return result;
};
const rawEngineRender = (source, flags) => {
  const encoded = encoder.encode(source);
  const at = input(encoded.length);
  new Uint8Array(memory.buffer, at, encoded.length).set(encoded);
  const length = render(encoded.length, flags);
  lastStatus = length;
  return length < 0 ? undefined : decoder.decode(new Uint8Array(memory.buffer, output(), length));
};
let lastStatus = 0;
/** reverseWasm's result, `{ threw }` with the message, or -3 when it leaves the input to JavaScript. */
const engineReverse = (source, flags) => {
  try {
    const result = reverseWasm(source, flags & 16 ? { unsupported: 'drop' } : {});
    return result === undefined ? -3 : result;
  } catch (error) {
    return { threw: `${error.constructor.name}: ${error.message}` };
  }
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
const pluginAtoms = [
  ...htmlAtoms, '<ul>', '<li><input type="checkbox" data-nizel-task-checkbox disabled>', '<input type="checkbox" checked data-nizel-task-checkbox>',
  '<li class="nizel-task-list__item">', '<span class="nizel-task-list__label">', '<span class="nizel-task-list__content">',
  '<span data-nizel-hidden-comment>note</span>', '<span class="nizel-hidden-comment">x</span>', '<a href="https://e.com">https://e.com</a>',
  '<a href="https://e.com" target="_blank" rel="noopener">https://e.com</a>', '<kbd>Ctrl</kbd>', '<kbd><b>K</b></kbd>',
];
let reverseCompared = 0;
let reverseDeferred = 0;
const reverseDiffs = [];
const checkReverse = (html, flags) => {
  let expected;
  try {
    expected = stock.htmlToMarkdown(html, flags & 16 ? { unsupported: 'drop' } : {});
  } catch (error) {
    expected = { threw: `${error.constructor.name}: ${error.message}` };
  }
  const actual = engineReverse(html, flags);
  if (actual === -3) {
    reverseDeferred += 1;
    return;
  }
  reverseCompared += 1;
  if (JSON.stringify(actual) !== JSON.stringify(expected)) reverseDiffs.push({ html, flags, expected, actual });
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
  'Σ', '.', ',', '!', '?', '(', ')', '"', "'", ':', ';', '-', 'ſ', 'K', '\u00a0', '\u2028', '\u3000', 'café', 'x_y_z',
  '*a*', '**b**', '_c_', '__d__', '`e`', '~~f~~', 'g*', '*h', ' *i* ', '**j*', '*k**',
  '[', ']', '![', '](', '[a](b)', '[a](<b c>)', '[t](/u "ti")', "[t](/u 'ti')", '[t](/u (ti))', '[t](/u "a\\"b")',
  '![i](/s.png)', '![*a*](x "y")', '[r]', '[R]', '[x][r]', '[x][]', '![r]', '![x][r]', '[r]: /url', '[r]: /url "T"',
  '\n[r]: <a b>\n', '[r]:\n/u', '[ r ]: /u', '[\\]]: /x', '[a]b]', '[a [b] c](d)', '[a](b(c)d)', '[a](b\\)c)', '[`]`](x)',
  '[<b>](c)', '[a](javascript:x)', '\n<div>\n', '<div>', '</div>', '<pre>', '</pre>', '<!-- x\n', '<?x', '<!X', '<![CDATA[', ']]>',
  '<script>', '</SCRIPT>', '<span a=1>', '<x\ny>', '(', ')', '"', '\n> [q]: /q\n',
  '\ud800', '\ude80', '\ud83d', '\ud83d\ude80', '\ue000', '\ue7ff', '&#xE000;', '*\udc00*', '[\ud800](x)',
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

// Options whose features run around the engine's AST: element rules, block
// definitions (parse + render), transforms, an afterParse plugin, standalone
// image unwrapping and autolink attributes.
const hookOptions = {
  elements: { p: { class: 'para' }, a: (node) => ({ attrs: { 'data-ext': String(node.external) } }) },
  blocks: { note: { parse: ({ args, props, content }) => ({ args, props, length: content.length }), formats: { html: (node, ctx) => `<aside data-v="${ctx.escape(JSON.stringify(node.value))}">${ctx.render(node.children)}</aside>` } } },
  transforms: [(ast) => ({ ...ast, children: [...ast.children, { type: 'paragraph', children: [{ type: 'text', value: 'end' }] }] })],
  plugins: [{ name: 'count', hooks: { afterParse: (ast) => { ast.children.unshift({ type: 'html', value: `<!--${ast.children.length}-->` }); } } }],
  unwrapStandaloneImages: true,
  autolinks: { target: '_blank', rel: 'noopener' },
};
const hookStock = stock.useNizel(hookOptions);
const hookWasm = wasmEntry.useNizel(hookOptions);
// Lezin's plugins plus a reverse handler that declares no tags.
const kbdHandler = { name: 'kbd', htmlToMarkdown: (node, ctx) => (node.tag === 'kbd' ? `<kbd>${ctx.inline(node)}</kbd>` : undefined) };
const pluginProfile = [taskListPlugin({ mode: 'edit' }), hiddenCommentsPlugin({ mode: 'hide' }), autolinkPlugin(), kbdHandler];
const pluginStock = stock.useNizel({ plugins: pluginProfile });
let pluginCompared = 0;
const pluginDiffs = [];
const checkPluginReverse = (html) => {
  const outcome = (convert) => {
    try {
      return convert();
    } catch (error) {
      return { threw: `${error.constructor.name}: ${error.message}` };
    }
  };
  const expected = outcome(() => stock.htmlToMarkdown(html, { plugins: pluginProfile }));
  pluginCompared += 1;
  // Where a handler throws in JavaScript, the entry point throws the same error.
  const actual = outcome(() => wasmEntry.htmlToMarkdown(html, { plugins: pluginProfile }));
  if (JSON.stringify(actual) !== JSON.stringify(expected)) pluginDiffs.push({ markdown: html, expected, actual });
};
let astCompared = 0;
const astDiffs = [];
let hookCompared = 0;
const hookDiffs = [];

const traceFs = process.env.FUZZ_TRACE ? await import('node:fs') : undefined;
/** With FUZZ_TRACE set, records the step about to run (to find a crash). */
const mark = (step, value) => traceFs?.writeFileSync(process.env.FUZZ_TRACE, JSON.stringify({ step, value }));
let compared = 0;
let declined = 0;
const diffs = [];
for (let i = 0; i < count; i += 1) {
  const length = 1 + random(14);
  let markdown = '';
  for (let j = 0; j < length; j += 1) markdown += pick(atoms);
  const profile = profiles[i % profiles.length];
  if (process.env.FUZZ_TRACE) (await import('node:fs')).writeFileSync(process.env.FUZZ_TRACE, JSON.stringify({ i, markdown }));
  if (process.env.FUZZ_HEAP && (i % 1000 === 0 || i > 11500)) console.error(i, Math.round(process.memoryUsage().heapUsed / 1e6), 'MB heap', Math.round(process.memoryUsage().external / 1e6), 'MB external');
  const source = profile.options.frontmatter === false ? markdown : extractFrontmatter(markdown).markdown;
  if (source.includes('{{')) continue;
  mark(`${i} engineRender`, source);
  const actual = engineRender(source, profile.flags);
  if (actual === undefined) {
    declined += 1;
    if (declinedSamples.length < showDeclined) declinedSamples.push(`${lastStatus} ${JSON.stringify(source).replace(/[\u2028\u2029]/g, (c) => "\\u" + c.charCodeAt(0).toString(16))}`);
    continue;
  }
  compared += 1;
  mark(`${i} js html`, markdown);
  const expected = await stock.useNizel(profile.options).html(markdown);
  if (actual !== expected) diffs.push({ markdown, flags: profile.flags, expected, actual });
  mark(`${i} checkReverse`, expected);
  checkReverse(expected, flagsFor[i % 2]);

  // The decoded engine AST must be exactly the JavaScript parser's.
  const parseOptions = profile.flags & 4
    ? { anchors: true, autolinks: { enabled: true }, blocks: {}, safe: true, slugStyle: undefined }
    : { anchors: false, autolinks: false, blocks: {}, safe: false, slugStyle: undefined };
  mark(`${i} parseWasm`, source);
  const decoded = parseWasm(source, profile.flags & 4 ? {} : { anchors: false, autolinks: false, safe: false });
  if (decoded !== undefined) {
    astCompared += 1;
    mark(`${i} parseMarkdown+compare`, source);
    const reference = parseMarkdown(source, parseOptions);
    if (!isDeepStrictEqual(decoded, reference)) astDiffs.push({ markdown: source, expected: reference, actual: decoded });
  }
  // The plugin and hook steps run with safe (default) options: compare them
  // only where the engine accepts the document with those options, as
  // everywhere else (it declines exactly the input JavaScript never
  // finishes, NIZEL-002).
  const acceptedWithDefaults = engineRender(extractFrontmatter(markdown).markdown, 1 | 2 | 4) !== undefined;
  if (i % 4 === 1 && acceptedWithDefaults) {
    mark(`${i} plugin html`, markdown);
    if (process.env.FUZZ_DUMP) traceFs?.appendFileSync(process.env.FUZZ_DUMP, JSON.stringify(markdown) + '\n');
    const pluginHtml = await pluginStock.html(markdown);
    mark(`${i} plugin reverse`, pluginHtml);
    checkPluginReverse(pluginHtml);
    let soup = '';
    for (let j = 0, n = 1 + random(12); j < n; j += 1) soup += pick(pluginAtoms);
    if (process.env.FUZZ_TRACE) (await import('node:fs')).writeFileSync(process.env.FUZZ_TRACE, JSON.stringify({ i, soup }));
    checkPluginReverse(soup);
  }
  if (i % 4 === 0 && acceptedWithDefaults) {
    hookCompared += 1;
    const viaWasm = await hookWasm.html(markdown);
    const viaJs = await hookStock.html(markdown);
    if (viaWasm !== viaJs) hookDiffs.push({ markdown, expected: viaJs, actual: viaWasm });
  }
  let soup = '';
  const soupLength = 1 + random(16);
  for (let j = 0; j < soupLength; j += 1) soup += pick(htmlAtoms);
  if (process.env.FUZZ_TRACE) (await import('node:fs')).writeFileSync(process.env.FUZZ_TRACE, JSON.stringify({ i, step: 'soup', soup }));
  checkReverse(soup, flagsFor[(i >> 1) % 2]);
  if (process.env.FUZZ_TRACE) (await import('node:fs')).writeFileSync(process.env.FUZZ_TRACE, JSON.stringify({ i, step: 'ast', source }));
}

console.log(`fuzz: ${count} generated, ${compared} compared, ${declined} declined, ${diffs.length} differences`);
console.log(`reverse: ${reverseCompared} compared, ${reverseDeferred} deferred to JavaScript, ${reverseDiffs.length} differences`);
console.log(`ast: ${astCompared} compared, ${astDiffs.length} differences; hooks through nizel/wasm: ${hookCompared} compared, ${hookDiffs.length} differences`);
console.log(`plugin reverse through nizel/wasm: ${pluginCompared} compared, ${pluginDiffs.length} differences`);
for (const diff of [...astDiffs, ...hookDiffs, ...pluginDiffs].slice(0, show)) {
  console.log('\nmarkdown:', JSON.stringify(diff.markdown));
  console.log('expected:', JSON.stringify(diff.expected).slice(0, 600));
  console.log('actual:  ', JSON.stringify(diff.actual).slice(0, 600));
}
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
process.exitCode = diffs.length + reverseDiffs.length + astDiffs.length + hookDiffs.length + pluginDiffs.length === 0 ? 0 : 1;
