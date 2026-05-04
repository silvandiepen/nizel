import assert from 'node:assert/strict';
import { test } from 'vitest';
import {
  expandListMarkerTabs,
  isParagraphInterruptingListMarker,
  isSameListMarker,
  listContentIndent,
  listMarkerBody,
  parseListMarker,
} from '../dist/parse/list.js';

test('parseListMarker parses unordered list markers and content indentation', () => {
  assert.deepEqual(parseListMarker('- item'), {
    body: 'item',
    contentIndent: 2,
    marker: '-',
    ordered: false,
  });
  assert.deepEqual(parseListMarker('   +    item'), {
    body: 'item',
    contentIndent: 8,
    marker: '+',
    ordered: false,
  });
  assert.equal(parseListMarker('    - code'), null);
});

test('parseListMarker parses ordered list markers with dot and parenthesis styles', () => {
  assert.deepEqual(parseListMarker('9. item'), {
    body: 'item',
    contentIndent: 3,
    marker: '.',
    ordered: true,
    start: 9,
  });
  assert.deepEqual(parseListMarker('12) item'), {
    body: 'item',
    contentIndent: 4,
    marker: ')',
    ordered: true,
    start: 12,
  });
  assert.equal(parseListMarker('1234567890. nope'), null);
});

test('listMarkerBody preserves over-wide marker padding as body text', () => {
  assert.equal(listMarkerBody(' ', 'item'), 'item');
  assert.equal(listMarkerBody('     ', 'item'), '    item');
});

test('expandListMarkerTabs expands tabs only while parsing marker padding', () => {
  assert.equal(expandListMarkerTabs('-\titem'), '-   item');
  assert.equal(expandListMarkerTabs('- item\tstill'), '- item\tstill');
});

test('isSameListMarker compares list marker style', () => {
  assert.equal(isSameListMarker(parseListMarker('1. a'), parseListMarker('2. b')), true);
  assert.equal(isSameListMarker(parseListMarker('1. a'), parseListMarker('2) b')), false);
  assert.equal(isSameListMarker(parseListMarker('- a'), parseListMarker('+ b')), false);
});

test('isParagraphInterruptingListMarker follows CommonMark interruption rules', () => {
  assert.equal(isParagraphInterruptingListMarker('1. item'), true);
  assert.equal(isParagraphInterruptingListMarker('2. item'), false);
  assert.equal(isParagraphInterruptingListMarker('- item'), true);
  assert.equal(isParagraphInterruptingListMarker('-'), false);
});

test('listContentIndent applies CommonMark padding fallback', () => {
  assert.equal(listContentIndent(0, 1, 1), 2);
  assert.equal(listContentIndent(3, 2, 4), 9);
  assert.equal(listContentIndent(0, 1, 5), 2);
});
