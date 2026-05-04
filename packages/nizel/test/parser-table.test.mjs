import assert from 'node:assert/strict';
import { test } from 'vitest';
import { isTableStart, readTable, splitTableRow } from '../dist/parse/table.js';

const textInline = (source) => [{ type: 'text', value: source }];

test('isTableStart detects GFM pipe table delimiter rows', () => {
  assert.equal(isTableStart(['a | b', '--- | :---:'], 0), true);
  assert.equal(isTableStart(['a | b', '---'], 0), false);
  assert.equal(isTableStart(['plain', '--- | ---'], 0), false);
});

test('readTable parses headers, alignment, body rows, and end index', () => {
  const parsed = readTable(
    [
      '| Name | Count | Price |',
      '| :--- | :---: | ---: |',
      '| Apple | 2 | 1.20 |',
      '| Pear | 4 | 2.00 |',
      '',
      'after',
    ],
    0,
    {},
    textInline,
  );

  assert.deepEqual(parsed.table.align, ['left', 'center', 'right']);
  assert.equal(parsed.endIndex, 3);
  assert.deepEqual(
    parsed.table.children.map((row) => row.children.map((cell) => cell.children[0].value)),
    [
      ['Name', 'Count', 'Price'],
      ['Apple', '2', '1.20'],
      ['Pear', '4', '2.00'],
    ],
  );
});

test('splitTableRow removes boundary pipes and preserves cell spacing for callers', () => {
  assert.deepEqual(splitTableRow('| a | b |'), [' a ', ' b ']);
  assert.deepEqual(splitTableRow('a | b'), ['a ', ' b']);
});
