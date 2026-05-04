import assert from 'node:assert/strict';
import { test } from 'vitest';
import {
  appendTextNode,
  classifyDelimiterRun,
  firstInlineCharacter,
  inlineTokensToNodes,
  isForbiddenDelimiterMatch,
  isUnicodePunctuation,
  lastInlineCharacter,
  nextEmphasisDelimiter,
  nextInlineCharacter,
  previousCharacter,
  resolveRemainingEmphasis,
  tokenizeEmphasisDelimiters,
} from '../dist/parse/emphasis.js';

test('resolveRemainingEmphasis resolves emphasis and strong delimiter runs', () => {
  assert.deepEqual(resolveRemainingEmphasis([{ type: 'text', value: '*a* **b**' }]), [
    { type: 'emphasis', children: [{ type: 'text', value: 'a' }] },
    { type: 'text', value: ' ' },
    { type: 'strong', children: [{ type: 'text', value: 'b' }] },
  ]);
});

test('tokenizeEmphasisDelimiters splits text into delimiter tokens', () => {
  assert.deepEqual(tokenizeEmphasisDelimiters([{ type: 'text', value: 'a *b*' }]), [
    { type: 'node', node: { type: 'text', value: 'a ' } },
    { type: 'delimiter', char: '*', close: false, length: 1, open: true },
    { type: 'node', node: { type: 'text', value: 'b' } },
    { type: 'delimiter', char: '*', close: true, length: 1, open: false },
  ]);
  assert.deepEqual(tokenizeEmphasisDelimiters([{ type: 'text', value: '*', escaped: true }]), [
    { type: 'node', node: { type: 'text', value: '*', escaped: true } },
  ]);
});

test('inline character helpers inspect nested inline nodes', () => {
  const nodes = [
    { type: 'inlineCode', code: 'code' },
    { type: 'strong', children: [{ type: 'text', value: 'bold' }] },
  ];

  assert.equal(firstInlineCharacter(nodes[1]), 'b');
  assert.equal(lastInlineCharacter(nodes[1]), 'd');
  assert.equal(nextInlineCharacter(nodes, 0), 'c');
});

test('isForbiddenDelimiterMatch applies CommonMark modulo-three rule', () => {
  assert.equal(
    isForbiddenDelimiterMatch(
      { type: 'delimiter', char: '*', close: true, length: 2, open: true },
      { type: 'delimiter', char: '*', close: true, length: 1, open: true },
    ),
    true,
  );
  assert.equal(
    isForbiddenDelimiterMatch(
      { type: 'delimiter', char: '*', close: false, length: 2, open: true },
      { type: 'delimiter', char: '*', close: true, length: 2, open: false },
    ),
    false,
  );
});

test('nextEmphasisDelimiter finds the next star or underscore', () => {
  assert.equal(nextEmphasisDelimiter('abc_def', 0), 3);
  assert.equal(nextEmphasisDelimiter('abcdef', 0), 6);
});

test('previousCharacter reads visible text from emitted tokens', () => {
  assert.equal(previousCharacter([{ type: 'node', node: { type: 'text', value: 'abc' } }]), 'c');
  assert.equal(previousCharacter([{ type: 'delimiter', char: '_', close: false, length: 1, open: true }]), '_');
});

test('classifyDelimiterRun handles star and underscore flanking rules', () => {
  assert.deepEqual(classifyDelimiterRun('*', ' ', 'a'), { open: true, close: false });
  assert.deepEqual(classifyDelimiterRun('*', 'a', ' '), { open: false, close: true });
  assert.deepEqual(classifyDelimiterRun('_', 'a', 'b'), { open: false, close: false });
});

test('isUnicodePunctuation detects punctuation and symbol characters', () => {
  assert.equal(isUnicodePunctuation('.'), true);
  assert.equal(isUnicodePunctuation('€'), true);
  assert.equal(isUnicodePunctuation('a'), false);
  assert.equal(isUnicodePunctuation(''), false);
});

test('inlineTokensToNodes and appendTextNode coalesce adjacent text', () => {
  assert.deepEqual(
    inlineTokensToNodes([
      { type: 'node', node: { type: 'text', value: 'a' } },
      { type: 'delimiter', char: '*', close: false, length: 2, open: true },
      { type: 'node', node: { type: 'text', value: 'b' } },
    ]),
    [{ type: 'text', value: 'a**b' }],
  );

  const nodes = [{ type: 'text', value: 'a' }];
  appendTextNode(nodes, 'b');
  appendTextNode(nodes, '');
  assert.deepEqual(nodes, [{ type: 'text', value: 'ab' }]);
});
