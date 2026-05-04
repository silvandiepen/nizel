import assert from 'node:assert/strict';
import { test } from 'vitest';
import { stripInlineNodes, trimTrailingSoftBreakSpace } from '../dist/parse/inline-text.js';

test('stripInlineNodes converts nested inline nodes to plain text', () => {
  assert.equal(
    stripInlineNodes([
      { type: 'text', value: 'A' },
      { type: 'lineBreak', value: ' ' },
      { type: 'inlineCode', code: 'code' },
      { type: 'image', src: '/x.png', alt: 'alt' },
      { type: 'strong', children: [{ type: 'text', value: 'bold' }] },
    ]),
    'A\ncodealtbold',
  );
});

test('trimTrailingSoftBreakSpace removes only one non-hardbreak trailing space', () => {
  const trimmed = [{ type: 'text', value: 'one ' }];
  trimTrailingSoftBreakSpace(trimmed);
  assert.deepEqual(trimmed, [{ type: 'text', value: 'one' }]);

  const hardBreak = [{ type: 'text', value: 'one  ' }];
  trimTrailingSoftBreakSpace(hardBreak);
  assert.deepEqual(hardBreak, [{ type: 'text', value: 'one  ' }]);

  const empty = [];
  trimTrailingSoftBreakSpace(empty);
  assert.deepEqual(empty, []);
});
