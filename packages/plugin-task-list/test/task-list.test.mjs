import assert from 'node:assert/strict';
import { test } from 'vitest';
import { useNizel } from 'nizel';
import { taskListPlugin } from '../dist/index.js';

test('core keeps task list markers as metadata without checkbox markup', async () => {
  const html = await useNizel().html('- [x] Done\n- [ ] Todo');

  assert.equal(html, '<ul>\n<li data-checked>Done</li>\n<li>Todo</li>\n</ul>');
});

test('renders disabled checkboxes in view mode by default', async () => {
  const html = await useNizel({ plugins: [taskListPlugin()] }).html('- [x] Done\n- [ ] Todo');

  assert.match(html, /data-nizel-task-checkbox type="checkbox" checked disabled/);
  assert.match(html, /data-nizel-task-checkbox type="checkbox" disabled/);
  assert.match(html, /class="nizel-task-list__label"/);
});

test('renders editable checkboxes in edit mode', async () => {
  const html = await useNizel({ plugins: [taskListPlugin({ mode: 'edit' })] }).html('- [x] Done\n- [ ] Todo');

  assert.match(html, /data-nizel-task-checkbox type="checkbox" checked>/);
  assert.match(html, /data-nizel-task-checkbox type="checkbox">/);
  assert.doesNotMatch(html, /disabled/);
});
