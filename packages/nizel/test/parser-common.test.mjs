import assert from 'node:assert/strict';
import { test } from 'vitest';
import {
  decodeCodePoint,
  decodeEntity,
  decodeStringContent,
  normalizeHref,
  normalizeReference,
  normalizeReferenceLabelForLookup,
  stripDestinationBrackets,
} from '../dist/parse/common.js';

test('normalizeReference folds whitespace, case, and sharp-s variants', () => {
  assert.equal(normalizeReference('  Foo\tBAR  '), 'foo bar');
  assert.equal(normalizeReference('Straße ẞ'), 'strasse ss');
});

test('normalizeReferenceLabelForLookup decodes escaped brackets before lookup', () => {
  assert.equal(normalizeReferenceLabelForLookup('foo\\[bar\\]'), 'foo[bar]');
  assert.equal(normalizeReferenceLabelForLookup('foo\\*bar'), 'foo\\*bar');
});

test('stripDestinationBrackets removes CommonMark angle destination wrappers', () => {
  assert.equal(stripDestinationBrackets('<https://example.com>'), 'https://example.com');
  assert.equal(stripDestinationBrackets('/url'), '/url');
});

test('normalizeHref encodes URLs while preserving already encoded octets', () => {
  assert.equal(normalizeHref('/a b?q=%5Bok%5D'), '/a%20b?q=%5Bok%5D');
});

test('decodeStringContent decodes escapable punctuation and character references', () => {
  assert.equal(decodeStringContent('\\*Tom &amp; Jerry&#33;'), '*Tom & Jerry!');
  assert.equal(decodeStringContent('\\x &unknown;'), '\\x &unknown;');
});

test('decodeEntity supports named, decimal, hex, unknown, and invalid entities', () => {
  assert.equal(decodeEntity('copy'), '©');
  assert.equal(decodeEntity('#169'), '©');
  assert.equal(decodeEntity('#xA9'), '©');
  assert.equal(decodeEntity('missing'), '&missing;');
  assert.equal(decodeEntity('#0'), '\ufffd');
});

test('decodeCodePoint preserves invalid entity ranges and decodes valid points', () => {
  assert.equal(decodeCodePoint('#x1F600', 0x1f600), '😀');
  assert.equal(decodeCodePoint('#x110000', 0x110000), '&#x110000;');
  assert.equal(decodeCodePoint('#xD800', 0xd800), '\ufffd');
  assert.equal(decodeCodePoint('#nan', Number.NaN), '\ufffd');
});
