import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { describe, test } from 'vitest';
import {
  htmlToMarkdown,
  markdownToHtml,
  mountMarkdown,
  nodeToMarkdown,
  selectionToMarkdown,
  useBrowserNizel,
} from 'nizel/browser';

describe('nizel/browser', () => {
  test('exports browser helpers through the package subpath', async () => {
    assert.equal(await markdownToHtml('# Hello'), '<h1 id="hello">Hello</h1>');
    assert.equal(htmlToMarkdown('<p>Hello <strong>browser</strong></p>'), 'Hello **browser**');
  });

  test('emits browser ESM and IIFE bundles for embedded webviews', async () => {
    const esm = await import('../dist/browser/nizel.js');
    assert.equal(await esm.markdownToHtml('# Bundle'), '<h1 id="bundle">Bundle</h1>');
    assert.equal(esm.htmlToMarkdown('<p>Back</p>'), 'Back');

    const code = await readFile(new URL('../dist/browser/nizel.iife.js', import.meta.url), 'utf8');
    const context = {};
    vm.runInNewContext(code, context);

    assert.equal(typeof context.Nizel.useBrowserNizel, 'function');
    assert.equal(context.Nizel.htmlToMarkdown('<h2>IIFE</h2>'), '## IIFE');
  });

  test('converts DOM-like elements and node lists to Markdown', () => {
    const heading = { nodeType: 1, outerHTML: '<h2>Title</h2>' };
    const paragraph = { nodeType: 1, outerHTML: '<p>Body</p>' };

    assert.equal(nodeToMarkdown(heading), '## Title');
    assert.equal(htmlToMarkdown([heading, paragraph]), ['## Title', '', 'Body'].join('\n'));
  });

  test('converts ranges and selections by cloning their fragments', () => {
    const fragment = {
      nodeType: 11,
      childNodes: [
        { nodeType: 1, outerHTML: '<p>Selected <em>text</em></p>' },
      ],
    };
    const range = {
      startContainer: {},
      endContainer: {},
      cloneContents: () => fragment,
    };
    const selection = {
      rangeCount: 1,
      getRangeAt: () => range,
    };

    assert.equal(htmlToMarkdown(range), 'Selected *text*');
    assert.equal(selectionToMarkdown(selection), 'Selected *text*');
  });

  test('mounts rendered Markdown into an element', async () => {
    const target = { innerHTML: '' };
    const element = await mountMarkdown(target, '**Bold**');

    assert.equal(element, target);
    assert.equal(target.innerHTML, '<p><strong>Bold</strong></p>');
  });

  test('extends configured processors with browser methods', async () => {
    const processor = useBrowserNizel({ data: { name: 'World' } });
    const target = { innerHTML: '' };

    assert.equal(await processor.markdownToHtml('# {{ name }}'), '<h1 id="world">World</h1>');
    assert.equal(processor.htmlToMarkdown('<h1>Back</h1>'), '# Back');

    await processor.mount(target, '# {{ name }}');
    assert.equal(target.innerHTML, '<h1 id="world">World</h1>');
  });
});
