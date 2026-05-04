import assert from 'node:assert/strict';
import { test } from 'vitest';
import {
  countLeadingSpaces,
  expandLeadingTabs,
  expandLeadingTabsFromColumn,
  nextNonBlankLine,
  stripLeadingSpaces,
  trimTrailingBlankLines,
} from '../dist/parse/lines.js';

test('expandLeadingTabs expands only leading indentation tabs', () => {
  assert.equal(expandLeadingTabs('\tcode\n  \tcode\nx\tkeep'), '    code\n    code\nx\tkeep');
});

test('expandLeadingTabsFromColumn respects a consumed block marker column', () => {
  assert.equal(expandLeadingTabsFromColumn('\tquote', 2), '  quote');
  assert.equal(expandLeadingTabsFromColumn(' \tquote', 1), '   quote');
  assert.equal(expandLeadingTabsFromColumn('x\tkeep', 0), 'x\tkeep');
});

test('nextNonBlankLine finds the next line with content', () => {
  assert.equal(nextNonBlankLine(['', '   ', 'x'], 0), 2);
  assert.equal(nextNonBlankLine(['', '   '], 0), -1);
});

test('countLeadingSpaces counts spaces without treating tabs as spaces', () => {
  assert.equal(countLeadingSpaces('   x'), 3);
  assert.equal(countLeadingSpaces('\tx'), 0);
});

test('stripLeadingSpaces removes up to the requested indentation', () => {
  assert.equal(stripLeadingSpaces('   x', 2), ' x');
  assert.equal(stripLeadingSpaces(' x', 4), 'x');
  assert.equal(stripLeadingSpaces('\tx', 2), '\tx');
});

test('trimTrailingBlankLines removes only blank suffix lines', () => {
  assert.deepEqual(trimTrailingBlankLines(['a', '', '  ']), ['a']);
  assert.deepEqual(trimTrailingBlankLines(['', 'a', '']), ['', 'a']);
});
