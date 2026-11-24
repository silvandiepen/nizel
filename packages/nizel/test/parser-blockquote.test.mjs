import assert from 'node:assert/strict';
import { test } from 'vitest';
import {
  canContinueBlockquoteLazily,
  canStartLazyBlockquoteContinuation,
  lazyContinuationCandidate,
} from '../dist/parse/blockquote.js';

const options = { safe: true };

test('canContinueBlockquoteLazily accepts paragraph continuation lines', () => {
  assert.equal(canContinueBlockquoteLazily('continued', options, ['continued'], 0), true);
  assert.equal(canContinueBlockquoteLazily('> quoted', options, ['> quoted'], 0), false);
  assert.equal(canContinueBlockquoteLazily('---', options, ['---'], 0), false);
  assert.equal(canContinueBlockquoteLazily('- item', options, ['- item'], 0), false);
});

test('canContinueBlockquoteLazily rejects unsafe-mode interrupting HTML starts', () => {
  assert.equal(canContinueBlockquoteLazily('<table>', { safe: false }, ['<table>'], 0), false);
  assert.equal(canContinueBlockquoteLazily('<table>', { safe: true }, ['<table>'], 0), true);
});

test('lazyContinuationCandidate unwraps nested quote and list quote markers', () => {
  assert.equal(lazyContinuationCandidate('> > foo'), 'foo');
  assert.equal(lazyContinuationCandidate('1. > foo'), 'foo');
  assert.equal(lazyContinuationCandidate('plain'), 'plain');
});

test('canStartLazyBlockquoteContinuation delegates block-start checks for deepest candidate', () => {
  const seen = [];
  const isBlockStart = (line) => {
    seen.push(line);
    return line === '# heading';
  };

  assert.equal(canStartLazyBlockquoteContinuation('> continued', options, ['continued'], 0, isBlockStart), true);
  assert.equal(canStartLazyBlockquoteContinuation('> # heading', options, ['# heading'], 0, isBlockStart), false);
  assert.deepEqual(seen, ['continued', '# heading']);
  assert.equal(canStartLazyBlockquoteContinuation('    code', options, ['    code'], 0, isBlockStart), false);
});

test('quoted lines with line separators parse as quotes and always terminate (NIZEL-002)', async () => {
  const { useNizel } = await import('../dist/index.js');
  const nizel = useNizel();
  // These never returned: the quote loop read lines with `.*`, which stops at U+2028/U+2029.
  assert.equal(await nizel.html('x\n\n> a b'), '<p>x</p>\n<blockquote>\n<p>a b</p>\n</blockquote>');
  assert.equal(await nizel.html('> one\n> two three\nlazy'), '<blockquote>\n<p>one\ntwo three\nlazy</p>\n</blockquote>');
  // At the start of a document this emitted an empty quote and skipped the next line.
  assert.equal(await nizel.html('> a b\nnext'), '<blockquote>\n<p>a b\nnext</p>\n</blockquote>');
  assert.equal(lazyContinuationCandidate('> a b'), 'a b');
});
