import assert from 'node:assert/strict';
import { test } from 'vitest';
import {
  htmlBlockClosingPattern,
  isBlankTerminatedHtmlBlockStart,
  isBlockTagHtmlBlockStart,
  isInterruptingHtmlBlockStart,
  isValidInlineHtmlTag,
  isValidInlineHtmlToken,
  readHtmlBlock,
  readHtmlBlockUntil,
  readHtmlBlockUntilBlank,
} from '../dist/parse/html.js';

test('htmlBlockClosingPattern resolves CommonMark special HTML block endings', () => {
  assert.match('</script>', htmlBlockClosingPattern('<script type="x">'));
  assert.match('ok -->', htmlBlockClosingPattern('<!-- comment'));
  assert.match('?>', htmlBlockClosingPattern('<?pi'));
  assert.match('>', htmlBlockClosingPattern('<!DOCTYPE html'));
  assert.match(']]>', htmlBlockClosingPattern('<![CDATA['));
  assert.equal(htmlBlockClosingPattern('<div>'), null);
});

test('readHtmlBlockUntil consumes through the matching closing line', () => {
  assert.deepEqual(
    readHtmlBlockUntil(['<script>', 'x', '</script>', 'after'], 0, /<\/script>/),
    { value: '<script>\nx\n</script>', endIndex: 2 },
  );
});

test('blank-terminated HTML block starts follow block and inline tag rules', () => {
  assert.equal(isBlankTerminatedHtmlBlockStart('<div>'), true);
  assert.equal(isBlankTerminatedHtmlBlockStart('<custom data-x="1">'), true);
  assert.equal(isBlankTerminatedHtmlBlockStart('<not a tag'), false);
});

test('isValidInlineHtmlTag accepts CommonMark tag shapes and rejects invalid attributes', () => {
  assert.equal(isValidInlineHtmlTag('<a href="/x" data-id=one>'), true);
  assert.equal(isValidInlineHtmlTag('</a>'), true);
  assert.equal(isValidInlineHtmlTag('<a href=`x`>'), false);
  assert.equal(isValidInlineHtmlTag('<a href=<x>>'), false);
});

test('isValidInlineHtmlToken handles declarations, comments, and multiline open tags', () => {
  assert.equal(isValidInlineHtmlToken('<!-->'), true);
  assert.equal(isValidInlineHtmlToken('<?ok?>'), true);
  assert.equal(isValidInlineHtmlToken('<![CDATA[x]]>'), true);
  assert.equal(isValidInlineHtmlToken('<a foo="bar"\n_boolean />'), true);
  assert.equal(isValidInlineHtmlToken('<a!\n/>'), false);
});

test('isBlockTagHtmlBlockStart recognizes CommonMark block tags only', () => {
  assert.equal(isBlockTagHtmlBlockStart('<table>'), true);
  assert.equal(isBlockTagHtmlBlockStart('</section>'), true);
  assert.equal(isBlockTagHtmlBlockStart('<custom>'), false);
});

test('readHtmlBlockUntilBlank consumes raw HTML through the next blank line', () => {
  assert.deepEqual(
    readHtmlBlockUntilBlank(['<div>', 'x', '', 'after'], 0),
    { value: '<div>\nx', endIndex: 1 },
  );
});

test('readHtmlBlock handles special and blank-terminated CommonMark HTML blocks', () => {
  assert.deepEqual(
    readHtmlBlock(['<!--', 'comment -->', 'after'], 0),
    { value: '<!--\ncomment -->', endIndex: 1 },
  );
  assert.deepEqual(
    readHtmlBlock(['<table>', '<tr>', '', 'after'], 0),
    { value: '<table>\n<tr>', endIndex: 1 },
  );
  assert.equal(readHtmlBlock(['paragraph'], 0), null);
});

test('isInterruptingHtmlBlockStart allows only interrupting HTML block starts', () => {
  assert.equal(isInterruptingHtmlBlockStart('<!-- comment -->'), true);
  assert.equal(isInterruptingHtmlBlockStart('<table>'), true);
  assert.equal(isInterruptingHtmlBlockStart('<custom>'), false);
  assert.equal(isInterruptingHtmlBlockStart(' <table>'), true);
  assert.equal(isInterruptingHtmlBlockStart('    <table>'), false);
});
