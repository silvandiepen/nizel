import assert from 'node:assert/strict';
import { test } from 'vitest';
import * as stock from 'nizel-kit';
import * as wasm from 'nizel-kit/wasm';

test('optional WebView kit preserves API and official plugin output', async () => {
  assert.deepEqual(Object.keys(wasm).sort(), Object.keys(stock).sort());
  const sources = ['A **bold** word.\n\nAnother paragraph.', '# Title\n\n- [x] Done\n\n<!-- note -->\n\nSee [the guide](/doc).'];
  const profiles = [
    [],
    ['sanitize', 'autolink', 'hidden-comments'],
    stock.defaultEnabledPlugins(),
    ['gfm', 'hidden-comments', 'task-list'],
    ...stock.supportedPlugins.map(plugin => [plugin.id]),
  ];
  for (const enabledPlugins of profiles) {
    const options = { enabledPlugins, template: false };
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
