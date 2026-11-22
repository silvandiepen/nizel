import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { tests } from 'commonmark-spec';
import { test } from 'vitest';
import * as stock from 'nizel';
import * as wasm from 'nizel/wasm';
import * as browser from 'nizel/browser';
import * as browserWasm from 'nizel/browser/wasm';
import { renderWasm, reverseWasm } from '../dist/wasm/backend.js';

test('opt-in exports mirror stock entry points', () => {
  assert.deepEqual(Object.keys(wasm).sort(), Object.keys(stock).sort());
  assert.deepEqual(Object.keys(browserWasm).sort(), Object.keys(browser).sort());
});

test('uses Wasm in both directions and rejects unsupported input', async () => {
  const source = '# Hello World\n\nA **bold word** with a soft\nline break.';
  const html = '<h1 id="hello-world">Hello World</h1>\n<p>A <strong>bold word</strong> with a soft\nline break.</p>';
  assert.equal(renderWasm(source, {}), html);
  assert.equal(reverseWasm(html), '# Hello World\n\nA **bold word** with a soft line break.');
  // The Rust engine covers what the AssemblyScript renderer declined; it must match JavaScript exactly.
  assert.equal(renderWasm('# Repeat\n\n# Repeat', {}), await stock.useNizel().html('# Repeat\n\n# Repeat'));
  assert.equal(renderWasm('<script>hello</script>', {}), await stock.useNizel().html('<script>hello</script>'));
  assert.equal(renderWasm('a'.repeat(1024 * 1024 + 1), {}), undefined);
  assert.equal(reverseWasm('<h1 id="different">Hello</h1>'), stock.htmlToMarkdown('<h1 id="different">Hello</h1>'));
  assert.equal(reverseWasm('<table><tr><td>One</td></tr></table>'), stock.htmlToMarkdown('<table><tr><td>One</td></tr></table>'));
  assert.equal(reverseWasm('<p>'+'a'.repeat(1024 * 1024)+'</p>'), undefined);
  // JavaScript throws on an out-of-range entity; the engine leaves that to it.
  assert.equal(reverseWasm('<p>&#99999999;</p>'), undefined);
});

test('matches forward and reverse HTML on the CommonMark corpus', async () => {
  const options = { anchors: false, autolinks: false, frontmatter: false, safe: false };
  const ordinary = stock.useNizel(options);
  const accelerated = wasm.useNizel(options);
  const web = browserWasm.useBrowserNizel(options);
  for (const example of tests) {
    const source = example.markdown.replaceAll('→', '\t');
    const expected = await ordinary.html(source);
    assert.equal(await accelerated.html(source), expected, 'Node ' + example.number);
    assert.equal(await web.markdownToHtml(source), expected, 'browser ' + example.number);
    assert.equal(wasm.htmlToMarkdown(expected), stock.htmlToMarkdown(expected), 'reverse ' + example.number);
  }
});

test('preserves processor methods, presets, and DOM input', async () => {
  const input = '---\ntitle: Draft\n---\n# Heading\n\nA **bold** word.';
  const js = stock.useNizel();
  const accelerated = wasm.useNizel();
  for (const method of ['html','text','ast','meta','parse','document']) {
    assert.deepEqual(await accelerated[method](input), await js[method](input), method);
  }
  assert.deepEqual(await accelerated(input), await js(input));
  assert.equal(await wasm.useNizel.preset('minimal').html(input), await stock.useNizel.preset('minimal').html(input));
  assert.equal(await accelerated.preset('blog').html(input), await js.preset('blog').html(input));
  const node = {nodeType: 1, outerHTML: '<p>A <strong>bold</strong> word.</p>'};
  const web = browserWasm.useBrowserNizel();
  assert.equal(web.htmlToMarkdown(node), browser.htmlToMarkdown(node));
  assert.equal(web.nodeToMarkdown(node), browser.nodeToMarkdown(node));
  const range = {startContainer:node,endContainer:node,cloneContents:()=>({nodeType:11,childNodes:[node]})};
  assert.equal(web.htmlToMarkdown(range), browser.htmlToMarkdown(range));
  const element = {innerHTML:''};
  assert.equal(await web.mount(element, input), element);
  assert.equal(element.innerHTML, await js.html(input));
});

test('runs compatible hooks once and honors AST and reverse hooks', async () => {
  const events = [];
  const plugin = {hooks:{
    beforeParse: source => { events.push('before'); return source + ' prepared'; },
    afterRender: html => { events.push('render'); return html + '!'; },
  }};
  const accelerated = wasm.useNizel({plugins:[plugin]});
  assert.equal(await accelerated.html('Plain text'), '<p>Plain text prepared</p>!');
  assert.deepEqual(events, ['before','render']);
  events.length = 0;
  await accelerated.html('[A link](/example)');
  assert.deepEqual(events, ['before','render']);
  const astPlugin = {hooks:{afterParse: ast => ({...ast,children:[]})}};
  assert.equal(await wasm.useNizel({plugins:[astPlugin]}).html('Original'), '');
  const reversePlugin = {htmlToMarkdown: node => node.tag === 'p' ? 'Converted by plugin' : undefined};
  assert.equal(wasm.htmlToMarkdown('<p>Original</p>', {plugins:[reversePlugin]}), 'Converted by plugin');
});

test('lets plugins that declare their reach keep the Wasm path', async () => {
  const astPlugin = {hooks:{afterParse: ast => ({...ast,children:[]})}, afterParseApplies: source => source.includes('[')};
  assert.equal(renderWasm('A **bold** word.', {plugins:[astPlugin]}), '<p>A <strong>bold</strong> word.</p>');
  assert.equal(renderWasm('- [ ] Box', {plugins:[astPlugin]}), undefined);
  assert.equal(await wasm.useNizel({plugins:[astPlugin]}).html('Kept'), '<p>Kept</p>');
  assert.equal(await wasm.useNizel({plugins:[astPlugin]}).html('Gone [x]'), '');

  const reversePlugin = {htmlToMarkdown: node => node.tag === 'span' ? 'Converted by plugin' : undefined, htmlToMarkdownTags: ['span']};
  assert.equal(reverseWasm('<p>A <strong>bold</strong> word.</p>', {plugins:[reversePlugin]}), 'A **bold** word.');
  assert.equal(reverseWasm('<p><span>x</span></p>', {plugins:[reversePlugin]}), undefined);
  assert.equal(reverseWasm('<p><SPAN class="x">x</SPAN></p>', {plugins:[reversePlugin]}), undefined);
  assert.equal(wasm.htmlToMarkdown('<p><span>x</span></p>', {plugins:[reversePlugin]}), 'Converted by plugin');
  assert.equal(reverseWasm('<p>A <strong>word</strong></p>', {plugins:[{htmlToMarkdown: () => undefined}]}), undefined);
});

test('falls back when WebAssembly is unavailable', () => {
  const code = [
    'globalThis.WebAssembly = undefined;',
    'const wasm = await import("nizel/wasm");',
    'if (await wasm.useNizel().html("One **bold** word.") !== "<p>One <strong>bold</strong> word.</p>") process.exit(1);',
    'if (wasm.htmlToMarkdown("<p>One <strong>bold</strong> word.</p>") !== "One **bold** word.") process.exit(1);',
  ].join('\n');
  execFileSync(process.execPath, ['--input-type=module', '-e', code], {cwd:new URL('..', import.meta.url)});
});

test('preserves output on generated forward and reverse documents', async () => {
  const ordinary = stock.useNizel();
  const accelerated = wasm.useNizel();
  const tokens = ['Some words', '**bold**', '*emphasis*', '"quotes"', '123', 'Accent café',
    '[ref](/doc)', '<em>HTML</em>', 'a_b', ':colon', '&amp;', '- marker'];
  const fragments = ['Text ', '<strong>bold</strong>', '<em> </em>', '<br>', '&amp;', '&quot;', '<code>a b</code>',
    '<a href="/">link</a>', ' café', ' \n ', '<b> bold </b>', '&nbsp;'];
  let state = 21473;
  const random = count => (state = (Math.imul(state, 1664525) + 1013904223) >>> 0) % count;
  for (let i = 0; i < 3000; i++) {
    const source = 'A ' + Array.from({length:7}, () => tokens[random(i % 2 ? 5 : tokens.length)]).join(' ');
    assert.equal(await accelerated.html(source), await ordinary.html(source));
    const html = '<p>' + Array.from({length:7}, () => fragments[random(fragments.length)]).join('') + '</p>';
    assert.equal(wasm.htmlToMarkdown(html), stock.htmlToMarkdown(html), html);
  }
});
