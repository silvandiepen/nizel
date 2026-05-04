import assert from 'node:assert/strict';
import { test } from 'vitest';
import {
  canTailBecomeReferenceLink,
  containsInlineLink,
  findBalancedLabelEnd,
  findReferenceLabelEnd,
  inlineTitleFromGroups,
  isAutolinkToken,
  nextInlineLabelOpener,
  normalizeInlineDestination,
  readInlineDestination,
  readInlineReferenceDestination,
  readUnresolvedInlineReferenceEnd,
} from '../dist/parse/inline-links.js';

const state = {
  references: new Map([
    ['ref', { href: '/url', title: 'Title' }],
    ['label', { href: '/label' }],
  ]),
};

test('nextInlineLabelOpener skips escaped openers and finds image/link labels', () => {
  assert.equal(nextInlineLabelOpener('\\[x] ![alt]', 0), 5);
  assert.equal(nextInlineLabelOpener('text [x]', 0), 5);
  assert.equal(nextInlineLabelOpener('text', 0), -1);
});

test('findBalancedLabelEnd skips nested labels, code spans, and inline HTML/autolinks', () => {
  assert.equal(findBalancedLabelEnd('a [b [c]](x)', 3), 8);
  assert.equal(findBalancedLabelEnd('[`not ] end`](x)', 1), 12);
  assert.equal(findBalancedLabelEnd('[<https://a/?q=]>(x)]', 1), 20);
  assert.equal(findBalancedLabelEnd('[unclosed', 1), -1);
});

test('containsInlineLink detects nested link syntax but ignores images', () => {
  assert.equal(containsInlineLink('a [link](x)'), true);
  assert.equal(containsInlineLink('a [link][ref]'), true);
  assert.equal(containsInlineLink('a ![image](x)'), false);
});

test('isAutolinkToken accepts CommonMark URL and email autolinks', () => {
  assert.equal(isAutolinkToken('<https://example.com>'), true);
  assert.equal(isAutolinkToken('<user@example.com>'), true);
  assert.equal(isAutolinkToken('<not autolink>'), false);
});

test('readInlineReferenceDestination resolves full and collapsed references', () => {
  assert.deepEqual(readInlineReferenceDestination('[label][ref]', 6, 'label', state), {
    href: '/url',
    title: 'Title',
    endIndex: 11,
  });
  assert.deepEqual(readInlineReferenceDestination('[label][]', 6, 'label', state), {
    href: '/label',
    title: undefined,
    endIndex: 8,
  });
  assert.equal(readInlineReferenceDestination('[label][missing]', 6, 'label', state), null);
});

test('readUnresolvedInlineReferenceEnd reads a reference-label tail', () => {
  assert.equal(readUnresolvedInlineReferenceEnd('[x][ref]', 2), 7);
  assert.equal(readUnresolvedInlineReferenceEnd('[x](url)', 2), -1);
});

test('canTailBecomeReferenceLink checks whether the reference label is itself link text', () => {
  assert.equal(canTailBecomeReferenceLink('[foo][bar][ref]', 9, 'bar', state), true);
  assert.equal(canTailBecomeReferenceLink('[foo][bar][missing]', 9, 'bar', state), false);
});

test('findReferenceLabelEnd rejects nested unescaped brackets', () => {
  assert.equal(findReferenceLabelEnd('ref]', 0), 3);
  assert.equal(findReferenceLabelEnd('a\\]b]', 0), 4);
  assert.equal(findReferenceLabelEnd('a[b]', 0), -1);
});

test('readInlineDestination parses hrefs, nested parentheses, escapes, and titles', () => {
  assert.deepEqual(readInlineDestination('(a(b)c "Title")', 0), {
    href: 'a(b)c',
    title: 'Title',
    endIndex: 14,
  });
  assert.deepEqual(readInlineDestination('(<https://example.com/a b>)', 0), {
    href: 'https://example.com/a b',
    title: undefined,
    endIndex: 26,
  });
  assert.deepEqual(readInlineDestination('(foo\\bar)', 0), {
    href: 'foo\\bar',
    title: undefined,
    endIndex: 8,
  });
  assert.equal(readInlineDestination('(a(b)', 0), null);
});

test('normalizeInlineDestination unwraps angle destinations only when paired', () => {
  assert.equal(normalizeInlineDestination('<url>'), 'url');
  assert.equal(normalizeInlineDestination('<url'), '<url');
});

test('inlineTitleFromGroups selects and decodes supported title group variants', () => {
  assert.equal(inlineTitleFromGroups({ title: 'A &amp; B' }, 'title'), 'A & B');
  assert.equal(inlineTitleFromGroups({ titleSingle: 'Single' }, 'title'), 'Single');
  assert.equal(inlineTitleFromGroups({ titleParen: 'Paren' }, 'title'), 'Paren');
  assert.equal(inlineTitleFromGroups({}, 'title'), undefined);
});
