import assert from 'node:assert/strict';
import { test } from 'vitest';
import {
  hasNestedListMarkerBeforeBlank,
  parseListItemBlocks,
  updateOpenFence,
} from '../dist/parse/list-items.js';
import { parseListMarker } from '../dist/parse/list.js';

const parseBlocksStub = (lines) => lines.map((line) => ({ type: 'paragraph', children: [{ type: 'text', value: line }] }));
const isBlockStartStub = (line) => /^#{1,6}\s/.test(line);

test('parseListItemBlocks collects indented continuation lines', () => {
  const marker = parseListMarker('- item');
  const parsed = parseListItemBlocks(
    'item',
    ['- item', '  continued', '- next'],
    0,
    marker,
    marker.contentIndent,
    {},
    new Map(),
    {},
    parseBlocksStub,
    isBlockStartStub,
  );

  assert.equal(parsed.endIndex, 1);
  assert.equal(parsed.loose, false);
  assert.deepEqual(parsed.children.map((child) => child.children[0].value), ['item', 'continued']);
});

test('parseListItemBlocks marks blank-separated sibling items loose', () => {
  const marker = parseListMarker('- item');
  const parsed = parseListItemBlocks(
    'item',
    ['- item', '', '- next'],
    0,
    marker,
    marker.contentIndent,
    {},
    new Map(),
    {},
    parseBlocksStub,
    isBlockStartStub,
  );

  assert.equal(parsed.endIndex, 1);
  assert.equal(parsed.loose, true);
});

test('hasNestedListMarkerBeforeBlank detects blanks owned by nested lists', () => {
  assert.equal(hasNestedListMarkerBeforeBlank(['foo', '  - bar'], 4), true);
  assert.equal(hasNestedListMarkerBeforeBlank(['foo', 'bar'], 4), false);
});

test('updateOpenFence closes and opens fenced code tracking', () => {
  const open = updateOpenFence(null, '``` js');
  assert.equal(open?.test('```'), true);
  assert.equal(updateOpenFence(open, '```'), null);
  assert.equal(updateOpenFence(null, 'plain'), null);
});
