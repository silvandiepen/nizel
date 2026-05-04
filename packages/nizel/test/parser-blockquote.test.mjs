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
