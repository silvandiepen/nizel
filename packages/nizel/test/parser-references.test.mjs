import assert from 'node:assert/strict';
import { test } from 'vitest';
import {
  canContinueReferenceDefinition,
  extractReferenceDefinitions,
  hasOpenReferenceTitle,
  isReferenceStartAfterBlock,
  parseReferenceDefinitionContent,
  parseReferenceTitle,
  readMultilineReferenceDefinition,
  readReferenceDefinition,
} from '../dist/parse/references.js';

test('parseReferenceTitle reads supported title delimiters and rejects invalid tails', () => {
  assert.equal(parseReferenceTitle(' "Title"'), 'Title');
  assert.equal(parseReferenceTitle(" 'Title'"), 'Title');
  assert.equal(parseReferenceTitle(' (Title)'), 'Title');
  assert.equal(parseReferenceTitle(''), undefined);
  assert.equal(parseReferenceTitle(' title'), null);
  assert.equal(parseReferenceTitle(' "open'), null);
});

test('parseReferenceDefinitionContent parses destinations, encoded hrefs, and titles', () => {
  assert.deepEqual(parseReferenceDefinitionContent('/a b'), null);
  assert.deepEqual(parseReferenceDefinitionContent('/a\\*b "A &amp; B"'), {
    href: '/a*b',
    title: 'A & B',
  });
  assert.deepEqual(parseReferenceDefinitionContent('<https://example.com/a b>'), {
    href: 'https://example.com/a%20b',
    title: undefined,
  });
  assert.equal(parseReferenceDefinitionContent('<unclosed'), null);
});

test('hasOpenReferenceTitle tracks unfinished title delimiters', () => {
  assert.equal(hasOpenReferenceTitle(['/url', '"title']), true);
  assert.equal(hasOpenReferenceTitle(['/url', '"title"']), false);
  assert.equal(hasOpenReferenceTitle(['/url']), false);
});

test('canContinueReferenceDefinition accepts valid continuation lines only', () => {
  assert.equal(canContinueReferenceDefinition([], '/url'), true);
  assert.equal(canContinueReferenceDefinition(['/url'], ' "title"'), true);
  assert.equal(canContinueReferenceDefinition(['/url', '"open'], 'title"'), true);
  assert.equal(canContinueReferenceDefinition(['/url "done"'], 'extra'), false);
});

test('isReferenceStartAfterBlock allows starts after headings and thematic breaks', () => {
  assert.equal(isReferenceStartAfterBlock('# Heading'), true);
  assert.equal(isReferenceStartAfterBlock('---'), true);
  assert.equal(isReferenceStartAfterBlock('paragraph'), false);
});

test('readReferenceDefinition parses single-line and continued definitions', () => {
  assert.deepEqual(readReferenceDefinition(['[foo]: /url "title"', 'after'], 0), {
    label: 'foo',
    reference: { href: '/url', title: 'title' },
    endIndex: 0,
  });
  assert.deepEqual(readReferenceDefinition(['[foo]: /url', ' "title"', 'after'], 0), {
    label: 'foo',
    reference: { href: '/url', title: 'title' },
    endIndex: 1,
  });
  assert.equal(readReferenceDefinition(['[]: /url'], 0), null);
});

test('readMultilineReferenceDefinition parses labels across lines', () => {
  assert.deepEqual(readMultilineReferenceDefinition(['[foo', 'bar]: /url'], 0), {
    label: 'foo\nbar',
    reference: { href: '/url', title: undefined },
    endIndex: 1,
  });
  assert.equal(readMultilineReferenceDefinition(['[', ' ]: /url'], 0), null);
  assert.equal(readMultilineReferenceDefinition(['[foo', '', 'bar]: /url'], 0), null);
});

test('extractReferenceDefinitions removes references without touching protected blocks', () => {
  const extracted = extractReferenceDefinitions([
    '[foo]: /url "title"',
    '',
    '```',
    '[code]: /nope',
    '```',
    '',
    '    [indented]: /nope',
    '',
    '> [quote]: /quoted',
    '',
    '<div>',
    '[html]: /nope',
    '',
    'Text [foo][quote].',
  ]);

  assert.deepEqual([...extracted.references.entries()], [
    ['foo', { href: '/url', title: 'title' }],
    ['quote', { href: '/quoted', title: undefined }],
  ]);
  assert.deepEqual(extracted.contentLines, [
    '',
    '```',
    '[code]: /nope',
    '```',
    '',
    '    [indented]: /nope',
    '',
    '>',
    '',
    '<div>',
    '[html]: /nope',
    '',
    'Text [foo][quote].',
  ]);
});
