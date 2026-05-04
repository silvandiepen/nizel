import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'vitest';
import { defineBlock, defineNizelPlugin, useNizel } from '../dist/index.js';

test('defineBlock and custom block rendering produce structured AST and HTML', async () => {
  const alertBlock = defineBlock({
    name: 'alert',
    parse({ args, props, content }) {
      return { kind: args[0], title: props.title, contentLength: content.length };
    },
    formats: {
      html(node, ctx) {
        return `<aside data-kind="${ctx.escape(node.value.kind)}"><h2>${ctx.escape(node.value.title)}</h2>${ctx.render(node.children)}</aside>`;
      },
    },
  });

  const result = await useNizel({
    blocks: { alert: alertBlock },
  })(`::alert warning
title: Careful
::
Pay **attention**.
::`);

  assert.equal(result.ast.children[0].type, 'customBlock');
  assert.equal(result.ast.children[0].name, 'alert');
  assert.equal(result.ast.children[0].value.kind, 'warning');
  assert.equal(result.ast.children[0].props.title, 'Careful');
  assert.match(result.html, /<aside data-kind="warning">/);
  assert.match(result.html, /<strong>attention<\/strong>/);
});

test('plugins merge in documented priority order and hooks/transforms run', async () => {
  const plugin = defineNizelPlugin({
    name: 'priority',
    template: { filters: { mark: () => 'plugin' } },
    elements: { h1: { class: 'plugin' } },
    hooks: {
      beforeParse(markdown) {
        return markdown.replace('HOOKED', '# Hooked');
      },
      afterParse(ast) {
        ast.children.push({
          type: 'paragraph',
          children: [{ type: 'text', value: 'afterParse' }],
        });
        return ast;
      },
    },
    transforms: [
      (ast) => {
        ast.children.push({
          type: 'paragraph',
          children: [{ type: 'text', value: 'transform' }],
        });
      },
    ],
  });

  const result = await useNizel({
    plugins: [plugin],
    elements: { h1: { class: 'options' } },
    template: { filters: { mark: () => 'options' } },
  })('HOOKED\n\n{{ value | mark }}', {
    template: { filters: { mark: () => 'runtime' } },
    data: { value: true },
  });

  assert.match(result.html, /<h1 id="hooked" class="options">Hooked<\/h1>/);
  assert.match(result.html, /<p>runtime<\/p>/);
  assert.match(result.html, /<p>afterParse<\/p>/);
  assert.match(result.html, /<p>transform<\/p>/);
});

test('package can be consumed through the npm workspace package name', () => {
  const script = `
    import assert from 'node:assert/strict';
    import { useNizel } from 'nizel';
    const result = await useNizel()('# E2E');
    assert.equal(result.html, '<h1 id="e2e">E2E</h1>');
  `;
  const child = spawnSync(process.execPath, ['--input-type=module', '--eval', script], {
    cwd: new URL('../../../', import.meta.url),
    encoding: 'utf8',
  });

  assert.equal(child.status, 0, child.stderr || child.stdout);
});
