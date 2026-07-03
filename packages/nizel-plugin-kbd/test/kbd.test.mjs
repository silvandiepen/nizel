import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'vitest';
import { useNizel } from 'nizel';
import { kbdPlugin, normalizeKbdShortcut } from '../dist/index.js';

test('renders a single key', async () => {
  const html = await useNizel({ plugins: [kbdPlugin()] }).html('Press :kbd(Escape).');

  assert.match(html, /<span class="nizel-kbd-group" data-shortcut="Esc"><kbd class="nizel-kbd">Esc<\/kbd><\/span>/);
});

test('renders a multi-key shortcut', async () => {
  const html = await useNizel({ plugins: [kbdPlugin()] }).html('Press :kbd(Cmd+K) to search.');

  assert.match(html, /data-shortcut="Cmd\+K"/);
  assert.match(html, /<kbd class="nizel-kbd">Cmd<\/kbd><span class="nizel-kbd-separator" aria-hidden="true">\+<\/span><kbd class="nizel-kbd">K<\/kbd>/);
});

test('ignores whitespace around plus separators', async () => {
  const html = await useNizel({ plugins: [kbdPlugin()] }).html(':kbd(Cmd + K)');

  assert.match(html, /data-shortcut="Cmd\+K"/);
});

test('resolves Mod on macOS', () => {
  assert.deepEqual(normalizeKbdShortcut('Mod+K', { platform: 'macos', aliases: {} }), {
    original: 'Mod+K',
    resolved: 'Cmd+K',
    keys: ['Cmd', 'K'],
  });
});

test('resolves Mod on Windows', () => {
  assert.deepEqual(normalizeKbdShortcut('Mod+K', { platform: 'windows', aliases: {} }), {
    original: 'Mod+K',
    resolved: 'Ctrl+K',
    keys: ['Ctrl', 'K'],
  });
});

test('resolves Mod on Linux', () => {
  assert.deepEqual(normalizeKbdShortcut('Mod+K', { platform: 'linux', aliases: {} }), {
    original: 'Mod+K',
    resolved: 'Ctrl+K',
    keys: ['Ctrl', 'K'],
  });
});

test('normalizes common keys', async () => {
  const html = await useNizel({ plugins: [kbdPlugin()] }).html(':kbd(cmd+shift+p) :kbd(ArrowUp) :kbd(Delete) :kbd(CapsLock)');

  assert.match(html, /data-shortcut="Cmd\+Shift\+P"/);
  assert.match(html, /<kbd class="nizel-kbd">↑<\/kbd>/);
  assert.match(html, /<kbd class="nizel-kbd">Del<\/kbd>/);
  assert.match(html, /<kbd class="nizel-kbd">Caps Lock<\/kbd>/);
});

test('supports aliases', async () => {
  const result = await useNizel({
    plugins: [kbdPlugin({ platform: 'macos', aliases: { search: 'Mod+K' } })],
  })(':kbd(search)');

  assert.match(result.html, /data-shortcut="Cmd\+K"/);
  assert.deepEqual(result.meta.kbd.shortcuts, [
    {
      original: 'search',
      resolved: 'Cmd+K',
      keys: ['Cmd', 'K'],
    },
  ]);
});

test('escapes malicious input', async () => {
  const html = await useNizel({ plugins: [kbdPlugin()] }).html(':kbd(<script>)');

  assert.match(html, /&lt;script&gt;/);
  assert.doesNotMatch(html, /<script>/);
});

test('does not transform fenced code', async () => {
  const html = await useNizel({ plugins: [kbdPlugin()] }).html('```md\n:kbd(Cmd+K)\n```');

  assert.match(html, /<code class="language-md">:kbd\(Cmd\+K\)\n<\/code>/);
  assert.doesNotMatch(html, /nizel-kbd/);
});

test('does not transform inline code', async () => {
  const html = await useNizel({ plugins: [kbdPlugin()] }).html('`:kbd(Cmd+K)`');

  assert.equal(html, '<p><code>:kbd(Cmd+K)</code></p>');
});

test('does not transform escaped syntax', async () => {
  const html = await useNizel({ plugins: [kbdPlugin()] }).html('\\:kbd(Cmd+K)');

  assert.equal(html, '<p>:kbd(Cmd+K)</p>');
});

test('does not transform raw HTML blocks', async () => {
  const html = await useNizel({ plugins: [kbdPlugin()] }).html('<div>:kbd(Cmd+K)</div>');

  assert.match(html, /:kbd\(Cmd\+K\)/);
  assert.doesNotMatch(html, /nizel-kbd/);
});

test('emits shortcut metadata when enabled', async () => {
  const result = await useNizel({ plugins: [kbdPlugin({ platform: 'macos' })] })(':kbd(Mod+K)');

  assert.deepEqual(result.meta.kbd.shortcuts, [
    {
      original: 'Mod+K',
      resolved: 'Cmd+K',
      keys: ['Cmd', 'K'],
    },
  ]);
});

test('does not emit metadata when disabled', async () => {
  const result = await useNizel({ plugins: [kbdPlugin({ collectMetadata: false })] })(':kbd(Cmd+K)');

  assert.equal(result.meta.kbd, undefined);
});

test('CSS file exists', async () => {
  const css = await readFile(new URL('../style.css', import.meta.url), 'utf8');

  assert.match(css, /\.nizel-kbd-group/);
  assert.match(css, /\.nizel-kbd/);
  assert.match(css, /\.nizel-kbd-separator/);
});
