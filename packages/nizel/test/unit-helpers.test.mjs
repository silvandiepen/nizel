import assert from 'node:assert/strict';
import { test } from 'vitest';
import { collect } from '../dist/collect.js';
import { defaultFilters, defaultOptions } from '../dist/defaults.js';
import { resolveOptions } from '../dist/options.js';
import { parseInline, parseMarkdown, stripInlineMarkdown } from '../dist/parse.js';
import { renderHtml } from '../dist/render.js';
import { escapeHtml, getPath, slugify, textFromUnknown, uniqueSlug } from '../dist/utils.js';

test('utility functions have deterministic behavior', () => {
  const seen = new Map();

  assert.equal(escapeHtml(`A&B<"'>`), 'A&amp;B&lt;&quot;\'&gt;');
  assert.equal(slugify(' Hello, Nizel! '), 'hello-nizel');
  assert.equal(textFromUnknown(null), '');
  assert.equal(textFromUnknown(new Date('2026-05-04T00:00:00.000Z')), '2026-05-04T00:00:00.000Z');
  assert.equal(getPath({ user: { name: 'Sil' } }, 'user.name'), 'Sil');
  assert.equal(getPath({ user: {} }, 'user.missing'), undefined);
  assert.equal(uniqueSlug('intro', seen), 'intro');
  assert.equal(uniqueSlug('intro', seen), 'intro-2');
});

test('default filters cover documented case and formatting behavior', () => {
  assert.equal(defaultFilters.lower('Hello'), 'hello');
  assert.equal(defaultFilters.upper('Hello'), 'HELLO');
  assert.equal(defaultFilters.title('hello nizel'), 'Hello Nizel');
  assert.equal(defaultFilters.kebab('Hello Nizel'), 'hello-nizel');
  assert.equal(defaultFilters.camel('Hello nizel processor'), 'helloNizelProcessor');
  assert.match(String(defaultFilters.format(12.5, 'currency', 'EUR')), /€12\.50|12,50/);
  assert.equal(defaultFilters.format('2026-05-04', 'date', 'dd MMM yyyy'), '04 May 2026');
  assert.equal(defaultFilters.format('2026-05-04', 'date'), '2026-05-04');
  assert.equal(defaultFilters.format('x', 'unknown'), 'x');
});

test('resolveOptions applies defaults, plugin options, processor options, and runtime options', () => {
  const resolved = resolveOptions(
    {
      plugins: [
        {
          options: { meta: { pluginMeta: { count: 1 } } },
          elements: { p: { class: 'plugin' } },
          blocks: { alert: { name: 'alert' } },
          template: { filters: { plugin: () => 'plugin' } },
        },
      ],
      elements: { p: { class: 'processor' } },
      meta: { processorMeta: true },
      template: { missing: 'empty' },
    },
    {
      elements: { h1: { class: 'runtime' } },
      data: { title: 'Runtime' },
      meta: { runtimeMeta: 'yes' },
    },
  );

  assert.equal(resolved.output, defaultOptions.output);
  assert.equal(resolved.elements.p.class, 'processor');
  assert.equal(resolved.elements.h1.class, 'runtime');
  assert.equal(resolved.blocks.alert.name, 'alert');
  assert.equal(resolved.template.missing, 'empty');
  assert.equal(resolved.template.filters.plugin(), 'plugin');
  assert.equal(resolved.data.title, 'Runtime');
  assert.deepEqual(resolved.meta, {
    pluginMeta: { count: 1 },
    processorMeta: true,
    runtimeMeta: 'yes',
  });
});

test('parseInline and stripInlineMarkdown expose direct parser units', () => {
  const nodes = parseInline('Go to https://example.com and **read** `code`.', {
    autolinks: true,
  });

  assert.deepEqual(
    nodes.map((node) => node.type),
    ['text', 'link', 'text', 'strong', 'text', 'inlineCode', 'text'],
  );
  assert.equal(stripInlineMarkdown('**Read** `code`'), 'Read code');
});

test('renderHtml and collect operate directly on AST input', () => {
  const ast = parseMarkdown('# Title\n\nHello [docs](/docs)', {
    anchors: true,
    autolinks: true,
    blocks: {},
    safe: true,
  });
  const html = renderHtml(ast, { a: { class: 'link' } });
  const result = collect(ast);

  assert.equal(html, '<h1 id="title">Title</h1>\n<p>Hello <a href="/docs" class="link">docs</a></p>');
  assert.equal(result.text, 'Title\nHello docs');
  assert.deepEqual(result.headings, [{ id: 'title', slug: 'title', text: 'Title', depth: 1, level: 1 }]);
  assert.deepEqual(result.links, [{ href: '/docs', text: 'docs', title: undefined, external: false }]);
});
