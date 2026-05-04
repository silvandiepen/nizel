import assert from 'node:assert/strict';
import { test } from 'vitest';
import {
  findDelimiter,
  isPropOrBlank,
  parsePrimitive,
  parseProps,
  readCustomBlock,
  splitWords,
} from '../dist/parse/custom.js';

test('findDelimiter returns the next standalone custom block delimiter', () => {
  assert.equal(findDelimiter(['x', ' :: ', ':: nope'], 0), 1);
  assert.equal(findDelimiter(['x', ':: nope'], 0), -1);
});

test('isPropOrBlank accepts prop lines and blanks only', () => {
  assert.equal(isPropOrBlank('title: Hello'), true);
  assert.equal(isPropOrBlank(''), true);
  assert.equal(isPropOrBlank('not props'), false);
});

test('parsePrimitive coerces documented scalar values', () => {
  assert.equal(parsePrimitive('true'), true);
  assert.equal(parsePrimitive('false'), false);
  assert.equal(parsePrimitive('null'), null);
  assert.equal(parsePrimitive('-12.5'), -12.5);
  assert.equal(parsePrimitive('"hello"'), 'hello');
  assert.equal(parsePrimitive("'hello'"), 'hello');
  assert.equal(parsePrimitive('hello'), 'hello');
});

test('parseProps reads key-value prop sections', () => {
  assert.deepEqual(parseProps(['title: Hello', 'count: 2', '', 'ignored']), {
    title: 'Hello',
    count: 2,
  });
});

test('readCustomBlock separates props, content, and closing delimiter', () => {
  assert.deepEqual(readCustomBlock(['::alert', 'title: Hi', 'count: 2', '::', 'Body', '::', 'after'], 0), {
    props: { title: 'Hi', count: 2 },
    content: 'Body',
    endIndex: 5,
  });
  assert.deepEqual(readCustomBlock(['::alert', 'Body', '::', 'after'], 0), {
    props: {},
    content: 'Body',
    endIndex: 2,
  });
  assert.deepEqual(readCustomBlock(['::alert', 'Body'], 0), {
    props: {},
    content: 'Body',
    endIndex: 1,
  });
});

test('splitWords tokenizes custom block arguments', () => {
  assert.deepEqual(splitWords(' one  two\tthree '), ['one', 'two', 'three']);
  assert.deepEqual(splitWords('   '), []);
});
