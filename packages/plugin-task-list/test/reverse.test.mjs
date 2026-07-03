import assert from 'node:assert/strict';
import { test } from 'vitest';
import { htmlToMarkdown, useNizel } from 'nizel';
import { taskListPlugin } from '../dist/index.js';

test('round-trips task list preserving checked state', async () => {
  const nizel = useNizel({ plugins: [taskListPlugin()] });
  const md = '- [x] Done\n- [ ] Todo';
  const html = await nizel.html(md);
  const back = htmlToMarkdown(html, { plugins: [taskListPlugin()] });
  assert.equal(back, md);
});

test('round-trips ordered task lists', async () => {
  const nizel = useNizel({ plugins: [taskListPlugin()] });
  const md = '1. [x] One\n2. [ ] Two';
  const html = await nizel.html(md);
  const back = htmlToMarkdown(html, { plugins: [taskListPlugin()] });
  assert.equal(back, md);
});

test('preserves checked state in edit mode', async () => {
  const nizel = useNizel({ plugins: [taskListPlugin({ mode: 'edit' })] });
  const html = await nizel.html('- [x] Done\n- [ ] Todo');
  const back = htmlToMarkdown(html, { plugins: [taskListPlugin()] });
  assert.equal(back, '- [x] Done\n- [ ] Todo');
});

test('leaves ordinary lists to the default converter', () => {
  const back = htmlToMarkdown('<ul><li>One</li><li>Two</li></ul>', { plugins: [taskListPlugin()] });
  assert.equal(back, '- One\n- Two');
});
