import assert from 'node:assert/strict';
import { test } from 'vitest';
import { useNizel } from '../dist/index.js';

test('renders markdown into structured content', async () => {
  const nizel = useNizel();
  const result = await nizel(`---
title: Hello World
description: Demo page
---

# {{ meta.title }}

Welcome to **Nizel**.

- [Docs](https://example.com/docs)
- ![Logo](/logo.png)
`);

  assert.equal(result.title, 'Hello World');
  assert.equal(result.description, 'Demo page');
  assert.match(result.html, /<h1 id="hello-world">Hello World<\/h1>/);
  assert.match(result.html, /<strong>Nizel<\/strong>/);
  assert.equal(result.toc[0].id, 'hello-world');
  assert.equal(result.links[0].href, 'https://example.com/docs');
  assert.equal(result.images[0].src, '/logo.png');
  assert.equal(result.readingTime.minutes, 1);
});

test('supports helpers, filters, and element attributes', async () => {
  const nizel = useNizel({
    elements: {
      a: { attrs: { rel: 'noopener noreferrer' }, class: 'link' },
    },
  });

  const html = await nizel.html('# {{ title | kebab }}\n\nhttps://example.com', {
    data: { title: 'Hello Nizel' },
  });
  const text = await nizel.text('Hello `code`');

  assert.match(html, /<h1 id="hello-nizel">hello-nizel<\/h1>/);
  assert.match(html, /class="link"/);
  assert.match(html, /rel="noopener noreferrer"/);
  assert.equal(text, 'Hello code');
});

test('helper methods preserve templates, transforms, and plugin hooks', async () => {
  const calls = [];
  const plugin = {
    name: 'helper-hooks',
    hooks: {
      beforeParse(markdown) {
        calls.push('beforeParse');
        return `${markdown}\n\nAdded by plugin`;
      },
      afterParse(ast) {
        calls.push('afterParse');
        return ast;
      },
      afterRender(html) {
        calls.push('afterRender');
        return `${html}\n<!-- rendered -->`;
      },
    },
  };
  const nizel = useNizel({
    plugins: [plugin],
    transforms: [
      (ast) => {
        ast.children.push({
          type: 'paragraph',
          children: [{ type: 'text', value: 'Added by transform' }],
        });
        return ast;
      },
    ],
  });

  const html = await nizel.html('# {{ title }}', {
    data: { title: 'Fast Path' },
  });
  const ast = await nizel.ast('# Title');
  const text = await nizel.text('Hello **world**');
  const meta = await nizel.meta('---\ntitle: "{{ title }}"\n---\n# Body', {
    data: { title: 'Rendered Meta' },
  });

  assert.match(html, /<h1 id="fast-path">Fast Path<\/h1>/);
  assert.match(html, /Added by plugin/);
  assert.match(html, /Added by transform/);
  assert.match(html, /<!-- rendered -->/);
  assert.equal(ast.children.at(-1).children[0].value, 'Added by transform');
  assert.match(text, /Added by plugin/);
  assert.match(text, /Added by transform/);
  assert.equal(meta.title, 'Rendered Meta');
  assert.deepEqual(calls, [
    'beforeParse',
    'afterParse',
    'afterRender',
    'beforeParse',
    'afterParse',
    'beforeParse',
    'afterParse',
  ]);
});

test('extracts code metadata, tables, delete nodes, and safe HTML', async () => {
  const nizel = useNizel();
  const result = await nizel(`\`\`\`ts filename="example.ts" {1,3-4}
const value = true;
console.log(value);
\`\`\`

| Name | State |
| :--- | ---: |
| ~~Old~~ | New |

<script>alert(1)</script>`);

  const code = result.ast.children[0];
  assert.equal(code.type, 'code');
  assert.equal(code.filename, 'example.ts');
  assert.deepEqual(code.highlightLines, [1, 3, 4]);
  assert.match(result.html, /data-filename="example.ts"/);
  assert.match(result.html, /<table>/);
  assert.match(result.html, /<del>Old<\/del>/);
  assert.match(result.html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
});

test('supports custom blocks and plugin merge order', async () => {
  const plugin = {
    name: 'alerts',
    template: { filters: { shout: (value) => String(value).toUpperCase() } },
    elements: { h2: { class: 'from-plugin' } },
    blocks: {
      alert: {
        name: 'alert',
        parse({ args, props }) {
          return { kind: args[0], props };
        },
        formats: {
          html(node, ctx) {
            return `<aside class="alert alert--${ctx.escape(node.args[0])}">${ctx.render(node.children)}</aside>`;
          },
        },
      },
    },
  };
  const nizel = useNizel({
    plugins: [plugin],
    elements: { h2: { class: 'from-options' } },
  });

  const result = await nizel(`## {{ title | shout }}

::alert warning
title: Careful
::
Be **aware**.
::`, {
    data: { title: 'hello' },
  });

  assert.match(result.html, /class="from-options"/);
  assert.match(result.html, /HELLO/);
  assert.match(result.html, /alert--warning/);
  assert.equal(result.ast.children[1].value.kind, 'warning');
  assert.equal(result.ast.children[1].props.title, 'Careful');
});

test('supports presets and missing value modes', async () => {
  const minimal = useNizel.preset('minimal');
  const keep = await minimal('# {{ title }}');
  const empty = await useNizel().html('# {{ title }}', {
    template: { missing: 'empty' },
  });

  assert.equal(keep.toc.length, 0);
  assert.match(keep.html, /\{\{ title \}\}/);
  assert.match(empty, /<h1><\/h1>/);
});

test('md→html→md→html round-trip produces stable output', async () => {
  const nizel = useNizel();
  const { htmlToMarkdown } = await import('../dist/index.js');
  const markdown = [
    '# Hello World',
    '',
    'Some **bold** text and [a link](https://example.com).',
    '',
    '## Section One',
    '',
    '- Item one',
    '- Item two',
    '',
    '> A blockquote',
    '',
    '```js',
    'const x = 1;',
    '```',
  ].join('\n');

  // md → html (first pass)
  const html1 = await nizel.html(markdown);
  // html → md
  const md2 = htmlToMarkdown(html1);
  // md → html (second pass)
  const html2 = await nizel.html(md2);

  assert.equal(html2, html1);
});
