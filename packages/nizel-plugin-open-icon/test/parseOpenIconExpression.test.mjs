import assert from 'node:assert/strict';
import { test } from 'vitest';
import { parseOpenIconExpression } from '../dist/index.js';

test('parses the positional icon name and named options', () => {
  assert.deepEqual(
    parseOpenIconExpression(':open-icon(ui/search-m, label="Search", size="1.25em", color="currentColor", strokeWidth=2)'),
    {
      name: 'ui/search-m',
      options: {
        label: 'Search',
        size: '1.25em',
        color: 'currentColor',
        strokeWidth: 2,
      },
    },
  );
});

test('rejects generic icon syntax and javascript expression values', () => {
  assert.equal(parseOpenIconExpression(':icon(ui/search-m)'), null);
  assert.equal(parseOpenIconExpression(':open-icon(ui/search-m, size={getSize()})'), null);
});
