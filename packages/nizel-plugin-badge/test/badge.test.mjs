import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'vitest';
import { useNizel } from 'nizel';
import { badgePlugin } from '../dist/index.js';

test('renders a basic badge', async () => {
  const html = await useNizel({ plugins: [badgePlugin()] }).html(':badge(beta)');
  assert.equal(html, '<p><span class="nizel-badge" data-tone="neutral">beta</span></p>');
});

test('renders a badge with tone', async () => {
  const html = await useNizel({ plugins: [badgePlugin()] }).html(':badge(deprecated, tone="warning")');
  assert.equal(html, '<p><span class="nizel-badge" data-tone="warning">deprecated</span></p>');
});

test('renders a badge with title', async () => {
  const html = await useNizel({ plugins: [badgePlugin()] }).html(':badge(done, tone="success", title="This task is complete")');
  assert.equal(html, '<p><span class="nizel-badge" data-tone="success" title="This task is complete">done</span></p>');
});

test('falls back to neutral for unknown tone', async () => {
  const html = await useNizel({ plugins: [badgePlugin()] }).html(':badge(beta, tone="banana")');
  assert.equal(html, '<p><span class="nizel-badge" data-tone="neutral">beta</span></p>');
});

test('supports aliases', async () => {
  const html = await useNizel({
    plugins: [badgePlugin({ aliases: { beta: { label: 'Beta', tone: 'info' }, done: { label: 'Done', tone: 'success' } } })],
  }).html(':badge(beta) :badge(done)');

  assert.equal(html, '<p><span class="nizel-badge" data-tone="info">Beta</span> <span class="nizel-badge" data-tone="success">Done</span></p>');
});

test('explicit options override alias defaults', async () => {
  const html = await useNizel({
    plugins: [badgePlugin({ aliases: { beta: { label: 'Beta', tone: 'info' } } })],
  }).html(':badge(beta, tone="warning")');

  assert.equal(html, '<p><span class="nizel-badge" data-tone="warning">Beta</span></p>');
});

test('escapes malicious labels', async () => {
  const html = await useNizel({ plugins: [badgePlugin()] }).html(':badge(<script>alert(1)</script>, tone="danger")');
  assert.equal(html, '<p><span class="nizel-badge" data-tone="danger">&lt;script&gt;alert(1)&lt;/script&gt;</span></p>');
});

test('escapes malicious title values', async () => {
  const html = await useNizel({ plugins: [badgePlugin()] }).html(':badge(done, title="<script>alert(1)</script>")');
  assert.equal(html, '<p><span class="nizel-badge" data-tone="neutral" title="&lt;script&gt;alert(1)&lt;/script&gt;">done</span></p>');
});

test('does not transform fenced code', async () => {
  const html = await useNizel({ plugins: [badgePlugin()] }).html('```md\n:badge(beta)\n```');
  assert.match(html, /<code class="language-md">:badge\(beta\)\n<\/code>/);
  assert.doesNotMatch(html, /nizel-badge/);
});

test('does not transform inline code', async () => {
  const html = await useNizel({ plugins: [badgePlugin()] }).html('`:badge(beta)`');
  assert.equal(html, '<p><code>:badge(beta)</code></p>');
});

test('does not transform escaped syntax', async () => {
  const html = await useNizel({ plugins: [badgePlugin()] }).html('\\:badge(beta)');
  assert.equal(html, '<p>:badge(beta)</p>');
});

test('does not transform raw html blocks', async () => {
  const html = await useNizel({ plugins: [badgePlugin()] }).html('<div>:badge(beta)</div>');
  assert.match(html, /&lt;div&gt;:badge\(beta\)&lt;\/div&gt;/);
  assert.doesNotMatch(html, /nizel-badge/);
});

test('emits badge metadata when enabled', async () => {
  const result = await useNizel({
    plugins: [badgePlugin({ aliases: { deprecated: { label: 'Deprecated', tone: 'warning' } } })],
  })(':badge(deprecated, title="Old")');

  assert.deepEqual(result.meta.badge.badges, [
    {
      label: 'Deprecated',
      tone: 'warning',
      original: 'deprecated',
      title: 'Old',
    },
  ]);
});

test('does not emit metadata when disabled', async () => {
  const result = await useNizel({ plugins: [badgePlugin({ collectMetadata: false })] })(':badge(beta)');
  assert.equal(result.meta.badge, undefined);
});

test('CSS file exists and contains required tone selectors', () => {
  const css = readFileSync(new URL('../style.css', import.meta.url), 'utf8');
  for (const selector of [
    '.nizel-badge[data-tone="neutral"]',
    '.nizel-badge[data-tone="info"]',
    '.nizel-badge[data-tone="blue"]',
    '.nizel-badge[data-tone="success"]',
    '.nizel-badge[data-tone="green"]',
    '.nizel-badge[data-tone="warning"]',
    '.nizel-badge[data-tone="yellow"]',
    '.nizel-badge[data-tone="danger"]',
    '.nizel-badge[data-tone="red"]',
    '.nizel-badge[data-tone="purple"]',
  ]) {
    assert.match(css, new RegExp(selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});
