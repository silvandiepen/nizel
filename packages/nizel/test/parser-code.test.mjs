import assert from 'node:assert/strict';
import { test } from 'vitest';
import {
  expandLineRanges,
  normalizeCodeSpan,
  openingFenceClosePattern,
  parseCodeMeta,
  parseFenceInfo,
  stripFenceIndent,
} from '../dist/parse/code.js';

test('openingFenceClosePattern creates marker-specific closing expressions', () => {
  assert.match('```', openingFenceClosePattern('``` js'));
  assert.match('~~~~', openingFenceClosePattern('~~~'));
  assert.equal(openingFenceClosePattern('code'), null);
  assert.equal(openingFenceClosePattern('``'), null);
});

test('normalizeCodeSpan applies CommonMark whitespace normalization', () => {
  assert.equal(normalizeCodeSpan(' foo '), 'foo');
  assert.equal(normalizeCodeSpan('  '), '  ');
  assert.equal(normalizeCodeSpan('foo\nbar'), 'foo bar');
});

test('parseFenceInfo decodes info strings and rejects backticks for backtick fences', () => {
  assert.deepEqual(parseFenceInfo(' js filename=demo.js', '`'), {
    lang: 'js',
    meta: 'js filename=demo.js',
    valid: true,
  });
  assert.deepEqual(parseFenceInfo(' a\\*b', '~'), {
    lang: 'a*b',
    meta: 'a*b',
    valid: true,
  });
  assert.deepEqual(parseFenceInfo(' bad`info', '`'), { meta: '', valid: false });
  assert.deepEqual(parseFenceInfo('', '`'), { meta: '', valid: true });
});

test('stripFenceIndent removes up to the opening fence indentation', () => {
  assert.equal(stripFenceIndent('  code', 2), 'code');
  assert.equal(stripFenceIndent(' code', 3), 'code');
  assert.equal(stripFenceIndent('\tcode', 2), '\tcode');
});

test('parseCodeMeta extracts filenames and highlighted line ranges', () => {
  assert.deepEqual(parseCodeMeta('js filename="demo file.js" {1,3-4,3}'), {
    filename: 'demo file.js',
    highlightLines: [1, 3, 4],
  });
  assert.deepEqual(parseCodeMeta("filename='demo.ts'"), {
    filename: 'demo.ts',
    highlightLines: undefined,
  });
  assert.deepEqual(parseCodeMeta(''), {
    filename: undefined,
    highlightLines: undefined,
  });
});

test('expandLineRanges parses comma-delimited line ranges', () => {
  assert.deepEqual(expandLineRanges('3,1-2,2,bad,5-4'), [1, 2, 3]);
});
