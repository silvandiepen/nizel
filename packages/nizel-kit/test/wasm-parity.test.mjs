import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { test } from 'vitest';
import * as stock from 'nizel-kit';
import * as wasm from 'nizel-kit/wasm';

test('optional WebView kit preserves API and official plugin output', async () => {
  assert.deepEqual(Object.keys(wasm).sort(), Object.keys(stock).sort());
  const sources = [
    'A **bold** word.\n\nAnother paragraph.',
    '# Title\n\n- [x] Done\n\n<!-- note -->\n\nSee [the guide](/doc).',
    '# Notes\n\nPlain *prose* with `code`.\n\n- one\n- two\n\n1. first',
    '- [ ] Open\n- [x] Closed\n\n1. [ ] Numbered',
    'Visit https://example.com and <!-- hidden --> text.\n\nCaf\u00e9 na\u00efve: done_done.',
    '| A | B |\n| - | - |\n| 1 | 2 |\n\n> Quote\n\n```\nfenced\n```',
  ];
  const profiles = [
    [],
    ['sanitize', 'autolink', 'hidden-comments'],
    stock.defaultEnabledPlugins(),
    ['gfm', 'hidden-comments', 'task-list'],
    ['sanitize', 'autolink', 'hidden-comments', 'task-list'],
    ...stock.supportedPlugins.map(plugin => [plugin.id]),
  ];
  const pluginOptionSets = [{}, { 'task-list': { mode: 'edit' }, 'hidden-comments': { mode: 'hide' } }];
  for (const enabledPlugins of profiles) for (const pluginOptions of pluginOptionSets) {
    const options = { enabledPlugins, pluginOptions, template: false };
    const original = stock.useNizelKit(options);
    const accelerated = wasm.useNizelKit(options);
    for (const source of sources) {
      const html = await original.html(source);
      assert.equal(await wasm.markdownToHtml(source, options), html);
      assert.equal(await accelerated.markdownToHtml(source), html);
      assert.equal(accelerated.htmlToMarkdown(html), original.htmlToMarkdown(html));
      assert.equal(accelerated.nodeToMarkdown(html), original.nodeToMarkdown(html));
      const target = {innerHTML:''};
      await wasm.mountMarkdown(target, source, options);
      assert.equal(target.innerHTML, html);
    }
  }
});

test('runs on Wasm with the default plugins for documents they do not touch', () => {
  // A fresh process, so the module is compiled under the counting wrapper.
  const code = [
    'const calls = { render: 0, reverse: 0 };',
    'const Instance = WebAssembly.Instance;',
    'WebAssembly.Instance = class extends Instance { constructor(...args) { super(...args);',
    '  const exports = this.exports; const counted = { ...exports };',
    '  for (const name of ["render", "reverse"]) counted[name] = (...a) => { const n = exports[name](...a); if (n >= 0) calls[name]++; return n; };',
    '  Object.defineProperty(this, "exports", { value: counted }); } };',
    'const kit = await import("nizel-kit/wasm");',
    'const options = { enabledPlugins: kit.defaultEnabledPlugins(), pluginOptions: { "task-list": { mode: "edit" }, "hidden-comments": { mode: "hide" } }, template: false };',
    'const processor = kit.useNizelKit(options);',
    'const html = await processor.html("# Notes\\n\\nA **bold** and *quiet* line with `code`.");',
    'const markdown = processor.htmlToMarkdown(html);',
    'await processor.html("- [ ] A task stays in JavaScript");',
    'process.stdout.write(JSON.stringify({ calls, markdown }));',
  ].join('\n');
  const result = JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e', code], { cwd: new URL('..', import.meta.url) }).toString());
  assert.deepEqual(result.calls, { render: 1, reverse: 1 });
  assert.equal(result.markdown, '# Notes\n\nA **bold** and *quiet* line with `code`.');
});
