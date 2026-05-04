import assert from 'node:assert/strict';
import { test } from 'vitest';
import {
  isRawHtmlBlockLine,
  isSetextUnderline,
  isThematicBreak,
  normalizeParagraphLine,
  normalizeParagraphSource,
  trimClosingHeadingHashes,
} from '../dist/parse/block.js';

test('isRawHtmlBlockLine recognizes simple raw HTML block lines', () => {
  assert.equal(isRawHtmlBlockLine('<div>'), true);
  assert.equal(isRawHtmlBlockLine('</section>'), true);
  assert.equal(isRawHtmlBlockLine('<a href="/x">'), true);
  assert.equal(isRawHtmlBlockLine('< not html >'), false);
});

test('isThematicBreak follows CommonMark marker run rules', () => {
  assert.equal(isThematicBreak('---'), true);
  assert.equal(isThematicBreak(' * * * '), true);
  assert.equal(isThematicBreak('  ___'), true);
  assert.equal(isThematicBreak('    ---'), false);
  assert.equal(isThematicBreak('--'), false);
});

test('isSetextUnderline matches level one and level two underline shapes', () => {
  assert.equal(isSetextUnderline('===')?.[1], '===');
  assert.equal(isSetextUnderline('  ---')?.[1], '---');
  assert.equal(isSetextUnderline('    ---'), null);
});

test('trimClosingHeadingHashes handles ATX closing marker text', () => {
  assert.equal(trimClosingHeadingHashes('Title ###'), 'Title');
  assert.equal(trimClosingHeadingHashes('###'), '');
  assert.equal(trimClosingHeadingHashes('Title#'), 'Title#');
});

test('normalizeParagraphLine removes paragraph indentation', () => {
  assert.equal(normalizeParagraphLine('   text'), 'text');
  assert.equal(normalizeParagraphLine('    code-ish'), 'code-ish');
});

test('normalizeParagraphSource joins lines and trims trailing paragraph spaces', () => {
  assert.equal(normalizeParagraphSource(['a  ', 'b   ']), 'a  \nb');
});
